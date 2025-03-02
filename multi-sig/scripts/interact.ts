import {
  Account,
  AccountAddress,
  Aptos,
  AptosConfig,
  Ed25519Account,
  Ed25519PrivateKey,
  Ed25519Signature,
  InputViewFunctionData,
  Network,
  Serializable,
  Serializer,
} from "@aptos-labs/ts-sdk";
import { aw } from "@aptos-labs/ts-sdk/dist/common/accountAddress-DnSqjhSl";
import sha256 from "fast-sha256";

const MODULE_ADDRESS = "0x1";
const MODULE_NAME = "main";

const config = new AptosConfig({ network: Network.DEVNET });
const aptos = new Aptos(config);

function hexToUint8Array(hex: string): Uint8Array {
  if (hex.startsWith("0x")) {
    hex = hex.slice(2);
  }
  const length = hex.length / 2;
  const array = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    array[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return array;
}

export class Uint64 extends Serializable {
  constructor(public value: bigint) {
    super();
  }

  serialize(serializer: Serializer): void {
    serializer.serializeU64(this.value);
  }
}

export class MessageMoveStruct extends Serializable {
  constructor(public name: string, public age: Uint64, public gender: string) {
    super();
  }

  serialize(serializer: Serializer): void {
    serializer.serializeStr(this.name);
    serializer.serialize(this.age);
    serializer.serializeStr(this.gender);
  }
}

export async function signMessage(
  privateKey: Ed25519PrivateKey,
  messageHash: Uint8Array
): Promise<Ed25519Signature> {
  const signature = await privateKey.sign(messageHash);
  return signature;
}

export async function add_public_key(
  moduleOwner: Ed25519Account,
  public_keys: Uint8Array[]
) {
  let txn = await aptos.transaction.build.simple({
    sender: moduleOwner.accountAddress,
    data: {
      function: `${MODULE_ADDRESS}::${MODULE_NAME}::add_public_key`,
      functionArguments: [[public_keys]],
    },
  });

  let signTxn = await aptos.transaction.signAndSubmitTransaction({
    signer: moduleOwner,
    transaction: txn,
  });

  let commitedTxnHash = await aptos.transaction.waitForTransaction({
    transactionHash: signTxn.hash,
  });

  console.log(commitedTxnHash.hash);
}

export async function verify_multiple_signatures(
  moduleOwnerAddress: AccountAddress,
  messageHash: Uint8Array,
  signatures: Uint8Array[]
) {
  const payload: InputViewFunctionData = {
    function: `${MODULE_ADDRESS}::${MODULE_NAME}::verify_multiple_signatures`,
    functionArguments: [moduleOwnerAddress, messageHash, signatures],
  };

  const data = await aptos.view({ payload });

  if (data[0]) {
    console.log("Signatures Verified!!!");
  } else {
    console.log("Signatures Not Verified!!!");
  }
}

export async function verify_signature(
  messageHash: Uint8Array,
  signature: Uint8Array,
  publicKey: Uint8Array,
  data: number
) {
  const payload: InputViewFunctionData = {
    function: `${MODULE_ADDRESS}::${MODULE_NAME}::verify_signature`,
    functionArguments: [messageHash, signature, publicKey, data],
  };

  const result = await aptos.view({ payload });

  if (result[0]) {
    console.log("Signatures Verified!!!");
  } else {
    console.log("Signatures Not Verified!!!");
  }
}

export async function multi_sig_trans(
  Account1: Ed25519Account,
  Account2: Ed25519Account,
  Account3: Ed25519Account,
  data: number
) {
  const transaction = await aptos.transaction.build.multiAgent({
    sender: Account1.accountAddress,
    secondarySignerAddresses: [
      Account2.accountAddress,
      Account3.accountAddress,
    ],
    data: {
      function: `${MODULE_ADDRESS}::${MODULE_NAME}::multi_sig_trans`,
      functionArguments: [data],
    },
  });

  let Account1SignTransaction = aptos.transaction.sign({
    signer: Account1,
    transaction,
  });

  let Account2SignTransaction = aptos.transaction.sign({
    signer: Account2,
    transaction,
  });

  let Account3SignTransaction = aptos.transaction.sign({
    signer: Account3,
    transaction,
  });

  const commitedTxnHash = await aptos.transaction.submit.multiAgent({
    transaction,
    senderAuthenticator: Account1SignTransaction,
    additionalSignersAuthenticators: [
      Account2SignTransaction,
      Account3SignTransaction,
    ],
  });

  const executedTransaction = await aptos.waitForTransaction({
    transactionHash: commitedTxnHash.hash,
  });
  console.log("Transaction Hash: ", executedTransaction);
}

let ownerPrivateKey = new Ed25519PrivateKey(
  hexToUint8Array(
    "0xb8abdd481d310da548fc233510baec082733f1b91ef6d429d268ef362e2bb3e1"
  )
);
const moduleOwner = Account.fromPrivateKey({ privateKey: ownerPrivateKey });

let addr1PrivateKey = new Ed25519PrivateKey(
  hexToUint8Array(
    "0x1f07988fb0965abc9ff283776270e539b769deba1580eed0bc645fb82d8484c3"
  )
);
const addr1Account = Account.fromPrivateKey({ privateKey: addr1PrivateKey });

let addr2PrivateKey = new Ed25519PrivateKey(
  hexToUint8Array(
    "0x91e94fef1ab3572cc547e51b0f574f3b674  07310c14ddfe1d332f0f538d862e6"
  )
);
const addr2Account = Account.fromPrivateKey({ privateKey: addr2PrivateKey });

async function main() {
  console.log("This Program helps you to interact with the deployed Contract.");

  console.log("\n == Addresses pf the Account. == \n");

  console.log("Address of owner: ", moduleOwner.accountAddress.toString());
  console.log("Address of Account1: ", addr1Account.accountAddress.toString());
  console.log("Address of Account2: ", addr2Account.accountAddress.toString());

  let message = new MessageMoveStruct(
    "Rudresh Koranne",
    new Uint64(BigInt(21)),
    "You can Change these field as per your choice."
  );
  let msg_bytes = message.bcsToBytes();
  let msg_hash = sha256(msg_bytes);

  let moduleOwnerSignature = await signMessage(
    moduleOwner.privateKey,
    msg_hash
  );

  let addr1AccSignature = await signMessage(addr1Account.privateKey, msg_hash);

  let addr2AccSignature = await signMessage(addr2Account.privateKey, msg_hash);

  console.log("\n == Invoking Contract's Method. == \n");
}

main()
  .then(() => console.log("Main Executed Succesfully."))
  .catch((err) => console.log("Error: ", err));
