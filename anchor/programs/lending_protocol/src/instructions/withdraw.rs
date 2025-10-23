//! Handles withdrawals from the protocol

use std::f64::consts::E;

use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{transfer_checked, Mint, TokenAccount, TokenInterface, TransferChecked},
};

use crate::{
    errors::ErrorCode,
    state::{Bank, TokenType, User},
};

/// Define the struct needed for our context to create the instruction for withdrawing from a bank
#[derive(Accounts)]
pub struct Withdraw<'info> {
    /// The signer of the transaction
    #[account(mut)]
    pub signer: Signer<'info>,

    /// The mint address of the asset to be withdrawn
    pub mint: InterfaceAccount<'info, Mint>,

    /// The bank account to withdraw the asset from
    #[account(
        mut,
        seeds = [mint.key().as_ref()],
        bump,
    )]
    pub bank: Account<'info, Bank>,

    /// The bank token account which holds the asset to be withdrawn
    #[account(
        mut,
        seeds = [b"Treasury", mint.key().as_ref()],
        bump,
    )]
    pub bank_token_account: InterfaceAccount<'info, TokenAccount>,

    /// The user account requesting the withdrawal
    #[account(
        mut,
        seeds = [signer.key().as_ref()],
        bump,
    )]
    pub user_account: Account<'info, User>,

    /// User token account we will be withdrawing the asset to.
    ///
    /// Ideally the account would already have been initialized when the user is depositing the asset, but since we can't guarantee that, we will initialize it if needed.
    #[account(
        init_if_needed,
        payer = signer,
        associated_token::mint = mint,
        associated_token::authority = signer,
        associated_token::token_program = token_program,
    )]
    pub user_token_account: InterfaceAccount<'info, TokenAccount>,

    /// Associated token program to create the associated token account
    pub associated_token_program: Program<'info, AssociatedToken>,

    /// Token program to create the token account.
    pub token_program: Interface<'info, TokenInterface>,

    /// System program to create the account
    pub system_program: Program<'info, System>,
}

/// Instruction to process the withdrawal.
///
/// Before processing the withdrawal, we need to check if the user has depossited enough tokens to be able to withdraw. User cannot withdraw tokens that they already deposited.
pub fn process_withdraw(ctx: Context<Withdraw>, amount_to_withdraw: u64, token_type: TokenType) -> Result<()> {
    let bank_account = &mut ctx.accounts.bank;
    let user_account = &mut ctx.accounts.user_account;

    // Verify that the user has deposited enough tokens to be able to withdraw
    let deposited_tokens: u64;
    match token_type {
        TokenType::SOL => deposited_tokens = user_account.deposited_sol,
        TokenType::USDC => deposited_tokens = user_account.deposited_usdc,
    }

    // Cal. the interest that the user has earned since the last time they deposited

    // Get the current time diffrance between the last time the user deposited and the current time
    let time_diff = Clock::get()?.unix_timestamp - user_account.last_updated;

    // Calculate the total deposits after interest has been applied
    bank_account.total_deposits = (bank_account.total_deposits as f64
        * E.powf(time_diff as f64 * bank_account.interest_rate as f64))
        as u64;

    // Calculate the current value of 1 share (unused but kept for clarity)
    let _value_per_share =
        bank_account.total_deposits as f64 / bank_account.total_deposits_shares as f64;

    // Calculate the current value of user's deposited tokens after interest
    let current_deposited_value = deposited_tokens as f64 * E.powf(time_diff as f64 * bank_account.interest_rate as f64);

    // Check if user has enough to withdraw
    if current_deposited_value < amount_to_withdraw as f64 {
        return Err(ErrorCode::InsufficientFunds.into());
    }

    // Intiate the transfer to be able to withdraw from the bank

    // CPI Transfer
    let transfer_cpi_accounts = TransferChecked {
        // From bank's token account
        from: ctx.accounts.bank_token_account.to_account_info(),

        // To user's token account
        to: ctx.accounts.user_token_account.to_account_info(),

        // Authority is the bank token account. Since while initialization we made the bank token account the authority itself - we can just set the authority directly here.
        authority: ctx.accounts.bank_token_account.to_account_info(),

        // Mint of the asset passed in the context (Withdraw struct)
        mint: ctx.accounts.mint.to_account_info(),
    };

    let cpi_program = ctx.accounts.token_program.to_account_info();

    // Since we are signing with the bank token account which is a PDA - we hv to define the signer seeds for this CPI to process
    let signer_seeds: &[&[&[u8]]] = &[&[
        b"Treasury",
        ctx.accounts.mint.to_account_info().key.as_ref(),
        &[ctx.bumps.bank_token_account],
    ]];

    let cpi_ctx = CpiContext::new(cpi_program, transfer_cpi_accounts).with_signer(signer_seeds);

    let decimals = ctx.accounts.mint.decimals;

    transfer_checked(cpi_ctx, amount_to_withdraw, decimals)?;

    // Update the state of the user and bank to reflect this withdrawal

    // Bank
    let bank_account = &mut ctx.accounts.bank;
    let shares_to_withdraw = (amount_to_withdraw as f64 / bank_account.total_deposits as f64)
        * bank_account.total_deposits_shares as f64;

    // User
    let user_account = &mut ctx.accounts.user_account;

    // First update the user's deposited amount to reflect accrued interest
    let user_shares: f64;
    match token_type {
        TokenType::USDC => {
            user_shares = user_account.deposited_usdc_shares as f64;
            // Update deposited amount with interest
            user_account.deposited_usdc = ((user_account.deposited_usdc as f64) * E.powf(time_diff as f64 * bank_account.interest_rate as f64)) as u64;
        },
        TokenType::SOL => {
            user_shares = user_account.deposited_sol_shares as f64;
            // Update deposited amount with interest
            user_account.deposited_sol = ((user_account.deposited_sol as f64) * E.powf(time_diff as f64 * bank_account.interest_rate as f64)) as u64;
        },
    }

    // Ensure we don't withdraw more shares than the user has
    let actual_shares_to_withdraw = shares_to_withdraw.min(user_shares);

    // Match the asset type and update the state of the user account
    match token_type {
        TokenType::USDC => {
            user_account.deposited_usdc -= amount_to_withdraw;
            user_account.deposited_usdc_shares -= actual_shares_to_withdraw as u64;
        },
        TokenType::SOL => {
            user_account.deposited_sol -= amount_to_withdraw;
            user_account.deposited_sol_shares -= actual_shares_to_withdraw as u64;
        },
    }

    // Finally update the state of the bank account
    bank_account.total_deposits -= amount_to_withdraw;
    bank_account.total_deposits_shares -= actual_shares_to_withdraw as u64;

    Ok(())
}
