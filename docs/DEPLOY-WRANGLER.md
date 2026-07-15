# 使用 Wrangler 命令行部署 RateRelay

这是面向开发者的命令行部署方式。只想使用浏览器部署，请返回[主 README](../README.md)。

## 前置条件

- Telegram、GitHub、Cloudflare 账号
- Node.js 20 或更高版本
- npm

## 1. 创建 Telegram Bot

在 Telegram 打开 [@BotFather](https://t.me/BotFather)：

1. 发送 `/newbot`，创建机器人并保存 Bot Token。
2. 发送 `/setinline`，选择机器人，设置占位文字：`5.2 USDT CNY Coinbase`。
3. 发送 `/setcommands`，选择机器人并粘贴：

```text
start - 使用说明
source - 查看可用汇率源
help - 使用说明
```

## 2. 下载并登录 Cloudflare

```bash
git clone https://github.com/Fdsapoawa/telegram-rate-relay.git
cd telegram-rate-relay
npm install
npx wrangler login
```

`npx wrangler login` 会打开 Cloudflare 官方授权网页，不会要求在终端输入 Cloudflare 密码。

## 3. 配置

普通配置位于 `wrangler.toml`：

```toml
[vars]
DEFAULT_SOURCE = "coinbase"
CACHE_TTL_SECONDS = "30"
```

- `DEFAULT_SOURCE`：`coinbase`、`coingecko`、`kraken` 或 `frankfurter`
- `CACHE_TTL_SECONDS`：`0` 关闭缓存；允许范围 `0` 到 `3600`

写入必需 Secret：

```bash
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put TELEGRAM_WEBHOOK_SECRET
```

`TELEGRAM_WEBHOOK_SECRET` 使用随机字符串，只能包含 `A-Z`、`a-z`、`0-9`、`_`、`-`，长度 1 到 256。

CoinGecko Key 可选：

```bash
npx wrangler secret put COINGECKO_API_KEY
```

## 4. 部署

```bash
npm run deploy
```

记下 Wrangler 返回的 Worker 地址，例如：

```text
https://telegram-rate-relay.<你的子域>.workers.dev
```

健康检查：

```bash
curl https://telegram-rate-relay.<你的子域>.workers.dev/health
```

预期返回：

```json
{"ok":true,"name":"RateRelay"}
```

## 5. 设置 Telegram Webhook

`secret_token` 必须和 `TELEGRAM_WEBHOOK_SECRET` 完全一致：

```bash
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://telegram-rate-relay.<你的子域>.workers.dev/webhook",
    "secret_token": "<WEBHOOK_SECRET>",
    "allowed_updates": ["message", "inline_query"]
  }'
```

检查 Webhook：

```bash
curl "https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo"
```

确认 `url` 正确，`last_error_message` 为空。

## 本地验证

```bash
npm test
npm run typecheck
npm run deploy:dry
```

Secret 不得写进 `wrangler.toml`、README 或 Git。
