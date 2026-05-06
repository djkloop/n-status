"use client"

import * as React from "react"
import { toast } from "sonner"

import { ApiKeysCard } from "@/components/console/api-keys-card"
import { AuthCard } from "@/components/console/auth-card"
import { GroupsCard } from "@/components/console/groups-card"
import { StatusCard } from "@/components/console/status-card"
import { UpstreamTabs, type UpstreamTab } from "@/components/console/upstream-tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { getDefaultUpstreams, getProviderByBaseUrl } from "@/providers"
import type { UserInfo } from "@/providers"
import { loadCache, saveCache, deleteCache, type CachedData } from "@/lib/idb"
import { useLocalStorageJson, useLocalStorageString } from "@/hooks/use-local-storage"

const UPSTREAMS_STORAGE_KEY = "console:upstreams"
const ACTIVE_UPSTREAM_STORAGE_KEY = "console:activeUpstreamId"
const STALE_THRESHOLD_MS = 5 * 60_000

type ConsoleStatus = "idle" | "loading" | "ok" | "error"

type UpstreamConfig = {
  id: string
  name: string
  baseUrl: string
}

function isUpstreamArray(value: unknown): value is UpstreamConfig[] {
  if (!Array.isArray(value)) return false
  for (const item of value) {
    if (!item || typeof item !== "object") return false
    const v = item as Record<string, unknown>
    if (typeof v.id !== "string" || typeof v.name !== "string" || typeof v.baseUrl !== "string") return false
  }
  return true
}

