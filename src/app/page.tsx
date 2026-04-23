"use client"

import * as React from "react"
import { toast } from "sonner"

import { ApiKeysCard } from "@/components/console/api-keys-card"
import { GroupsCard } from "@/components/console/groups-card"
import { TokenCard, type ConsoleStatus } from "@/components/console/token-card"
import { LoginCard } from "@/components/console/login-card"
import { UpstreamManager, type Upstream } from "@/components/console/upstream-manager"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { extractList } from "@/lib/extract"
import { useLocalStorageJson, useLocalStorageString } from "@/hooks/use-local-storage"

const UPSTREAMS_STORAGE_KEY = "console:upstreams"
const ACTIVE_UPSTREAM_STORAGE_KEY = "console:activeUpstreamId"
const TOKEN_STORAGE_KEY_PREFIX = "console:token:"

const DEFAULT_UPSTREAMS: Upstream[] = [
  { id: "router", name: "ai.router.team", baseUrl: "https://ai.router.team" },
]

type UserInfo = {
  id?: number
  email?: string
  displayName?: string
  role?: string
  emailVerified?: boolean
}

function getTokenKey(upstreamId: string) {
  return `${TOKEN_STORAGE_KEY_PREFIX}${upstreamId}`
}

function isUpstreamArray(value: unknown): value is Upstream[] {
  if (!Array.isArray(value)) return false
  for (const item of value) {
    if (!item || typeof item !== "object") return false
    const v = item as Record<string, unknown>
    if (typeof v.id !== "string" || typeof v.name !== "string" || typeof v.baseUrl !== "string") return false
  }
  return true
}

function getDefaultUpstreams(): Upstream[] {
  return DEFAULT_UPSTREAMS
}

async function readJsonSafely(res: Response) {
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

function getErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") return null
  const v = payload as Record<string, unknown>
  return typeof v.message === "string" ? v.message : null
}

function getAccessToken(payload: unknown) {
  if (!payload || typeof payload !== "object") return null
  const v = payload as Record<string, unknown>
  return typeof v.accessToken === "string" ? v.accessToken : null
}

function getUserInfo(payload: unknown): UserInfo | null {
  if (!payload || typeof payload !== "object") return null
  const v = payload as Record<string, unknown>
  if (!v.user || typeof v.user !== "object") return null
  const u = v.user as Record<string, unknown>
  return {
    id: typeof u.id === "number" ? u.id : undefined,
    email: typeof u.email === "string" ? u.email : undefined,
    displayName: typeof u.displayName === "string" ? u.displayName : undefined,
    role: typeof u.role === "string" ? u.role : undefined,
    emailVerified: typeof u.emailVerified === "boolean" ? u.emailVerified : undefined,
  }
}

