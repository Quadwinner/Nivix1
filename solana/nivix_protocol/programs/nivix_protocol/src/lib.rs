use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer, Mint};

declare_id!("6WapLzABgaKEBBos6NTTyNJajhe2uFZ27MUpYAwWcBzM");

#[program]
pub mod nivix_protocol {
    use super::*;

    // Initialize the payment platform
    pub fn initialize_platform(
        ctx: Context<InitializePlatform>,
        platform_name: String,
        admin_key: Pubkey,
    ) -> Result<()> {
        let platform = &mut ctx.accounts.platform;
        platform.admin = admin_key;
        platform.name = platform_name;
        platform.is_active = true;
        platform.total_transactions = 0;
        platform.supported_currencies = 0;
        platform.version = 1;
        platform.created_at = Clock::get()?.unix_timestamp;
        Ok(())
    }

    // Register a new user
    pub fn register_user(
        ctx: Context<RegisterUser>,
        username: String,
        kyc_status: bool,
        home_currency: String,
    ) -> Result<()> {
        let user = &mut ctx.accounts.user;
        let platform = &ctx.accounts.platform;

        // Ensure the platform is active
        require!(platform.is_active, ErrorCode::PlatformInactive);

        user.owner = ctx.accounts.owner.key();
        user.username = username;
        user.kyc_verified = kyc_status;
        user.home_currency = home_currency;
        user.total_sent = 0;
        user.total_received = 0;
        user.created_at = Clock::get()?.unix_timestamp;
        user.is_active = true;
        
        Ok(())
    }

    // Add a currency to the user's wallet
    pub fn add_currency(
        ctx: Context<AddCurrency>,
        currency_code: String, 
    ) -> Result<()> {
        let wallet = &mut ctx.accounts.wallet;
        let user = &ctx.accounts.user;
        
        require!(user.is_active, ErrorCode::UserInactive);
        
        wallet.owner = user.key();
        wallet.user = user.owner;
        wallet.currency_code = currency_code;
        wallet.token_mint = ctx.accounts.token_mint.key();
        wallet.token_account = ctx.accounts.token_account.key();
        wallet.balance = 0;
        wallet.created_at = Clock::get()?.unix_timestamp;
        wallet.is_active = true;
        
        Ok(())
    }

