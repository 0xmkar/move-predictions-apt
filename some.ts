// https://metamask.app.link/send/{contract_address}?value={amount}&asset={token_symbol}&to={recipient_address}
import { createPublicClient, http, Address, Hash, parseEventLogs, parseAbi } from 'viem';
import { sepolia } from 'viem/chains';

const RPC_URL = `https://sepolia.infura.io/v3/${process.env.INFURA_API_KEY}`;
const usdcAmount = 1_000_000n;
const USDC_ADDRESS: Address = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238';
const ERC20_ABI = parseAbi(['event Transfer(address indexed from, address indexed to, uint256 value)']);


async function send() {
    const safeAddress = '0x53b2b1795ed7C16C7956c86a131F3B546D668d1d';
    console.log('-Safe Address:', safeAddress)

    const deepLink = `ethereum:${safeAddress}@1/transfer?value=1000000&token=${USDC_ADDRESS}`
    console.log(deepLink);

    // await message.reply(`Click here to pay 1 USDC: ${deepLink}`)
}

// send();


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

// Example usage
(async () => {
  const txHash: Hash = '0x0bf4001ec740278e9656401ad606db1527bdbba31de5a4fc12bb26f6e7a7785f';
  const sender: Address = '0x7e41530294092d856F3899Dd87A5756e00da1e7a';
  const receiver: Address = '0x53b2b1795ed7C16C7956c86a131F3B546D668d1d';
  const amount: bigint = BigInt('1000000'); // 1 USDC

  const isValid = await verifyUSDCTransfer(txHash, sender, receiver, amount);
  console.log('Is transaction valid?', isValid);
})();