"use client"

import * as React from "react"
import { CopyIcon, LayersIcon } from "lucide-react"

import { JsonViewer } from "@/components/json-viewer"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { pickDisplayName, pickId, pickRate, pickSupportedModels } from "@/lib/extract"
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
    <Card className="bg-card/60 backdrop-blur supports-[backdrop-filter]:bg-card/50">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
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

      <CardContent className="flex flex-col gap-3">
        <Separator />
        {loading && (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}

        {!loading && list.length === 0 && (
          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            暂无数据。先在顶部点击“拉取分组”。
          </div>
        )}

        {!loading && list.length > 0 && (
          <ScrollArea className="h-[420px] rounded-lg border">
            <div className="flex flex-col">
              {filtered.map((g, idx) => {
                const id = pickId(g)
                const label = pickDisplayName(g)
                const rate = pickRate(g)
                const models = pickSupportedModels(g)
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
                      "group flex items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-accent/50",
                      active && "bg-accent/60"
                    )}
                  >
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <div className="flex min-w-0 items-center justify-between gap-2">
                        <div className="truncate font-medium">{label}</div>
                        {rate && (
                          <Badge variant="secondary" className="shrink-0 font-mono text-[11px]">
                            倍率 {rate}
                          </Badge>
                        )}
                      </div>
                      {id && <div className="truncate font-mono text-xs text-muted-foreground">{id}</div>}
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
                            onCopy(`【${upstreamName}】-【${label}】-【${rateText}】`)
                          }}
                        >
                          <CopyIcon data-icon="inline-start" />
                          复制
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>复制【上游】-【name】-【rate】</TooltipContent>
                    </Tooltip>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        )}

        {!loading && selectedId && (
          <div className="flex flex-col gap-2">
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
