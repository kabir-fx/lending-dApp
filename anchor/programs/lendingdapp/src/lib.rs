#![allow(clippy::result_large_err)]

use anchor_lang::prelude::*;

declare_id!("Count3AcZucFDPSFBAeHkQ6AvttieKUkyJ8HiQGhQwe");

#[program]
pub mod lendingdapp {
    use super::*;

    pub fn close(_ctx: Context<CloseLendingdapp>) -> Result<()> {
        Ok(())
    }

    pub fn decrement(ctx: Context<Update>) -> Result<()> {
        ctx.accounts.lendingdapp.count = ctx.accounts.lendingdapp.count.checked_sub(1).unwrap();
        Ok(())
    }

    pub fn increment(ctx: Context<Update>) -> Result<()> {
        ctx.accounts.lendingdapp.count = ctx.accounts.lendingdapp.count.checked_add(1).unwrap();
        Ok(())
    }

    pub fn initialize(_ctx: Context<InitializeLendingdapp>) -> Result<()> {
        Ok(())
    }

    pub fn set(ctx: Context<Update>, value: u8) -> Result<()> {
        ctx.accounts.lendingdapp.count = value.clone();
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeLendingdapp<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
  init,
  space = 8 + Lendingdapp::INIT_SPACE,
  payer = payer
    )]
    pub lendingdapp: Account<'info, Lendingdapp>,
    pub system_program: Program<'info, System>,
}
#[derive(Accounts)]
pub struct CloseLendingdapp<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
  mut,
  close = payer, // close account and return lamports to payer
    )]
    pub lendingdapp: Account<'info, Lendingdapp>,
}

#[derive(Accounts)]
pub struct Update<'info> {
    #[account(mut)]
    pub lendingdapp: Account<'info, Lendingdapp>,
}

#[account]
#[derive(InitSpace)]
pub struct Lendingdapp {
    count: u8,
}
