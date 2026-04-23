"use client"

import * as React from "react"
import { ActivityIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"

function pickSummary(value: unknown) {
  if (!value || typeof value !== "object") return null
  const v = value as Record<string, unknown>
  if (!v.summary || typeof v.summary !== "object") return null
  const s = v.summary as Record<string, unknown>
  const total = typeof s.totalGroups === "number" ? s.totalGroups : null
  const healthy = typeof s.healthyGroups === "number" ? s.healthyGroups : null
  const abnormal = typeof s.abnormalGroups === "number" ? s.abnormalGroups : null
  if (total === null && healthy === null && abnormal === null) return null
  return { total, healthy, abnormal }
}

type HealthGroupRow = {
  raw: unknown
  id: number | null
  name: string
  channelName: string | null
  channelStatus: string | null
  groupType: string | null
  monitorEnabled: boolean | null
  healthy: boolean | null
  lastCheckStatus: string | null
  lastCheckLatencyMs: number | null
  availabilityRate: number | null
  lastCheckedAt: string | null
  records: HealthRecord[]
}

type HealthRecord = {
  fullLabel: string | null
  status: string | null
  severity: string | null
  latencyMs: number | null
  statusCode: number | null
  model: string | null
  message: string | null
  checkedAt: string | null
}

function pickRecords(value: unknown): HealthRecord[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null
      const r = item as Record<string, unknown>
      return {
        fullLabel: typeof r.fullLabel === "string" ? r.fullLabel : null,
        status: typeof r.status === "string" ? r.status : null,
        severity: typeof r.severity === "string" ? r.severity : null,
        latencyMs: typeof r.latencyMs === "number" ? r.latencyMs : null,
        statusCode: typeof r.statusCode === "number" ? r.statusCode : null,
        model: typeof r.model === "string" ? r.model : null,
        message: typeof r.message === "string" ? r.message : null,
        checkedAt: typeof r.checkedAt === "string" ? r.checkedAt : null,
      }
    })
    .filter((x): x is HealthRecord => Boolean(x))
}

function pickGroups(value: unknown): HealthGroupRow[] {
  if (!value || typeof value !== "object") return []
  const v = value as Record<string, unknown>
  if (!Array.isArray(v.groups)) return []
  return v.groups
    .map((item) => {
      if (!item || typeof item !== "object") return null
      const g = item as Record<string, unknown>
      const id = typeof g.id === "number" ? g.id : null
      const name = typeof g.name === "string" ? g.name : ""
      const channelName = typeof g.channelName === "string" ? g.channelName : null
      const channelStatus = typeof g.channelStatus === "string" ? g.channelStatus : null
      const groupType = typeof g.groupType === "string" ? g.groupType : null
      const monitorEnabled = typeof g.monitorEnabled === "boolean" ? g.monitorEnabled : null
      const healthy = typeof g.healthy === "boolean" ? g.healthy : null
      const lastCheckStatus = typeof g.lastCheckStatus === "string" ? g.lastCheckStatus : null
      const lastCheckLatencyMs = typeof g.lastCheckLatencyMs === "number" ? g.lastCheckLatencyMs : null
      const availabilityRate = typeof g.availabilityRate === "number" ? g.availabilityRate : null
      const lastCheckedAt = typeof g.lastCheckedAt === "string" ? g.lastCheckedAt : null
      const records = pickRecords(g.records)
      return {
        raw: item,
        id,
        name,
        channelName,
        channelStatus,
        groupType,
        monitorEnabled,
        healthy,
        lastCheckStatus,
        lastCheckLatencyMs,
        availabilityRate,
        lastCheckedAt,
        records,
      }
    })
    .filter((x): x is HealthGroupRow => Boolean(x && x.name))
}

function formatIso(iso: string | null) {
  if (!iso) return "-"
  const ts = Date.parse(iso)
  if (!Number.isFinite(ts)) return iso
  const fmt = new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
  return fmt.format(new Date(ts))
}

function getStatusText(v: string | null) {
  if (!v) return "-"
  if (v === "ONLINE") return "在线"
  if (v === "OFFLINE") return "离线"
  if (v === "UNKNOWN") return "未知"
  if (v === "HEALTHY") return "健康"
  if (v === "ABNORMAL") return "异常"
  return v
}