    // Process an online transfer
    pub fn process_transfer(
        ctx: Context<ProcessTransfer>,
        amount: u64,
        source_currency: String,
        destination_currency: String,
        _recipient_wallet_seed: [u8; 32],
        memo: String,
    ) -> Result<()> {
        let from_wallet = &mut ctx.accounts.from_wallet;
        let to_wallet = &mut ctx.accounts.to_wallet;
        let platform = &mut ctx.accounts.platform;
        let user = &mut ctx.accounts.user;
        
        // Check if sender has sufficient balance
        require!(from_wallet.balance >= amount, ErrorCode::InsufficientBalance);
        
        // Check if sender is KYC verified
        require!(user.kyc_verified, ErrorCode::KycRequired);
        
        // Update balances
        from_wallet.balance = from_wallet.balance.checked_sub(amount).unwrap();
        to_wallet.balance = to_wallet.balance.checked_add(amount).unwrap();
        
        // Update user stats
        user.total_sent = user.total_sent.checked_add(amount).unwrap();
        
        // Update platform stats
        platform.total_transactions = platform.total_transactions.checked_add(1).unwrap();
        
        // Handle token transfer
        let transfer_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.from_token_account.to_account_info(),
                to: ctx.accounts.to_token_account.to_account_info(),
                authority: ctx.accounts.owner.to_account_info(),
            },
        );
        
        token::transfer(transfer_ctx, amount)?;
        
        // Create transaction record
        let tx_record = &mut ctx.accounts.transaction_record;
        tx_record.from_user = user.key();
        tx_record.to_user = to_wallet.user;
        tx_record.amount = amount;
        tx_record.source_currency = source_currency;
        tx_record.destination_currency = destination_currency;
        tx_record.memo = memo;
        tx_record.timestamp = Clock::get()?.unix_timestamp;
        tx_record.status = TransactionStatus::Completed;
        
        Ok(())
    }

    // Record offline transaction for later sync
    pub fn record_offline_transaction(
        ctx: Context<RecordOfflineTransaction>,
        amount: u64,
        source_currency: String,
        destination_currency: String,
        recipient: Pubkey,
        bluetooth_tx_id: String,
        signature: [u8; 64],
        timestamp: i64,
    ) -> Result<()> {
        let offline_record = &mut ctx.accounts.offline_record;
        let user = &ctx.accounts.user;
        
        // Check if sender is KYC verified
        require!(user.kyc_verified, ErrorCode::KycRequired);
        
        // Check offline transaction limit (e.g., 500 INR or $5-10)
        require!(amount <= 500, ErrorCode::ExceedsOfflineLimit);
        
        // Record the offline transaction for later syncing
        offline_record.from_user = user.owner;
        offline_record.to_user = recipient;
        offline_record.amount = amount;
        offline_record.source_currency = source_currency;
        offline_record.destination_currency = destination_currency;
        offline_record.bluetooth_tx_id = bluetooth_tx_id;
        offline_record.signature = signature;
        offline_record.offline_timestamp = timestamp;
        offline_record.synced = false;
        offline_record.created_at = Clock::get()?.unix_timestamp;
        
        Ok(())
    }

    // Sync offline transactions
    pub fn sync_offline_transaction(
        ctx: Context<SyncOfflineTransaction>,
    ) -> Result<()> {
        let offline_record = &mut ctx.accounts.offline_record;
        let from_wallet = &mut ctx.accounts.from_wallet;
        let to_wallet = &mut ctx.accounts.to_wallet;
        
        // Verify transaction hasn't been synced already
        require!(!offline_record.synced, ErrorCode::AlreadySynced);
        
        // Check if sender has sufficient balance
        require!(
            from_wallet.balance >= offline_record.amount, 
            ErrorCode::InsufficientBalance
        );
        
        // Update balances
        from_wallet.balance = from_wallet
            .balance
            .checked_sub(offline_record.amount)
            .unwrap();
        
        to_wallet.balance = to_wallet
            .balance
            .checked_add(offline_record.amount)
            .unwrap();
        
        // Handle token transfer
        let transfer_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.from_token_account.to_account_info(),
                to: ctx.accounts.to_token_account.to_account_info(),
                authority: ctx.accounts.owner.to_account_info(),
            },
        );
        
        token::transfer(transfer_ctx, offline_record.amount)?;
        
        // Mark the offline transaction as synced
        offline_record.synced = true;
        offline_record.sync_timestamp = Clock::get()?.unix_timestamp;
        
        Ok(())
    }

    // Create a liquidity pool for currency exchange
    pub fn create_liquidity_pool(
        ctx: Context<CreateLiquidityPool>,
        pool_name: String,
        source_currency: String,
        destination_currency: String,
        initial_exchange_rate: u64,
    ) -> Result<()> {
        let pool = &mut ctx.accounts.liquidity_pool;
        let platform = &ctx.accounts.platform;
        
        // Ensure only admin can create pools
        require!(
            platform.admin == ctx.accounts.admin.key(),
            ErrorCode::AdminRequired
        );
        
        pool.name = pool_name;
        pool.admin = ctx.accounts.admin.key();
        pool.source_currency = source_currency;
        pool.destination_currency = destination_currency;
        pool.source_mint = ctx.accounts.source_mint.key();
        pool.destination_mint = ctx.accounts.destination_mint.key();
        pool.exchange_rate = initial_exchange_rate;
        pool.total_swapped = 0;
        pool.is_active = true;
        pool.created_at = Clock::get()?.unix_timestamp;
        
        Ok(())
    }

    // Swap between currencies using a liquidity pool
    pub fn swap_currencies(
        ctx: Context<SwapCurrencies>,
        amount_in: u64,
        minimum_amount_out: u64,
    ) -> Result<()> {
        let pool = &mut ctx.accounts.liquidity_pool;
        let user = &ctx.accounts.user;
        
        // Verify KYC status
        require!(user.kyc_verified, ErrorCode::KycRequired);
        
        // Verify the pool is active
        require!(pool.is_active, ErrorCode::PoolInactive);
        
        // Calculate the exchange amount based on the current rate
        let amount_out = (amount_in as u128)
            .checked_mul(pool.exchange_rate as u128)
            .unwrap()
            .checked_div(10_000)
            .unwrap() as u64;
        
        // Verify the minimum amount is satisfied
        require!(
            amount_out >= minimum_amount_out,
            ErrorCode::SlippageExceeded
        );
        
        // Execute the token transfers
        // Source token transfer
        let source_transfer_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.user_source_account.to_account_info(),
                to: ctx.accounts.pool_source_account.to_account_info(),
                authority: ctx.accounts.owner.to_account_info(),
            },
        );
        
        token::transfer(source_transfer_ctx, amount_in)?;
        
        // Destination token transfer
        let dest_transfer_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.pool_destination_account.to_account_info(),
                to: ctx.accounts.user_destination_account.to_account_info(),
                authority: ctx.accounts.pool_authority.to_account_info(),
            },
        );
        
        token::transfer(dest_transfer_ctx, amount_out)?;
        
        // Update pool stats
        pool.total_swapped = pool.total_swapped.checked_add(amount_in).unwrap();
        
        Ok(())
    }

    // Update exchange rate in a liquidity pool (admin only)
    pub fn update_exchange_rate(
        ctx: Context<UpdateExchangeRate>,
        new_rate: u64,
    ) -> Result<()> {
        let pool = &mut ctx.accounts.liquidity_pool;
        
        // Verify admin authority
        require!(
            pool.admin == ctx.accounts.admin.key(),
            ErrorCode::AdminRequired
        );
        
        // Update the exchange rate
        pool.exchange_rate = new_rate;
        
        Ok(())
    }
}

