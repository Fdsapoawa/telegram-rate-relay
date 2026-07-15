import { formatResult, type RateQuote } from "./format";
import {
  ParseError,
  SOURCE_NAMES,
  parseConversion,
  parseSource,
  type ConversionRequest,
  type SourceKey,
} from "./parser";
import { ProviderError } from "./providers/types";
import { UserSettingsError, type UserSettingsStore } from "./settings";
import {
  DEFAULT_TIME_ZONE,
  TimeZoneError,
  normalizeTimeZone,
  timeZoneLabel,
} from "./timezone";

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
  settings: UserSettingsStore;
}

export interface TelegramUpdate {
  message?: { chat: { id: number }; from?: { id: number }; text?: string };
  inline_query?: { id: string; from?: { id: number }; query: string };
}

const SOURCE_DESCRIPTIONS: Record<SourceKey, string> = {
  coinbase: "法币 / 加密货币",
  binance: "Binance 现货交易对",
  kraken: "Kraken 现货交易对",
  frankfurter: "ECB 法币参考价",
};

const USAGE = [
  "格式：金额 源币 目标币 [汇率源|none] [时区]",
  "例：5.2 USDT CNY Coinbase",
  "Inline 时区：@机器人 5.2 USDT CNY none Shanghai",
].join("\n");

export function sourceHelp(defaultSource: SourceKey): string {
  const lines = ["📡 可用汇率源"];
  for (const [key, name] of Object.entries(SOURCE_NAMES) as Array<[SourceKey, string]>) {
    lines.push(`${key === defaultSource ? "⭐" : "•"} ${name} — ${SOURCE_DESCRIPTIONS[key]}`);
  }
  lines.push("", "设置：/source Coinbase", "重置：/source reset");
  lines.push("💡 none 表示使用个人默认汇率源；未设置时使用机器人默认源。");
  return lines.join("\n");
}

function command(text: string): { name: string; argument?: string } | undefined {
  const match = text.match(/^\/(\w+)(?:@\w+)?(?:\s+(.*))?$/);
  if (!match) return undefined;
  const argument = match[2]?.trim();
  return { name: match[1].toLowerCase(), ...(argument ? { argument } : {}) };
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
  if (
    error instanceof ParseError ||
    error instanceof ProviderError ||
    error instanceof TimeZoneError ||
    error instanceof UserSettingsError
  ) {
    return error.message;
  }
  return "换算失败，请稍后重试";
}

export function timeHelp(currentTimeZone: string, at = new Date()): string {
  return [
    `🕒 当前时区：${timeZoneLabel(currentTimeZone, at)}`,
    "设置：/time Shanghai、/time Taipei、/time Osaka、/time LosAngeles、/time UTC8",
    "重置：/time reset",
    "Inline：@机器人 5.2 USDT CNY none Shanghai",
    "💡 none 表示使用个人默认汇率源，只用于占住汇率源位置；必须完整拼写。",
  ].join("\n");
}

async function selectedPreferences(
  request: ConversionRequest,
  userId: number | undefined,
  deps: BotDependencies,
): Promise<{ request: ConversionRequest; timeZone: string }> {
  const needsSettings = request.usesDefaultSource || !request.timeZone;
  const settings = userId !== undefined && needsSettings
    ? await deps.settings.get(userId)
    : {};
  const savedSource = settings.source && Object.hasOwn(SOURCE_NAMES, settings.source)
    ? settings.source
    : deps.defaultSource;
  const source = request.usesDefaultSource
    ? savedSource
    : request.source;
  return {
    request: { ...request, source },
    timeZone: request.timeZone ?? settings.timeZone ?? DEFAULT_TIME_ZONE,
  };
}

async function handleTimeCommand(
  chatId: number,
  userId: number | undefined,
  argument: string | undefined,
  deps: BotDependencies,
): Promise<void> {
  if (userId === undefined) {
    await deps.telegram.sendMessage(chatId, "无法识别用户，不能保存时区设置");
    return;
  }

  if (!argument) {
    const current = (await deps.settings.get(userId)).timeZone ?? DEFAULT_TIME_ZONE;
    await deps.telegram.sendMessage(chatId, timeHelp(current));
    return;
  }

  if (argument.toLowerCase() === "reset") {
    await deps.settings.deleteTimeZone(userId);
    await deps.telegram.sendMessage(
      chatId,
      `✅ 已恢复默认时区：${timeZoneLabel(DEFAULT_TIME_ZONE, new Date())}`,
    );
    return;
  }

  const timeZone = normalizeTimeZone(argument);
  await deps.settings.setTimeZone(userId, timeZone);
  await deps.telegram.sendMessage(chatId, `✅ 时区已设置：${timeZoneLabel(timeZone, new Date())}`);
}

async function handleSourceCommand(
  chatId: number,
  userId: number | undefined,
  argument: string | undefined,
  deps: BotDependencies,
): Promise<void> {
  if (!argument) {
    const stored = userId === undefined ? undefined : (await deps.settings.get(userId)).source;
    const current = stored && Object.hasOwn(SOURCE_NAMES, stored)
      ? stored
      : deps.defaultSource;
    await deps.telegram.sendMessage(chatId, sourceHelp(current));
    return;
  }

  if (userId === undefined) {
    await deps.telegram.sendMessage(chatId, "无法识别用户，不能保存汇率源设置");
    return;
  }

  if (argument.toLowerCase() === "reset") {
    await deps.settings.deleteSource(userId);
    await deps.telegram.sendMessage(
      chatId,
      `✅ 已恢复默认汇率源：${SOURCE_NAMES[deps.defaultSource]}`,
    );
    return;
  }

  const source = parseSource(argument);
  await deps.settings.setSource(userId, source);
  await deps.telegram.sendMessage(chatId, `✅ 默认汇率源已设置：${SOURCE_NAMES[source]}`);
}

export async function handleUpdate(update: TelegramUpdate, deps: BotDependencies): Promise<void> {
  if (update.message?.text) {
    const text = update.message.text.trim();
    const cmd = command(text);
    if (cmd?.name === "source" || cmd?.name === "sources") {
      try {
        await handleSourceCommand(
          update.message.chat.id,
          update.message.from?.id,
          cmd.argument,
          deps,
        );
      } catch (error) {
        await deps.telegram.sendMessage(update.message.chat.id, publicError(error));
      }
      return;
    }
    if (cmd?.name === "start" || cmd?.name === "help") {
      await deps.telegram.sendMessage(update.message.chat.id, USAGE);
      return;
    }
    if (cmd?.name === "time") {
      try {
        await handleTimeCommand(
          update.message.chat.id,
          update.message.from?.id,
          cmd.argument,
          deps,
        );
      } catch (error) {
        await deps.telegram.sendMessage(update.message.chat.id, publicError(error));
      }
      return;
    }

    try {
      const request = parseConversion(text, deps.defaultSource);
      const selected = await selectedPreferences(
        request,
        update.message.from?.id,
        deps,
      );
      const quote = await deps.getQuote(selected.request);
      await deps.telegram.sendMessage(
        update.message.chat.id,
        formatResult(selected.request, quote, selected.timeZone),
      );
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
      const selected = await selectedPreferences(
        request,
        update.inline_query.from?.id,
        deps,
      );
      const quote = await deps.getQuote(selected.request);
      const result = formatResult(selected.request, quote, selected.timeZone);
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
