import type { UpstreamProvider, UserInfo, HealthSummary, HealthGroupItem } from "./types"

export const routerProvider: UpstreamProvider = {
  id: "router",
  name: "ai.router.team",
  defaultBaseUrl: "https://ai.router.team",

  loginLabel: "用户名（邮箱）",
  credentialEnvPrefix: "ROUTER",

  paths: {
    login: "/api/auth/login",
    groups: "/api/user/api-keys/groups",
    apiKeys: "/api/user/api-keys/paged",
    serviceHealth: "/api/user/service-health",
  },

  transformLoginPayload(username: string, password: string) {
    return { username, password }
  },

  buildGroupsUrl(baseUrl: string, path: string) {
    return new URL(path, baseUrl)
  },

  buildApiKeysUrl(baseUrl: string, path: string, page: number, size: number) {
    const url = new URL(path, baseUrl)
    url.searchParams.set("page", String(page))
    url.searchParams.set("size", String(size))
    return url
  },

  buildServiceHealthUrl(baseUrl: string, path: string) {
    return new URL(path, baseUrl)
  },

  extractAccessToken(response: unknown): string | null {
    if (!response || typeof response !== "object") return null
    const v = response as Record<string, unknown>
    if (typeof v.accessToken === "string") return v.accessToken
    return null
  },

  extractUserInfo(response: unknown): UserInfo | null {
    if (!response || typeof response !== "object") return null
    const v = response as Record<string, unknown>
    if (!v.user || typeof v.user !== "object") return null
    const u = v.user as Record<string, unknown>
    return {
      id: typeof u.id === "number" ? u.id : undefined,
      email: typeof u.email === "string" ? u.email : undefined,
      displayName: (typeof u.displayName === "string" ? u.displayName : undefined) ||
                   (typeof u.username === "string" && u.username ? u.username : undefined),
      role: typeof u.role === "string" ? u.role : undefined,
      emailVerified: typeof u.emailVerified === "boolean" ? u.emailVerified : undefined,
    }
  },

  extractErrorMessage(response: unknown): string | null {
    if (!response || typeof response !== "object") return null
    const v = response as Record<string, unknown>
    if (typeof v.message === "string") return v.message
    return null
  },

  extractList(response: unknown): unknown[] {
    if (Array.isArray(response)) return response
    if (!response || typeof response !== "object") return []
    const v = response as Record<string, unknown>
    const candidates = [v.data, v.items, v.records, v.list, v.content]
    for (const c of candidates) {
      if (Array.isArray(c)) return c
    }
    if (v.data && typeof v.data === "object") return this.extractList(v.data)
    return []
  },

  extractTotal(response: unknown): number | null {
    if (!response || typeof response !== "object") return null
    const v = response as Record<string, unknown>
    const candidates = [v.total, v.count, v.totalElements, v.totalCount]
    for (const c of candidates) {
      if (typeof c === "number" && Number.isFinite(c)) return c
    }
    if (v.data && typeof v.data === "object") return this.extractTotal(v.data)
    return null
  },

  extractHealthSummary(response: unknown): HealthSummary | null {
    if (!response || typeof response !== "object") return null
    const v = response as Record<string, unknown>
    if (!v.summary || typeof v.summary !== "object") return null
    const s = v.summary as Record<string, unknown>
    const total = typeof s.totalGroups === "number" ? s.totalGroups : null
    const healthy = typeof s.healthyGroups === "number" ? s.healthyGroups : null
    const abnormal = typeof s.abnormalGroups === "number" ? s.abnormalGroups : null
    if (total === null && healthy === null && abnormal === null) return null
    return { total, healthy, abnormal }
  },

  extractHealthGroups(response: unknown): HealthGroupItem[] {
    if (!response || typeof response !== "object") return []
    const v = response as Record<string, unknown>
    if (!Array.isArray(v.groups)) return []
    return v.groups
      .flatMap((item) => {
        if (!item || typeof item !== "object") return []
        const g = item as Record<string, unknown>
        const name = typeof g.name === "string" ? g.name : ""
        if (!name) return []
        const healthy = typeof g.healthy === "boolean" ? g.healthy : null
        return [{
          raw: item,
          id: typeof g.id === "number" ? g.id : null,
          name,
          channelName: typeof g.channelName === "string" ? g.channelName : null,
          healthy,
          lastCheckLatencyMs: typeof g.lastCheckLatencyMs === "number" ? g.lastCheckLatencyMs : null,
          availabilityRate: typeof g.availabilityRate === "number" ? g.availabilityRate : null,
          lastCheckedAt: typeof g.lastCheckedAt === "string" ? g.lastCheckedAt : null,
          currentStatus: null,
          records: Array.isArray(g.records) ? g.records : [],
          layers: [],
        }]
      })
  },

  getExtraHeaders(_url: string): Record<string, string> {
    return {}
  },
}