// Account Structures

#[derive(Accounts)]
pub struct InitializePlatform<'info> {
    #[account(init, payer = payer, space = 8 + Platform::SPACE)]
    pub platform: Account<'info, Platform>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RegisterUser<'info> {
    #[account(mut)]
    pub platform: Account<'info, Platform>,
    #[account(init, payer = payer, space = 8 + User::SPACE)]
    pub user: Account<'info, User>,
    pub owner: Signer<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AddCurrency<'info> {
    #[account(mut, has_one = owner)]
    pub user: Account<'info, User>,
    #[account(init, payer = payer, space = 8 + Wallet::SPACE)]
    pub wallet: Account<'info, Wallet>,
    pub token_mint: Account<'info, Mint>,
    #[account(
        constraint = token_account.mint == token_mint.key(),
        constraint = token_account.owner == user.owner
    )]
    pub token_account: Account<'info, TokenAccount>,
    pub owner: Signer<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ProcessTransfer<'info> {
    #[account(mut)]
    pub platform: Account<'info, Platform>,
    #[account(mut, has_one = owner)]
    pub user: Account<'info, User>,
    #[account(mut, has_one = owner)]
    pub from_wallet: Account<'info, Wallet>,
    #[account(mut)]
    pub to_wallet: Account<'info, Wallet>,
    #[account(
        mut,
        constraint = from_token_account.mint == from_wallet.token_mint,
        constraint = from_token_account.owner == from_wallet.user
    )]
    pub from_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = to_token_account.mint == to_wallet.token_mint,
        constraint = to_token_account.owner == to_wallet.user
    )]
    pub to_token_account: Account<'info, TokenAccount>,
    #[account(init, payer = payer, space = 8 + TransactionRecord::SPACE)]
    pub transaction_record: Account<'info, TransactionRecord>,
    pub owner: Signer<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct RecordOfflineTransaction<'info> {
    #[account(mut, has_one = owner)]
    pub user: Account<'info, User>,
    #[account(init, payer = payer, space = 8 + OfflineTransaction::SPACE)]
    pub offline_record: Account<'info, OfflineTransaction>,
    pub owner: Signer<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SyncOfflineTransaction<'info> {
    #[account(mut)]
    pub offline_record: Account<'info, OfflineTransaction>,
    #[account(
        mut, 
        constraint = from_wallet.user == offline_record.from_user
    )]
    pub from_wallet: Account<'info, Wallet>,
    #[account(
        mut, 
        constraint = to_wallet.user == offline_record.to_user
    )]
    pub to_wallet: Account<'info, Wallet>,
    #[account(
        mut,
        constraint = from_token_account.mint == from_wallet.token_mint,
        constraint = from_token_account.owner == from_wallet.user
    )]
    pub from_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = to_token_account.mint == to_wallet.token_mint,
        constraint = to_token_account.owner == to_wallet.user
    )]
    pub to_token_account: Account<'info, TokenAccount>,
    #[account(
        constraint = owner.key() == from_wallet.user, 
    )]
    pub owner: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct CreateLiquidityPool<'info> {
    #[account(mut)]
    pub platform: Account<'info, Platform>,
    #[account(init, payer = payer, space = 8 + LiquidityPool::SPACE)]
    pub liquidity_pool: Account<'info, LiquidityPool>,
    pub source_mint: Account<'info, Mint>,
    pub destination_mint: Account<'info, Mint>,
    #[account(constraint = admin.key() == platform.admin)]
    pub admin: Signer<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SwapCurrencies<'info> {
    #[account(mut)]
    pub liquidity_pool: Account<'info, LiquidityPool>,
    #[account(mut)]
    pub user: Account<'info, User>,
    #[account(mut)]
    pub user_source_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub user_destination_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = pool_source_account.mint == liquidity_pool.source_mint
    )]
    pub pool_source_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = pool_destination_account.mint == liquidity_pool.destination_mint
    )]
    pub pool_destination_account: Account<'info, TokenAccount>,
    /// The authority that can sign for the pool accounts
    pub pool_authority: Signer<'info>,
    /// The user that owns the source funds
    pub owner: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct UpdateExchangeRate<'info> {
    #[account(mut)]
    pub liquidity_pool: Account<'info, LiquidityPool>,
    #[account(constraint = admin.key() == liquidity_pool.admin)]
    pub admin: Signer<'info>,
}

