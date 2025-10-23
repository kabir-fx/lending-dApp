//! The first thing a user will do it deposity an asset to the bank which will later be used as a collateral to borrow another asset.

use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{transfer_checked, Mint, TokenAccount, TokenInterface, TransferChecked},
};

use crate::errors::ErrorCode;
use crate::state::{Bank, TokenType, User};

/// Define all the accounts needed for the deposit instruction
#[derive(Accounts)]
pub struct Deposit<'info> {
    /// The signer of the transaction
    #[account(mut)]
    pub signer: Signer<'info>,

    /// The mint address of the asset to be deposited
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
        mut,
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

/// Logic to make a deposit into the protocol:
/// 1. Make a CPI Transfer from the user's token account to the bank token account
/// 2. Calculate the new shared added to the bank and to the user
/// 3. Update the user's deposited amount and total collateral value
/// 4. Update the bank's total deposits and total deposits shares
pub fn process_deposit(ctx: Context<Deposit>, amount_to_deposit: u64, token_type: TokenType) -> Result<()> {
    // CPI Transfer
    let transfer_cpi_accounts = TransferChecked {
        // From user's token account
        from: ctx.accounts.user_token_account.to_account_info(),

        // To bank's token account
        to: ctx.accounts.bank_token_account.to_account_info(),

        // Authority is the signer of the transaction
        authority: ctx.accounts.signer.to_account_info(),

        // Mint of the asset passed in the context (Deposit struct)
        mint: ctx.accounts.mint.to_account_info(),
    };

    // Defining the CPI program that will be used to make the transfer.
    // Since all tokens we are transferring are interface accounts tokens, we can use Token program.
    let cpi_program = ctx.accounts.token_program.to_account_info();

    // Defining the CPI context
    let cpi_ctx = CpiContext::new(cpi_program, transfer_cpi_accounts);

    // Decimals of the asset we are depositing into the bank that will be used to convert the amount to deposit to the correct amount of decimals.
    let decimals = ctx.accounts.mint.decimals;

    // Processing the transfer from the user's token account to the bank token account
    transfer_checked(cpi_ctx, amount_to_deposit, decimals)?;

    // Update the state for both user account and bank account to reflect this transfer

    // Load the bank account
    let bank = &mut ctx.accounts.bank;

    // Prevent division by zero
    if bank.total_deposits == 0 {
        bank.total_deposits = amount_to_deposit;
        bank.total_deposits_shares = amount_to_deposit;
    }

    // In order to prevent uderflow/overflow calculation errors for share calculations we will use checked math operations.
    let deposit_ratio = amount_to_deposit
        .checked_div(bank.total_deposits)
        .unwrap_or(0);
    let user_shares = bank
        .total_deposits_shares
        .checked_mul(deposit_ratio)
        .unwrap_or(0);

    // Update the information for user state
    let user_account = &mut ctx.accounts.user_account;

    // Since we are only using SOL and USDC we will use a simple match comparison to indentify and update the corresponding assests.
    match token_type {
        TokenType::USDC => {
            user_account.deposited_usdc += amount_to_deposit;
            user_account.deposited_usdc_shares += user_shares;
        }
        TokenType::SOL => {
            user_account.deposited_sol += amount_to_deposit;
            user_account.deposited_sol_shares += user_shares;
        }
    }

    bank.total_deposits += amount_to_deposit;
    bank.total_deposits_shares += user_shares;

    user_account.last_updated = Clock::get()?.unix_timestamp;

    Ok(())
}
