# Telegram Exchange Bot Design

## Scope

Build a Cloudflare Worker Telegram bot that converts fiat and cryptocurrency in direct messages and inline mode.

## Input

- `5.2 USDT CNY` uses the default source, Coinbase.
- `5.2 USDT CNY coinbase` selects a source explicitly.
- Currency and source codes are case-insensitive.
- Source names must match completely after lowercasing. `cOiNbAsE` is valid; `Coinbasew` is invalid.
- Common Chinese currency aliases are normalized to currency codes.
- `/source` and `/sources` list canonical source names and capabilities.

## Sources

- Coinbase: default; fiat and cryptocurrency reference rates.
- CoinGecko: aggregate cryptocurrency market rates against supported fiat or another supported cryptocurrency.
- Kraken: public spot pairs available on Kraken.
- Frankfurter: ECB fiat reference rates, updated on banking days.

Providers never silently fall back to another source. Unsupported pairs return a concise error.

## Telegram Behavior

- Direct messages send the conversion result with `sendMessage`.
- Inline queries return one insertable article result.
- Empty or invalid inline queries return a usage result.
- Webhook requests must include the configured Telegram secret header.

Successful output is exactly two lines:

```text
💰 5.2 USDT = 37.48 CNY
📡 Coinbase · 14:30:25
```

## Runtime

- TypeScript Cloudflare Worker using native `fetch`.
- Secrets: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`.
- Optional `COINGECKO_API_KEY` raises CoinGecko limits.
- Provider results are cached in an isolate for 30 seconds.
- `/health` returns JSON without secrets.

## Verification

Unit tests cover parsing, exact source matching, formatting, provider response parsing, commands, direct messages, inline queries, and webhook authentication. Type checking and a dry-run Worker deploy verify Cloudflare compatibility.
