//! Handles the repayment of a borrowed asset

use std::f64::consts::E;

use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{transfer_checked, Mint, TokenAccount, TokenInterface, TransferChecked},
};

use crate::state::{Bank, User};
use crate::{errors::ErrorCode, state::TokenType};

#[derive(Accounts)]
pub struct Repay<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    pub mint: InterfaceAccount<'info, Mint>,

    /// The bank account to deposit the asset to
    #[account(
        mut,
        seeds = [mint.key().as_ref()],
        bump,
    )]
    pub bank: Account<'info, Bank>,

    /// The bank token account to deposit the tokens
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

    /// Account that will take the tokens we are depositing and transfer them to the bank token account
    ///
    /// This will be an Associated Token Account for the mint address of the asset we are depositing into the bank.
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

/// Instruction to process the repayment.
///
/// Esentially we are making a CPI transfer from the user token account to the bank token account to repay the borrowed asset.
///
/// We will also have to perfrom a basic check to ensure that the user doesn't repay more than they borrowed.
pub fn process_repay(
    ctx: Context<Repay>,
    amount_to_repay: u64,
    token_type: TokenType,
) -> Result<()> {
    let bank_account = &mut ctx.accounts.bank;
    let user_account = &mut ctx.accounts.user_account;

    let borrowed_tokens: u64;
    match token_type {
        TokenType::USDC => borrowed_tokens = user_account.borrowed_usdc,
        TokenType::SOL => borrowed_tokens = user_account.borrowed_sol,
    }

    // Cal. the interest to be paid alongside the borrowed amount since the last time the user borrowed

    // Get the current time diffrance between the last time the user borrowed and the current time
    let time_diff = Clock::get()?.unix_timestamp - user_account.last_updated;

    // Cal. the total borrow amount after the interest has been applied, taking into the consideration the APY on the bank.
    bank_account.total_borrows = (bank_account.total_borrows as f64
        * E.powf(time_diff as f64 * bank_account.interest_rate as f64))
        as u64;

    // Cal. the current value of 1 share
    let value_per_share =
        bank_account.total_borrows as f64 / bank_account.total_borrows_shares as f64;

    // Cal. the user's shares based on the current share value (interest included)
    let current_user_shares = borrowed_tokens as f64 / value_per_share;

    // Now that we have current user's shares after taking interest into consideration we can perform a check to ensure they are not repaying more than they currently hold.
    if current_user_shares < amount_to_repay as f64 {
        return Err(ErrorCode::OverRepay.into());
    }

    // Intiate the transfer to be able to repay the borrowed asset

    // CPI Transfer
    let transfer_cpi_accounts = TransferChecked {
        // From user's token account
        from: ctx.accounts.user_token_account.to_account_info(),

        // To bank's token account
        to: ctx.accounts.bank_token_account.to_account_info(),

        // Authority is the signer (owner of the user token account)
        authority: ctx.accounts.signer.to_account_info(),

        // Mint of the asset passed in the context (Repay struct)
        mint: ctx.accounts.mint.to_account_info(),
    };

    let cpi_program = ctx.accounts.token_program.to_account_info();

    let cpi_ctx = CpiContext::new(cpi_program, transfer_cpi_accounts);
    let decimals = ctx.accounts.mint.decimals;

    // Since the account token account is not a PDA we dont need to add any signers to the CPI context.
    transfer_checked(cpi_ctx, amount_to_repay, decimals)?;

    // Update the state of the user and bank to reflect this repayment

    let borrow_ratio = amount_to_repay
        .checked_div(bank_account.total_borrows)
        .unwrap();
    let user_shares = bank_account
        .total_borrows_shares
        .checked_mul(borrow_ratio)
        .unwrap();

    match token_type {
        TokenType::USDC => {
            user_account.borrowed_usdc -= amount_to_repay;
            user_account.borrowed_usdc_shares -= user_shares as u64;
        }
        TokenType::SOL => {
            user_account.borrowed_sol -= amount_to_repay;
            user_account.borrowed_sol_shares -= user_shares as u64;
        }
    }

    // Finally update the state of the bank account
    bank_account.total_borrows -= amount_to_repay;
    bank_account.total_borrows_shares -= user_shares as u64;

    Ok(())
}
