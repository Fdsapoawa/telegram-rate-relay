import { afterEach, describe, expect, it, vi } from "vitest";
import { TelegramClient } from "../src/telegram";

describe("TelegramClient", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls the default runtime fetch without binding it to the client", async () => {
    const runtime = globalThis;
    vi.stubGlobal(
      "fetch",
      vi.fn(function (this: unknown) {
        if (this !== runtime) throw new TypeError("Illegal invocation");
        return Promise.resolve(Response.json({ ok: true }));
      }),
    );

    const client = new TelegramClient("123456789:test-token");

    await expect(client.sendMessage(42, "hello")).resolves.toBeUndefined();
  });
});
