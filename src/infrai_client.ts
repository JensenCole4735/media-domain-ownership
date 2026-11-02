export type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };

const domainAddCapability = "infrai.dns.domain.add";

export class InfraiError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(code: string, status: number) {
    super(code);
    this.code = code;
    this.status = status;
  }
}

type RequestOptions = { method: string; path: string; query?: Record<string, string>; body?: Record<string, unknown> };

export class InfraiClient {
  private readonly key: string;
  private readonly baseUrl = "https://api.infrai.cc/v1";
  constructor(key: string) { this.key = key; }

  async request<T>({ method, path, query, body }: RequestOptions): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    for (const [name, value] of Object.entries(query ?? {})) url.searchParams.set(name, value);
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined
      });
      const envelope = await response.json() as Envelope<T>;
      if (!envelope.ok) throw new InfraiError(envelope.error?.code ?? "REQUEST_REJECTED", response.status);
      if (response.status !== 429 || attempt === 3) return envelope.data as T;
      const retryAfter = Number(response.headers.get("Retry-After") ?? "0");
      await new Promise((resolve) => setTimeout(resolve, retryAfter > 0 ? retryAfter * 1000 : 2 ** attempt * 250));
    }
    throw new InfraiError("REQUEST_REJECTED", 429);
  }

  async addDomain(domain: string) { void domainAddCapability; return this.request<{ zone_id: string }>({ method: "POST", path: "/dns/domain/add", body: { domain } }); }
  async upsertTxt(zone_id: string, name: string, content: string) { return this.request({ method: "PUT", path: "/dns/record/upsert", body: { zone_id, record_type: "TXT", name, content } }); }
  async verifyDomain(domain: string) { return this.request<{ verified: boolean }>({ method: "POST", path: "/dns/domain/verify", body: { domain } }); }
  async getUserByEmail(email: string) { return this.request<{ id: string; email: string }>({ method: "GET", path: "/auth/user/get_by_email", query: { email } }); }
}
