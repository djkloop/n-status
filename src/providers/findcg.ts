import type { UpstreamProvider, UserInfo, HealthSummary, HealthGroupItem } from "./types"

export const findcgProvider: UpstreamProvider = {
  id: "findcg",
  name: "findcg.com",
  defaultBaseUrl: "https://www.findcg.com",

  loginLabel: "邮箱",
  credentialEnvPrefix: "FINDCG",

  paths: {
    login: "/api/v1/auth/login",
    groups: "/api/v1/groups/available",
    apiKeys: "/api/v1/keys",
    serviceHealth: "/api/v1/availability/status",
  },

  transformLoginPayload(username: string, password: string) {
    return { email: username, password }
  },

  buildGroupsUrl(baseUrl: string, path: string) {
    const url = new URL(path, baseUrl)
    url.searchParams.set("timezone", "Asia/Shanghai")
    return url
  },

  buildApiKeysUrl(baseUrl: string, path: string, page: number, size: number) {
    const url = new URL(path, baseUrl)
    url.searchParams.set("page", String(page))
    url.searchParams.set("page_size", String(size))
    url.searchParams.set("timezone", "Asia/Shanghai")
    return url
  },

  buildServiceHealthUrl(baseUrl: string, path: string) {
    const url = new URL(path, baseUrl)
    url.searchParams.set("timezone", "Asia/Shanghai")
    return url
  },

  extractAccessToken(response: unknown): string | null {
    if (!response || typeof response !== "object") return null
    const v = response as Record<string, unknown>
    if (v.code === 0 && v.data && typeof v.data === "object") {
      const d = v.data as Record<string, unknown>
      if (typeof d.access_token === "string") return d.access_token
      if (typeof d.accessToken === "string") return d.accessToken
    }
    if (typeof v.access_token === "string") return v.access_token
    return null
  },

  extractUserInfo(response: unknown): UserInfo | null {
    if (!response || typeof response !== "object") return null
    const v = response as Record<string, unknown>
    let userObj: Record<string, unknown> | null = null
    if (v.code === 0 && v.data && typeof v.data === "object") {
      const d = v.data as Record<string, unknown>
      if (d.user && typeof d.user === "object") userObj = d.user as Record<string, unknown>
    }
    if (!userObj) return null
    return {
      id: typeof userObj.id === "number" ? userObj.id : undefined,
      email: typeof userObj.email === "string" ? userObj.email : undefined,
      displayName: (typeof userObj.displayName === "string" ? userObj.displayName : undefined) ||
                   (typeof userObj.username === "string" && userObj.username ? userObj.username : undefined),
      role: typeof userObj.role === "string" ? userObj.role : undefined,
      emailVerified: typeof userObj.emailVerified === "boolean" ? userObj.emailVerified : undefined,
    }
  },

  extractErrorMessage(response: unknown): string | null {
    if (!response || typeof response !== "object") return null
    const v = response as Record<string, unknown>
    if (typeof v.message === "string") return v.message
    if (v.data && typeof v.data === "object") {
      const d = v.data as Record<string, unknown>
      if (typeof d.message === "string") return d.message
    }
    return null
  },

  extractList(response: unknown): unknown[] {
    if (Array.isArray(response)) return response
    if (!response || typeof response !== "object") return []
    const v = response as Record<string, unknown>
    if (v.code === 0 && v.data !== undefined && v.data !== null) {
      if (Array.isArray(v.data)) return v.data
      if (typeof v.data === "object") {
        const d = v.data as Record<string, unknown>
        const candidates = [d.items, d.data, d.records, d.list, d.content]
        for (const c of candidates) {
          if (Array.isArray(c)) return c
        }
      }
      return []
    }
    if (Array.isArray(v.groups)) return v.groups
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
    if (v.code === 0 && v.data && typeof v.data === "object") {
      const d = v.data as Record<string, unknown>
      const candidates = [d.total, d.count, d.totalElements, d.totalCount]
      for (const c of candidates) {
        if (typeof c === "number" && Number.isFinite(c)) return c
      }
      return null
    }
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
    if (Array.isArray(v.groups)) {
      const total = v.groups.length
      const healthy = v.groups.filter((g: unknown) => {
        if (!g || typeof g !== "object") return false
        const gg = g as Record<string, unknown>
        return gg.current_status === 1
      }).length
      return { total, healthy, abnormal: total - healthy }
    }
    return null
  },

  extractHealthGroups(response: unknown): HealthGroupItem[] {
    if (!response || typeof response !== "object") return []
    const v = response as Record<string, unknown>
    if (!Array.isArray(v.groups)) return []
    return v.groups
      .map((item) => {
        if (!item || typeof item !== "object") return null
        const g = item as Record<string, unknown>
        const name = typeof g.provider === "string" ? g.provider : ""
        const currentStatus = typeof g.current_status === "number" ? g.current_status : null
        const healthy = currentStatus === 1 ? true : currentStatus !== null ? false : null
        const layers = Array.isArray(g.layers) ? g.layers : []

        let resolvedLatency: number | null = null
        let resolvedAvailability: number | null = null
        let resolvedLastCheckedAt: string | null = null

        if (layers.length > 0) {
          const firstLayer = layers[0] as Record<string, unknown>
          if (typeof firstLayer.current_status === "object" && firstLayer.current_status) {
            const cs = firstLayer.current_status as Record<string, unknown>
            if (typeof cs.latency === "number") resolvedLatency = cs.latency
            if (typeof cs.timestamp === "number") {
              resolvedLastCheckedAt = new Date(cs.timestamp * 1000).toISOString()
            }
          }
          const timeline = Array.isArray(firstLayer.timeline) ? firstLayer.timeline as Record<string, unknown>[] : []
          if (timeline.length > 0) {
            const latest = timeline[timeline.length - 1]
            if (typeof latest.availability === "number") resolvedAvailability = latest.availability
          }
        }

        return {
          raw: item,
          id: typeof g.id === "number" ? g.id : null,
          name,
          channelName: typeof g.channel === "string" ? g.channel : null,
          healthy,
          lastCheckLatencyMs: resolvedLatency,
          availabilityRate: resolvedAvailability,
          lastCheckedAt: resolvedLastCheckedAt,
          currentStatus,
          records: [],
          layers,
        }
      })
      .filter((x): x is HealthGroupItem => Boolean(x && x.name))
  },

  getExtraHeaders(url: string): Record<string, string> {
    if (url.includes("findcg")) {
      return { "Host": "www.findcg.com" }
    }
    return {}
  },
}
