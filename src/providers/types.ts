export type UserInfo = {
  id?: number
  email?: string
  displayName?: string
  role?: string
  emailVerified?: boolean
}

export type HealthSummary = {
  total: number | null
  healthy: number | null
  abnormal: number | null
}

export type HealthGroupItem = {
  raw: unknown
  id: number | null
  name: string
  channelName: string | null
  healthy: boolean | null
  lastCheckLatencyMs: number | null
  availabilityRate: number | null
  lastCheckedAt: string | null
  currentStatus: number | null
  records: unknown[]
  layers: unknown[]
}

export interface UpstreamProvider {
  id: string
  name: string
  defaultBaseUrl: string

  loginLabel: string
  credentialEnvPrefix?: string

  paths: {
    login: string
    groups: string
    apiKeys: string
    serviceHealth?: string
  }

  transformLoginPayload(username: string, password: string): Record<string, unknown>

  buildGroupsUrl(baseUrl: string, path: string): URL
  buildApiKeysUrl(baseUrl: string, path: string, page: number, size: number): URL
  buildServiceHealthUrl?(baseUrl: string, path: string): URL

  extractAccessToken(response: unknown): string | null
  extractUserInfo(response: unknown): UserInfo | null
  extractErrorMessage(response: unknown): string | null
  extractList(response: unknown): unknown[]
  extractTotal(response: unknown): number | null

  extractHealthSummary(response: unknown): HealthSummary | null
  extractHealthGroups(response: unknown): HealthGroupItem[]

  getExtraHeaders(url: string): Record<string, string>
}
