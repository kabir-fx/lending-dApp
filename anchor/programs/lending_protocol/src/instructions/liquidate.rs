//! Handles the liquidation of an account

use crate::instructions::borrow::calculate_accrued_interest;
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{transfer_checked, Mint, TokenAccount, TokenInterface, TransferChecked},
};
use pyth_solana_receiver_sdk::price_update::{get_feed_id_from_hex, PriceUpdateV2};

use crate::{
    constants::{MAX_AGE, SOL_USD_FEED_ID, USDC_USD_FEED_ID},
    errors::ErrorCode,
    state::{Bank, User, TokenType},
};

#[derive(Accounts)]
pub struct Liquidate<'info> {
    #[account(mut)]
    pub liquidator: Signer<'info>,

    #[account(mut)]
    pub price_update_account: Account<'info, PriceUpdateV2>,

    /// Mints for the collateral and borrowed asset
    pub collateral_mint: InterfaceAccount<'info, Mint>,
    pub borrowed_mint: InterfaceAccount<'info, Mint>,

    /// Defining borrowed and collateral bank account for there respective token accounts

    /// Collateral bank account
    #[account(
        mut,
        seeds = [collateral_mint.key().as_ref()],
        bump,
    )]
    pub collateral_bank: Account<'info, Bank>,

    /// Collateral Bank token account
    #[account(
        mut,
        seeds = [b"Treasury", collateral_mint.key().as_ref()],
        bump,
    )]
    pub collateral_bank_token_account: InterfaceAccount<'info, TokenAccount>,

    /// Borrowed bank account
    #[account(
        mut,
        seeds = [borrowed_mint.key().as_ref()],
        bump,
    )]
    pub borrowed_bank: Account<'info, Bank>,

    /// Borrowed Bank token account
    #[account(
        mut,
        seeds = [b"Treasury", borrowed_mint.key().as_ref()],
        bump,
    )]
    pub borrowed_bank_token_account: InterfaceAccount<'info, TokenAccount>,

    /// User account for the liquidator
    #[account(mut)]
    pub liquidator_user_account: Account<'info, User>,

    /// Liquidator's borrowed token account
    #[account(
        init_if_needed,
        payer = liquidator,
        associated_token::mint = borrowed_mint,
        associated_token::authority = liquidator_user_account,
    )]
    pub liquidator_borrowed_token_account: InterfaceAccount<'info, TokenAccount>,

    /// Liquidator's collateral token account
    #[account(
        init_if_needed,
        payer = liquidator,
        associated_token::mint = collateral_mint,
        associated_token::authority = liquidator_user_account,
    )]
    pub liquidator_collateral_token_account: InterfaceAccount<'info, TokenAccount>,

    /// System program
    pub system_program: Program<'info, System>,

    /// Token program
    pub token_program: Interface<'info, TokenInterface>,

    /// Associated token program
    pub associated_token_program: Program<'info, AssociatedToken>,
}

