"use client"

import * as React from "react"
import { PlusIcon, RefreshCwIcon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

export type UpstreamTab = {
  id: string
  name: string
  baseUrl: string
  hasToken: boolean
  hasData: boolean
  isStale: boolean
  lastFetchedAt: number | null
}

function formatFreshness(ts: number | null): string {
  if (!ts) return ""
  const diff = Date.now() - ts
  if (diff < 60_000) return "刚刚"
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`
  return `${Math.floor(diff / 86_400_000)}d`
}

function StatusDot({ hasToken, hasData, isStale }: { hasToken: boolean; hasData: boolean; isStale: boolean }) {
  let color = "bg-zinc-500/25 dark:bg-zinc-400/20"
  let glow = ""
  if (!hasToken) {
    color = "bg-zinc-500/25 dark:bg-zinc-400/20"
  } else if (!hasData) {
    color = "bg-amber-400"
    glow = "shadow-[0_0_6px_rgba(251,191,36,0.5)]"
  } else if (isStale) {
    color = "bg-orange-400"
    glow = "shadow-[0_0_4px_rgba(251,146,60,0.4)]"
  } else {
    color = "bg-emerald-400"
    glow = "shadow-[0_0_6px_rgba(52,211,153,0.5)]"
  }
  return <span className={cn("size-1.5 rounded-full transition-all", color, glow)} />
}

export function UpstreamTabs({
  tabs,
  activeId,
  refreshingId,
  onActiveChange,
  onRefresh,
  onAdd,
  onRemove,
}: {
  tabs: UpstreamTab[]
  activeId: string
  refreshingId: string | null
  onActiveChange: (id: string) => void
  onRefresh: (id: string) => void
  onAdd: (name: string, baseUrl: string) => void
  onRemove: (id: string) => void
}) {
  const [addOpen, setAddOpen] = React.useState(false)
  const [newName, setNewName] = React.useState("")
  const [newUrl, setNewUrl] = React.useState("")

  return (
    <div className="flex w-full items-center gap-1.5 overflow-x-auto scrollbar-none">
      {tabs.map((tab) => {
        const active = tab.id === activeId
        const refreshing = tab.id === refreshingId
        const freshness = formatFreshness(tab.lastFetchedAt)
        return (
          <Tooltip key={tab.id}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => onActiveChange(tab.id)}
                className={cn(
                  "group relative flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-[13px] font-medium transition-all duration-200",
                  active
                    ? "bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                )}
              >
                <StatusDot hasToken={tab.hasToken} hasData={tab.hasData} isStale={tab.isStale} />
                <span className="max-w-[100px] truncate">{tab.name}</span>
                {freshness && !active && (
                  <span className="text-[10px] font-normal tabular-nums text-muted-foreground/50">{freshness}</span>
                )}
                {active && freshness && (
                  <span className="text-[10px] font-normal tabular-nums text-primary/50">{freshness}</span>
                )}

                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation()
                    onRefresh(tab.id)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.stopPropagation()
                      onRefresh(tab.id)
                    }
                  }}
                  className="-mr-0.5 ml-0.5 rounded-md p-0.5 opacity-0 transition-all duration-150 hover:bg-accent group-hover:opacity-70 hover:!opacity-100"
                >
                  <RefreshCwIcon className={cn("size-2.5", refreshing && "animate-spin")} />
                </span>

                {!active && tabs.length > 1 && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation()
                      onRemove(tab.id)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.stopPropagation()
                        onRemove(tab.id)
                      }
                    }}
                    className="-mr-1 rounded-md p-0.5 opacity-0 transition-all duration-150 hover:bg-destructive/15 group-hover:opacity-70 hover:!opacity-100"
                  >
                    <XIcon className="size-2.5" />
                  </span>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              <div className="flex flex-col gap-0.5">
                <span className="font-medium">{tab.name}</span>
                <span className="text-muted-foreground">{tab.baseUrl}</span>
                {freshness && <span className="text-muted-foreground">更新于 {freshness}</span>}
              </div>
            </TooltipContent>
          </Tooltip>
        )
      })}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogTrigger asChild>
          <button
            type="button"
            className="flex shrink-0 items-center justify-center rounded-lg px-2.5 py-2 text-muted-foreground/50 transition-all duration-200 hover:bg-accent/60 hover:text-muted-foreground"
          >
            <PlusIcon className="size-3.5" />
          </button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加上游</DialogTitle>
            <DialogDescription>输入上游服务的名称和 API 地址</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="upstream-name">名称</Label>
              <Input
                id="upstream-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="例如：my-api"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="upstream-url">API 地址</Label>
              <Input
                id="upstream-url"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://api.example.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              取消
            </Button>
            <Button
              onClick={() => {
                if (newName.trim() && newUrl.trim()) {
                  onAdd(newName.trim(), newUrl.trim())
                  setNewName("")
                  setNewUrl("")
                  setAddOpen(false)
                }
              }}
              disabled={!newName.trim() || !newUrl.trim()}
            >
              添加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