async function callAuthedApi(token: string, upstreamBaseUrl: string, path: string) {
  const res = await fetch(path, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}`, "x-upstream-base": upstreamBaseUrl },
    cache: "no-store",
  })

  const elapsed = Number(res.headers.get("x-upstream-elapsed-ms") ?? "")
  const payload = await readJsonSafely(res)

  if (!res.ok) {
    throw Object.assign(new Error(getErrorMessage(payload) ?? `HTTP ${res.status}`), {
      status: res.status,
      payload,
    })
  }

  return {
    payload,
    elapsedMs: Number.isFinite(elapsed) ? elapsed : null,
  }
}

export default function Home() {
  const [upstreams, setUpstreams] = useLocalStorageJson<Upstream[]>(
    UPSTREAMS_STORAGE_KEY,
    getDefaultUpstreams(),
    isUpstreamArray
  )

  const [activeUpstreamId, setActiveUpstreamId] = useLocalStorageString(
    ACTIVE_UPSTREAM_STORAGE_KEY,
    upstreams[0]?.id ?? "router"
  )

  const [storedToken, setStoredToken] = useLocalStorageString(getTokenKey(activeUpstreamId), "")
  const [tokenDraft, setTokenDraft] = React.useState("")
  const [persistToken, setPersistToken] = React.useState(true)
  const [status, setStatus] = React.useState<ConsoleStatus>("idle")
  const [lastElapsedMs, setLastElapsedMs] = React.useState<number | null>(null)

  const token = persistToken ? storedToken : tokenDraft

  const [groups, setGroups] = React.useState<unknown[] | null>(null)
  const [groupsLoading, setGroupsLoading] = React.useState(false)
  const [groupFilter, setGroupFilter] = React.useState("")
  const [selectedGroupId, setSelectedGroupId] = React.useState<string | null>(null)

  const [apiRaw, setApiRaw] = React.useState<unknown | null>(null)
  const [apiItems, setApiItems] = React.useState<unknown[] | null>(null)
  const [apiLoading, setApiLoading] = React.useState(false)
  const [apiFilter, setApiFilter] = React.useState("")
  const [page, setPage] = React.useState(1)
  const [size, setSize] = React.useState(10)
  const [apiElapsedMs, setApiElapsedMs] = React.useState<number | null>(null)

  const [loginLoading, setLoginLoading] = React.useState(false)
  const [user, setUser] = React.useState<UserInfo | null>(null)

  const activeUpstream = upstreams.find((u) => u.id === activeUpstreamId) ?? upstreams[0]

  const onCopy = React.useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success("已复制")
    } catch {
      toast.error("复制失败")
    }
  }, [])

  const fetchGroups = React.useCallback(async () => {
    if (!token) {
      toast.error("请先输入 Token")
      return
    }
    setStatus("loading")
    setGroupsLoading(true)
    try {
      const { payload, elapsedMs } = await callAuthedApi(
        token,
        activeUpstream.baseUrl,
        "/api/upstream/groups"
      )
      setGroups(extractList(payload))
      if (elapsedMs !== null) setLastElapsedMs(elapsedMs)
      setStatus("ok")
      toast.success("分组已更新")
    } catch (e) {
      setStatus("error")
      toast.error(e instanceof Error ? e.message : "请求失败")
    } finally {
      setGroupsLoading(false)
    }
  }, [activeUpstream.baseUrl, token])

  const fetchApiKeys = React.useCallback(async () => {
    if (!token) {
      toast.error("请先输入 Token")
      return
    }
    setStatus("loading")
    setApiLoading(true)
    try {
      const { payload, elapsedMs } = await callAuthedApi(
        token,
        activeUpstream.baseUrl,
        `/api/upstream/api-keys/paged?page=${page}&size=${size}`
      )
      setApiRaw(payload)
      setApiItems(extractList(payload))
      if (elapsedMs !== null) {
        setApiElapsedMs(elapsedMs)
        setLastElapsedMs(elapsedMs)
      }
      setStatus("ok")
      toast.success("列表已更新")
    } catch (e) {
      setStatus("error")
      toast.error(e instanceof Error ? e.message : "请求失败")
    } finally {
      setApiLoading(false)
    }
  }, [activeUpstream.baseUrl, page, size, token])

  const refreshAll = React.useCallback(async () => {
    await fetchGroups()
    await fetchApiKeys()
  }, [fetchApiKeys, fetchGroups])

  const login = React.useCallback(
    async (payload: { username: string; password: string }) => {
      setStatus("loading")
      setLoginLoading(true)
      try {
        const res = await fetch("/api/upstream/auth/login", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-upstream-base": activeUpstream.baseUrl,
          },
          body: JSON.stringify(payload),
          cache: "no-store",
        })

        const elapsed = Number(res.headers.get("x-upstream-elapsed-ms") ?? "")
        const body = await readJsonSafely(res)
        if (!res.ok) throw new Error(getErrorMessage(body) ?? `HTTP ${res.status}`)

        const accessToken = getAccessToken(body)
        const userInfo = getUserInfo(body)

        if (!accessToken) {
          toast.error("未找到 accessToken 字段")
          setStatus("error")
          return
        }

        setUser(userInfo)
        if (persistToken) setStoredToken(accessToken)
        else setTokenDraft(accessToken)
        if (Number.isFinite(elapsed)) setLastElapsedMs(elapsed)
        setStatus("ok")
        toast.success("登录成功")
      } catch (e) {
        setStatus("error")
        toast.error(e instanceof Error ? e.message : "登录失败")
      } finally {
        setLoginLoading(false)
      }
    },
    [activeUpstream.baseUrl, persistToken, setStoredToken, setTokenDraft]
  )

  const loginWithDefault = React.useCallback(async () => {
    setStatus("loading")
    setLoginLoading(true)
    try {
      const res = await fetch("/api/bootstrap/login", {
        method: "POST",
        headers: { "x-upstream-base": activeUpstream.baseUrl },
        cache: "no-store",
      })

      const elapsed = Number(res.headers.get("x-upstream-elapsed-ms") ?? "")
      const body = await readJsonSafely(res)
      if (!res.ok) throw new Error(getErrorMessage(body) ?? `HTTP ${res.status}`)

      const accessToken = getAccessToken(body)
      const userInfo = getUserInfo(body)

      if (!accessToken) {
        toast.error("未找到 accessToken 字段")
        setStatus("error")
        return
      }

      setUser(userInfo)
      if (persistToken) setStoredToken(accessToken)
      else setTokenDraft(accessToken)
      if (Number.isFinite(elapsed)) setLastElapsedMs(elapsed)
      setStatus("ok")
      toast.success("登录成功")
    } catch (e) {
      setStatus("error")
      toast.error(e instanceof Error ? e.message : "登录失败")
    } finally {
      setLoginLoading(false)
    }
  }, [activeUpstream.baseUrl, persistToken, setStoredToken, setTokenDraft])

  return (
    <div className="relative flex flex-1 flex-col">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-40 -top-40 size-[520px] rounded-full bg-[radial-gradient(circle_at_center,oklch(0.8_0.16_200/0.22),transparent_65%)] blur-2xl" />
        <div className="absolute -right-56 top-24 size-[640px] rounded-full bg-[radial-gradient(circle_at_center,oklch(0.75_0.18_260/0.18),transparent_70%)] blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,oklch(0.145_0_0/0.9))]" />
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-2">
              <div className="text-2xl font-semibold tracking-tight">接口查询控制台</div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>目标：</span>
                <Badge variant="secondary">/api/auth/login</Badge>
                <Badge variant="secondary">/api/user/api-keys/groups</Badge>
                <Badge variant="secondary">/api/user/api-keys/paged</Badge>
                <span>（不设置 User-Agent）</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={status === "ok" ? "default" : status === "error" ? "destructive" : "secondary"}>
                {status === "idle" && "就绪"}
                {status === "loading" && "请求中"}
                {status === "ok" && "已连接"}
                {status === "error" && "失败"}
              </Badge>
              {typeof lastElapsedMs === "number" && (
                <span className="font-mono text-xs text-muted-foreground">{lastElapsedMs}ms</span>
              )}
              <Separator orientation="vertical" className="hidden h-5 md:block" />
              <Button variant="secondary" onClick={refreshAll} disabled={!token || status === "loading"}>
                刷新全部
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setStoredToken("")
                  setTokenDraft("")
                  setUser(null)
                  setGroups(null)
                  setSelectedGroupId(null)
                  setApiItems(null)
                  setApiRaw(null)
                  toast.success("已清空")
                }}
                disabled={status === "loading"}
              >
                清空
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-2 rounded-xl border bg-card/40 p-4 backdrop-blur supports-[backdrop-filter]:bg-card/30">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <UpstreamManager
                upstreams={upstreams}
                value={activeUpstreamId}
                onValueChange={(id) => {
                  setActiveUpstreamId(id)
                  setGroups(null)
                  setSelectedGroupId(null)
                  setApiItems(null)
                  setApiRaw(null)
                  setTokenDraft("")
                  setUser(null)
                }}
                onUpstreamsChange={setUpstreams}
              />
              <div className="text-xs text-muted-foreground">
                同域转发：/api/upstream/*（避免浏览器 CORS）
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <LoginCard
            loading={loginLoading}
            onLogin={login}
            onLoginWithDefault={loginWithDefault}
            user={user}
            upstreamId={activeUpstreamId}
          />
          <TokenCard
            token={token}
            onTokenChange={(v) => {
              if (persistToken) setStoredToken(v)
              else setTokenDraft(v)
            }}
            persistToken={persistToken}
            onPersistTokenChange={(v) => {
              if (v) {
                setStoredToken(tokenDraft)
                setTokenDraft("")
              } else {
                setTokenDraft(storedToken)
                setStoredToken("")
              }
              setPersistToken(v)
            }}
            status={status}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <GroupsCard
              groups={groups}
              loading={groupsLoading}
              filter={groupFilter}
              onFilterChange={setGroupFilter}
              selectedId={selectedGroupId}
              onSelect={setSelectedGroupId}
              onCopy={onCopy}
              onFetch={fetchGroups}
              canFetch={Boolean(token)}
            />
          </div>
          <div className="lg:col-span-3">
            <ApiKeysCard
              raw={apiRaw}
              items={apiItems}
              loading={apiLoading}
              filter={apiFilter}
              onFilterChange={setApiFilter}
              page={page}
              size={size}
              onPageChange={setPage}
              onSizeChange={(v) => {
                setSize(v)
                setPage(1)
              }}
              lastElapsedMs={apiElapsedMs}
              onFetch={fetchApiKeys}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