function recordColorClass(status: string | null, severity: string | null) {
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
  columns = 20,
}: {
  records: HealthRecord[]
  limit?: number
  columns?: number
}) {
  const tail = records.slice(-limit)
  const cell = 10
  return (
    <div
      className="grid justify-center gap-[2px]"
      style={{ gridTemplateColumns: `repeat(${Math.max(8, Math.min(30, columns))}, ${cell}px)` }}
    >
      {tail.map((r, idx) => {
        const title = [
          r.fullLabel ?? "采样点",
          getStatusText(r.status),
          typeof r.latencyMs === "number" ? `${r.latencyMs}ms` : null,
          typeof r.statusCode === "number" ? String(r.statusCode) : null,
          r.model ?? null,
          r.message ?? null,
          r.checkedAt ? formatIso(r.checkedAt) : null,
        ]
          .filter(Boolean)
          .join(" · ")

        return (
          <span
            key={`${r.fullLabel ?? idx}-${idx}`}
            title={title}
            className={cn(
              "size-[10px] rounded-[3px] ring-1 ring-foreground/10",
              recordColorClass(r.status, r.severity)
            )}
          />
        )
      })}
    </div>
  )
}

function statusBadgeClass(level: "ok" | "warn" | "idle") {
  if (level === "ok") return "border border-emerald-500/25 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
  if (level === "warn") return "border border-rose-500/25 bg-rose-500/15 text-rose-700 dark:text-rose-300"
  return "border border-border bg-muted/40 text-muted-foreground"
}

