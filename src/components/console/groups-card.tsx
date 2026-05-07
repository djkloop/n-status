"use client"

import * as React from "react"
import { CopyIcon, LayersIcon } from "lucide-react"

import { JsonViewer } from "@/components/json-viewer"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { pickDisplayName, pickId, pickRate, pickSupportedModels, pickPlatform, pickStatus, pickDescription, platformToModel } from "@/lib/extract"
import { cn } from "@/lib/utils"

type RateSort = "default" | "rate-desc" | "rate-asc"

function toRateNumber(value: unknown) {
  const rate = pickRate(value)
  if (!rate) return null
  const parsed = Number(rate)
  return Number.isFinite(parsed) ? parsed : null
}

export function GroupsCard({
  groups,
  loading,
  upstreamName,
  filter,
  onFilterChange,
  selectedId,
  onSelect,
  onCopy,
  onFetch,
  canFetch,
}: {
  groups: unknown[] | null
  loading: boolean
  upstreamName: string
  filter: string
  onFilterChange: (v: string) => void
  selectedId: string | null
  onSelect: (id: string | null) => void
  onCopy: (text: string) => void
  onFetch: () => void
  canFetch: boolean
}) {
  const list = React.useMemo(() => groups ?? [], [groups])
  const [sortBy, setSortBy] = React.useState<RateSort>("default")

  const filtered = React.useMemo(() => {
    const q = filter.trim().toLowerCase()
    const next = !q ? list : list.filter((g) => {
      const label = pickDisplayName(g).toLowerCase()
      const id = (pickId(g) ?? "").toLowerCase()
      return label.includes(q) || id.includes(q)
    })

    if (sortBy === "default") return next

    return [...next].sort((a, b) => {
      const av = toRateNumber(a)
      const bv = toRateNumber(b)
      if (av === null && bv === null) return 0
      if (av === null) return 1
      if (bv === null) return -1
      return sortBy === "rate-desc" ? bv - av : av - bv
    })
  }, [filter, list, sortBy])

  return (
    <Card className="bg-card/60 backdrop-blur supports-[backdrop-filter]:bg-card/50 flex flex-col !gap-0 !py-0 h-full">
      <CardHeader className="shrink-0 border-b px-4 py-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <LayersIcon data-icon="inline-start" />
              分组
            </CardTitle>
            <CardDescription>
              {loading ? "加载中…" : `共 ${filtered.length} 条`}
            </CardDescription>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              value={filter}
              onChange={(e) => onFilterChange(e.target.value)}
              placeholder="过滤分组（名称 / ID）"
              className="w-full sm:flex-1"
            />
            <div className="flex items-center gap-2 sm:shrink-0">
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as RateSort)}>
                <SelectTrigger className="w-full sm:w-[152px]">
                  <SelectValue placeholder="排序" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">默认排序</SelectItem>
                  <SelectItem value="rate-desc">倍率从高到低</SelectItem>
                  <SelectItem value="rate-asc">倍率从低到高</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={onFetch} disabled={!canFetch || loading} variant="secondary" className="shrink-0">
                拉取
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-3 p-4 pt-4">
        {loading && (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}

        {!loading && list.length === 0 && (
          <div className="flex items-center justify-center rounded-lg border border-dashed p-8 text-sm text-muted-foreground">
            暂无数据。先在顶部点击"拉取分组"。
          </div>
        )}

        {!loading && list.length > 0 && (
          <div className="overflow-y-auto h-[336px] rounded-md">
            <div className="flex flex-col">
              {filtered.map((g, idx) => {
                const id = pickId(g)
                const label = pickDisplayName(g)
                const rate = pickRate(g)
                const models = pickSupportedModels(g)
                const platform = pickPlatform(g)
                const status = pickStatus(g)
                const description = pickDescription(g)
                const rateText = rate ?? "1"
                const active = id && selectedId === id
                return (
                  <div
                    key={id ?? idx}
                    onClick={() => onSelect(id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        onSelect(id)
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    className={cn(
                      "group flex items-center justify-between gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent/50",
                      active && "bg-accent/60"
                    )}
                  >
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <div className="flex min-w-0 items-center justify-between gap-2">
                        <div className="truncate font-medium">{label}</div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          {platform && (
                            <Badge variant="outline" className="font-mono text-[10px]">
                              {platform}
                            </Badge>
                          )}
                          {status && (
                            <Badge variant={status === "active" ? "secondary" : "destructive"} className="text-[10px]">
                              {status === "active" ? "活跃" : status}
                            </Badge>
                          )}
                          {rate && (
                            <Badge variant="secondary" className="font-mono text-[11px]">
                              倍率 {rate}
                            </Badge>
                          )}
                        </div>
                      </div>
                      {description && <div className="truncate text-xs text-muted-foreground">{description}</div>}
                      {models.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          {models.slice(0, 6).map((m) => (
                            <Badge key={m} variant="outline" className="font-mono text-[10px]">
                              {m}
                            </Badge>
                          ))}
                          {models.length > 6 && (
                            <Badge variant="outline" className="text-[10px]">
                              +{models.length - 6}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            const modelLabel = platformToModel(platform)
                            onCopy(`【${upstreamName}】-【${modelLabel}】-【${rateText}】`)
                          }}
                        >
                          <CopyIcon data-icon="inline-start" />
                          复制
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>复制【上游】-【模型】-【倍率】</TooltipContent>
                    </Tooltip>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {!loading && selectedId && (
          <div className="flex flex-col gap-2 shrink-0">
            <div className="text-xs text-muted-foreground">已选分组原始数据</div>
            <JsonViewer
              value={list.find((g) => pickId(g) === selectedId)}
              className="max-h-[220px]"
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
