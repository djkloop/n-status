"use client"

import * as React from "react"
import { CopyIcon, ListIcon, RotateCwIcon } from "lucide-react"
import { toast } from "sonner"

import { JsonViewer } from "@/components/json-viewer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { extractTotal } from "@/lib/extract"
import { cn } from "@/lib/utils"

type Row = Record<string, unknown>

function toRow(v: unknown): Row | null {
  if (!v || typeof v !== "object") return null
  return v as Row
}

function formatCell(v: unknown) {
  if (v === null || v === undefined) return "—"
  if (typeof v === "string") return v
  if (typeof v === "number" || typeof v === "boolean") return String(v)
  return "…"
}

function getColumnKeys(items: unknown[]) {
  const first = toRow(items[0])
  if (!first) return []
  const keys = Object.keys(first)
  const preferred = ["id", "name", "key", "apiKey", "createdAt", "updatedAt", "status"]
  const out: string[] = []
  for (const k of preferred) if (keys.includes(k) && !out.includes(k)) out.push(k)
  for (const k of keys) if (!out.includes(k)) out.push(k)
  return out.slice(0, 6)
}

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

  const cols = React.useMemo(() => getColumnKeys(filtered), [filtered])

  return (
    <Card className="bg-card/60 backdrop-blur supports-[backdrop-filter]:bg-card/50">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <ListIcon data-icon="inline-start" />
            API Key 列表
          </CardTitle>
          <CardDescription className="flex items-center gap-2">
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
        <div className="flex items-center gap-2">
          <Button onClick={onFetch} disabled={loading}>
            <RotateCwIcon data-icon="inline-start" />
            查询
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <Separator />

        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="page">页码</Label>
            <Input
              id="page"
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
            <Label htmlFor="filter">本地过滤</Label>
            <Input
              id="filter"
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
            <Skeleton className="h-10 w-full" />
          </div>
        )}

        {!loading && list.length === 0 && (
          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            暂无数据。设置 page/size 后点击“查询”。
          </div>
        )}

        {!loading && list.length > 0 && (
          <div className="overflow-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  {cols.map((k) => (
                    <TableHead key={k} className="whitespace-nowrap">
                      {k}
                    </TableHead>
                  ))}
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row, idx) => {
                  const obj = toRow(row)
                  const key = (obj?.id as string | undefined) ?? idx

                  return (
                    <Dialog key={key}>
                      <TableRow className="hover:bg-accent/40">
                        {cols.map((k) => (
                          <TableCell key={k} className="max-w-[260px] truncate font-mono text-xs">
                            {formatCell(obj?.[k])}
                          </TableCell>
                        ))}
                        <TableCell className="text-right">
                          <DialogTrigger asChild>
                            <Button variant="secondary" size="sm">
                              详情
                            </Button>
                          </DialogTrigger>
                        </TableCell>
                      </TableRow>

                      <DialogContent className="max-w-3xl">
                        <DialogHeader>
                          <DialogTitle>记录详情</DialogTitle>
                          <DialogDescription className="flex items-center justify-between gap-3">
                            <span className="truncate font-mono text-xs text-muted-foreground">
                              {typeof obj?.id === "string" ? obj.id : ""}
                            </span>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={async () => {
                                    try {
                                      await navigator.clipboard.writeText(
                                        JSON.stringify(row, null, 2)
                                      )
                                      toast.success("已复制 JSON")
                                    } catch {
                                      toast.error("复制失败")
                                    }
                                  }}
                                >
                                  <CopyIcon data-icon="inline-start" />
                                  复制 JSON
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>复制整条记录</TooltipContent>
                            </Tooltip>
                          </DialogDescription>
                        </DialogHeader>
                        <JsonViewer value={row} />
                      </DialogContent>
                    </Dialog>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {!loading && raw !== null && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs text-muted-foreground">上游原始响应</div>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(JSON.stringify(raw, null, 2))
                    toast.success("已复制响应 JSON")
                  } catch {
                    toast.error("复制失败")
                  }
                }}
              >
                <CopyIcon data-icon="inline-start" />
                复制
              </Button>
            </div>
            <JsonViewer value={raw} className={cn("max-h-[260px]")} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
