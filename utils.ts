import { CommandInteraction, PermissionFlagsBits } from 'discord.js';
import { createPublicClient, http, Address, Hash, parseEventLogs, parseAbi } from 'viem';
import { sepolia } from 'viem/chains';
import {
  createSafeClient,
} from '@safe-global/sdk-starter-kit';

const ABI = [{"inputs":[{"internalType":"address","name":"_singleton","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"stateMutability":"payable","type":"fallback"}];
const RPC_URL = `https://sepolia.infura.io/v3/${process.env.INFURA_API_KEY}`;
const USDC_ADDRESS: Address = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238';
const ERC20_ABI = parseAbi(['event Transfer(address indexed from, address indexed to, uint256 value)']);


export function isValidEthereumAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
}

export const isAdmin = (interaction: CommandInteraction): boolean => {
    return interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) ?? false;
};

export async function verifyUSDCTransfer(
  txHash: Hash,
  expectedSender: Address,
  expectedReceiver: Address,
  expectedAmount: bigint
): Promise<boolean> {
  const client = createPublicClient({
    chain: sepolia,
    transport: http(`https://sepolia.infura.io/v3/${process.env.INFURA_API_KEY}`)
  });
  try {
    // Fetch transaction receipt (ERC-20 transfers are in logs, not in transaction details)
    const receipt = await client.getTransactionReceipt({ hash: txHash });

    if (!receipt) {
      console.log('Transaction receipt not found.');
      return false;
    }

    // Parse event logs for Transfer events from the USDC contract
    const transferLogs = parseEventLogs({
      abi: ERC20_ABI,
      logs: receipt.logs,
      eventName: 'Transfer'
    });

    // Find a matching transfer event
    for (const log of transferLogs) {
      if (
        log.address.toLowerCase() === USDC_ADDRESS.toLowerCase() && // Must be from USDC contract
        log.args.from.toLowerCase() === expectedSender.toLowerCase() &&
        log.args.to.toLowerCase() === expectedReceiver.toLowerCase() &&
        log.args.value === expectedAmount
      ) {
        console.log('USDC Transfer verified successfully!');
        return true;
      }
    }

    console.log('USDC Transfer verification failed!');
    return false;
  } catch (error) {
    console.error('Error verifying USDC transfer:', error);
    return false;
  }
}

export const addOwner = async (safeAddress: string = "0x53b2b1795ed7C16C7956c86a131F3B546D668d1d", newOwner: string) =>{

	const safeClient = await createSafeClient({
		provider: RPC_URL,
		signer: process.env.PRIVATE_KEY,
		safeAddress: '0x53b2b1795ed7C16C7956c86a131F3B546D668d1d',
	});
	console.log("safe Cleint - ", safeClient);
  const transaction = await safeClient.createAddOwnerTransaction({
    ownerAddress: '0x...',
    threshold: 2
  })

  const txResult = await safeClient.send({
    transactions: [transaction]
  })
  
  console.log(await txResult);
};


import { AptosClient, Types } from "aptos";

export async function verifyAptosTransfer(
    txHash: string, 
    sender: string, 
    receiver: string, 
    amount: number
): Promise<boolean> {
    try {
        // Initialize Aptos client with testnet URL
        const client = new AptosClient("https://testnet.aptoslabs.com");
        
        // Fetch transaction details
        const txDetails = await client.getTransactionByHash(txHash);
        
        // Verify the transaction was successful
        if (txDetails.success !== true) {
            console.log("Transaction failed on chain");
            return false;
        }
        
        // Check if this is a user transaction
        if (txDetails.type !== "user_transaction") {
            console.log("Not a user transaction");
            return false;
        }

        // For debugging - log the full transaction details
        console.log("Transaction details:", JSON.stringify(txDetails, null, 2));
        
        // Access the payload correctly
        const payload = txDetails.payload;
        
        // Check if it's an entry function payload
        if (payload.type !== "entry_function_payload") {
            console.log("Not an entry function payload");
            return false;
        }
        
        // Check if it's a coin transfer - the full function name includes module
        // It should be something like "0x1::coin::transfer" or similar
        const functionName = payload.function;
        if (!functionName.includes("::coin::transfer")) {
            console.log(`Not a coin transfer transaction. Function: ${functionName}`);
            return false;
        }
        
        // Verify sender address (already in the type check above, but double-checking)
        if (txDetails.sender.toLowerCase() !== sender.toLowerCase()) {
            console.log("Sender address mismatch");
            return false;
        }
        
        // Extract arguments from the payload
        const args = payload.arguments;
        if (args.length < 2) {
            console.log("Invalid arguments in transaction");
            return false;
        }
        
        // The arguments format can vary based on the exact coin transfer function
        // Let's log them to better understand their structure
        console.log("Transaction arguments:", args);
        
        // You may need to adjust these checks based on the actual argument structure
        // For the standard 0x1::coin::transfer function, the first argument is typically the recipient
        if (args[0].toLowerCase() !== receiver.toLowerCase()) {
            console.log(`Receiver address mismatch: expected ${receiver}, got ${args[0]}`);
            return false;
        }
        
        // And the second argument is typically the amount
        const transferAmount = Number(args[1]);
        if (transferAmount !== amount) {
            console.log(`Amount mismatch: expected ${amount}, got ${transferAmount}`);
            return false;
        }
        
        // If all checks pass, return true
        return true;
    } catch (error) {
        console.error("Error verifying Aptos transaction:", error);
        return false;
    }
}