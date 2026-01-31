# midnight-local-dapp

Hello World dApp for the **local Midnight network** (Undeployed). Configured to work with `midnight-local-network` (Docker: node, indexer, proof server).

## Prerequisites

1. **Local network running** — from repo root:
   ```bash
   docker compose up -d
   ```
2. **Wallet funded** — use the same Lace wallet (Undeployed network) and fund it from repo root:
   ```bash
   yarn fund "your mnemonic from Lace"
   ```
   or:
   ```bash
   yarn fund mn_addr_undeployed1...
   ```

## Deploy the contract (recommended: from repo root with mnemonic)

To deploy using **the same wallet as Lace** (same address from your mnemonic), run from the **repo root**:

```bash
yarn deploy "your twelve or twenty four mnemonic words"
```

- Uses the same wallet derivation as Lace and `yarn fund`, so the deployed contract is owned by your Lace-funded address.
- Requires the parent project to have `@midnight-ntwrk/compact-runtime` (run `yarn install` from repo root if needed).
- Writes `midnight-local-dapp/deployment.json` with the contract address.

**Alternative (different address than Lace):** From **this directory** you can run `npm run build && npm run deploy` and use a 64‑character hex seed. That uses a different wallet stack than Lace, so the address will not match your Lace wallet and the script may hit indexer schema errors on the local indexer.

After a successful deploy you get:

- `deployment.json` — contract address and timestamp
- Contract is live on your local chain and ready to use from the dApp (e.g. with Lace)

## Scripts

| Script     | Description                          |
|-----------|--------------------------------------|
| `compile` | Compile `contracts/hello-world.compact` |
| `build`   | Compile TypeScript (`src/` → `dist/`)   |
| `deploy`  | Deploy Hello World to local network     |

## Config (local / undeployed)

- **Network:** `NetworkId.Undeployed`
- **Indexer:** `http://localhost:8088/api/v3/graphql` (and WS at `/api/v3/graphql/ws`)
- **Node:** `http://localhost:9944`
- **Proof server:** `http://127.0.0.1:6300`

These match the defaults used by `midnight-local-network`.
