# Frontend - Ledger Dashboard

React + TypeScript + Vite + Tailwind. A dashboard demonstrating the wallet
processor: process transactions, watch the balance update live, browse history -
plus a **Manual Test Lab** that exercises the real backend to demonstrate the
idempotency and concurrency guarantees interactively. See the
[root README](../README.md) for full project documentation.

## Run

```bash
npm install
cp .env.example .env   # VITE_API_BASE_URL, defaults to http://localhost:8080
npm run dev
```

Opens on `http://localhost:5173`. The backend must be running first.

## Structure

```
src/
├── api/                Fetch-based API client (client.ts)
├── components/          Sidebar, forms, tables, cards
│   └── testlab/          Manual Test Lab cards, request-log table, demo-wallet bar
├── context/             AppContext - current demo user + wallet/transaction state
├── lib/                 Formatting helpers (currency, dates, UUID validation)
├── pages/                Dashboard, Transactions, Wallet, Test Lab
└── types/                TypeScript types mirroring backend DTOs
```

## Manual Test Lab

`/test-lab` runs five scenarios directly against the real backend (no mocking):
concurrent duplicate payment, concurrent wallet debit race, idempotency conflict,
insufficient balance, and a plain successful payment. Every test manages its own
disposable demo wallet (created fresh via `POST /api/v1/wallets` before each run),
so nothing on the main Dashboard/Wallet pages is ever at risk.

## Notes

- There's no auth in this demo - a "wallet switcher" (top-right of every page) lets
  you create a funded demo wallet or paste an existing `userId`, persisted in
  `localStorage` so it survives a refresh. The Test Lab's demo wallet is separate
  and in-memory only (not persisted), by design.
- `npm run build` type-checks (`tsc -b`) and produces a static `dist/` bundle;
  `npm run lint` runs `oxlint`.
