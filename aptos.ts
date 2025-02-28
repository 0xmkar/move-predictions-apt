// aptosUtils.ts
import { 
  Account, 
  Aptos, 
  AptosConfig, 
  Network, 
  Ed25519PrivateKey, 
  ViewPayload, 
  TransactionPayload 
} from "@aptos-labs/ts-sdk";
import dotenv from "dotenv";

dotenv.config();

// Create a common configuration
const config = new AptosConfig({
  network: Network.CUSTOM,
  fullnode: "https://aptos.testnet.porto.movementlabs.xyz/v1",
  faucet: "https://fund.testnet.porto.movementlabs.xyz/",
});

// Initialize the Aptos client
const aptos = new Aptos(config);

/**
 * Returns the Aptos client instance.
 */
export function getAptosClient(): Aptos {
  return aptos;
}

/**
 * Creates and returns an Account using the PRIVATE_KEY in your .env file.
 * Throws an error if PRIVATE_KEY is not set.
 */
export function createAccount(): Account {
  const privateKeyHex = process.env.PRIVATE_KEY;
  if (!privateKeyHex) {
    throw new Error("PRIVATE_KEY is not defined in your environment variables.");
  }
  const privateKey = new Ed25519PrivateKey(privateKeyHex);
  return Account.fromPrivateKey({ privateKey });
}

/**
 * Calls a view function on the Aptos blockchain.
 * @param func - The fully qualified Move function name (e.g. "0x1::message::get_message")
 * @param args - The function arguments
 * @returns The result of the view call.
 */
export async function viewMoveFunction(func: string, args: any[]): Promise<any> {
  const payload: ViewPayload = {
    function: func,
    functionArguments: args,
  };

  return await aptos.view({ payload });
}

/**
 * Builds, signs, submits, and waits for a transaction.
 * @param account - The account sending the transaction.
 * @param func - The fully qualified Move function name (e.g. "0x1::message::set_message")
 * @param args - The function arguments for the transaction.
 * @returns The response from waitForTransaction.
 */
export async function buildAndSubmitTransaction(
  account: Account,
  func: string,
  args: any[]
): Promise<any> {
  // Use the account's address as sender.
  const sender = account.address().toString();

  // Build the transaction payload
  const transaction = await aptos.transaction.build.simple({
    sender: sender,
    data: {
      function: func,
      functionArguments: args,
    } as TransactionPayload,
  });

  // Sign the transaction
  const signature = aptos.transaction.sign({
    signer: account,
    transaction,
  });

  // Submit the transaction and wait for its completion
  const committedTxn = await aptos.transaction.submit.simple({
    transaction,
    senderAuthenticator: signature,
  });

  return await aptos.waitForTransaction({ transactionHash: committedTxn.hash });
}
