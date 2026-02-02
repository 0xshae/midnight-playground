# Tutorial: Your First Midnight Smart Contract with Midnight Playground

If you are new to Midnight, you might be used to public blockchains where every transaction is visible. Midnight is different. It uses **Zero-Knowledge (ZK)** technology to allow for "selective disclosure."

This tutorial guides you through writing, compiling, and deploying your first Compact contract locally using the **midnight-playground**.

---

## 1. Understanding the Midnight Stack

Before we code, you need to understand the three pillars of a Midnight application:

- **The Node:** Maintains the ledger (the "Undeployed" network).
- **The Indexer:** A GraphQL service that allows you to query the state of the blockchain.
- **The Proof Server:** This is where the magic happens. It generates the ZK proofs on your machine before they are sent to the node. This ensures your private data never leaves your computer.

---

## 2. Setting Up the Playground

First, clone the environment and install dependencies. You'll need **Node.js v22** and **Docker**.

```bash
git clone https://github.com/0xshae/midnight-playground
cd midnight-playground
nvm use 22
yarn install
```

Start your local infrastructure:

```bash
docker compose up -d
```

> **Note:** Wait about 30 seconds for the indexer to sync.

---

## 3. Writing the Compact Contract

**Compact** is Midnight's language. It feels like a mix of TypeScript and C++, but it handles state in two ways: **Public** and **Private**.

Navigate to `midnight-local-dapp/contracts/hello-world.compact`. You'll see a structure like this:

```compact
pragma language_version 0.20.0;

export ledger message: Opaque<"string">;

export circuit storeMessage(customMessage: Opaque<"string">): [] {
  message = disclose(customMessage);
}
```

- **`ledger message`** — The ledger is what is stored on-chain. Here, a single private string (`Opaque<"string">`).
- **`export circuit storeMessage(...)`** — Transitions (how state changes) are defined as **circuits**. This one takes a private message and **discloses** it into the ledger.

### Key Concept: The "Circuit"

In Midnight, functions are called **circuits**. When you run `storeMessage`, your Proof Server executes the logic locally and generates a proof that the state transition is valid without necessarily revealing the inputs used.

---

## 4. Compiling and Funding

Midnight doesn't use standard `.js` or `.rs` files for contracts; it compiles them into a **contract pack**.

```bash
cd midnight-local-dapp
yarn compile
cd ..
```

### Funding your Wallet

The local "Undeployed" network doesn't have a public faucet. You must fund your Lace wallet using the playground's CLI:

```bash
yarn fund "your twelve word mnemonic phrase here"
```

This script derives your public/private addresses from your mnemonic and provides them with local DUST and tokens.

---

## 5. Deployment

In the root directory, run:

```bash
yarn deploy "your twelve word mnemonic phrase"
```

**What happens during deployment?**

1. Your mnemonic is used to sign the transaction.
2. The compiled contract bytecode is sent to the local Midnight node.
3. A `deployment.json` file is created in `midnight-local-dapp/`, containing your `contractAddress`.

---

## 6. Interaction

To interact with your contract, you can use the included CLI starter.

1. Open `midnight-local-dapp/src/cli.ts`.
2. Notice the endpoints point to localhost:
   - **Indexer:** `http://localhost:8088`
   - **Proof Server:** `http://localhost:6300`
3. Run the CLI (if configured) to call your `storeMessage` circuit. Each time you call it, your local Proof Server will generate a new ZK proof!

---

## Troubleshooting Tips

- **Insufficient DUST:** Even on a local network, Midnight uses DUST for fees. Ensure you "Generate DUST" inside the Lace wallet (Undeployed network) after funding.
- **Docker Logs:** If deployment hangs, run `docker compose logs -f` to see if the Node or Indexer is throwing errors.