// Account Definitions

#[account]
pub struct Platform {
    pub admin: Pubkey,
    pub name: String,
    pub is_active: bool,
    pub total_transactions: u64,
    pub supported_currencies: u8,
    pub version: u8,
    pub created_at: i64,
}

impl Platform {
    pub const SPACE: usize = 32 + // admin pubkey
                             64 + // name string (max)
                             1 +  // is_active
                             8 +  // total_transactions
                             1 +  // supported_currencies
                             1 +  // version
                             8;   // created_at timestamp
}

#[account]
pub struct User {
    pub owner: Pubkey,
    pub username: String,
    pub kyc_verified: bool,
    pub home_currency: String,
    pub total_sent: u64,
    pub total_received: u64,
    pub created_at: i64,
    pub is_active: bool,
}

impl User {
    pub const SPACE: usize = 32 +  // owner pubkey
                             64 +  // username string (max)
                             1 +   // kyc_verified
                             8 +   // home_currency string (max)
                             8 +   // total_sent
                             8 +   // total_received
                             8 +   // created_at timestamp
                             1;    // is_active
}

#[account]
pub struct Wallet {
    pub owner: Pubkey,       // User PDA
    pub user: Pubkey,        // User wallet address
    pub currency_code: String,
    pub token_mint: Pubkey,
    pub token_account: Pubkey,
    pub balance: u64,
    pub created_at: i64,
    pub is_active: bool,
}

