import { NextResponse } from "next/server"

export type ApiErrorPayload = {
  ok: false
  status: number
  message: string
  upstream?: {
    status?: number
    body?: unknown
  }
}

export type UpstreamType = "router" | "findcg"

export interface UpstreamApiConfig {
  loginPath: string
  groupsPath: string
  apiKeysPath: string
  serviceHealthPath?: string
  accessTokenField: string
  dataField: string
  listField: string
  totalField: string
}

export const UPSTREAM_CONFIGS: Record<UpstreamType, UpstreamApiConfig> = {
  router: {
    loginPath: "/api/auth/login",
    groupsPath: "/api/user/api-keys/groups",
    apiKeysPath: "/api/user/api-keys/paged",
    serviceHealthPath: "/api/user/service-health",
    accessTokenField: "accessToken",
    dataField: "",
    listField: "data",
    totalField: "total",
  },
  findcg: {
    loginPath: "/api/v1/auth/login",
    groupsPath: "/api/v1/groups/available",
    apiKeysPath: "/api/v1/keys",
    serviceHealthPath: "/api/v1/availability/status",
    accessTokenField: "access_token",
    dataField: "data",
    listField: "items",
    totalField: "total",
  },
}

export const DEFAULT_UPSTREAM_BASE = "https://ai.router.team"
const DEFAULT_TIMEOUT_MS = 12_000
const MIN_TIMEOUT_MS = 1_000
const MAX_TIMEOUT_MS = 60_000

function getBearerToken(req: Request) {
  const raw = req.headers.get("authorization") ?? ""
  const token = raw.startsWith("Bearer ") ? raw.slice("Bearer ".length).trim() : ""
  return token || null
}

function isIpv4(hostname: string) {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)
}

function isPrivateIpv4(hostname: string) {
  if (!isIpv4(hostname)) return false
  const parts = hostname.split(".").map((v) => Number(v))
  if (parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true

  const [a, b] = parts
  if (a === 10) return true
  if (a === 127) return true
  if (a === 169 && b === 254) return true
  if (a === 192 && b === 168) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  return false
}

function getTimeoutMs(req: Request) {
  const raw = (req.headers.get("x-upstream-timeout-ms") ?? "").trim()
  if (!raw) return DEFAULT_TIMEOUT_MS
  const n = Number(raw)
  if (!Number.isFinite(n)) return DEFAULT_TIMEOUT_MS
  return Math.max(MIN_TIMEOUT_MS, Math.min(MAX_TIMEOUT_MS, Math.floor(n)))
}

export function validateUpstreamBase(base: string) {
  try {
    // 移除末尾的斜杠，避免双斜杠问题
    const cleanBase = base.replace(/\/$/, "")
    const url = new URL(cleanBase)
    if (url.protocol !== "https:") return null
    if (url.username || url.password) return null
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "::1") return null
    if (isPrivateIpv4(url.hostname)) return null
    url.hash = ""
    url.search = ""
    return url
  } catch {
    return null
  }
}

export function getUpstreamBaseFromRequest(req: Request) {
  const base = req.headers.get("x-upstream-base") ?? DEFAULT_UPSTREAM_BASE
  const url = validateUpstreamBase(base)
  if (!url) {
    return NextResponse.json(
      { ok: false, status: 400, message: "无效的上游地址（仅允许 https，且禁止 localhost/内网 IP）" } satisfies ApiErrorPayload,
      { status: 400 }
    )
  }
  return url
}

