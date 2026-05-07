"use client"

import * as React from "react"
import { toast } from "sonner"

import { UpstreamManager, type Upstream } from "@/components/console/upstream-manager"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useLocalStorageJson, useLocalStorageString } from "@/hooks/use-local-storage"
import { cn } from "@/lib/utils"

const UPSTREAMS_STORAGE_KEY = "console:upstreams"
const ACTIVE_UPSTREAM_STORAGE_KEY = "console:activeUpstreamId"
const TOKEN_STORAGE_KEY_PREFIX = "console:token:"

import { getDefaultUpstreams, getProviderByBaseUrl } from "@/providers"

const STATUS_ENABLED_KEY_PREFIX = "status:enabled:"
const STATUS_INTERVAL_KEY = "status:intervalMs"

const INTERVAL_OPTIONS = [
  { label: "30 秒", value: 30_000 },
  { label: "1 分钟", value: 60_000 },
  { label: "5 分钟", value: 300_000 },
]

type HealthSummary = {
  totalGroups: number
  healthyGroups: number
  abnormalGroups: number
  slotMinutes: number
  windowMinutes: number
  availabilityWindowDays: number
}

type HealthRecord = {
  fullLabel?: string
  status?: string
  severity?: string
  latencyMs?: number
  statusCode?: number
  model?: string
  message?: string
  checkedAt?: string
}

type HealthGroup = {
  id: number
  name: string
  description?: string
  groupType?: string
  channelId?: number
  channelName?: string
  channelStatus?: string
  monitorEnabled?: boolean
  status?: string
  healthy?: boolean
  lastCheckStatus?: string
  lastCheckLatencyMs?: number
  lastCheckedAt?: string
  onlineSlots?: number
  abnormalSlots?: number
  unknownSlots?: number
  availabilityRate?: number
  records?: HealthRecord[]
}

type ServiceHealthPayload = {
  summary: HealthSummary
  groups: HealthGroup[]
}

function getTokenKey(upstreamId: string) {
  return `${TOKEN_STORAGE_KEY_PREFIX}${upstreamId}`
}

function getEnabledKey(upstreamId: string) {
  return `${STATUS_ENABLED_KEY_PREFIX}${upstreamId}`
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

function readNumber(raw: string, fallback: number) {
  const n = Number(raw)
  return Number.isFinite(n) ? n : fallback
}

function formatDateTime(ts: number) {
  const fmt = new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
  const parts = fmt.formatToParts(new Date(ts))
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ""
  const month = get("month")
  const day = get("day")
  const hour = get("hour")
  const minute = get("minute")
  const second = get("second")
  return `${month}-${day} ${hour}:${minute}:${second}`
}

function formatIsoTime(iso: string) {
  const ts = Date.parse(iso)
  if (!Number.isFinite(ts)) return iso
  return formatDateTime(ts)
}

function Sparkline({
  values,
  className,
}: {
  values: Array<number | null>
  className?: string
}) {
  const width = 140
  const height = 30
  const padding = 2

  const pathD = React.useMemo(() => {
    const finite = values.filter((v): v is number => typeof v === "number" && Number.isFinite(v))
    if (finite.length === 0) return ""

    const min = Math.min(...finite)
    const max = Math.max(...finite)
    const range = Math.max(1, max - min)
    const stepX = values.length <= 1 ? 0 : (width - padding * 2) / (values.length - 1)

    const toY = (v: number) => {
      const t = (v - min) / range
      return padding + (height - padding * 2) * (1 - t)
    }

    let d = ""
    let started = false
    for (let i = 0; i < values.length; i++) {
      const v = values[i]
      const x = padding + stepX * i
      if (typeof v !== "number" || !Number.isFinite(v)) {
        started = false
        continue
      }
      const y = toY(v)
      d += `${started ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`
      started = true
    }

    return d
  }, [values])

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn("h-[30px] w-[140px] text-muted-foreground", className)}
      aria-hidden
    >
      <path
        d={pathD}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity={pathD ? 0.9 : 0}
      />
    </svg>
  )
}

