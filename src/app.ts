import { formatResult, type RateQuote } from "./format";
import {
  ParseError,
  SOURCE_NAMES,
  parseConversion,
  type ConversionRequest,
  type SourceKey,
} from "./parser";
import { ProviderError } from "./providers/types";

export interface InlineResult {
  type: "article";
  id: string;
  title: string;
  description?: string;
  input_message_content: { message_text: string };
}

export interface TelegramGateway {
  sendMessage(chatId: number, text: string): Promise<void>;
  answerInlineQuery(inlineQueryId: string, results: InlineResult[]): Promise<void>;
}

export interface BotDependencies {
  defaultSource: SourceKey;
  telegram: TelegramGateway;
  getQuote(request: ConversionRequest): Promise<RateQuote>;
}

export interface TelegramUpdate {
  message?: { chat: { id: number }; text?: string };
  inline_query?: { id: string; query: string };
}

const SOURCE_DESCRIPTIONS: Record<SourceKey, string> = {
  coinbase: "法币 / 加密货币",
  coingecko: "加密货币综合市场价",
  kraken: "Kraken 现货交易对",
  frankfurter: "ECB 法币参考价",
};

const USAGE = "格式：金额 源币 目标币 [汇率源]\n例：5.2 USDT CNY Coinbase";

export function sourceHelp(defaultSource: SourceKey): string {
  const lines = ["📡 可用汇率源"];
  for (const [key, name] of Object.entries(SOURCE_NAMES) as Array<[SourceKey, string]>) {
    lines.push(`${key === defaultSource ? "⭐" : "•"} ${name} — ${SOURCE_DESCRIPTIONS[key]}`);
  }
  return lines.join("\n");
}

function command(text: string): string | undefined {
  const match = text.match(/^\/(\w+)(?:@\w+)?(?:\s|$)/);
  return match?.[1].toLowerCase();
}

function inlineResult(title: string, message: string, description?: string): InlineResult {
  return {
    type: "article",
    id: crypto.randomUUID(),
    title,
    description,
    input_message_content: { message_text: message },
  };
}

function publicError(error: unknown): string {
  if (error instanceof ParseError || error instanceof ProviderError) return error.message;
  return "换算失败，请稍后重试";
}

export async function handleUpdate(update: TelegramUpdate, deps: BotDependencies): Promise<void> {
  if (update.message?.text) {
    const text = update.message.text.trim();
    const cmd = command(text);
    if (cmd === "source" || cmd === "sources") {
      await deps.telegram.sendMessage(update.message.chat.id, sourceHelp(deps.defaultSource));
      return;
    }
    if (cmd === "start" || cmd === "help") {
      await deps.telegram.sendMessage(update.message.chat.id, USAGE);
      return;
    }

    try {
      const request = parseConversion(text, deps.defaultSource);
      const quote = await deps.getQuote(request);
      await deps.telegram.sendMessage(update.message.chat.id, formatResult(request, quote));
    } catch (error) {
      await deps.telegram.sendMessage(update.message.chat.id, publicError(error));
    }
    return;
  }

  if (update.inline_query) {
    const query = update.inline_query.query.trim();
    if (!query) {
      await deps.telegram.answerInlineQuery(update.inline_query.id, [
        inlineResult("输入金额和币种", USAGE, "例：5.2 USDT CNY Coinbase"),
      ]);
      return;
    }

    try {
      const request = parseConversion(query, deps.defaultSource);
      const quote = await deps.getQuote(request);
      const result = formatResult(request, quote);
      await deps.telegram.answerInlineQuery(update.inline_query.id, [
        inlineResult(result.split("\n")[0], result, `${quote.source} · 点击发送`),
      ]);
    } catch (error) {
      const message = publicError(error);
      await deps.telegram.answerInlineQuery(update.inline_query.id, [
        inlineResult(message, message, USAGE.replace("\n", " · ")),
      ]);
    }
  }
}
