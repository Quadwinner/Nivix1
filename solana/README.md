# Nivix Protocol - Solana Implementation

This directory contains the Solana smart contracts for the Nivix payment platform, implemented using the Anchor framework.

## Features

- **Liquidity Pools**: Create and manage liquidity pools for cross-border payments
- **Fast Payments**: Process payments between users with low latency
- **Offline Transactions**: Support for offline transaction processing
- **Transaction Records**: Maintain records of all transactions for compliance

## Project Structure

- `nivix_protocol/`: Anchor project for the Nivix protocol
  - `programs/nivix_protocol/`: Smart contract code
  - `tests/`: Tests for the smart contract

## Setup Instructions

1. Install Solana and Anchor:
   ```bash
   sh -c "$(curl -sSfL https://release.solana.com/v1.16.0/install)"
   cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
   avm install latest
   avm use latest
   ```

2. Build the project:
   ```bash
   cd nivix_protocol
   anchor build
   ```

3. Run tests:
   ```bash
   anchor test
   ```

## Smart Contract Overview

The Nivix protocol smart contract includes the following main functionalities:

1. **Liquidity Pool Management**
   - Initialize liquidity pools
   - Add liquidity to pools
   - Track liquidity providers

2. **Payment Processing**
   - Process direct payments between users
   - Record payment details for compliance

3. **Offline Transaction Support**
   - Register transactions for offline processing
   - Settle offline transactions when connectivity is restored

## Integration with Hyperledger Fabric

The Solana implementation focuses on fast payment processing, while the Hyperledger Fabric implementation handles KYC/AML data and compliance. The two blockchains are integrated through the bridge service. 