/// Logic: a liquidator is able to come to a protocol and repay the debt of an unhealthy account, and in return they recieve the collateral + a liquidation bonus - a bonus of the liquidation amount that they receive to incentivize them to liquidate.
pub fn process_liquidate(ctx: Context<Liquidate>, token_type: TokenType) -> Result<()> {
    // Verifying that the account is indeed unhealthy to process the liquidation

    let collateral_bank = &mut ctx.accounts.collateral_bank;
    let liquidator_user_account = &mut ctx.accounts.liquidator_user_account;
    let liquidator_borrowed_token_account = &mut ctx.accounts.liquidator_borrowed_token_account;
    let borrowed_bank = &mut ctx.accounts.borrowed_bank;
    let liquidator_collateral_token_account = &mut ctx.accounts.liquidator_collateral_token_account;

    let price_update_account = &mut ctx.accounts.price_update_account;

    let sol_feed_id = get_feed_id_from_hex(SOL_USD_FEED_ID)?;
    let sol_price =
        price_update_account.get_price_no_older_than(&Clock::get()?, MAX_AGE, &sol_feed_id)?;

    let usdc_feed_id = get_feed_id_from_hex(USDC_USD_FEED_ID)?;
    let usdc_price =
        price_update_account.get_price_no_older_than(&Clock::get()?, MAX_AGE, &usdc_feed_id)?;

    let total_collateral_value: u64;
    let total_borrowed_value: u64;

    match token_type {
        TokenType::USDC => {
            let new_usdc_price = calculate_accrued_interest(
                liquidator_user_account.deposited_usdc,
                collateral_bank.interest_rate,
                liquidator_user_account.last_updated,
            )?;

            total_collateral_value = new_usdc_price * usdc_price.price as u64;

            let new_sol_price = calculate_accrued_interest(
                liquidator_user_account.borrowed_sol,
                borrowed_bank.interest_rate,
                liquidator_user_account.last_updated,
            )?;

            total_borrowed_value = new_sol_price * sol_price.price as u64;
        },
        TokenType::SOL => {
            let new_sol_price = calculate_accrued_interest(
                liquidator_user_account.deposited_sol,
                collateral_bank.interest_rate,
                liquidator_user_account.last_updated,
            )?;

            total_collateral_value = new_sol_price * sol_price.price as u64;

            let new_usdc_price = calculate_accrued_interest(
                liquidator_user_account.borrowed_usdc,
                borrowed_bank.interest_rate,
                liquidator_user_account.last_updated,
            )?;

            total_borrowed_value = new_usdc_price * usdc_price.price as u64;
        },
    }

    // Cal. the health factor to ensure that the account is healthy. Is the HF < 1, then the account is unhealthy.
    let health_factor = ((total_collateral_value as f64
        * collateral_bank.liquidation_threshold as f64)
        / total_borrowed_value as f64) as f64;

    if health_factor >= 1.0 {
        return Err(ErrorCode::AccountNotUnhealthy.into());
    }

    // Now that we have confirmed that the account is indeed unhealthy, we can proceed to liquidate the account.

    // STEP 1: The liquidator needs to pay back the borrowed amount to the bank
    let transfer_to_bank = TransferChecked {
        from: liquidator_borrowed_token_account.to_account_info(),
        to: ctx.accounts.borrowed_bank_token_account.to_account_info(),
        authority: ctx.accounts.liquidator.to_account_info(),
        mint: ctx.accounts.borrowed_mint.to_account_info(),
    };

    // Parameters for the CPI transfer to the bank. No signing seeds needed for this transfer as it's not coming from a Associated Token Account.
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, transfer_to_bank);
    let decimals = ctx.accounts.borrowed_mint.decimals;

    // Calculate the liquidation amount that the liquidator needs to pay back to the bank in order to liquidate the account.
    let liquidation_amount = total_borrowed_value
        .checked_mul(borrowed_bank.liquidation_close_factor)
        .unwrap();

    // Process the transfer to the bank
    transfer_checked(cpi_ctx, liquidation_amount, decimals)?;

    // STEP 2: Tranferring from the collateral account to the liquidator. It's going to pay back evrything the liquidator sent to repay the loan alongside an additional amount for liquidation bonus.

    // Calculate the amount that the liquidator will receive from the liquidation.
    let liquidator_amount =
        (liquidation_amount * collateral_bank.liquidation_bonus) + liquidation_amount;

    // Process the transfer to the liquidator.
    let transfer_to_liquidator = TransferChecked {
        from: ctx.accounts.collateral_bank_token_account.to_account_info(),
        to: liquidator_collateral_token_account.to_account_info(),
        authority: ctx.accounts.collateral_bank_token_account.to_account_info(),
        mint: ctx.accounts.collateral_mint.to_account_info(),
    };

    // Since we are tranferring from bank token account which is a PDA, we need to provide the seeds for the transfer.
    let signer_seeds: &[&[&[u8]]] = &[&[
        b"Treasury",
        ctx.accounts.collateral_mint.to_account_info().key.as_ref(),
        &[ctx.bumps.collateral_bank_token_account],
    ]];

    let cpi_ctx_to_liquidator = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        transfer_to_liquidator,
    )
    .with_signer(signer_seeds);

    let decimals = ctx.accounts.collateral_mint.decimals;

    // Process the transfer to the liquidator.
    transfer_checked(cpi_ctx_to_liquidator, liquidator_amount, decimals)?;

    Ok(())
}
