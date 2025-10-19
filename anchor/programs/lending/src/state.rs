use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct User {
    pub owner: Pubkey,

    // TODO: use a more robust approach to store currencies
    pub deposited_sol: u64,
    pub deposited_sol_shares: u64,
    pub borrowed_sol: u64,
    pub borrowed_sol_shares: u64,

    pub deposited_usdc: u64,
    pub deposited_usdc_shares: u64,
    pub borrowed_usdc: u64,
    pub borrowed_usdc_shares: u64,

    pub usdc_address: Pubkey,

    pub last_updated: i64,
}

/// Since there will be a bank for each asset on the lending protocol - we need to keep it's state after intialization
#[account]
#[derive(InitSpace)]
pub struct Bank {
    pub authority: Pubkey,
    /// The mint address of the asset. Mint is a spl token program used to create the asset.
    pub mint_address: Pubkey,
    /// The total amount of deposits in the bank.
    pub total_deposits: u64,
    /// The total amount of deposits shares in the bank.
    pub total_deposits_shares: u64,
    /// The total amount of borrows in the bank.
    pub total_borrows: u64,
    /// The total amount of borrows shares in the bank.
    pub total_borrows_shares: u64,

    /// Since all the accounts in the protocal can be liquidated, we need all these constants to calculate whether an account is healthy or not.
    ///
    /// Loan to value at which a loan is defined as under-collateralized and can be liquidated.
    pub liquidation_threshold: u64,
    /// % of bonus that will be given to the liquidator as bonus for processing the liquidation.
    pub liquidation_bonus: u64,
    /// % of collateral that can be liquidated
    pub liquidation_close_factor: u64,
    /// Maximum percentage of collateral that can be borrowed for a specific asset. Collateral is the asset that is used to secure the loan
    pub max_ltv: u64,

    pub interest_rate: u64,

    pub last_updated: i64,
}
