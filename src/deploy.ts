// Copyright 2025 Brick Towers
// Deploy Hello World contract using the same wallet as Lace (mnemonic → same address).
// Run from repo root: yarn deploy "your mnemonic words"

import * as bip39 from 'bip39';
import * as rx from 'rxjs';
import * as path from 'path';
import { pathToFileURL } from 'node:url';
import * as fs from 'fs';
import * as ledger from '@midnight-ntwrk/ledger-v6';
import { initWalletWithSeed } from './utils';
import { MidnightBech32m } from '@midnight-ntwrk/wallet-sdk-address-format';
import { createConstructorContext } from '@midnight-ntwrk/compact-runtime';

const NATIVE_TOKEN = ledger.nativeToken();
const NETWORK_ID = 'undeployed';
const TTL_MS = 30 * 60 * 1000;

async function main(): Promise<void> {
    const mnemonic = process.argv.slice(2).join(' ').trim();
    if (!mnemonic || !bip39.validateMnemonic(mnemonic)) {
        console.error('Usage: yarn deploy "your twelve or twenty four mnemonic words"');
        process.exit(2);
    }

    const seed = bip39.mnemonicToSeedSync(mnemonic).subarray(0, 32);
    console.log('Building wallet (same derivation as Lace)...');
    const { wallet, shieldedSecretKeys, dustSecretKey, unshieldedKeystore } = await initWalletWithSeed(seed);
    await wallet.start(shieldedSecretKeys, dustSecretKey);

    await rx.firstValueFrom(wallet.state().pipe(rx.filter((s) => s.isSynced)));
    const state = await rx.firstValueFrom(wallet.state());
    const shieldedAddress = MidnightBech32m.encode('undeployed', state.shielded.address).toString();
    console.log('Your wallet address (Lace match):', shieldedAddress);

    const balance = state.shielded.balances[NATIVE_TOKEN] ?? 0n;
    if (balance === 0n) {
        console.error('Balance is 0. Fund this address from repo root: yarn fund "' + mnemonic + '"');
        await wallet.stop();
        process.exit(1);
    }
    console.log('Balance:', balance.toString());

    const dappDir = path.join(process.cwd(), 'midnight-local-dapp');
    const contractPath = path.join(dappDir, 'contracts', 'managed', 'hello-world', 'contract', 'index.js');
    if (!fs.existsSync(contractPath)) {
        console.error('Contract not found at', contractPath);
        await wallet.stop();
        process.exit(1);
    }

    console.log('Loading contract...');
    const ContractModule = await import(pathToFileURL(contractPath).href);
    const ContractClass = ContractModule.Contract;
    const contractInstance = new ContractClass({});

    const coinPublicKeyHex = state.shielded.coinPublicKey.toHexString();
    const constructorContext = createConstructorContext({}, coinPublicKeyHex);
    const constructorResult = contractInstance.initialState(constructorContext);

    let ledgerContractState: ledger.ContractState;
    const cs = constructorResult.currentContractState;
    if (typeof (cs as { serialize?: () => Uint8Array }).serialize === 'function') {
        ledgerContractState = ledger.ContractState.deserialize((cs as { serialize: () => Uint8Array }).serialize());
    } else {
        ledgerContractState = cs as unknown as ledger.ContractState;
    }

    const deploy = new ledger.ContractDeploy(ledgerContractState);
    const ttl = new Date(Date.now() + TTL_MS);
    const intent = ledger.Intent.new(ttl).addDeploy(deploy);
    const tx = ledger.Transaction.fromParts(NETWORK_ID, undefined, undefined, intent);

    console.log('Balancing and proving deploy transaction...');
    const recipe = await wallet.balanceTransaction(shieldedSecretKeys, dustSecretKey, tx, ttl);

    const unprovenTx =
        recipe.type === 'TransactionToProve'
            ? recipe.transaction
            : recipe.type === 'BalanceTransactionToProve'
              ? recipe.transactionToProve
              : recipe.transaction;

    const signSegment = (payload: Uint8Array): ledger.Signature => unshieldedKeystore.signData(payload);
    const signedTx = await wallet.signTransaction(unprovenTx, signSegment);

    const recipeToFinalize =
        recipe.type === 'TransactionToProve'
            ? { type: 'TransactionToProve' as const, transaction: signedTx }
            : recipe.type === 'BalanceTransactionToProve'
              ? { ...recipe, transactionToProve: signedTx }
              : { ...recipe, transaction: signedTx };

    const finalizedTx = await wallet.finalizeTransaction(recipeToFinalize);
    const txHash = await wallet.submitTransaction(finalizedTx);
    console.log('Deploy transaction submitted:', txHash);

    const contractAddress = deploy.address.toString();
    const deploymentJson = path.join(dappDir, 'deployment.json');
    fs.writeFileSync(
        deploymentJson,
        JSON.stringify({ contractAddress, deployedAt: new Date().toISOString(), txHash }, null, 2)
    );
    console.log('Contract address:', contractAddress);
    console.log('Saved to', deploymentJson);

    await wallet.stop();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