async function safeReadJson(res: Response) {
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

export async function proxyUpstreamAuthedJson(req: Request, url: string) {
  const token = getBearerToken(req)
  if (!token) {
    return NextResponse.json(
      { ok: false, status: 401, message: "缺少 Authorization: Bearer <token>" } satisfies ApiErrorPayload,
      { status: 401 }
    )
  }

  const startedAt = Date.now()
  const ctrl = new AbortController()
  const timeout = setTimeout(() => ctrl.abort(), getTimeoutMs(req))

  try {
    const isFindcg = url.includes("findcg")
    
    const upstreamRes = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "*/*",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0",
        ...(isFindcg ? { "Host": "www.findcg.com" } : {}),
      },
      cache: "no-store",
      signal: ctrl.signal,
    })

    const elapsedMs = Date.now() - startedAt
    const body = await safeReadJson(upstreamRes)

    if (!upstreamRes.ok) {
      return NextResponse.json(
        {
          ok: false,
          status: upstreamRes.status,
          message: "上游请求失败",
          upstream: { status: upstreamRes.status, body },
        } satisfies ApiErrorPayload,
        { status: upstreamRes.status }
      )
    }

    return NextResponse.json(body, {
      status: upstreamRes.status,
      headers: {
        "cache-control": "no-store",
        "x-upstream-elapsed-ms": String(elapsedMs),
      },
    })
  } catch (err) {
    const elapsedMs = Date.now() - startedAt
    const message = err instanceof Error ? err.message : "未知错误"
    const status = message.toLowerCase().includes("aborted") ? 504 : 502

    return NextResponse.json(
      {
        ok: false,
        status,
        message: status === 504 ? "请求超时" : "无法连接上游服务",
        upstream: { body: { message, elapsedMs } },
      } satisfies ApiErrorPayload,
      { status }
    )
  } finally {
    clearTimeout(timeout)
  }
}

export async function proxyUpstreamJson(req: Request, url: string) {
  const startedAt = Date.now()
  const ctrl = new AbortController()
  const timeout = setTimeout(() => ctrl.abort(), getTimeoutMs(req))

  try {
    let jsonBody: unknown = null
    const method = req.method.toUpperCase()

    if (method !== "GET" && method !== "HEAD") {
      try {
        jsonBody = await req.json()
      } catch {
        jsonBody = null
      }
    }

    const isFindcg = url.includes("findcg")
    
    const headers: Record<string, string> = {
      Accept: "*/*",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0",
      "Connection": "keep-alive",
      ...(jsonBody ? { "content-type": "application/json" } : {}),
      ...(isFindcg ? { "Host": "www.findcg.com" } : {}),
    }
    
    console.log(`[proxyUpstreamJson] Request URL: ${url}`)
    console.log(`[proxyUpstreamJson] Request Method: ${method}`)
    console.log(`[proxyUpstreamJson] Request Headers:`, JSON.stringify(headers, null, 2))
    console.log(`[proxyUpstreamJson] Request Body:`, jsonBody ? JSON.stringify(jsonBody, null, 2) : "null")
    
    const upstreamRes = await fetch(url, {
      method,
      headers,
      body: jsonBody ? JSON.stringify(jsonBody) : undefined,
      cache: "no-store",
      signal: ctrl.signal,
    })

    const elapsedMs = Date.now() - startedAt
    const body = await safeReadJson(upstreamRes)

    if (!upstreamRes.ok) {
      return NextResponse.json(
        {
          ok: false,
          status: upstreamRes.status,
          message: "上游请求失败",
          upstream: { status: upstreamRes.status, body },
        } satisfies ApiErrorPayload,
        { status: upstreamRes.status }
      )
    }

    return NextResponse.json(body, {
      status: upstreamRes.status,
      headers: {
        "cache-control": "no-store",
        "x-upstream-elapsed-ms": String(elapsedMs),
      },
    })
  } catch (err) {
    const elapsedMs = Date.now() - startedAt
    const message = err instanceof Error ? err.message : "未知错误"
    const status = message.toLowerCase().includes("aborted") ? 504 : 502

    return NextResponse.json(
      {
        ok: false,
        status,
        message: status === 504 ? "请求超时" : "无法连接上游服务",
        upstream: { body: { message, elapsedMs } },
      } satisfies ApiErrorPayload,
      { status }
    )
  } finally {
    clearTimeout(timeout)
  }
}
