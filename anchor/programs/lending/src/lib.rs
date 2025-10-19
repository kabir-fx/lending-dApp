use anchor_lang::prelude::*;
use instructions::admin::*;
use instructions::borrow::*;
use instructions::deposit::*;
use instructions::liquidate::*;
use instructions::repay::*;
use instructions::withdraw::*;

mod constants;
mod errors;
mod instructions;
mod state;

declare_id!("6awyXWuEkqhNWpmPRJpzZXuz8z8KVzh347jjSqywuokC");

#[program]
pub mod lending {
    use super::*;

    pub fn initialize_bank(
        ctx: Context<InitializeBank>,
        liquidation_threshold: u64,
        max_ltv: u64,
    ) -> Result<()> {
        process_initialize_bank(ctx, liquidation_threshold, max_ltv)
    }

    pub fn initialize_account(ctx: Context<InitializeAccount>, usdc_address: Pubkey) -> Result<()> {
        process_initialize_account(ctx, usdc_address)
    }

    pub fn deposit(ctx: Context<Deposit>, amount_to_deposit: u64) -> Result<()> {
        process_deposit(ctx, amount_to_deposit)
    }

    pub fn withdraw(ctx: Context<Withdraw>, amount_to_withdraw: u64) -> Result<()> {
        process_withdraw(ctx, amount_to_withdraw)
    }

    pub fn borrow(ctx: Context<Borrow>, amount_to_borrow: u64) -> Result<()> {
        process_borrow(ctx, amount_to_borrow)
    }

    pub fn repay(ctx: Context<Repay>, amount_to_repay: u64) -> Result<()> {
        process_repay(ctx, amount_to_repay)
    }

    pub fn liquidate(ctx: Context<Liquidate>) -> Result<()> {
        process_liquidate(ctx)
    }
}

#[derive(Accounts)]
pub struct Initialize {}
