//! Handles new account needed

use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};

use crate::state::{Bank, User};

/// Define the struct needed for our context to create the instruction for intializing a bank
#[derive(Accounts)]
pub struct InitializeBank<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    /// The mint address of asset of the bank
    pub mint: InterfaceAccount<'info, Mint>,

    /// Initialize the bank account
    #[account(
        init,
        payer = signer,
        // 8 is the space for the account discriminator. Discriminator is used to identify the account type.
        space = 8 + Bank::INIT_SPACE,
        // Since we are going to make the bank a PDA, we need to pass the seeds to the instruction
        // We will pass the mint address as the seed since every bank will have a unique mint address for the asset
        seeds = [mint.key().as_ref()],
        // Bump is used to create a unique address for the bank account
        bump,
    )]
    pub bank: Account<'info, Bank>,

    /// Token account to hold the tokens for the bank
    ///
    /// We are not using an Associated Token Account instead - a Token Account with a PDA so we are able to know that this account is specific to lending protocol bank.
    #[account(
        init,
        // taking the mint address from the mint account so that the token account is created with the same mint address
        token::mint = mint,
        // Setting the authority to this account itself 
        token::authority = bank_token_account,
        payer = signer,

        seeds = [b"Treasury", mint.key().as_ref()],
        bump,
    )]
    pub bank_token_account: InterfaceAccount<'info, TokenAccount>,

    /// Token program to create the token account.
    ///
    /// When you use Interface<'info, TokenInterface>, Anchor automatically determines which token program to use based on the accounts passed in
    pub token_program: Interface<'info, TokenInterface>,

    /// System program to initialize the bank account
    pub system_program: Program<'info, System>,
}

/// Define the struct needed for our context to create the instruction for intializing a user account
#[derive(Accounts)]
pub struct InitializeAccount<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    /// Initialize the user account
    #[account(
        init,
        payer = signer,
        space = 8 + User::INIT_SPACE,
        seeds = [signer.key().as_ref()],
        bump,
    )]
    pub user_account: Account<'info, User>,

    pub system_program: Program<'info, System>,
}

/// Instruction to initialize the bank
///
/// Initialization happened in the stuct so here is - saving the infromation we need to the account state of the bank.
pub fn process_initialize_bank(
    ctx: Context<InitializeBank>,
    liquidation_threshold: u64,
    max_ltv: u64,
) -> Result<()> {
    // Getting the mutable reference to the bank account
    let bank = &mut ctx.accounts.bank;

    // Setting the mint address to the bank account
    bank.mint_address = ctx.accounts.mint.key();

    // Setting the authority of the bank to the current signer - so only the admin can initialize the bank.
    bank.authority = ctx.accounts.signer.key();

    bank.liquidation_threshold = liquidation_threshold;
    bank.max_ltv = max_ltv;

    bank.interest_rate = 0.05 as u64;

    Ok(())
}

/// Instruction to initialize the user account
///
/// Initialization happened in the stuct so here is - saving the infromation we need to the account state of the user. Current USDC address is hardcoded since we need to check it throughout the program.
pub fn process_initialize_account(
    ctx: Context<InitializeAccount>,
    usdc_address: Pubkey,
) -> Result<()> {
    let user = &mut ctx.accounts.user_account;

    user.owner = ctx.accounts.signer.key();

    user.usdc_address = usdc_address;

    Ok(())
}
