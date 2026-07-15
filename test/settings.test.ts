import { describe, expect, it, vi } from "vitest";
import {
  DurableObjectUserSettingsStore,
  UserSettingsObject,
} from "../src/settings";

function durableState() {
  const values = new Map<string, unknown>();
  return {
    values,
    state: {
      storage: {
        get: vi.fn(async (key: string) => values.get(key)),
        put: vi.fn(async (key: string, value: unknown) => {
          values.set(key, value);
        }),
        delete: vi.fn(async (key: string) => values.delete(key)),
      },
    } as unknown as DurableObjectState,
  };
}

describe("UserSettingsObject", () => {
  it("stores time zone and source independently", async () => {
    const { state } = durableState();
    const object = new UserSettingsObject(state);

    await object.fetch(
      new Request("https://settings/time-zone", { method: "PUT", body: "UTC" }),
    );
    await object.fetch(
      new Request("https://settings/source", { method: "PUT", body: "kraken" }),
    );

    const response = await object.fetch(new Request("https://settings/"));
    await expect(response.json()).resolves.toEqual({ timeZone: "UTC", source: "kraken" });

    await object.fetch(new Request("https://settings/time-zone", { method: "DELETE" }));
    const afterDelete = await object.fetch(new Request("https://settings/"));
    await expect(afterDelete.json()).resolves.toEqual({ source: "kraken" });
  });
});

describe("DurableObjectUserSettingsStore", () => {
  it("uses the Telegram user ID as the Durable Object name", async () => {
    const fetcher = vi.fn(async (_request: Request) => Response.json({}));
    const namespace = {
      idFromName: vi.fn(() => "durable-id"),
      get: vi.fn(() => ({ fetch: fetcher })),
    } as unknown as DurableObjectNamespace;
    const store = new DurableObjectUserSettingsStore(namespace);

    await store.setSource(7, "coingecko");

    expect(namespace.idFromName).toHaveBeenCalledWith("7");
    const request = fetcher.mock.calls[0]?.[0] as Request;
    expect(request.method).toBe("PUT");
    expect(new URL(request.url).pathname).toBe("/source");
    await expect(request.text()).resolves.toBe("coingecko");
  });
});