function getStatusText(v: string | undefined) {
  if (!v) return "-"
  if (v === "operational") return "健康"
  if (v === "degraded") return "降级"
  if (v === "failed" || v === "error") return "失败"
  if (v === "ONLINE") return "在线"
  if (v === "OFFLINE") return "离线"
  if (v === "UNKNOWN") return "未知"
  if (v === "HEALTHY") return "健康"
  if (v === "ABNORMAL") return "异常"
  return v
}

function getChannelStatusText(v: string | undefined) {
  if (!v) return "-"
  if (v === "ACTIVE") return "启用"
  if (v === "INACTIVE") return "停用"
  return v
}

function statusBadgeClass(ok: boolean) {
  return ok
    ? "border border-emerald-500/25 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
    : "border border-rose-500/25 bg-rose-500/15 text-rose-700 dark:text-rose-300"
}

function overallBadgeClass(level: "ok" | "error" | "idle" | "loading") {
  if (level === "ok") return "border border-emerald-500/25 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
  if (level === "error") return "border border-rose-500/25 bg-rose-500/15 text-rose-700 dark:text-rose-300"
  if (level === "loading") return "border border-sky-500/25 bg-sky-500/15 text-sky-700 dark:text-sky-300"
  return "border border-border bg-muted/40 text-muted-foreground"
}

function recordColorClass(status: string | undefined, severity: string | undefined) {
  if (status === "ONLINE") {
    if (severity === "HIGH") return "bg-emerald-500/60 dark:bg-emerald-400/55"
    if (severity === "MEDIUM") return "bg-emerald-500/45 dark:bg-emerald-400/40"
    return "bg-emerald-500/30 dark:bg-emerald-400/28"
  }
  if (status === "OFFLINE") return "bg-rose-500/60 dark:bg-rose-400/55"
  return "bg-amber-500/40 dark:bg-amber-400/35"
}

