# RateRelay

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/Fdsapoawa/telegram-rate-relay)

部署在 Cloudflare Workers 上的 Telegram 多源汇率机器人。支持私聊换算和 Inline Mode，可在任意聊天框直接引用结果。

```text
💰 5.2 USDT ≈ 37.4764 CNY
📡 Coinbase · 获取 14:30:25 · Asia/Shanghai (UTC+8)
```

## 功能

- 法币、加密货币双向换算
- 私聊：`5.2 USDT CNY Coinbase`
- Inline：`@你的机器人 5.2 USDT CNY Coinbase`
- `/source` 查看或保存个人默认汇率源
- `/time` 查看或保存个人时区，默认北京时间
- Inline 可临时覆盖时区，不修改个人设置
- 源名称忽略大小写，但必须完整匹配
- 支持 `100 美元 人民币` 等常见中文别名
- 缓存时间可配置，`0` 可关闭

## 汇率源

| 名称 | 能力 | 说明 |
| --- | --- | --- |
| `Coinbase` | 法币、加密货币 | 默认源，市场参考价 |
| `Binance` | Binance 支持的现货交易对 | 直接、反向或经 USDT 桥接；无需 API Key |
| `Kraken` | Kraken 支持的现货交易对 | 交易所最新成交价 |
| `Frankfurter` | 法币 | ECB 参考汇率，银行工作日更新 |

```text
5.2 USDT CNY
5.2 USDT CNY coinbase
7891 USD SOL Binance
1 BTC USDT Binance
100 EUR CNY Frankfurter
5.2 USDT CNY none Shanghai
5.2 USDT CNY Coinbase UTC
```

`none` 占住汇率源位置，表示使用个人默认源；未设置个人源时使用 Worker 的 `DEFAULT_SOURCE`。它不区分大小写，但必须完整拼写，`nonew` 不会命中。

## 个人设置与 Inline 覆盖

```text
/source Binance
/source reset
/time UTC8
/time Shanghai
/time Taipei
/time Osaka
/time LosAngeles
/time Asia/Shanghai
/time Asia/Taipei
/time America/Los_Angeles
/time reset
```

优先级：消息中显式设置 > 个人设置 > Worker 默认值。

Inline 临时修改示例：

```text
@你的机器人 5.2 USDT CNY none Shanghai
@你的机器人 5.2 USDT CNY Coinbase UTC
```

第一条使用个人默认汇率源，并只对本次结果使用上海时区；第二条同时指定 Coinbase 和 UTC。Inline 覆盖不会修改 `/source` 或 `/time` 保存的设置。支持 `Shanghai`、`Taipei`、`Osaka`、`LosAngeles` 等裸城市，也支持 `Asia/Taipei`、`America/Los_Angeles` 等标准 IANA 时区。

汇率源名称不区分大小写，但必须完整拼写：

```text
可用：Coinbase、cOINBASE、cOiNbAsE
拒绝：Coinbasew（末尾多了一个 w）
```

## 纯网页一键部署

整个流程不需要安装 Node.js，不需要执行命令，也不需要把作者的 Secret 复制到你的账号。

部署后，代码位于你自己的 GitHub 仓库，Worker 和 Secret 位于你自己的 Cloudflare 账号。

### 1. 创建 Telegram Bot

在 Telegram 打开 [@BotFather](https://t.me/BotFather)：

1. 发送 `/newbot`，按提示创建机器人。
2. 保存 BotFather 返回的 Bot Token。
3. 发送 `/setinline`，选择机器人，设置占位文字：`5.2 USDT CNY Coinbase`。
4. 发送 `/setcommands`，选择机器人并粘贴：

```text
start - 使用说明
source - 查看可用汇率源
time - 查看或设置个人时区
help - 使用说明
```

### 2. 打开 Cloudflare 部署页

点击：

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/Fdsapoawa/telegram-rate-relay)

Cloudflare 会引导你：

1. 登录自己的 Cloudflare 账号。
2. 连接自己的 GitHub 账号。
3. 将本项目复制到你自己的 GitHub 仓库。
4. 选择 Cloudflare 账号并设置 Worker 名称。
5. 构建和部署项目。

