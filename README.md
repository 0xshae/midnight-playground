# Midnight Local Playground

A **playground** for writing [Compact](https://docs.midnight.network) contracts and deploying them **locally** on your machine. Use the **Midnight Lace Preview Wallet** on the **“Undeployed”** network to fund your wallet, deploy contracts, and interact with them—without depending on public testnets or faucets.

▶️ **[Watch the Video Explainer & Demo](https://youtu.be/1L4xR8LIe6I)** (earlier version; concepts are the same)

---

## What this repo is for

- **Write** Compact smart contracts (edit the example in `midnight-local-dapp` or add your own).
- **Run** a full local Midnight network (node, indexer, proof server) via Docker.
- **Fund** your Lace-derived wallet using a CLI script (no built-in faucet on Undeployed).
- **Deploy** contracts from the repo root using the **same wallet as Lace** (mnemonic-based).
- **Interact** with deployed contracts via the Lace wallet UI or a CLI adapted for the local setup.

Ideal for development, workshops, and learning the Compact toolchain and Midnight stack locally.

---

## Prerequisites

- **Git**
- **Docker** and **Docker Compose v2**
- **Node.js ≥ 22.16.0** ([nvm](https://github.com/nvm-sh/nvm) recommended)
- **Yarn** (classic)
- **Midnight Lace Preview** (v2.36.0 or later) browser extension

---

## Quick reference: ports

| Service       | Port | Purpose        |
|---------------|------|----------------|
| Proof Server  | 6300 | ZK proof generation |
| Node          | 9944 | RPC / chain   |
| Indexer       | 8088 | GraphQL API   |

---

## Step-by-step setup

All commands below are from the **repository root** unless stated otherwise.

### 1. Clone and install

```bash
git clone git@github.com:bricktowers/midnight-local-network.git midnight-local-network
cd midnight-local-network
nvm use 22   # or: nvm install 22 && nvm use 22
yarn install
```

### 2. Start the local network

```bash
docker compose up -d
```

Give it a short time to start (e.g. 30 seconds). The node, indexer, and proof server will be available on the ports above.

### 3. Connect Lace to “Undeployed”

- In **Lace** → **Settings** → **Midnight**
- Set network to **“Undeployed”**
- Save and switch the wallet to that network

Use the same wallet (and mnemonic) for funding and deployment so addresses match.

### 4. Fund your wallet

The Undeployed network has no faucet. Use the included fund script with your **BIP-39 mnemonic** (the one from Lace):

```bash
yarn fund "your twelve or twenty four mnemonic words"
```

This funds both the shielded and unshielded addresses derived from that mnemonic (same derivation as Lace). You can also fund a single address:

```bash
yarn fund mn_shield-addr_undeployed1...
yarn fund mn_addr_undeployed1...
```

### 5. Generate DUST in Lace (required before deploy)

Deploying a contract uses **DUST** for fees. You must have DUST in your Lace wallet on the Undeployed network:

1. Open **Lace** → **Midnight** (Undeployed).
2. Use the wallet UI to **generate DUST** (follow Lace’s in-app steps).
3. **Wait for DUST to refill** to the required level.

If you skip this step, `yarn deploy` can fail due to insufficient DUST.

### 6. Deploy the Hello World contract

From the repo root, using the **same mnemonic** as Lace:

```bash
yarn deploy "your twelve or twenty four mnemonic words"
```

- Requires a **funded** wallet (`yarn fund` first) and **DUST** (generated in Lace).
- Deploys the contract from `midnight-local-dapp` (Hello World example).
- Writes **`midnight-local-dapp/deployment.json`** with `contractAddress` and `txHash`.

You can re-run this after changing the contract (see below).

---

## Changing the contract and redeploying

1. **Edit** the Compact source, e.g.  
   `midnight-local-dapp/contracts/hello-world.compact`
2. **Recompile** from the dApp directory:
   ```bash
   cd midnight-local-dapp
   yarn compile
   cd ..
   ```
3. **Redeploy** from the repo root:
   ```bash
   yarn deploy "your mnemonic"
   ```

The deploy script is currently wired to the **Hello World** contract and its `storeMessage` entrypoint/verifier. To deploy a different contract or entrypoint, you’d need to point the deploy script at that contract’s path and verifier key (see `src/deploy.ts`).

---

## Interacting with the deployed contract

### Option A: Lace wallet UI

Once the contract is deployed, you can interact with it through a dApp that uses the **dapp-connector-api** and is configured for the **Undeployed** network. Lace will use your local node/indexer when connected to Undeployed.

### Option B: CLI (adapted for local)

The [official Midnight guide](https://docs.midnight.network/getting-started/interact-with-mn-app) describes an interactive CLI for contract interaction (store message, read message, etc.). That guide targets **Testnet** and a 64-character hex wallet seed.

For **this playground** (local Undeployed network):

- Use **local endpoints** instead of Testnet:
  - Indexer: `http://127.0.0.1:8088/api/v3/graphql` (WS: `ws://127.0.0.1:8088/api/v3/graphql/ws`)
  - Node: `http://127.0.0.1:9944`
  - Proof server: `http://127.0.0.1:6300`
- Set **network** to **Undeployed** (e.g. `NetworkId.Undeployed`).
- Use **`midnight-local-dapp/deployment.json`** for the contract address (written by `yarn deploy`).

The `midnight-local-dapp` folder contains a starter CLI (`src/cli.ts`). To make it work locally, configure it with the endpoints above, point it at `deployment.json`, and use a wallet setup compatible with the local indexer (e.g. same derivation as Lace if you use the same mnemonic/seed approach as the deploy script).

---

## Repo layout (relevant parts)

```
midnight-local-network/
├── compose.yml          # Docker: node, indexer, proof-server
├── package.json         # Root scripts: fund, deploy
├── src/
│   ├── fund.ts          # Fund shielded/unshielded from mnemonic or address
│   ├── deploy.ts        # Deploy Hello World using Lace-compatible wallet
│   └── utils.ts
└── midnight-local-dapp/
    ├── contracts/
    │   ├── hello-world.compact   # Edit this (or add new contracts)
    │   └── managed/hello-world/  # Compiled output, keys, contract module
    ├── deployment.json          # Written by yarn deploy
    ├── src/
    │   └── cli.ts               # CLI starter for interaction (adapt for local)
    └── package.json             # compile, build, deploy (dApp-level)
```

---

## Scripts (repo root)

| Script    | Description |
|----------|--------------|
| `yarn fund "mnemonic"`   | Fund Lace-derived addresses on Undeployed (or pass a single address). |
| `yarn deploy "mnemonic"` | Deploy the Hello World contract; requires funded wallet + DUST in Lace. |

---

## Troubleshooting

- **“Balance is still 0”**  
  Run `yarn fund "your mnemonic"` and ensure the local network is up (`docker compose up -d`).

- **Deploy fails (e.g. insufficient DUST)**  
  In Lace (Undeployed), generate DUST and wait for it to refill, then run `yarn deploy` again.

- **“Invalid Transaction: Custom error: 110”**  
  The node rejected the deploy (e.g. verifier key or proof issue). Check `docker compose logs node` and ensure node/image versions in `compose.yml` match the ledger-v6 and proof-server versions used by this repo.

- **“Command 'fund' not found”**  
  Run `yarn install` from the repo root so the `fund` script is available.

---

## References

- [Midnight Docs – Interact with an MN app](https://docs.midnight.network/getting-started/interact-with-mn-app) (Testnet CLI flow; adapt endpoints and network for local Undeployed).
- [Compact](https://docs.midnight.network) – Midnight’s smart contract language and toolchain.