export function StatusCard({
  loading,
  data,
  error,
  lastElapsedMs,
  onFetch,
  canFetch,
  expanded,
  onExpandedChange,
}: {
  loading: boolean
  data: unknown | null
  error: string | null
  lastElapsedMs: number | null
  onFetch: () => void
  canFetch: boolean
  expanded: boolean
  onExpandedChange: (v: boolean) => void
}) {
  const summary = React.useMemo(() => pickSummary(data), [data])
  const groups = React.useMemo(() => pickGroups(data), [data])
  const [expandedRow, setExpandedRow] = React.useState<string | null>(null)
  const heatmapRef = React.useRef<HTMLDivElement | null>(null)
  const [heatmapColumns, setHeatmapColumns] = React.useState(20)
  const level = React.useMemo(() => {
    if (error) return "warn" as const
    if (!summary) return "idle" as const
    if (typeof summary.abnormal === "number" && summary.abnormal > 0) return "warn" as const
    return "ok" as const
  }, [error, summary])

  React.useEffect(() => {
    if (!expandedRow) return
    const el = heatmapRef.current
    if (!el) return

    const update = () => {
      const width = el.clientWidth
      const cell = 10
      const gap = 2
      const step = cell + gap
      const next = Math.max(10, Math.min(30, Math.floor((width + gap) / step)))
      setHeatmapColumns(next)
    }

    update()

    if (typeof ResizeObserver === "undefined") return
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [expandedRow])

  const subtitle = React.useMemo(() => {
    if (loading) return "检查中…"
    if (error) return "探测失败"
    if (!summary) return "尚未获取"
    const total = typeof summary.total === "number" ? summary.total : "-"
    const healthy = typeof summary.healthy === "number" ? summary.healthy : "-"
    const abnormal = typeof summary.abnormal === "number" ? summary.abnormal : "-"
    return `健康 ${healthy} · 异常 ${abnormal} · 总数 ${total}`
  }, [error, loading, summary])

  const sortedGroups = React.useMemo(() => {
    const list = [...groups]
    return list.sort((a, b) => {
      const aa = a.healthy ? 1 : 0
      const bb = b.healthy ? 1 : 0
      if (aa !== bb) return aa - bb
      const al = a.lastCheckLatencyMs ?? Number.POSITIVE_INFINITY
      const bl = b.lastCheckLatencyMs ?? Number.POSITIVE_INFINITY
      return bl - al
    })
  }, [groups])

  const previewGroups = React.useMemo(() => sortedGroups.slice(0, 60), [sortedGroups])

  return (
    <Card className="bg-card/60 backdrop-blur supports-[backdrop-filter]:bg-card/50">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <ActivityIcon data-icon="inline-start" />
            状态
            <Badge variant="secondary" className={cn("ml-1", statusBadgeClass(level))}>
              {level === "ok" && "正常"}
              {level === "warn" && "异常"}
              {level === "idle" && "未检查"}
            </Badge>
          </CardTitle>
          <CardDescription>{subtitle}</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          {typeof lastElapsedMs === "number" && (
            <span className="font-mono text-xs text-muted-foreground">{lastElapsedMs}ms</span>
          )}
          {groups.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => onExpandedChange(!expanded)}>
              {expanded ? "收起" : "展开"}
            </Button>
          )}
          <Button onClick={onFetch} disabled={!canFetch || loading} variant="secondary">
            检查
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        <Separator />
        {error && (
          <div className="rounded-lg border bg-muted/40 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="text-xs text-muted-foreground">健康</div>
            <div className="mt-1 font-mono text-sm tabular-nums">{summary?.healthy ?? "—"}</div>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="text-xs text-muted-foreground">异常</div>
            <div className="mt-1 font-mono text-sm tabular-nums">{summary?.abnormal ?? "—"}</div>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="text-xs text-muted-foreground">总数</div>
            <div className="mt-1 font-mono text-sm tabular-nums">{summary?.total ?? "—"}</div>
          </div>
        </div>

        {expanded && groups.length > 0 && (
          <div className="rounded-lg border bg-card/40">
            <div className="border-b px-4 py-3 text-sm font-medium">
              近 60 分组（{Math.min(60, groups.length)}/{groups.length}）
            </div>
            <ScrollArea className="h-[360px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>分组</TableHead>
                    <TableHead>渠道</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>延迟</TableHead>
                    <TableHead>可用率</TableHead>
                    <TableHead className="text-right">最近检查</TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewGroups.map((g, idx) => {
                    const ok = g.healthy !== false
                    const rowKey = typeof g.id === "number" ? String(g.id) : `${g.name}-${idx}`
                    const rowOpen = expandedRow === rowKey

                    return (
                      <React.Fragment key={rowKey}>
                        <TableRow className={cn(!ok && "bg-destructive/5")}>
                          <TableCell className="max-w-[260px] truncate font-medium">{g.name}</TableCell>
                        <TableCell className="max-w-[220px] truncate text-xs text-muted-foreground">
                          {g.channelName ?? "-"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={cn(ok ? statusBadgeClass("ok") : statusBadgeClass("warn"))}
                          >
                            {ok ? "健康" : "异常"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs tabular-nums">
                          {typeof g.lastCheckLatencyMs === "number" ? `${g.lastCheckLatencyMs}ms` : "-"}
                        </TableCell>
                        <TableCell className="font-mono text-xs tabular-nums">
                          {typeof g.availabilityRate === "number" ? `${g.availabilityRate.toFixed(2)}%` : "-"}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs text-muted-foreground tabular-nums">
                          {formatIso(g.lastCheckedAt)}
                        </TableCell>
                          <TableCell className="text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setExpandedRow((v) => (v === rowKey ? null : rowKey))}
                            >
                              {rowOpen ? "收起" : "展开"}
                            </Button>
                          </TableCell>
                        </TableRow>
                        {rowOpen && (
                          <TableRow className={cn(!ok && "bg-destructive/5")}>
                            <TableCell colSpan={7} className="p-3">
                              <div className="flex flex-col gap-3">
                                <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                                  <div className="rounded-lg border bg-muted/30 p-3">
                                    <div className="text-xs text-muted-foreground">最近检查</div>
                                    <div className="mt-1 text-sm font-medium">{formatIso(g.lastCheckedAt)}</div>
                                    <div className="mt-1 text-xs text-muted-foreground">
                                      {getStatusText(g.lastCheckStatus)}
                                      {typeof g.lastCheckLatencyMs === "number" ? ` · ${g.lastCheckLatencyMs}ms` : ""}
                                    </div>
                                  </div>
                                  <div className="rounded-lg border bg-muted/30 p-3">
                                    <div className="text-xs text-muted-foreground">可用率</div>
                                    <div className="mt-1 font-mono text-sm tabular-nums">
                                      {typeof g.availabilityRate === "number" ? `${g.availabilityRate.toFixed(2)}%` : "-"}
                                    </div>
                                  </div>
                                  <div className="rounded-lg border bg-muted/30 p-3">
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="text-xs text-muted-foreground">采样点</div>
                                      <div className="font-mono text-xs text-muted-foreground tabular-nums">
                                        {g.records.length || "-"}
                                      </div>
                                    </div>
                                    <div ref={rowOpen ? heatmapRef : null} className="mt-2 w-full overflow-x-auto">
                                      <RecordsHeatmap records={g.records} limit={60} columns={heatmapColumns} />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    )
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
