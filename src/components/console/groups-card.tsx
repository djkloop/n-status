"use client"

import * as React from "react"
import { CopyIcon, LayersIcon } from "lucide-react"

import { JsonViewer } from "@/components/json-viewer"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { pickDisplayName, pickId, pickRate, pickSupportedModels, pickPlatform, pickStatus, pickDescription, platformToModel } from "@/lib/extract"
import { cn } from "@/lib/utils"

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
  const filtered = React.useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return list
    return list.filter((g) => {
      const label = pickDisplayName(g).toLowerCase()
      const id = (pickId(g) ?? "").toLowerCase()
      return label.includes(q) || id.includes(q)
    })
  }, [filter, list])

  return (
    <Card className="bg-card/60 backdrop-blur supports-[backdrop-filter]:bg-card/50 flex flex-col !gap-0 !py-0 h-full">
      <CardHeader className="flex flex-row items-start justify-between gap-4 shrink-0">
        <div className="flex flex-col gap-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <LayersIcon data-icon="inline-start" />
            分组
          </CardTitle>
          <CardDescription>
            {loading ? "加载中…" : `共 ${filtered.length} 条`}
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Input
            value={filter}
            onChange={(e) => onFilterChange(e.target.value)}
            placeholder="过滤分组（名称 / ID）"
            className="w-56"
          />
          <Button onClick={onFetch} disabled={!canFetch || loading} variant="secondary">
            拉取
          </Button>
        </div>
      </CardHeader>

      <Separator />

      <CardContent className="flex flex-col gap-3 p-4 pt-0">
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