function migrateUpstreams(upstreams: UpstreamConfig[]): UpstreamConfig[] {
  const defaults = getDefaultUpstreams()
  return upstreams.map(u => {
    const provider = getProviderByBaseUrl(u.baseUrl)
    const defaultUpstream = defaults.find(d => d.id === u.id)
    let baseUrl = u.baseUrl.replace(/\/$/, "").replace(/\/api$/, "")
    if (!baseUrl) baseUrl = provider.defaultBaseUrl
    return { ...u, baseUrl, name: defaultUpstream?.name ?? provider.name }
  })
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

type UpstreamState = {
  token: string
  user: UserInfo | null
  groups: unknown[] | null
  apiRaw: unknown | null
  apiItems: unknown[] | null
  apiElapsedMs: number | null
  health: unknown | null
  healthElapsedMs: number | null
  healthError: string | null
  groupsFetchedAt: number | null
  apiFetchedAt: number | null
  healthFetchedAt: number | null
}

function emptyState(): UpstreamState {
  return {
    token: "",
    user: null,
    groups: null,
    apiRaw: null,
    apiItems: null,
    apiElapsedMs: null,
    health: null,
    healthElapsedMs: null,
    healthError: null,
    groupsFetchedAt: null,
    apiFetchedAt: null,
    healthFetchedAt: null,
  }
}

function stateFromCache(c: CachedData): UpstreamState {
  return {
    token: c.token ?? "",
    user: (c.user as UserInfo | null) ?? null,
    groups: (c.groups as unknown[] | null) ?? null,
    apiRaw: c.apiRaw ?? null,
    apiItems: (c.apiItems as unknown[] | null) ?? null,
    apiElapsedMs: null,
    health: c.health ?? null,
    healthElapsedMs: null,
    healthError: c.healthError ?? null,
    groupsFetchedAt: c.groupsFetchedAt ?? null,
    apiFetchedAt: c.apiFetchedAt ?? null,
    healthFetchedAt: c.healthFetchedAt ?? null,
  }
}

function cacheFromState(id: string, s: UpstreamState): CachedData {
  return {
    id,
    token: s.token,
    user: s.user,
    groups: s.groups,
    apiRaw: s.apiRaw,
    apiItems: s.apiItems,
    health: s.health,
    healthError: s.healthError,
    groupsFetchedAt: s.groupsFetchedAt,
    apiFetchedAt: s.apiFetchedAt,
    healthFetchedAt: s.healthFetchedAt,
  }
}

export default function Home() {
  const [rawUpstreams, setUpstreams] = useLocalStorageJson<UpstreamConfig[]>(
    UPSTREAMS_STORAGE_KEY,
    getDefaultUpstreams(),
    isUpstreamArray
  )

  const upstreams = React.useMemo(() => migrateUpstreams(rawUpstreams), [rawUpstreams])

  const [activeUpstreamId, setActiveUpstreamId] = useLocalStorageString(
    ACTIVE_UPSTREAM_STORAGE_KEY,
    upstreams[0]?.id ?? "router"
  )

  const statesRef = React.useRef<Map<string, UpstreamState>>(new Map())
  const getUpstreamState = React.useCallback((id: string) => {
    let s = statesRef.current.get(id)
    if (!s) {
      s = emptyState()
      statesRef.current.set(id, s)
    }
    return s
  }, [])

  const [status, setStatus] = React.useState<ConsoleStatus>("idle")
  const [lastElapsedMs, setLastElapsedMs] = React.useState<number | null>(null)

  const [token, setToken] = React.useState("")
  const [user, setUser] = React.useState<UserInfo | null>(null)

  const [groups, setGroups] = React.useState<unknown[] | null>(null)
  const [groupsLoading, setGroupsLoading] = React.useState(false)
  const [groupFilter, setGroupFilter] = React.useState("")
  const [selectedGroupId, setSelectedGroupId] = React.useState<string | null>(null)
  const [groupsFetchedAt, setGroupsFetchedAt] = React.useState<number | null>(null)

  const [apiRaw, setApiRaw] = React.useState<unknown | null>(null)
  const [apiItems, setApiItems] = React.useState<unknown[] | null>(null)
  const [apiLoading, setApiLoading] = React.useState(false)
  const [apiFilter, setApiFilter] = React.useState("")
  const [page, setPage] = React.useState(1)
  const [size, setSize] = React.useState(10)
  const [apiElapsedMs, setApiElapsedMs] = React.useState<number | null>(null)
  const [selectedApiKeyId, setSelectedApiKeyId] = React.useState<string | null>(null)
  const [apiFetchedAt, setApiFetchedAt] = React.useState<number | null>(null)

  const [health, setHealth] = React.useState<unknown | null>(null)
  const [healthLoading, setHealthLoading] = React.useState(false)
  const [healthElapsedMs, setHealthElapsedMs] = React.useState<number | null>(null)
  const [healthError, setHealthError] = React.useState<string | null>(null)
  const [healthExpanded, setHealthExpanded] = React.useState(false)
  const [healthFetchedAt, setHealthFetchedAt] = React.useState<number | null>(null)

  const [loginLoading, setLoginLoading] = React.useState(false)
  const [refreshingId, setRefreshingId] = React.useState<string | null>(null)

  const activeUpstream = upstreams.find((u) => u.id === activeUpstreamId) ?? upstreams[0]
  const activeProvider = React.useMemo(() => getProviderByBaseUrl(activeUpstream.baseUrl), [activeUpstream.baseUrl])

  const requestQueueRef = React.useRef<Promise<void>>(Promise.resolve())
  const enqueueRequest = React.useCallback((fn: () => Promise<void>) => {
    const run = requestQueueRef.current.then(fn, fn)
    requestQueueRef.current = run.catch(() => undefined)
    return run
  }, [])

  const saveCurrentState = React.useCallback(() => {
    const s: UpstreamState = {
      token,
      user,
      groups,
      apiRaw,
      apiItems,
      apiElapsedMs,
      health,
      healthElapsedMs,
      healthError,
      groupsFetchedAt,
      apiFetchedAt,
      healthFetchedAt,
    }
    statesRef.current.set(activeUpstreamId, s)
    saveCache(cacheFromState(activeUpstreamId, s))
  }, [activeUpstreamId, token, user, groups, apiRaw, apiItems, apiElapsedMs, health, healthElapsedMs, healthError, groupsFetchedAt, apiFetchedAt, healthFetchedAt])

  const loadStateToUI = React.useCallback((s: UpstreamState) => {
    setToken(s.token)
    setUser(s.user)
    setGroups(s.groups)
    setApiRaw(s.apiRaw)
    setApiItems(s.apiItems)
    setApiElapsedMs(s.apiElapsedMs)
    setHealth(s.health)
    setHealthElapsedMs(s.healthElapsedMs)
    setHealthError(s.healthError)
    setGroupsFetchedAt(s.groupsFetchedAt)
    setApiFetchedAt(s.apiFetchedAt)
    setHealthFetchedAt(s.healthFetchedAt)
  }, [])

  React.useEffect(() => {
    for (const u of upstreams) {
      loadCache(u.id).then((cached) => {
        if (cached) {
          const s = stateFromCache(cached)
          statesRef.current.set(u.id, s)
          if (u.id === activeUpstreamId) {
            loadStateToUI(s)
            if (s.token && s.groupsFetchedAt) {
              setStatus("ok")
            }
          }
        }
      })
    }
  }, [])

  const onCopy = React.useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success("已复制")
    } catch {
      toast.error("复制失败")
    }
  }, [])

  const fetchGroups = React.useCallback(async (silent = false) => {
    return enqueueRequest(async () => {
      if (!token) {
        if (!silent) toast.error("请先输入 Token")
        return
      }
      if (!silent) setStatus("loading")
      setGroupsLoading(true)
      try {
        const res = await fetch("/api/upstream/groups", {
          method: "GET",
          headers: { Authorization: `Bearer ${token}`, "x-upstream-base": activeUpstream.baseUrl },
          cache: "no-store",
        })
        const elapsed = Number(res.headers.get("x-upstream-elapsed-ms") ?? "")
        const payload = await readJsonSafely(res)
        if (!res.ok) throw new Error(activeProvider.extractErrorMessage(payload) ?? `HTTP ${res.status}`)

        const list = activeProvider.extractList(payload)
        const now = Date.now()
        setGroups(list)
        setGroupsFetchedAt(now)
        if (Number.isFinite(elapsed)) setLastElapsedMs(elapsed)
        if (!silent) setStatus("ok")
        if (!silent) toast.success("分组已更新")
      } catch (e) {
        if (!silent) {
          setStatus("error")
          toast.error(e instanceof Error ? e.message : "请求失败")
        }
      } finally {
        setGroupsLoading(false)
      }
    })
  }, [activeUpstream.baseUrl, activeProvider, enqueueRequest, token])

  const fetchApiKeys = React.useCallback(async (silent = false) => {
    return enqueueRequest(async () => {
      if (!token) {
        if (!silent) toast.error("请先输入 Token")
        return
      }
      if (!silent) setStatus("loading")
      setApiLoading(true)
      try {
        const res = await fetch(`/api/upstream/api-keys/paged?page=${page}&size=${size}`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}`, "x-upstream-base": activeUpstream.baseUrl },
          cache: "no-store",
        })
        const elapsed = Number(res.headers.get("x-upstream-elapsed-ms") ?? "")
        const payload = await readJsonSafely(res)
        if (!res.ok) throw new Error(activeProvider.extractErrorMessage(payload) ?? `HTTP ${res.status}`)

        const list = activeProvider.extractList(payload)
        const now = Date.now()
        setApiRaw(payload)
        setApiItems(list)
        setApiFetchedAt(now)
        if (Number.isFinite(elapsed)) {
          setApiElapsedMs(elapsed)
          setLastElapsedMs(elapsed)
        }
        if (!silent) setStatus("ok")
        if (!silent) toast.success("列表已更新")
      } catch (e) {
        if (!silent) {
          setStatus("error")
          toast.error(e instanceof Error ? e.message : "请求失败")
        }
      } finally {
        setApiLoading(false)
      }
    })
  }, [activeUpstream.baseUrl, activeProvider, enqueueRequest, page, size, token])

  const fetchHealth = React.useCallback(async (silent = false) => {
    return enqueueRequest(async () => {
      if (!token) {
        if (!silent) toast.error("请先输入 Token")
        return
      }
      if (!silent) setStatus("loading")
      setHealthLoading(true)
      try {
        const res = await fetch("/api/upstream/service-health", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "x-upstream-base": activeUpstream.baseUrl,
            "x-upstream-timeout-ms": "25000",
          },
          cache: "no-store",
        })
        const elapsed = Number(res.headers.get("x-upstream-elapsed-ms") ?? "")
        const payload = await readJsonSafely(res)
        if (!res.ok) throw new Error(activeProvider.extractErrorMessage(payload) ?? `HTTP ${res.status}`)

        const now = Date.now()
        setHealth(payload)
        setHealthError(null)
        setHealthFetchedAt(now)
        if (!silent) setHealthExpanded(true)
        if (Number.isFinite(elapsed)) {
          setHealthElapsedMs(elapsed)
          setLastElapsedMs(elapsed)
        }
        if (!silent) setStatus("ok")
        if (!silent) toast.success("状态已更新")
      } catch (e) {
        const msg = e instanceof Error ? e.message : "请求失败"
        setHealthError(msg)
        if (!silent) {
          setStatus("error")
          toast.error(msg)
        }
      } finally {
        setHealthLoading(false)
      }
    })
  }, [activeUpstream.baseUrl, activeProvider, enqueueRequest, token])

  const requestAll = React.useCallback(async (silent = false) => {
    await Promise.all([fetchGroups(silent), fetchApiKeys(silent), fetchHealth(silent)])
  }, [fetchApiKeys, fetchGroups, fetchHealth])

  const onRefreshTab = React.useCallback(async (tabId: string) => {
    setRefreshingId(tabId)
    saveCurrentState()
    setActiveUpstreamId(tabId)
    const s = getUpstreamState(tabId)
    loadStateToUI(s)
    setSelectedGroupId(null)
    setSelectedApiKeyId(null)
    setGroupFilter("")
    setApiFilter("")

    const targetUpstream = upstreams.find((u) => u.id === tabId) ?? upstreams[0]
    const targetProvider = getProviderByBaseUrl(targetUpstream.baseUrl)

    if (!s.token) {
      setStatus("loading")
      try {
        const res = await fetch("/api/bootstrap/login", {
          method: "POST",
          headers: { "x-upstream-base": targetUpstream.baseUrl },
          cache: "no-store",
        })
        const elapsed = Number(res.headers.get("x-upstream-elapsed-ms") ?? "")
        const body = await readJsonSafely(res)
        if (!res.ok) throw new Error(targetProvider.extractErrorMessage(body) ?? `HTTP ${res.status}`)
        const accessToken = targetProvider.extractAccessToken(body)
        const userInfo = targetProvider.extractUserInfo(body)
        if (accessToken) {
          setToken(accessToken)
          setUser(userInfo)
          if (Number.isFinite(elapsed)) setLastElapsedMs(elapsed)
        }
        toast.success("登录成功")
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "默认登录失败")
      }
    }

    try {
      await requestAll(false)
    } finally {
      setRefreshingId(null)
    }
  }, [upstreams, getUpstreamState, loadStateToUI, requestAll, saveCurrentState])

  const login = React.useCallback(
    async (payload: { username: string; password: string }) => {
      setStatus("loading")
      setLoginLoading(true)
      try {
        const loginPayload = activeProvider.transformLoginPayload(payload.username, payload.password)
        const res = await fetch("/api/upstream/auth/login", {
          method: "POST",
          headers: { "content-type": "application/json", "x-upstream-base": activeUpstream.baseUrl },
          body: JSON.stringify(loginPayload),
          cache: "no-store",
        })
        const elapsed = Number(res.headers.get("x-upstream-elapsed-ms") ?? "")
        const body = await readJsonSafely(res)
        if (!res.ok) throw new Error(activeProvider.extractErrorMessage(body) ?? `HTTP ${res.status}`)

        const accessToken = activeProvider.extractAccessToken(body)
        const userInfo = activeProvider.extractUserInfo(body)
        if (!accessToken) {
          toast.error("未找到 accessToken 字段")
          setStatus("error")
          return
        }

        setToken(accessToken)
        setUser(userInfo)
        if (Number.isFinite(elapsed)) setLastElapsedMs(elapsed)
        setStatus("ok")
        toast.success("登录成功")

        setTimeout(() => requestAll(false), 0)
      } catch (e) {
        setStatus("error")
        toast.error(e instanceof Error ? e.message : "登录失败")
      } finally {
        setLoginLoading(false)
      }
    },
    [activeUpstream.baseUrl, activeProvider, requestAll]
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
      if (!res.ok) throw new Error(activeProvider.extractErrorMessage(body) ?? `HTTP ${res.status}`)

      const accessToken = activeProvider.extractAccessToken(body)
      const userInfo = activeProvider.extractUserInfo(body)
      if (!accessToken) {
        toast.error("未找到 accessToken 字段")
        setStatus("error")
        return
      }

      setToken(accessToken)
      setUser(userInfo)
      if (Number.isFinite(elapsed)) setLastElapsedMs(elapsed)
      setStatus("ok")
      toast.success("登录成功")

      setTimeout(() => requestAll(false), 0)
    } catch (e) {
      setStatus("error")
      toast.error(e instanceof Error ? e.message : "登录失败")
    } finally {
      setLoginLoading(false)
    }
  }, [activeUpstream.baseUrl, activeProvider, requestAll])

  const tabItems = React.useMemo<UpstreamTab[]>(() => {
    return upstreams.map((u) => {
      const s = statesRef.current.get(u.id)
      const hasToken = Boolean(s?.token)
      const hasData = Boolean(s?.groups || s?.apiItems || s?.health)
      const lastFetch = Math.max(s?.groupsFetchedAt ?? 0, s?.apiFetchedAt ?? 0, s?.healthFetchedAt ?? 0) || null
      const isStale = lastFetch ? Date.now() - lastFetch > STALE_THRESHOLD_MS : false
      return { id: u.id, name: u.name, baseUrl: u.baseUrl, hasToken, hasData, isStale, lastFetchedAt: lastFetch }
    })
  }, [upstreams, token, groups, apiItems, health, groupsFetchedAt, apiFetchedAt, healthFetchedAt])

  React.useEffect(() => {
    if (token && groupsFetchedAt && Date.now() - groupsFetchedAt > STALE_THRESHOLD_MS) {
      requestAll(true)
    }
  }, [activeUpstreamId])

  return (
    <div className="relative flex flex-1 flex-col">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-40 -top-40 size-[520px] rounded-full bg-[radial-gradient(circle_at_center,oklch(0.8_0.16_200/0.22),transparent_65%)] blur-2xl" />
        <div className="absolute -right-56 top-24 size-[640px] rounded-full bg-[radial-gradient(circle_at_center,oklch(0.75_0.18_260/0.18),transparent_70%)] blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,oklch(0.145_0_0/0.9))]" />
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
        <div className="flex flex-col gap-3 rounded-xl border bg-card/40 p-4 backdrop-blur supports-[backdrop-filter]:bg-card/30">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-lg font-semibold tracking-tight">接口控制台</div>
              <Badge variant={status === "ok" ? "default" : status === "error" ? "destructive" : "secondary"}>
                {status === "idle" && "就绪"}
                {status === "loading" && "请求中"}
                {status === "ok" && "已连接"}
                {status === "error" && "失败"}
              </Badge>
              {typeof lastElapsedMs === "number" && (
                <span className="font-mono text-xs text-muted-foreground">{lastElapsedMs}ms</span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setToken("")
                  setUser(null)
                  setGroups(null)
                  setSelectedGroupId(null)
                  setApiItems(null)
                  setApiRaw(null)
                  setSelectedApiKeyId(null)
                  setHealth(null)
                  setHealthElapsedMs(null)
                  setHealthError(null)
                  setHealthExpanded(false)
                  setGroupsFetchedAt(null)
                  setApiFetchedAt(null)
                  setHealthFetchedAt(null)
                  statesRef.current.delete(activeUpstreamId)
                  deleteCache(activeUpstreamId)
                  setStatus("idle")
                  toast.success("已清空")
                }}
                disabled={status === "loading"}
              >
                清空
              </Button>
            </div>
          </div>

          <Separator />

          <UpstreamTabs
            tabs={tabItems}
            activeId={activeUpstreamId}
            refreshingId={refreshingId}
            onActiveChange={(id) => {
              saveCurrentState()
              setActiveUpstreamId(id)
              const s = getUpstreamState(id)
              loadStateToUI(s)
              setSelectedGroupId(null)
              setSelectedApiKeyId(null)
              setGroupFilter("")
              setApiFilter("")
            }}
            onRefresh={onRefreshTab}
            onAdd={(name, baseUrl) => {
              const id = name.toLowerCase().replace(/[^a-z0-9]/g, "-")
              setUpstreams(migrateUpstreams([...upstreams, { id, name, baseUrl }]))
            }}
            onRemove={(id) => {
              if (upstreams.length <= 1) return
              const next = upstreams.filter((u) => u.id !== id)
              setUpstreams(migrateUpstreams(next))
              statesRef.current.delete(id)
              deleteCache(id)
              if (id === activeUpstreamId) {
                const newActive = next[0]?.id ?? ""
                setActiveUpstreamId(newActive)
                loadStateToUI(getUpstreamState(newActive))
              }
            }}
          />
        </div>

        <AuthCard
          token={token}
          onTokenChange={setToken}
          persistToken={true}
          onPersistTokenChange={() => {}}
          status={status}
          loginLoading={loginLoading}
          onLogin={login}
          onLoginWithDefault={loginWithDefault}
          user={user}
          upstreamId={activeUpstreamId}
          loginLabel={activeProvider.loginLabel}
        />

        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground">数据</div>
            <Button
              variant="secondary"
              onClick={() => requestAll(false)}
              disabled={!token || status === "loading" || groupsLoading || apiLoading || healthLoading}
            >
              全部请求
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <GroupsCard
              groups={groups}
              loading={groupsLoading}
              upstreamName={activeUpstream?.name ?? ""}
              filter={groupFilter}
              onFilterChange={setGroupFilter}
              selectedId={selectedGroupId}
              onSelect={setSelectedGroupId}
              onCopy={onCopy}
              onFetch={() => fetchGroups(false)}
              canFetch={Boolean(token)}
            />
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
              onFetch={() => fetchApiKeys(false)}
              selectedId={selectedApiKeyId}
              onSelect={setSelectedApiKeyId}
            />

            <div className="lg:col-span-2">
              <StatusCard
                loading={healthLoading}
                data={health}
                error={healthError}
                lastElapsedMs={healthElapsedMs}
                onFetch={() => fetchHealth(false)}
                canFetch={Boolean(token)}
                expanded={healthExpanded}
                onExpandedChange={setHealthExpanded}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
