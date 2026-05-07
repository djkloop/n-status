"use client"

import * as React from "react"
import { CopyIcon, ListIcon, RotateCwIcon } from "lucide-react"
import { toast } from "sonner"

import { JsonViewer } from "@/components/json-viewer"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { extractTotal, pickKey, pickDisplayName, pickId } from "@/lib/extract"
import { cn } from "@/lib/utils"

export function ApiKeysCard({
  raw,
  items,
  loading,
  filter,
  onFilterChange,
  page,
  size,
  onPageChange,
  onSizeChange,
  lastElapsedMs,
  onFetch,
  selectedId,
  onSelect,
}: {
  raw: unknown | null
  items: unknown[] | null
  loading: boolean
  filter: string
  onFilterChange: (v: string) => void
  page: number
  size: number
  onPageChange: (v: number) => void
  onSizeChange: (v: number) => void
  lastElapsedMs: number | null
  onFetch: () => void
  selectedId: string | null
  onSelect: (id: string | null) => void
}) {
  const list = React.useMemo(() => items ?? [], [items])
  const total = raw !== null ? extractTotal(raw) : null

  const filtered = React.useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return list
    return list.filter((x) => {
      try {
        return JSON.stringify(x).toLowerCase().includes(q)
      } catch {
        return false
      }
    })
  }, [filter, list])

  return (
    <Card className="bg-card/60 backdrop-blur supports-[backdrop-filter]:bg-card/50 flex flex-col !gap-0 !py-0 h-full">
      <CardHeader className="shrink-0 border-b px-4 py-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
              <CardTitle className="flex items-center gap-2 text-base">
                <ListIcon data-icon="inline-start" />
                API Key 列表
              </CardTitle>
              <CardDescription className="flex flex-wrap items-center gap-2">
                <span>
                  {loading ? "加载中…" : `当前 ${filtered.length} 条${total ? ` / 总 ${total}` : ""}`}
                </span>
                {typeof lastElapsedMs === "number" && (
                  <span className="font-mono text-xs text-muted-foreground">
                    {lastElapsedMs}ms
                  </span>
                )}
              </CardDescription>
            </div>

            <div className="flex items-center gap-2 sm:shrink-0">
              <Button onClick={onFetch} disabled={loading}>
                <RotateCwIcon data-icon="inline-start" />
                查询
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-3 p-4 pt-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4 shrink-0">
          <div className="flex flex-col gap-2">
            <Label htmlFor="ak-page">页码</Label>
            <Input
              id="ak-page"
              inputMode="numeric"
              value={String(page)}
              onChange={(e) => onPageChange(Math.max(1, Number(e.target.value || 1)))}
              className="font-mono"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>每页条数</Label>
            <Select value={String(size)} onValueChange={(v) => onSizeChange(Number(v))}>
              <SelectTrigger className="font-mono">
                <SelectValue placeholder="选择 size" />
              </SelectTrigger>
              <SelectContent>
                {[10, 20, 50, 100].map((n) => (
                  <SelectItem key={n} value={String(n)} className="font-mono">
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2 md:col-span-2">
            <Label htmlFor="ak-filter">本地过滤</Label>
            <Input
              id="ak-filter"
              value={filter}
              onChange={(e) => onFilterChange(e.target.value)}
              placeholder="输入关键字（本地 JSON contains）"
            />
          </div>
        </div>

        {loading && (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}

        {!loading && list.length === 0 && (
          <div className="flex items-center justify-center rounded-lg border border-dashed p-8 text-sm text-muted-foreground">
            暂无数据。设置 page/size 后点击"查询"。
          </div>
        )}

        {!loading && list.length > 0 && (
          <div className="overflow-y-auto h-[336px] rounded-md">
            <div className="flex flex-col">
              {filtered.map((row, idx) => {
                const id = pickId(row)
                const name = pickDisplayName(row)
                const keyValue = pickKey(row)
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
                        <div className="truncate font-medium">{name}</div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          {keyValue && (
                            <Badge variant="outline" className="font-mono text-[10px] max-w-[180px] truncate">
                              {keyValue.slice(0, 8)}…{keyValue.slice(-4)}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {keyValue && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={async (e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                try {
                                  await navigator.clipboard.writeText(keyValue)
                                  toast.success("Key 已复制")
                                } catch {
                                  toast.error("复制失败")
                                }
                              }}
                            >
                              <CopyIcon data-icon="inline-start" />
                              复制
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>复制 Key</TooltipContent>
                        </Tooltip>
                      )}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={async (e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              try {
                                await navigator.clipboard.writeText(JSON.stringify(row, null, 2))
                                toast.success("JSON 已复制")
                              } catch {
                                toast.error("复制失败")
                              }
                            }}
                          >
                            详情
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>复制 JSON 详情</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {!loading && selectedId && (
          <div className="flex flex-col gap-2 shrink-0">
            <div className="text-xs text-muted-foreground">已选 Key 原始数据</div>
            <JsonViewer
              value={list.find((row) => pickId(row) === selectedId)}
              className="max-h-[220px]"
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
