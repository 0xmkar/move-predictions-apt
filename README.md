# Accountability Bot

## Overview

<!-- Deployed contract on localnet     "9b1a90fa877964092ba05890fcb1998a3426b72f3bface15d336b6388cae2cf7::main" -->

Accountability Bot is a decentralized accountability platform built on Safe Smart Accounts. It enables users to stake money towards personal or group goals, ensuring commitment through financial incentives. Users can participate in challenges like weight loss, work goals, and marathons, with funds being distributed based on completion.

**Lit Protocol’s PKP** system ensures security through a distributed key management approach. Instead of storing private keys in a single location, PKPs are managed across a decentralized network of nodes using cryptography.
We have used the Lit protocol’s PKP to store the private keys of challenge’s wallet addresses so that not even the challengers can access after deploying it

## Features

- **Discord Integration:** Users interact through a familiar Discord bot interface.
- **Secure Staking:** Participants deposit funds in USDC.
- **Trustless Verification:** Results are verified by other members.
- **Fair Distribution:** Winners redeem funds while non-completers forfeit.
- **Group and Individual Bets:** Create or join accountability challenges with friends or organizations.

## How It Works

1. **Create a Bet:** A user sets up a challenge with rules and deposit amount.
2. **Join a Bet:** Participants stake USDC by sending a deposit transaction.
3. **Verify Participation:** Users confirm their deposit via transaction hash.
4. **Track Progress:** The challenge runs for a specified period.
5. **Submit Results:** Participants submit proof of completion.
6. **Validate Results:** Other members verify and approve valid submissions.
7. **Distribute Funds:** Winners redeem their share; forfeited funds are split among completers.

## Technology Stack

- **Smart Accounts:** Powered by Safe Protocol
- **Blockchain:** USDC transactions for secure deposits
- **Backend:** Node.js with PostgreSQL
- **Frontend:** Discord Bot Interface

## Setup & Installation

1. Clone the repository:
   ```sh
   git clone https://github.com/your-repo/accountability-bot.git
   cd accountability-bot
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. Run the bot:
   ```sh
   npm tsx bot.ts
   ```

### Commands

| Command                                         | Description                                            |
| ----------------------------------------------- | ------------------------------------------------------ |
| **`/start_bet`**                                | Starts a new bet.                                      |
| **`/join_bet <bet_id>`**                        | Joins an existing bet.                                 |
| **`/verify_payment <bet_id> <tx_hash>`**        | Verifies the deposit transaction.                      |
| **`/submit_result <bet_id>`**                   | Submits the result of a bet.                           |
| **`/validate_result <bet_id> <user> <yes/no>`** | Validates another participant's result.                |
| **`/redeem <bet_id>`**                          | Redeems winnings after bet completion.                 |
| **`/list_bets`**                                | Lists all active bets.                                 |
| **`/bet_info <bet_id>`**                        | Shows details of a specific bet.                       |
| **`/end_bet <bet_id>`**                         | Ends a bet and triggers the distribution phase.        |
| **`/register <wallet_address>`**                | Links a user's Discord account to their crypto wallet. |

## Roadmap

- AI-based validation of proof submissions
- Mobile app integration
- Multi-chain support for deposits

## License

This project is licensed under the MIT License.
