import type { InlineResult, TelegramGateway } from "./app";
import { ProviderError, type Fetcher } from "./providers/types";

interface TelegramResponse {
  ok?: boolean;
  description?: string;
}

export class TelegramClient implements TelegramGateway {
  constructor(
    private readonly token: string,
    private readonly fetcher: Fetcher = fetch,
  ) {}

  sendMessage(chatId: number, text: string): Promise<void> {
    return this.call("sendMessage", { chat_id: chatId, text });
  }

  answerInlineQuery(inlineQueryId: string, results: InlineResult[]): Promise<void> {
    return this.call("answerInlineQuery", {
      inline_query_id: inlineQueryId,
      results,
      cache_time: 1,
      is_personal: true,
    });
  }

  private async call(method: string, payload: unknown): Promise<void> {
    const response = await this.fetcher(`https://api.telegram.org/bot${this.token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = (await response.json().catch(() => ({}))) as TelegramResponse;
    if (!response.ok || !body.ok) {
      throw new ProviderError(body.description ?? `Telegram API 请求失败 (${response.status})`);
    }
  }
}
