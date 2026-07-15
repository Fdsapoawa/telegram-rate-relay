# RateRelay

一个部署在 Cloudflare Workers 上的 Telegram 多源汇率机器人。支持私聊换算和 Inline Mode，可在任意聊天框直接引用结果。

```text
💰 5.2 USDT = 37.4764 CNY
📡 Coinbase · 14:30:25
```

## 功能

- 法币、加密货币双向换算
- 私聊：`5.2 USDT CNY Coinbase`
- Inline：`@你的机器人 5.2 USDT CNY Coinbase`
- `/source` 查看汇率源和规范名称
- 汇率源名称忽略大小写，但必须完整匹配
- 常见中文别名：`100 美元 人民币`
- 0 到 3600 秒可配置缓存
- Telegram Webhook Secret 验证

## 汇率源

| 名称 | 能力 | 说明 |
| --- | --- | --- |
| `Coinbase` | 法币、加密货币 | 默认源，市场参考价 |
| `CoinGecko` | 包含加密货币的换算 | 多交易所综合市场价 |
| `Kraken` | Kraken 支持的现货交易对 | 交易所最新成交价 |
| `Frankfurter` | 法币 | ECB 参考汇率，银行工作日更新 |

省略第四个参数时使用默认源：

```text
5.2 USDT CNY
5.2 USDT CNY coinbase
1 BTC USD CoinGecko
100 EUR CNY Frankfurter
```

`Coinbase`、`cOINBASE`、`cOiNbAsE` 等价。`Coinbasew` 不匹配，机器人会提示使用 `/source`。

## 前置条件

- Telegram 账号
- Cloudflare 账号
- Node.js 20 或更高版本
- npm

## 1. 创建 Telegram Bot

在 Telegram 打开 [@BotFather](https://t.me/BotFather)：

1. 发送 `/newbot`，按提示创建机器人，保存 Bot Token。
2. 发送 `/setinline`，选择机器人，设置占位文字，例如 `5.2 USDT CNY Coinbase`。
3. 发送 `/setcommands`，选择机器人，粘贴：

```text
start - 使用说明
source - 查看可用汇率源
help - 使用说明
```

Inline Mode 必须通过 `/setinline` 开启，否则 `@机器人用户名 ...` 不会出现结果。

## 2. 安装与登录 Cloudflare

```bash
git clone https://github.com/Fdsapoawa/telegram-rate-relay.git
cd telegram-rate-relay
npm install
npx wrangler login
```

## 3. 配置

普通配置位于 `wrangler.toml`：

```toml
[vars]
DEFAULT_SOURCE = "coinbase"
CACHE_TTL_SECONDS = "30"
```

- `DEFAULT_SOURCE`：`coinbase`、`coingecko`、`kraken` 或 `frankfurter`
- `CACHE_TTL_SECONDS`：`0` 关闭缓存；最大 `3600`；无效值回退到 `30`

保存敏感配置：

```bash
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put TELEGRAM_WEBHOOK_SECRET
```

两个命令会分别提示输入值。`TELEGRAM_WEBHOOK_SECRET` 请使用随机字符串，只能包含 `A-Z`、`a-z`、`0-9`、`_`、`-`，长度 1 到 256。

CoinGecko 可免 Key 使用公开接口。需要更高额度时可选配：

```bash
npx wrangler secret put COINGECKO_API_KEY
```

## 4. 部署 Worker

```bash
npm run deploy
```

Wrangler 会输出地址，例如：

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

将下列三个占位值替换为真实值。`secret_token` 必须与 Cloudflare 中的 `TELEGRAM_WEBHOOK_SECRET` 完全一致。

```bash
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://telegram-rate-relay.<你的子域>.workers.dev/webhook",
    "secret_token": "<WEBHOOK_SECRET>",
    "allowed_updates": ["message", "inline_query"]
  }'
```

成功响应：

```json
{"ok":true,"result":true,"description":"Webhook was set"}
```

检查 Webhook：

```bash
curl "https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo"
```

确认 `url` 正确且 `last_error_message` 为空。

## 6. 使用

私聊机器人：

```text
5.2 USDT CNY
100 美元 人民币
1 ETH BTC CoinGecko
/source
```

任意 Telegram 聊天框：

```text
@你的机器人用户名 5.2 USDT CNY Coinbase
```

选择结果即可发送到当前聊天。

## 本地检查

```bash
npm test
npm run typecheck
npm run deploy:dry
```

## 注意

- 不同数据源的覆盖范围不同，不支持的币对会直接报错，不会偷偷切换来源。
- Coinbase 和 CoinGecko 是市场参考价；Kraken 是单一交易所价格；Frankfurter 是 ECB 参考价。
- Cloudflare Secret 不要写入 `wrangler.toml`、README 或 Git。

## License

[GPL-3.0-only](LICENSE)
