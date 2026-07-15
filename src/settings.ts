import { parseSource, type SourceKey } from "./parser";
import { normalizeTimeZone } from "./timezone";

export interface UserSettings {
  timeZone?: string;
  source?: SourceKey;
}

export interface UserSettingsStore {
  get(userId: number): Promise<UserSettings>;
  setTimeZone(userId: number, timeZone: string): Promise<void>;
  deleteTimeZone(userId: number): Promise<void>;
  setSource(userId: number, source: SourceKey): Promise<void>;
  deleteSource(userId: number): Promise<void>;
}

export class UserSettingsError extends Error {
  constructor() {
    super("用户设置暂时不可用，请稍后重试");
    this.name = "UserSettingsError";
  }
}

export class UserSettingsObject {
  constructor(private readonly state: DurableObjectState) {}

  async fetch(request: Request): Promise<Response> {
    const path = new URL(request.url).pathname;
    if (request.method === "GET" && path === "/") {
      const [timeZone, source] = await Promise.all([
        this.state.storage.get<string>("timeZone"),
        this.state.storage.get<SourceKey>("source"),
      ]);
      return Response.json({
        ...(timeZone ? { timeZone } : {}),
        ...(source ? { source } : {}),
      });
    }

    if (path === "/time-zone") {
      if (request.method === "PUT") {
        await this.state.storage.put("timeZone", normalizeTimeZone(await request.text()));
        return new Response(null, { status: 204 });
      }
      if (request.method === "DELETE") {
        await this.state.storage.delete("timeZone");
        return new Response(null, { status: 204 });
      }
    }

    if (path === "/source") {
      if (request.method === "PUT") {
        await this.state.storage.put("source", parseSource(await request.text()));
        return new Response(null, { status: 204 });
      }
      if (request.method === "DELETE") {
        await this.state.storage.delete("source");
        return new Response(null, { status: 204 });
      }
    }

    return new Response("Not Found", { status: 404 });
  }
}

export class DurableObjectUserSettingsStore implements UserSettingsStore {
  constructor(private readonly namespace: DurableObjectNamespace) {}

  async get(userId: number): Promise<UserSettings> {
    const response = await this.request(userId, "/", "GET");
    return (await response.json()) as UserSettings;
  }

  async setTimeZone(userId: number, timeZone: string): Promise<void> {
    await this.request(userId, "/time-zone", "PUT", timeZone);
  }

  async deleteTimeZone(userId: number): Promise<void> {
    await this.request(userId, "/time-zone", "DELETE");
  }

  async setSource(userId: number, source: SourceKey): Promise<void> {
    await this.request(userId, "/source", "PUT", source);
  }

  async deleteSource(userId: number): Promise<void> {
    await this.request(userId, "/source", "DELETE");
  }

  private async request(
    userId: number,
    path: string,
    method: string,
    body?: string,
  ): Promise<Response> {
    const id = this.namespace.idFromName(String(userId));
    const stub = this.namespace.get(id);
    try {
      const response = await stub.fetch(
        new Request(`https://settings${path}`, { method, ...(body ? { body } : {}) }),
      );
      if (!response.ok) throw new UserSettingsError();
      return response;
    } catch (error) {
      if (error instanceof UserSettingsError) throw error;
      throw new UserSettingsError();
    }
  }
}

class UnavailableUserSettingsStore implements UserSettingsStore {
  async get(): Promise<UserSettings> {
    return {};
  }

  async setTimeZone(): Promise<void> {
    throw new UserSettingsError();
  }

  async deleteTimeZone(): Promise<void> {
    throw new UserSettingsError();
  }

  async setSource(): Promise<void> {
    throw new UserSettingsError();
  }

  async deleteSource(): Promise<void> {
    throw new UserSettingsError();
  }
}

export function createUserSettingsStore(
  namespace: DurableObjectNamespace | undefined,
): UserSettingsStore {
  return namespace
    ? new DurableObjectUserSettingsStore(namespace)
    : new UnavailableUserSettingsStore();
}