仓库已有 `wrangler.toml` 和 `npm run deploy`，构建命令保持空白，部署命令使用自动识别值即可。

部署会自动创建 Durable Object 保存每个 Telegram 用户的默认汇率源和时区，不需要手动创建或绑定 Workers KV。

### 3. 填写 Secret

部署页面会根据 `.dev.vars.example` 要求填写：

| Secret | 填写内容 |
| --- | --- |
| `TELEGRAM_BOT_TOKEN` | BotFather 返回的 Bot Token |
| `TELEGRAM_WEBHOOK_SECRET` | 自己生成的随机字符串 |

`TELEGRAM_WEBHOOK_SECRET` 只能包含 `A-Z`、`a-z`、`0-9`、`_`、`-`，长度 1 到 256。保存好这个值，设置 Webhook 时还要使用一次。

如果一键部署页面没有要求填写 Secret：

1. 打开 Cloudflare 控制台的 `Workers & Pages`。
2. 选择刚部署的 `telegram-rate-relay` Worker。
3. 打开 `Settings` → `Variables & Secrets`。
4. 分别添加上面两个名称，类型选择 `Secret`。
5. 保存后进入 `Deployments`，重新部署最新版本。

### 4. 获取 Worker 地址

部署完成后进入 Worker 的 `Settings` → `Domains & Routes`，复制 `workers.dev` 地址，例如：

```text
https://telegram-rate-relay.<你的子域>.workers.dev
```

在浏览器打开：

```text
https://telegram-rate-relay.<你的子域>.workers.dev/health
```

正常结果：

```json
{"ok":true,"name":"RateRelay"}
```

### 5. 用浏览器设置 Telegram Webhook

替换下面三个占位值，然后在浏览器地址栏打开：

```text
https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https://telegram-rate-relay.<你的子域>.workers.dev/webhook&secret_token=<WEBHOOK_SECRET>
```

- `<BOT_TOKEN>`：BotFather 返回的 Token
- `<你的子域>`：Cloudflare 提供的 `workers.dev` 子域
- `<WEBHOOK_SECRET>`：部署时填写的 `TELEGRAM_WEBHOOK_SECRET`

成功时浏览器显示：

```json
{"ok":true,"result":true,"description":"Webhook was set"}
```

继续在浏览器打开以下地址检查状态：

```text
https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo
```

确认 `url` 指向你的 Worker，`last_error_message` 为空。完成后建议清除包含 Bot Token 的浏览器历史记录。

### 6. 测试

私聊机器人：

```text
5.2 USDT CNY
/source
/source Binance
/time
/time UTC
```

在任意 Telegram 聊天框：

```text
@你的机器人用户名 5.2 USDT CNY none Shanghai
```

## 在 Cloudflare 控制台修改配置

打开 Worker → `Settings` → `Variables & Secrets`：

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `DEFAULT_SOURCE` | `coinbase` | 默认汇率源 |
| `CACHE_TTL_SECONDS` | `30` | 缓存秒数；`0` 关闭；最大 `3600` |

修改后保存并重新部署。

## 命令行部署

需要本地开发、测试或 Wrangler 部署时，参见 [`docs/DEPLOY-WRANGLER.md`](docs/DEPLOY-WRANGLER.md)。

## 注意

- 不支持的币对会直接报错，不会偷偷切换汇率源。
- Coinbase 是市场参考价；Kraken 是单一交易所价格；Frankfurter 是 ECB 参考价。
- Binance 使用无需 API Key 的官方 Google Cloud Spot 行情域名 `api-gcp.binance.com`；不存在的交易对会明确报错。
- `获取` 表示机器人请求汇率源的时间；`行情` 表示汇率源提供的行情时间；`参考` 表示参考汇率日期。
- Worker 默认缓存 30 秒；可将 `CACHE_TTL_SECONDS` 设为 `0` 关闭，但上游汇率源仍可能自行缓存。
- 不要把 Telegram Bot Token 或 Webhook Secret 提交到 Git。

## License

[GPL-3.0-only](LICENSE)
