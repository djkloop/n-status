import { NextResponse } from "next/server"

import { type ApiErrorPayload, getUpstreamBaseFromRequest } from "@/lib/upstream"
import { getProviderByBaseUrl } from "@/providers"

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0"

function resolveCredentials(provider: { credentialEnvPrefix?: string }) {
  const prefix = provider.credentialEnvPrefix
  if (!prefix) return null

  const username = process.env[`${prefix}_USERNAME`]
  const password = process.env[`${prefix}_PASSWORD`]
  if (username && password) return { username, password }

  return null
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

export async function POST(req: Request) {
  const base = getUpstreamBaseFromRequest(req)
  if (base instanceof Response) return base

  const provider = getProviderByBaseUrl(base.toString())
  const creds = resolveCredentials(provider)

  if (!creds) {
    const prefix = provider.credentialEnvPrefix
      ? `环境变量 ${provider.credentialEnvPrefix}_USERNAME / ${provider.credentialEnvPrefix}_PASSWORD`
      : "当前上游未配置 credentialEnvPrefix"
    return NextResponse.json(
      {
        ok: false,
        status: 500,
        message: `未配置当前上游登录凭据（请设置 ${prefix}）`,
      } satisfies ApiErrorPayload,
      { status: 500 }
    )
  }

  const loginPayload = provider.transformLoginPayload(creds.username, creds.password)
  const url = new URL(provider.paths.login, base)
  const extraHeaders = provider.getExtraHeaders(url.toString())

  const startedAt = Date.now()
  const ctrl = new AbortController()
  const timeout = setTimeout(() => ctrl.abort(), 12_000)

  try {
    const upstreamRes = await fetch(url.toString(), {
      method: "POST",
      headers: {
        Accept: "*/*",
        "User-Agent": UA,
        "Connection": "keep-alive",
        "content-type": "application/json",
        ...extraHeaders,
      },
      body: JSON.stringify(loginPayload),
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
