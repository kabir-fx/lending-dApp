//! Handles the borrow instruction that will be used to cal. the quantity of assests that a user can borrow against their collateral.

use std::f64::consts::E;

use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{transfer_checked, Mint, TokenAccount, TokenInterface, TransferChecked},
};
use pyth_solana_receiver_sdk::price_update::{get_feed_id_from_hex, PriceUpdateV2};

use crate::{
    constants::{MAX_AGE, SOL_USD_FEED_ID, USDC_USD_FEED_ID},
    errors::ErrorCode,
    state::{Bank, TokenType, User},
};

/// Define the struct needed for our context to create the instruction for borrowing assets
#[derive(Accounts)]
pub struct Borrow<'info> {
    /// The signer of the transaction
    #[account(mut)]
    pub signer: Signer<'info>,

    /// The mint address of the asset to be borrowed
    pub mint: InterfaceAccount<'info, Mint>,

    /// The bank account of the mint that the user wants to borrow
    #[account(
        mut,
        seeds = [mint.key().as_ref()],
        bump,
    )]
    pub bank: Account<'info, Bank>,

    /// The bank token account of the mint that the user wants to borrow
    #[account(
        mut,
        seeds = [b"Treasury", mint.key().as_ref()],
        bump,
    )]
    pub bank_token_account: InterfaceAccount<'info, TokenAccount>,

    /// The user account that stores the state of the user
    #[account(
        mut,
        seeds = [signer.key().as_ref()],
        bump,
    )]
    pub user_account: Account<'info, User>,

    /// The user token account which (will) hold the tokens that the user is looking to borrow
    ///
    /// Since we can't guarantee that the user will have a token account for the mint that they are looking to borrow, we will initialize it if needed.
    #[account(
        init_if_needed,
        payer = signer,
        associated_token::mint = mint,
        associated_token::authority = user_account,
        associated_token::token_program = token_program,
    )]
    pub user_token_account: InterfaceAccount<'info, TokenAccount>,

    /// Since the user will be borrowing a different asset than the one they deposited - we need to calculate the price corresponding to the asset they deposited using pyth-solana-receiver-sdk
    pub price_update: Account<'info, PriceUpdateV2>,

    /// Associated token program because it's referenced in the instruction
    pub associated_token_program: Program<'info, AssociatedToken>,

    /// Token program because it's referenced in the instruction
    pub token_program: Interface<'info, TokenInterface>,

    /// System program to POTENTIALLY create a new account and also because it's required by the instruction
    pub system_program: Program<'info, System>,
}

/// Instruction to process the borrow.
///
/// Before processing the borrow, we need to check if the user has deposited enough collateral to be able to borrow the desired amount.
pub fn process_borrow(
    ctx: Context<Borrow>,
    amount_to_borrow: u64,
    token_type: TokenType,
) -> Result<()> {
    let bank_account = &mut ctx.accounts.bank;
    let user_account = &mut ctx.accounts.user_account;

    let price_update = &mut ctx.accounts.price_update;

    // Cal. the total collateral a user holds
    let total_collateral: u64 = match token_type {
        TokenType::USDC => {
            // If the user is passing USDC as key, means that they have their collateral in SOL
            let sol_feed_id = get_feed_id_from_hex(SOL_USD_FEED_ID)?;
            let sol_price =
                price_update.get_price_no_older_than(&Clock::get()?, MAX_AGE, &sol_feed_id)?;

            let new_value = calculate_accrued_interest(
                user_account.deposited_sol,
                bank_account.interest_rate,
                user_account.last_updated,
            )?;

            sol_price.price as u64 * new_value
        }
        TokenType::SOL => {
            let usdc_feed_id = get_feed_id_from_hex(USDC_USD_FEED_ID)?;
            let usdc_price =
                price_update.get_price_no_older_than(&Clock::get()?, MAX_AGE, &usdc_feed_id)?;

            let new_value = calculate_accrued_interest(
                user_account.deposited_usdc,
                bank_account.interest_rate,
                user_account.last_updated,
            )?;

            usdc_price.price as u64 * new_value
        }
    };

    // Calculate the borrowable amount that a user can borrow against their collateral
    let borrowable_amount = total_collateral
        .checked_mul(bank_account.liquidation_threshold)
        .unwrap_or(0);

    // Check if the requested amount to borrow is greater than the borrowable amount
    if amount_to_borrow > borrowable_amount {
        return Err(ErrorCode::OverBorrowableAmount.into());
    }
    // Process the CPI instruction to transfer the requested amount to borrow from the bank token account to the user token account
    let transfer_cpi_accounts = TransferChecked {
        from: ctx.accounts.bank_token_account.to_account_info(),
        to: ctx.accounts.user_token_account.to_account_info(),
        authority: ctx.accounts.bank_token_account.to_account_info(),
        mint: ctx.accounts.mint.to_account_info(),
    };

    let cpi_program = ctx.accounts.token_program.to_account_info();

    // Since we are signing with the bank token account which is a PDA - we hv to define the signer seeds for this CPI to process
    // Same as withdraw instruction - since we are using the same PDA from the same token account
    let signer_seeds: &[&[&[u8]]] = &[&[
        b"Treasury",
        ctx.accounts.mint.to_account_info().key.as_ref(),
        &[ctx.bumps.bank_token_account],
    ]];

    let cpi_ctx = CpiContext::new(cpi_program, transfer_cpi_accounts).with_signer(signer_seeds);

    let decimals = ctx.accounts.mint.decimals;

    // Perform the transfer
    transfer_checked(cpi_ctx, amount_to_borrow, decimals)?;

    // Update the state of the user and bank to reflect this borrow

    // Perform the check to ensure total borrows non 0
    if bank_account.total_borrows == 0 {
        bank_account.total_borrows_shares = amount_to_borrow;
        bank_account.total_borrows = amount_to_borrow;
    }

    let borrow_ratio = amount_to_borrow
        .checked_div(bank_account.total_borrows)
        .unwrap();
    let user_shares = bank_account
        .total_borrows_shares
        .checked_mul(borrow_ratio)
        .unwrap();

    match token_type {
        TokenType::USDC => {
            user_account.borrowed_usdc += amount_to_borrow;
            user_account.borrowed_usdc_shares += user_shares;
        }
        TokenType::SOL => {
            user_account.borrowed_sol += amount_to_borrow;
            user_account.borrowed_sol_shares += user_shares;
        }
    }

    bank_account.total_borrows += amount_to_borrow;
    bank_account.total_borrows_shares += user_shares;

    user_account.last_updated = Clock::get()?.unix_timestamp;

    Ok(())
}

pub fn calculate_accrued_interest(
    deposited: u64,
    interest_rate: u64,
    last_updated: i64,
) -> Result<u64> {
    let current_time = Clock::get()?.unix_timestamp;
    let time_diff = current_time - last_updated;

    let new_value =
        (deposited as f64 * E.powf(interest_rate as f64 * time_diff as f64) as f64) as u64;

    Ok(new_value)
}
