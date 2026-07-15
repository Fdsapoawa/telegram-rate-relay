# Telegram Exchange Bot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a deployable Cloudflare Worker Telegram bot for multi-source fiat and cryptocurrency conversion.

**Architecture:** A small Worker routes Telegram updates to pure parsing and formatting functions. Provider adapters normalize Coinbase, CoinGecko, Kraken, and Frankfurter responses behind one rate interface.

**Tech Stack:** TypeScript, Cloudflare Workers, Vitest, Wrangler

---

### Task 1: Parser and formatter

**Files:** `src/parser.ts`, `src/format.ts`, `test/parser.test.ts`, `test/format.test.ts`

- [ ] Write tests for three/four-token input, aliases, case-insensitive exact source names, invalid syntax, and two-line output.
- [ ] Run `npm test -- test/parser.test.ts test/format.test.ts` and confirm missing-module failures.
- [ ] Implement minimal parser and formatter.
- [ ] Re-run focused tests and confirm they pass.

### Task 2: Rate providers

**Files:** `src/providers/*.ts`, `test/providers.test.ts`

- [ ] Write tests using injected fetch responses for all four providers.
- [ ] Run provider tests and confirm missing-module failures.
- [ ] Implement provider interface, HTTP validation, and 30-second cache.
- [ ] Re-run provider tests and confirm they pass.

### Task 3: Telegram update handling

**Files:** `src/app.ts`, `src/telegram.ts`, `src/index.ts`, `test/app.test.ts`

- [ ] Write tests for `/source`, direct conversion, inline conversion, and invalid webhook secret.
- [ ] Run app tests and confirm missing-module failures.
- [ ] Implement Telegram API client, update dispatcher, and Worker routes.
- [ ] Re-run app tests and confirm they pass.

### Task 4: Deployment documentation and verification

**Files:** `README.md`, `wrangler.toml`, `package.json`, `tsconfig.json`

- [ ] Document BotFather inline mode, Worker secrets, deploy, webhook registration, and commands.
- [ ] Run `npm test`, `npm run typecheck`, and `npm run deploy:dry`.
- [ ] Inspect output for failures, placeholders, and accidental secrets.
