import type { UpstreamProvider, UserInfo, HealthSummary, HealthGroupItem } from "./types"

export const moaiProvider: UpstreamProvider = {
  id: "moai",
  name: "moai.top",
  defaultBaseUrl: "https://moai.top",

  loginLabel: "邮箱",
  credentialEnvPrefix: "MOAI",

  paths: {
    login: "/api/v1/auth/login",
    groups: "/api/v1/groups/available",
    apiKeys: "/api/v1/keys",
    serviceHealth: "/api/v1/channel-monitors",
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
    const data = v.data && typeof v.data === "object" ? v.data as Record<string, unknown> : null
    const items = Array.isArray(data?.items) ? data.items : []
    if (items.length > 0) {
      const total = items.length
      const healthy = items.filter((g: unknown) => {
        if (!g || typeof g !== "object") return false
        const gg = g as Record<string, unknown>
        return gg.primary_status === "operational"
      }).length
      return { total, healthy, abnormal: total - healthy }
    }
    return null
  },

  extractHealthGroups(response: unknown): HealthGroupItem[] {
    if (!response || typeof response !== "object") return []
    const v = response as Record<string, unknown>
    const data = v.data && typeof v.data === "object" ? v.data as Record<string, unknown> : null
    const items = Array.isArray(data?.items) ? data.items : []
    if (items.length === 0) return []

    return items
      .flatMap((item) => {
        if (!item || typeof item !== "object") return []
        const g = item as Record<string, unknown>
        const name = typeof g.name === "string" ? g.name : ""
        if (!name) return []
        const primaryStatus = typeof g.primary_status === "string" ? g.primary_status : null
        const currentStatus = primaryStatus === "operational" ? 1 : primaryStatus ? 0 : null
        const healthy = primaryStatus === "operational" ? true : primaryStatus ? false : null
        const records = Array.isArray(g.timeline)
          ? g.timeline.flatMap((entry) => {
              if (!entry || typeof entry !== "object") return []
              const t = entry as Record<string, unknown>
              const status = typeof t.status === "string" ? t.status : null
              return [{
                fullLabel: typeof g.primary_model === "string" ? g.primary_model : null,
                status: status === "operational" ? "ONLINE" : status === "failed" ? "OFFLINE" : "UNKNOWN",
                severity: status === "degraded" ? "MEDIUM" : status === "failed" ? "HIGH" : null,
                latencyMs: typeof t.latency_ms === "number" ? t.latency_ms : null,
                statusCode: null,
                model: typeof g.primary_model === "string" ? g.primary_model : null,
                message: status,
                checkedAt: typeof t.checked_at === "string" ? t.checked_at : null,
              }]
            })
          : []

        const latestRecord = records[records.length - 1] ?? null

        return [{
          raw: item,
          id: typeof g.id === "number" ? g.id : null,
          name,
          channelName: typeof g.group_name === "string" && g.group_name ? g.group_name : null,
          healthy,
          lastCheckLatencyMs: typeof g.primary_latency_ms === "number" ? g.primary_latency_ms : null,
          availabilityRate: typeof g.availability_7d === "number" ? g.availability_7d : null,
          lastCheckedAt: latestRecord?.checkedAt ?? null,
          currentStatus,
          records,
          layers: [],
        }]
      })
  },

  getExtraHeaders(url: string): Record<string, string> {
    if (url.includes("moai.top")) {
      return { "Host": "moai.top" }
    }
    return {}
  },
}