impl Wallet {
    pub const SPACE: usize = 32 +  // owner pubkey
                             32 +  // user pubkey
                             8 +   // currency_code string (max)
                             32 +  // token_mint pubkey
                             32 +  // token_account pubkey
                             8 +   // balance
                             8 +   // created_at timestamp
                             1;    // is_active
}

#[account]
pub struct TransactionRecord {
    pub from_user: Pubkey,
    pub to_user: Pubkey,
    pub amount: u64,
    pub source_currency: String,
    pub destination_currency: String,
    pub memo: String,
    pub timestamp: i64,
    pub status: TransactionStatus,
}

impl TransactionRecord {
    pub const SPACE: usize = 32 +  // from_user pubkey
                             32 +  // to_user pubkey
                             8 +   // amount
                             8 +   // source_currency string (max)
                             8 +   // destination_currency string (max)
                             128 + // memo string (max)
                             8 +   // timestamp
                             1;    // status
}

#[account]
pub struct OfflineTransaction {
    pub from_user: Pubkey,
    pub to_user: Pubkey,
    pub amount: u64,
    pub source_currency: String,
    pub destination_currency: String,
    pub bluetooth_tx_id: String,
    pub signature: [u8; 64],
    pub offline_timestamp: i64,
    pub synced: bool,
    pub sync_timestamp: i64,
    pub created_at: i64,
}

impl OfflineTransaction {
    pub const SPACE: usize = 32 +  // from_user pubkey
                             32 +  // to_user pubkey
                             8 +   // amount
                             8 +   // source_currency string (max)
                             8 +   // destination_currency string (max)
                             64 +  // bluetooth_tx_id string (max)
                             64 +  // signature
                             8 +   // offline_timestamp
                             1 +   // synced
                             8 +   // sync_timestamp
                             8;    // created_at timestamp
}

#[account]
pub struct LiquidityPool {
    pub name: String,
    pub admin: Pubkey,
    pub source_currency: String,
    pub destination_currency: String,
    pub source_mint: Pubkey,
    pub destination_mint: Pubkey,
    pub exchange_rate: u64,     // Scaled by 10,000 (e.g., 1 USD = 83.25 INR would be 832500)
    pub total_swapped: u64,
    pub is_active: bool,
    pub created_at: i64,
}

impl LiquidityPool {
    pub const SPACE: usize = 64 +  // name string (max)
                             32 +  // admin pubkey
                             8 +   // source_currency string (max)
                             8 +   // destination_currency string (max)
                             32 +  // source_mint pubkey
                             32 +  // destination_mint pubkey
                             8 +   // exchange_rate
                             8 +   // total_swapped
                             1 +   // is_active
                             8;    // created_at timestamp
}

// Enums

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum TransactionStatus {
    Pending,
    Completed,
    Failed,
    Cancelled,
}

// Error Codes

#[error_code]
pub enum ErrorCode {
    #[msg("Insufficient balance for this operation")]
    InsufficientBalance,
    #[msg("KYC verification is required for this operation")]
    KycRequired,
    #[msg("The platform is currently inactive")]
    PlatformInactive,
    #[msg("The user account is inactive")]
    UserInactive,
    #[msg("Only the admin can perform this operation")]
    AdminRequired,
    #[msg("Offline transaction amount exceeds the limit")]
    ExceedsOfflineLimit,
    #[msg("This offline transaction has already been synced")]
    AlreadySynced,
    #[msg("The liquidity pool is inactive")]
    PoolInactive,
    #[msg("Slippage tolerance exceeded")]
    SlippageExceeded,
}
