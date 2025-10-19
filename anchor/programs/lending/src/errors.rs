use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("User has not deposited enough tokens to withdraw")]
    InsufficientFunds,

    #[msg("Requested amount to borrow is greater than the borrowable amount")]
    OverBorrowableAmount,

    #[msg("User has not borrowed enough tokens to repay")]
    OverRepay,

    #[msg("User's account is not unhealthy")]
    AccountNotUnhealthy,
}
