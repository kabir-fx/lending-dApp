# Lending Protocol dApp

A decentralized lending protocol built on Solana, enabling users to deposit assets to earn interest and borrow against their collateral. Built with modern web technologies and Anchor framework.

## 🚀 Features

- **🏦 Multi-Asset Lending**: Support for SOL and USDC tokens
- **💰 Earn Interest**: Deposit tokens to earn yields from borrowers
- **🏗️ Decentralized**: Fully on-chain lending protocol using Anchor
- **🔒 Secure**: Built with Anchor's security best practices
- **📱 Modern UI**: Clean, responsive interface with wallet integration
- **⚡ Real-time**: Live price feeds via Pyth Network
- **🔄 Borrowing & Liquidation**: Full lending protocol with risk management

## 🛠️ Tech Stack

- **Backend**: [Anchor](https://www.anchor-lang.com/) - Solana's framework for Solana programs
- **Frontend**: [Next.js 15](https://nextjs.org/) with [React 19](https://react.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + [Shadcn UI](https://ui.shadcn.com/)
- **Solana SDK**: [Gill](https://gill.site/) - Type-safe Solana SDK
- **Wallet**: [Wallet UI](https://registry.wallet-ui.dev) components
- **Code Generation**: [Codama](https://github.com/codama-idl/codama) for IDL-to-TypeScript
- **Price Feeds**: [Pyth Network](https://pyth.network/) for real-time asset prices

## 📋 Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [Rust](https://rustup.rs/) (latest stable)
- [Solana CLI](https://docs.solana.com/cli/install-solana-cli-tools)
- [Anchor Framework](https://www.anchor-lang.com/docs/installation)

## 🚀 Quick Start

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/kabir-fx/lending-dApp.git

# Install dependencies
npm install
```

### 2. Setup Development Environment

```bash
# Initialize Anchor program and generate client SDK
npm run setup
```

### 3. Start Local Development

```bash
# Terminal 1: Set the CLI to localnet
solana config set --url http://localhost:8899

# Terminal 1: Start Solana localnet
solana-test-validator                                       

# Terminal 2: Builf the Anchor program 
npm run anchor build

# Terminal 2: Deploy the Anchor program
npm run anchor deploy

# [OPTIONAL] Terminal 2: Setup banks with initial liquidity 
npm run faucet [your_wallet_address]

# Terminal 3: Start the web app
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to access the dApp.

## 📖 Usage Guide

### For Users

1. **Connect Wallet**: Click "Connect Wallet" and select your preferred Solana wallet
2. **Setup Protocol**: If it's your first time, click "Setup Lending Protocol" to initialize banks
3. **Initialize Account**: Create your lending account
4. **Deposit Assets**: Add SOL or USDC to start earning interest
5. **Withdraw Assets**: Remove your deposited tokens anytime
6. **Borrow Assets**: Use your deposits as collateral to borrow (coming soon)

### Core Contracts

- **Bank**: Manages asset pools, interest rates, and risk parameters
- **User Account**: Tracks individual user positions and balances
- **Price Feeds**: Pyth Network integration for accurate valuations

### Key Features

- **Liquidation Threshold**: 80% - Position health monitoring
- **Max LTV**: 70% - Maximum borrowable amount
- **Interest Accrual**: Automatic interest calculation
- **Risk Management**: Built-in liquidation mechanisms

### Supported Assets

- **SOL**: Native Solana token
- **USDC**: USD stablecoin

## 🔧 Configuration

### Program IDs

Program addresses are automatically read from the IDL file, ensuring consistency across deployments.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes
4. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

This is a demo lending protocol for educational purposes. Not intended for production use without thorough security audits and testing.

## 🆘 Support

- [Anchor Documentation](https://www.anchor-lang.com/docs/)
- [Solana Documentation](https://docs.solana.com/)
- [Gill SDK Documentation](https://gill.site/)
- [Pyth Network Docs](https://docs.pyth.network/)