function RecordsHeatmap({
  records,
  limit = 60,
  columns = 12,
}: {
  records: HealthRecord[]
  limit?: number
  columns?: number
}) {
  const tail = records.slice(-limit)

  return (
    <div className="flex items-center gap-1">
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${Math.max(6, Math.min(30, columns))}, minmax(0, 1fr))` }}
      >
        {tail.map((r, idx) => {
          const label = [
            r.fullLabel ?? "采样点",
            getStatusText(r.status),
            typeof r.latencyMs === "number" ? `${r.latencyMs}ms` : null,
            typeof r.statusCode === "number" ? String(r.statusCode) : null,
          ]
            .filter(Boolean)
            .join(" · ")

          return (
          <Tooltip key={`${r.fullLabel ?? idx}-${idx}`}>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={label}
                className={cn(
                  "size-2.5 rounded-[3px] ring-1 ring-foreground/10 transition-transform hover:scale-110 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring",
                  recordColorClass(r.status, r.severity)
                )}
              />
            </TooltipTrigger>
            <TooltipContent sideOffset={8}>
              <div className="flex flex-col gap-0.5">
                <div className="font-medium">{r.fullLabel ?? "采样点"}</div>
                <div className="text-[11px] opacity-90">
                  {getStatusText(r.status)}
                  {typeof r.latencyMs === "number" ? ` · ${r.latencyMs}ms` : ""}
                  {typeof r.statusCode === "number" ? ` · ${r.statusCode}` : ""}
                </div>
                {(r.model || r.message) && (
                  <div className="text-[11px] opacity-90">
                    {r.model ? `${r.model}` : ""}
                    {r.model && r.message ? " · " : ""}
                    {r.message ?? ""}
                  </div>
                )}
                {r.checkedAt && <div className="text-[11px] opacity-80">{formatIsoTime(r.checkedAt)}</div>}
              </div>
            </TooltipContent>
          </Tooltip>
          )
        })}
      </div>
    </div>
  )
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

export default function StatusPage() {
  const [upstreams, setUpstreams] = useLocalStorageJson<Upstream[]>(
    UPSTREAMS_STORAGE_KEY,
    getDefaultUpstreams(),
    isUpstreamArray
  )

  const [activeUpstreamId, setActiveUpstreamId] = useLocalStorageString(
    ACTIVE_UPSTREAM_STORAGE_KEY,
    upstreams[0]?.id ?? "router"
  )

  const activeUpstream = upstreams.find((u) => u.id === activeUpstreamId) ?? upstreams[0]
  const activeProvider = React.useMemo(() => getProviderByBaseUrl(activeUpstream.baseUrl), [activeUpstream.baseUrl])
  const [token, setToken] = useLocalStorageString(getTokenKey(activeUpstreamId), "")

  const [enabledRaw, setEnabledRaw] = useLocalStorageString(getEnabledKey(activeUpstreamId), "0")
  const enabled = enabledRaw === "1"

  const [intervalRaw, setIntervalRaw] = useLocalStorageString(STATUS_INTERVAL_KEY, String(60_000))
  const intervalMs = readNumber(intervalRaw, 60_000)

  const [loading, setLoading] = React.useState(false)
  const [lastElapsedMs, setLastElapsedMs] = React.useState<number | null>(null)
  const [lastFetchedAt, setLastFetchedAt] = React.useState<number | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [data, setData] = React.useState<ServiceHealthPayload | null>(null)

  const [query, setQuery] = React.useState("")
  const [onlyAbnormal, setOnlyAbnormal] = React.useState(false)
  const [tokenVisible, setTokenVisible] = React.useState(false)
  const [view, setView] = React.useState<"split" | "table">("split")
  const [selectedGroupId, setSelectedGroupId] = React.useState<number | null>(null)
  const selectedGroupIdRef = React.useRef<number | null>(null)

  React.useEffect(() => {
    selectedGroupIdRef.current = selectedGroupId
  }, [selectedGroupId])

  const runningRef = React.useRef(false)

  const fetchHealth = React.useCallback(
    async ({ silent }: { silent: boolean }) => {
      if (!activeUpstream) return
      if (!token) {
        if (!silent) toast.error("请先在 控制台 页填写 Token")
        return
      }
      if (runningRef.current) return
      runningRef.current = true
      setLoading(true)

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

        if (!res.ok) {
          throw new Error(activeProvider.extractErrorMessage(payload) ?? getErrorMessage(payload) ?? `HTTP ${res.status}`)
        }

        const summary = activeProvider.extractHealthSummary(payload)
        const groups = activeProvider.extractHealthGroups(payload)
        const mapped: ServiceHealthPayload = {
          summary: {
            totalGroups: summary?.total ?? groups.length,
            healthyGroups: summary?.healthy ?? groups.filter((g) => g.healthy).length,
            abnormalGroups: summary?.abnormal ?? groups.filter((g) => g.healthy === false).length,
            slotMinutes: 0,
            windowMinutes: 0,
            availabilityWindowDays: 0,
          },
          groups: groups.map((g) => ({
            id: g.id ?? -1,
            name: g.name,
            channelName: g.channelName ?? undefined,
            healthy: g.healthy ?? undefined,
            lastCheckStatus: undefined,
            lastCheckLatencyMs: g.lastCheckLatencyMs ?? undefined,
            availabilityRate: g.availabilityRate ?? undefined,
            lastCheckedAt: g.lastCheckedAt ?? undefined,
            records: (g.records as HealthRecord[] | undefined) ?? [],
          })),
        }

        setData(mapped)
        const currentSelected = selectedGroupIdRef.current
        const exists = typeof currentSelected === "number" && mapped.groups.some((g) => g.id === currentSelected)
        if (!exists) {
          const nextSelected = mapped.groups.find((g) => !g.healthy)?.id ?? mapped.groups[0]?.id ?? null
          setSelectedGroupId(nextSelected)
        }
        setError(null)
        setLastFetchedAt(Date.now())
        setLastElapsedMs(Number.isFinite(elapsed) ? elapsed : null)
        if (!silent) toast.success("已刷新状态")
      } catch (e) {
        const msg = e instanceof Error ? e.message : "请求失败"
        setError(msg)
        if (!silent) toast.error(msg)
      } finally {
        setLoading(false)
        runningRef.current = false
      }
    },
    [activeProvider, activeUpstream, token]
  )

  React.useEffect(() => {
    if (!enabled) return
    const first = window.setTimeout(() => {
      void fetchHealth({ silent: true })
    }, 0)
    const t = window.setInterval(() => {
      void fetchHealth({ silent: true })
    }, intervalMs)
    return () => {
      window.clearTimeout(first)
      window.clearInterval(t)
    }
  }, [enabled, fetchHealth, intervalMs])

  const overall = React.useMemo(() => {
    if (!activeUpstream) return { level: "idle" as const, label: "未选择上游" }
    if (!token) return { level: "idle" as const, label: "缺少 Token" }
    if (loading && !data) return { level: "loading" as const, label: "请求中" }
    if (error) return { level: "error" as const, label: "探测失败" }
    if (!data) return { level: "idle" as const, label: "等待探测" }
    if (data.summary.abnormalGroups > 0) return { level: "error" as const, label: "存在异常" }
    return { level: "ok" as const, label: "运行正常" }
  }, [activeUpstream, data, error, loading, token])

  const groups = React.useMemo(() => {
    const list = data?.groups ?? []
    const q = query.trim().toLowerCase()

    const filtered = list.filter((g) => {
      if (onlyAbnormal && g.healthy) return false
      if (!q) return true
      return (
        g.name.toLowerCase().includes(q) ||
        (g.channelName ?? "").toLowerCase().includes(q) ||
        String(g.id).includes(q)
      )
    })

    return filtered.sort((a, b) => {
      const aa = a.healthy ? 1 : 0
      const bb = b.healthy ? 1 : 0
      if (aa !== bb) return aa - bb
      const al = a.lastCheckLatencyMs ?? Number.POSITIVE_INFINITY
      const bl = b.lastCheckLatencyMs ?? Number.POSITIVE_INFINITY
      return bl - al
    })
  }, [data?.groups, onlyAbnormal, query])

  const selectedGroup = React.useMemo(() => {
    const list = data?.groups ?? []
    if (typeof selectedGroupId !== "number") return null
    return list.find((g) => g.id === selectedGroupId) ?? null
  }, [data?.groups, selectedGroupId])

  return (
    <div className="relative flex flex-1 flex-col">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-56 -top-56 size-[640px] rounded-full bg-[radial-gradient(circle_at_center,oklch(0.8_0.16_140/0.22),transparent_68%)] blur-3xl" />
        <div className="absolute -right-60 top-12 size-[700px] rounded-full bg-[radial-gradient(circle_at_center,oklch(0.75_0.18_260/0.18),transparent_70%)] blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,oklch(0.145_0_0/0.9))]" />
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-2">
              <div className="text-2xl font-semibold tracking-tight">上游状态</div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>数据源：</span>
                <Badge variant="secondary">/api/user/service-health</Badge>
                {activeUpstream?.baseUrl && <span className="font-mono">{activeUpstream.baseUrl}</span>}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="secondary"
                className={overallBadgeClass(overall.level)}
              >
                {overall.label}
              </Badge>
              {lastElapsedMs !== null && (
                <span className="font-mono text-xs text-muted-foreground">{lastElapsedMs}ms</span>
              )}
              {lastFetchedAt !== null && (
                <span className="font-mono text-xs text-muted-foreground">{formatDateTime(lastFetchedAt)}</span>
              )}
              <Separator orientation="vertical" className="hidden h-5 md:block" />
              <Button
                variant="secondary"
                onClick={() => void fetchHealth({ silent: false })}
                disabled={!activeUpstream || loading}
              >
                立即刷新
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-xl border bg-card/40 p-4 backdrop-blur supports-[backdrop-filter]:bg-card/30">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <UpstreamManager
                upstreams={upstreams}
                value={activeUpstreamId}
                onValueChange={(id) => {
                  setActiveUpstreamId(id)
                  setError(null)
                  setData(null)
                  setLastElapsedMs(null)
                  setLastFetchedAt(null)
                  setSelectedGroupId(null)
                }}
                onUpstreamsChange={setUpstreams}
              />

              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">自动刷新</Label>
                  <Switch
                    checked={enabled}
                    onCheckedChange={(v) => setEnabledRaw(v ? "1" : "0")}
                    aria-label="自动刷新"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">频率</Label>
                  <Select value={String(intervalMs)} onValueChange={(v) => setIntervalRaw(v)}>
                    <SelectTrigger className="h-8 w-[120px]">
                      <SelectValue placeholder="选择" />
                    </SelectTrigger>
                    <SelectContent>
                      {INTERVAL_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={String(o.value)}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="text-xs text-muted-foreground">Token：{token ? "已设置" : "未设置（去控制台页填写）"}</div>
              </div>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">Token</Label>
                  <Input
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="粘贴 Bearer Token…"
                    className="h-8 w-full md:w-[420px] font-mono"
                    type={tokenVisible ? "text" : "password"}
                    name="token"
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTokenVisible((v) => !v)}
                    aria-label={tokenVisible ? "隐藏 Token" : "显示 Token"}
                    className="shrink-0"
                  >
                    {tokenVisible ? "隐藏" : "显示"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setToken("")}
                    aria-label="清空 Token"
                    className="shrink-0"
                  >
                    清空
                  </Button>
                </div>

                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="搜索：分组 / 渠道 / ID"
                  className="h-8 w-full md:w-[280px]"
                  aria-label="搜索分组"
                  name="query"
                  autoComplete="off"
                />
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">仅异常</Label>
                  <Switch checked={onlyAbnormal} onCheckedChange={setOnlyAbnormal} aria-label="仅显示异常分组" />
                </div>
              </div>

              {error && (
                <div className="rounded-lg border bg-muted/40 px-3 py-2 text-xs text-destructive">
                  {error}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Card>
            <CardHeader className="border-b">
              <CardTitle>分组健康</CardTitle>
              <CardDescription>健康 / 异常 / 总数</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="text-xs text-muted-foreground">健康</div>
                <div className="mt-1 text-xl font-semibold tabular-nums">{data?.summary.healthyGroups ?? "-"}</div>
              </div>
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="text-xs text-muted-foreground">异常</div>
                <div className="mt-1 text-xl font-semibold tabular-nums">{data?.summary.abnormalGroups ?? "-"}</div>
              </div>
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="text-xs text-muted-foreground">总数</div>
                <div className="mt-1 text-xl font-semibold tabular-nums">{data?.summary.totalGroups ?? "-"}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <CardTitle>采样窗口</CardTitle>
              <CardDescription>slot / window</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="text-xs text-muted-foreground">slotMinutes</div>
                <div className="mt-1 text-xl font-semibold tabular-nums">{data?.summary.slotMinutes ?? "-"}</div>
              </div>
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="text-xs text-muted-foreground">windowMinutes</div>
                <div className="mt-1 text-xl font-semibold tabular-nums">{data?.summary.windowMinutes ?? "-"}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <CardTitle>可用率口径</CardTitle>
              <CardDescription>availabilityWindowDays</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="text-xs text-muted-foreground">天</div>
                <div className="mt-1 text-xl font-semibold tabular-nums">
                  {data?.summary.availabilityWindowDays ?? "-"}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={view} onValueChange={(v) => setView(v as "split" | "table")} className="gap-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-1">
              <div className="text-base font-medium">分组视图</div>
              <div className="text-xs text-muted-foreground">
                {data ? `共 ${data.groups.length} 个分组，当前显示 ${groups.length} 个` : "尚未获取数据"}
              </div>
            </div>
            <TabsList aria-label="视图切换">
              <TabsTrigger value="split">分栏</TabsTrigger>
              <TabsTrigger value="table">表格</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="split">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
              <Card className="lg:col-span-2">
                <CardHeader className="border-b">
                  <CardTitle>分组</CardTitle>
                  <CardDescription>点击左侧分组，右侧查看详情</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[640px]">
                    <div className="p-2">
                      <div className="flex flex-wrap items-center gap-3 px-2 pb-2 text-xs text-muted-foreground">
                        <div className="inline-flex items-center gap-1">
                          <span className="size-2.5 rounded-[3px] bg-emerald-500/45 ring-1 ring-foreground/10 dark:bg-emerald-400/40" />
                          在线
                        </div>
                        <div className="inline-flex items-center gap-1">
                          <span className="size-2.5 rounded-[3px] bg-rose-500/55 ring-1 ring-foreground/10 dark:bg-rose-400/55" />
                          离线
                        </div>
                        <div className="inline-flex items-center gap-1">
                          <span className="size-2.5 rounded-[3px] bg-amber-500/40 ring-1 ring-foreground/10 dark:bg-amber-400/35" />
                          未知
                        </div>
                      </div>

                      <div className="flex flex-col gap-1">
                        {groups.map((g) => {
                          const ok = Boolean(g.healthy)
                          const selected = selectedGroupId === g.id

                          return (
                            <button
                              key={g.id}
                              type="button"
                              onClick={() => setSelectedGroupId(g.id)}
                              aria-current={selected ? "true" : undefined}
                              className={cn(
                                "group flex w-full items-start justify-between gap-3 rounded-lg border px-3 py-2 text-left transition-colors hover:bg-muted/50 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring",
                                selected ? "border-border bg-muted/40" : "border-transparent"
                              )}
                            >
                              <div className="flex min-w-0 flex-1 flex-col gap-1">
                                <div className="flex min-w-0 items-center gap-2">
                                  <span
                                    className={cn(
                                      "size-2 shrink-0 rounded-full",
                                      ok ? "bg-emerald-500/80 dark:bg-emerald-400/80" : "bg-rose-500/80 dark:bg-rose-400/80"
                                    )}
                                  />
                                  <div className="min-w-0 truncate font-medium">{g.name}</div>
                                </div>
                                <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                                  <span className="truncate">{g.channelName ?? "-"}</span>
                                  <span className="font-mono">#{g.id}</span>
                                  <span>可用率 {typeof g.availabilityRate === "number" ? `${g.availabilityRate.toFixed(2)}%` : "-"}</span>
                                  <span>延迟 {typeof g.lastCheckLatencyMs === "number" ? `${g.lastCheckLatencyMs}ms` : "-"}</span>
                                </div>
                              </div>
                              <Badge variant="secondary" className={statusBadgeClass(ok)}>
                                {ok ? "健康" : "异常"}
                              </Badge>
                            </button>
                          )
                        })}

                        {!groups.length && (
                          <div className="px-2 py-10 text-center text-sm text-muted-foreground">
                            {data ? "没有匹配的分组" : "请先点击“立即刷新”获取数据"}
                          </div>
                        )}
                      </div>
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card className="lg:col-span-3">
                <CardHeader className="border-b">
                  <CardTitle>详情</CardTitle>
                  <CardDescription>{selectedGroup ? "时间线支持悬浮查看详细信息" : "请先从左侧选择一个分组"}</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-5">
                  {!selectedGroup ? (
                    <div className="rounded-lg border bg-muted/30 p-6 text-sm text-muted-foreground">
                      选择分组后，这里会显示分组状态、可用率与近 60 个采样点时间线。
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col gap-3">
                        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                          <div className="flex min-w-0 flex-col gap-1">
                            <div className="flex min-w-0 items-center gap-2">
                              <div className="min-w-0 truncate text-lg font-semibold">{selectedGroup.name}</div>
                              <Badge variant="secondary" className={statusBadgeClass(Boolean(selectedGroup.healthy))}>
                                {Boolean(selectedGroup.healthy) ? "健康" : "异常"}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <span>{selectedGroup.channelName ?? "-"}</span>
                              <span>·</span>
                              <span>{getChannelStatusText(selectedGroup.channelStatus)}</span>
                              <span>·</span>
                              <span>监控 {selectedGroup.monitorEnabled ? "开启" : "关闭"}</span>
                              <span>·</span>
                              <span className="font-mono">#{selectedGroup.id}</span>
                            </div>
                            {selectedGroup.description && (
                              <div className="text-xs text-muted-foreground">{selectedGroup.description}</div>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                          <div className="rounded-lg border bg-muted/30 p-3">
                            <div className="text-xs text-muted-foreground">最近检查</div>
                            <div className="mt-1 text-sm font-medium">
                              {selectedGroup.lastCheckedAt ? formatIsoTime(selectedGroup.lastCheckedAt) : "-"}
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              {getStatusText(selectedGroup.lastCheckStatus)}
                              {typeof selectedGroup.lastCheckLatencyMs === "number" ? ` · ${selectedGroup.lastCheckLatencyMs}ms` : ""}
                            </div>
                          </div>
                          <div className="rounded-lg border bg-muted/30 p-3">
                            <div className="text-xs text-muted-foreground">可用率</div>
                            <div className="mt-1 text-sm font-medium tabular-nums">
                              {typeof selectedGroup.availabilityRate === "number"
                                ? `${selectedGroup.availabilityRate.toFixed(2)}%`
                                : "-"}
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              online {selectedGroup.onlineSlots ?? "-"} · abnormal {selectedGroup.abnormalSlots ?? "-"} · unknown {selectedGroup.unknownSlots ?? "-"}
                            </div>
                          </div>
                          <div className="rounded-lg border bg-muted/30 p-3">
                            <div className="text-xs text-muted-foreground">接口口径</div>
                            <div className="mt-1 text-sm font-medium">
                              slot {data?.summary.slotMinutes ?? "-"}min · window {data?.summary.windowMinutes ?? "-"}min
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              可用率窗口 {data?.summary.availabilityWindowDays ?? "-"} 天
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-xl border bg-card/40 p-4">
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-sm font-medium">时间线（最近 60 个采样点）</div>
                            <div className="text-xs text-muted-foreground">
                              {selectedGroup.records?.length ? `${selectedGroup.records.length} 条记录` : "无记录"}
                            </div>
                          </div>
                          {selectedGroup.records?.length ? (
                            <RecordsHeatmap records={selectedGroup.records} limit={60} columns={20} />
                          ) : (
                            <div className="text-xs text-muted-foreground">暂无数据</div>
                          )}
                        </div>
                      </div>

                      {selectedGroup.records?.length ? (
                        <div className="rounded-xl border bg-card/40">
                          <div className="border-b px-4 py-3 text-sm font-medium">最近记录</div>
                          <ScrollArea className="h-[260px]">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>时间</TableHead>
                                  <TableHead>状态</TableHead>
                                  <TableHead>延迟</TableHead>
                                  <TableHead>状态码</TableHead>
                                  <TableHead>信息</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {selectedGroup.records
                                  .slice(-30)
                                  .reverse()
                                  .map((r, idx) => (
                                    <TableRow key={`${r.fullLabel ?? idx}-${idx}`}>
                                      <TableCell className="font-mono text-xs text-muted-foreground">
                                        {r.fullLabel ?? "-"}
                                      </TableCell>
                                      <TableCell>{getStatusText(r.status)}</TableCell>
                                      <TableCell className="font-mono text-xs tabular-nums">
                                        {typeof r.latencyMs === "number" ? `${r.latencyMs}ms` : "-"}
                                      </TableCell>
                                      <TableCell className="font-mono text-xs tabular-nums">
                                        {typeof r.statusCode === "number" ? r.statusCode : "-"}
                                      </TableCell>
                                      <TableCell className="max-w-[280px] truncate text-xs text-muted-foreground">
                                        {r.message ?? "-"}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                              </TableBody>
                            </Table>
                          </ScrollArea>
                        </div>
                      ) : null}
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="table">
            <Card>
              <CardHeader className="border-b">
                <CardTitle>分组列表</CardTitle>
                <CardDescription>适合快速对比与批量浏览</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[560px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>分组</TableHead>
                        <TableHead>渠道</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead>延迟</TableHead>
                        <TableHead>可用率</TableHead>
                        <TableHead>时间线</TableHead>
                        <TableHead className="text-right">最近检查</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {groups.map((g) => {
                        const ok = Boolean(g.healthy)
                        const trend = (g.records ?? []).slice(-36).map((r) => {
                          if (r.status && r.status !== "ONLINE") return null
                          return typeof r.latencyMs === "number" ? r.latencyMs : null
                        })

                        return (
                          <TableRow key={g.id} className={cn(!ok && "bg-destructive/5")}>
                            <TableCell className="max-w-[280px]">
                              <div className="flex flex-col gap-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <div className="font-medium">{g.name}</div>
                                  {g.groupType && (
                                    <Badge variant="secondary" className="font-normal">
                                      {g.groupType}
                                    </Badge>
                                  )}
                                </div>
                                {g.description && (
                                  <div className="max-w-[280px] truncate text-xs text-muted-foreground">{g.description}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="max-w-[220px]">
                              <div className="flex flex-col gap-1">
                                <div className="font-medium">{g.channelName ?? "-"}</div>
                                <div className="text-xs text-muted-foreground">
                                  {getChannelStatusText(g.channelStatus)} · 监控 {g.monitorEnabled ? "开启" : "关闭"}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <Badge variant="secondary" className={statusBadgeClass(ok)}>
                                  {ok ? "健康" : "异常"}
                                </Badge>
                                <div className="text-xs text-muted-foreground">{getStatusText(g.lastCheckStatus)}</div>
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-xs tabular-nums">
                              {typeof g.lastCheckLatencyMs === "number" ? `${g.lastCheckLatencyMs}ms` : "-"}
                            </TableCell>
                            <TableCell className="font-mono text-xs tabular-nums">
                              {typeof g.availabilityRate === "number" ? `${g.availabilityRate.toFixed(2)}%` : "-"}
                            </TableCell>
                            <TableCell>
                              {g.records?.length ? (
                                <div className="flex items-center gap-3">
                                  <RecordsHeatmap records={g.records} />
                                  <div className="hidden lg:block">
                                    <Sparkline
                                      values={trend}
                                      className={cn(
                                        ok
                                          ? "text-emerald-600 dark:text-emerald-400"
                                          : "text-rose-600 dark:text-rose-400"
                                      )}
                                    />
                                  </div>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs text-muted-foreground tabular-nums">
                              {g.lastCheckedAt ? formatIsoTime(g.lastCheckedAt) : "-"}
                            </TableCell>
                          </TableRow>
                        )
                      })}

                      {!groups.length && (
                        <TableRow>
                          <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                            {data ? "没有匹配的分组" : "请先点击“立即刷新”获取数据"}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
