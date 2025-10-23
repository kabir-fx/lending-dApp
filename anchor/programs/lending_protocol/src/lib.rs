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
use crate::state::TokenType;

declare_id!("9CoY42r3y5WFDJjQX97e9m9THcVGpvuVSKjBjGkiksMR");

#[program]
pub mod lending_protocol {
    use super::*;

    pub fn initialize_bank(
        ctx: Context<InitializeBank>,
        liquidation_threshold: u64,
        max_ltv: u64,
    ) -> Result<()> {
        process_initialize_bank(ctx, liquidation_threshold, max_ltv)
    }

    pub fn initialize_account(ctx: Context<InitializeAccount>) -> Result<()> {
        process_initialize_account(ctx)
    }

    pub fn deposit(ctx: Context<Deposit>, amount_to_deposit: u64, token_type: TokenType) -> Result<()> {
        process_deposit(ctx, amount_to_deposit, token_type)
    }

    pub fn withdraw(ctx: Context<Withdraw>, amount_to_withdraw: u64, token_type: TokenType) -> Result<()> {
        process_withdraw(ctx, amount_to_withdraw, token_type)
    }

    pub fn borrow(ctx: Context<Borrow>, amount_to_borrow: u64, token_type: TokenType) -> Result<()> {
        process_borrow(ctx, amount_to_borrow, token_type)
    }

    pub fn repay(ctx: Context<Repay>, amount_to_repay: u64, token_type: TokenType) -> Result<()> {
        process_repay(ctx, amount_to_repay, token_type)
    }

    pub fn liquidate(ctx: Context<Liquidate>, token_type: TokenType) -> Result<()> {
        process_liquidate(ctx, token_type)
    }
}

#[derive(Accounts)]
pub struct Initialize {}
