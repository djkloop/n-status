import { NextResponse } from "next/server"

import { type ApiErrorPayload, getUpstreamBaseFromRequest } from "@/lib/upstream"

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

  const username = process.env.DEFAULT_LOGIN_USERNAME
  const password = process.env.DEFAULT_LOGIN_PASSWORD

  if (!username || !password) {
    return NextResponse.json(
      {
        ok: false,
        status: 500,
        message: "未配置默认登录凭据（DEFAULT_LOGIN_USERNAME / DEFAULT_LOGIN_PASSWORD）",
      } satisfies ApiErrorPayload,
      { status: 500 }
    )
  }

  const startedAt = Date.now()
  const ctrl = new AbortController()
  const timeout = setTimeout(() => ctrl.abort(), 12_000)

  try {
    const url = new URL("/api/auth/login", base)
    const upstreamRes = await fetch(url.toString(), {
      method: "POST",
      headers: { "content-type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ username, password }),
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
