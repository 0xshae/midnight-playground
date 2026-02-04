import * as readline from "readline/promises";
import { pathToFileURL } from "node:url";
import * as path from "path";
import * as fs from "fs";
import * as Rx from "rxjs";
import * as bip39 from "bip39";
import { WebSocket } from "ws";
import { WalletBuilder } from "@midnight-ntwrk/wallet";
import { findDeployedContract } from "@midnight-ntwrk/midnight-js-contracts";
import { httpClientProofProvider } from "@midnight-ntwrk/midnight-js-http-client-proof-provider";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { NodeZkConfigProvider } from "@midnight-ntwrk/midnight-js-node-zk-config-provider";
import { levelPrivateStateProvider } from "@midnight-ntwrk/midnight-js-level-private-state-provider";
import { NetworkId, setNetworkId, getZswapNetworkId, getLedgerNetworkId, } from "@midnight-ntwrk/midnight-js-network-id";
import { createBalancedTx } from "@midnight-ntwrk/midnight-js-types";
import { nativeToken, Transaction } from "@midnight-ntwrk/ledger";
import { Transaction as ZswapTransaction } from "@midnight-ntwrk/zswap";
// Fix WebSocket for Node.js environment
// @ts-ignore
globalThis.WebSocket = WebSocket;
// Configure for local network (Undeployed) — matches midnight-local-network
setNetworkId(NetworkId.Undeployed);
// Local connection endpoints (indexer api/v3, node, proof server)
const LOCAL_CONFIG = {
    indexer: "http://localhost:8088/api/v3/graphql",
    indexerWS: "ws://localhost:8088/api/v3/graphql/ws",
    node: "http://localhost:9944",
    proofServer: "http://127.0.0.1:6300",
};
const waitForFunds = (wallet) => Rx.firstValueFrom(wallet.state().pipe(Rx.filter((state) => state.syncProgress?.synced === true), Rx.map((s) => s.balances[nativeToken()] ?? 0n), Rx.filter((balance) => balance > 0n), Rx.tap((balance) => console.log(`Wallet funded with balance: ${balance}`))));
async function main() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    console.log("Hello World Contract CLI\n");
    try {
        // Check for deployment file (must run from midnight-local-dapp directory)
        if (!fs.existsSync("deployment.json")) {
            console.error("No deployment.json found! Run deploy from repo root: yarn deploy \"your mnemonic\"");
            process.exit(1);
        }
        const deployment = JSON.parse(fs.readFileSync("deployment.json", "utf-8"));
        console.log(`Contract: ${deployment.contractAddress}\n`);
        // Accept mnemonic (same as Lace / yarn fund / yarn deploy) or 64-char hex seed
        const input = (await rl.question("Enter your mnemonic (or 64-char hex seed): ")).trim();
        let seedHex;
        if (bip39.validateMnemonic(input)) {
            // Derive 32-byte seed from mnemonic (same first 32 bytes as BIP39 seed → 64 hex chars)
            const seed32 = bip39.mnemonicToSeedSync(input).subarray(0, 32);
            seedHex = Buffer.from(seed32).toString("hex");
        }
        else if (input.length === 64 && /^[0-9a-fA-F]+$/.test(input)) {
            seedHex = input.toLowerCase();
        }
        else {
            console.error("Enter a valid BIP-39 mnemonic (12 or 24 words) or 64 hexadecimal characters.");
            rl.close();
            process.exit(1);
        }
        console.log("\nConnecting to Midnight network...");
        // Build wallet from seed (WalletBuilder expects 64-char hex)
        const wallet = await WalletBuilder.buildFromSeed(LOCAL_CONFIG.indexer, LOCAL_CONFIG.indexerWS, LOCAL_CONFIG.proofServer, LOCAL_CONFIG.node, seedHex, getZswapNetworkId(), "info");
        wallet.start();
        const state = await Rx.firstValueFrom(wallet.state());
        console.log(`Your wallet address is: ${state.address}`);
        let balance = state.balances[nativeToken()] ?? 0n;
        if (balance === 0n) {
            console.log("Your wallet balance is 0.");
            console.log("Fund from repo root: yarn fund \"<mnemonic>\" or yarn fund <mn_addr_undeployed...>");
            console.log("Waiting to receive tokens...");
            balance = await waitForFunds(wallet);
        }
        console.log(`Balance: ${balance}\n`);
        // Load compiled contract (index.js — ESM output)
        console.log("Loading contract...");
        const contractPath = path.join(process.cwd(), "contracts");
        const contractModulePath = path.join(contractPath, "managed", "hello-world", "contract", "index.js");
        if (!fs.existsSync(contractModulePath)) {
            console.error("Contract not found! Run: yarn compile");
            rl.close();
            process.exit(1);
        }
        const HelloWorldModule = await import(pathToFileURL(contractModulePath).href);
        const contractInstance = new HelloWorldModule.Contract({});
        const walletState = await Rx.firstValueFrom(wallet.state());
        const walletProvider = {
            coinPublicKey: walletState.coinPublicKey,
            encryptionPublicKey: walletState.encryptionPublicKey,
            balanceTx(tx, newCoins) {
                return wallet
                    .balanceTransaction(ZswapTransaction.deserialize(tx.serialize(getLedgerNetworkId()), getZswapNetworkId()), newCoins)
                    .then((tx) => wallet.proveTransaction(tx))
                    .then((zswapTx) => Transaction.deserialize(zswapTx.serialize(getZswapNetworkId()), getLedgerNetworkId()))
                    .then(createBalancedTx);
            },
            submitTx(tx) {
                return wallet.submitTransaction(tx);
            },
        };
        // Configure all required providers
        console.log("Setting up providers...");
        const zkConfigPath = path.join(contractPath, "managed", "hello-world");
        const providers = {
            privateStateProvider: levelPrivateStateProvider({
                privateStateStoreName: "hello-world-state",
            }),
            publicDataProvider: indexerPublicDataProvider(LOCAL_CONFIG.indexer, LOCAL_CONFIG.indexerWS),
            zkConfigProvider: new NodeZkConfigProvider(zkConfigPath),
            proofProvider: httpClientProofProvider(LOCAL_CONFIG.proofServer),
            walletProvider: walletProvider,
            midnightProvider: walletProvider,
        };
        // Connect to contract
        const deployed = await findDeployedContract(providers, {
            contractAddress: deployment.contractAddress,
            contract: contractInstance,
            privateStateId: "helloWorldState",
            initialPrivateState: {},
        });
        console.log("Connected to contract\n");
        // Main menu loop
        let running = true;
        while (running) {
            console.log("--- Menu ---");
            console.log("1. Store message");
            console.log("2. Read current message");
            console.log("3. Exit");
            const choice = await rl.question("\nYour choice: ");
            switch (choice) {
                case "1":
                    console.log("\nStoring custom message...");
                    const customMessage = await rl.question("Enter your message: ");
                    try {
                        const tx = await deployed.callTx.storeMessage(customMessage);
                        console.log("Success!");
                        console.log(`Message: "${customMessage}"`);
                        console.log(`Transaction ID: ${tx.public.txId}`);
                        console.log(`Block height: ${tx.public.blockHeight}\n`);
                    }
                    catch (error) {
                        console.error("Failed to store message:", error);
                    }
                    break;
                case "2":
                    console.log("\nReading message from blockchain...");
                    try {
                        const contractState = await providers.publicDataProvider.queryContractState(deployment.contractAddress);
                        if (contractState) {
                            const ledger = HelloWorldModule.ledger(contractState.data);
                            const message = Buffer.from(ledger.message).toString();
                            console.log(`Current message: "${message}"\n`);
                        }
                        else {
                            console.log("No message found\n");
                        }
                    }
                    catch (error) {
                        console.error("Failed to read message:", error);
                    }
                    break;
                case "3":
                    running = false;
                    console.log("\nGoodbye!");
                    break;
                default:
                    console.log("Invalid choice. Please enter 1, 2, or 3.\n");
            }
        }
        await wallet.close();
    }
    catch (error) {
        console.error("\nError:", error);
    }
    finally {
        rl.close();
    }
}
main().catch(console.error);
