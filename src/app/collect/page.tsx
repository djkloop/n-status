"use client"

import * as React from "react"
import { BookmarkIcon, CopyIcon, ExternalLinkIcon, SearchIcon } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { COLLECT_SITES, type CollectSiteType } from "@/lib/collect-sites"

const TYPE_OPTIONS: Array<{ label: string; value: CollectSiteType | "all" }> = [
  { label: "全部类型", value: "all" },
  { label: "提供商", value: "Provider" },
  { label: "监测", value: "Monitor" },
  { label: "排行榜", value: "Leaderboard" },
  { label: "目录", value: "Directory" },
]

function getTypeLabel(type: CollectSiteType) {
  if (type === "Provider") return "提供商"
  if (type === "Monitor") return "监测"
  if (type === "Leaderboard") return "排行榜"
  return "目录"
}

function getAllTags() {
  const set = new Set<string>()
  for (const s of COLLECT_SITES) for (const t of s.tags) set.add(t)
  return Array.from(set).sort((a, b) => a.localeCompare(b))
}

export default function CollectPage() {
  const [query, setQuery] = React.useState("")
  const [type, setType] = React.useState<CollectSiteType | "all">("all")
  const [tag, setTag] = React.useState<string>("all")

  const tags = React.useMemo(() => getAllTags(), [])

  const list = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return COLLECT_SITES.filter((s) => {
      if (type !== "all" && s.type !== type) return false
      if (tag !== "all" && !s.tags.includes(tag)) return false
      if (!q) return true
      const hay = [s.name, s.url, s.description ?? "", s.type, ...s.tags].join(" ").toLowerCase()
      return hay.includes(q)
    }).sort((a, b) => a.name.localeCompare(b.name))
  }, [query, tag, type])

  const onCopy = React.useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success("已复制链接")
    } catch {
      toast.error("复制失败")
    }
  }, [])

  return (
    <div className="relative flex flex-1 flex-col">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-48 -top-48 size-[600px] rounded-full bg-[radial-gradient(circle_at_center,oklch(0.83_0.15_85/0.22),transparent_68%)] blur-3xl" />
        <div className="absolute -right-64 top-10 size-[760px] rounded-full bg-[radial-gradient(circle_at_center,oklch(0.76_0.18_260/0.18),transparent_70%)] blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,oklch(0.145_0_0/0.9))]" />
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="inline-flex size-9 items-center justify-center rounded-lg border bg-card/40">
                <BookmarkIcon className="size-4" aria-hidden />
              </div>
              <div className="flex flex-col gap-0.5">
                <div className="text-2xl font-semibold tracking-tight">收录</div>
                <div className="text-xs text-muted-foreground">
                  专门用于收录各种中转站上游收录/排行榜/监测站点，方便快速跳转与对比。
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-xl border bg-card/40 p-4 backdrop-blur supports-[backdrop-filter]:bg-card/30">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center">
                <div className="relative w-full md:w-[360px]">
                  <SearchIcon className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" aria-hidden />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="搜索：名称 / 标签 / 说明 / URL"
                    className="h-9 pl-9"
                    aria-label="搜索收录站点"
                    name="query"
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Select value={type} onValueChange={(v) => setType(v as CollectSiteType | "all")}>
                    <SelectTrigger className="h-9 w-full sm:w-[180px]" aria-label="类型筛选">
                      <SelectValue placeholder="类型" />
                    </SelectTrigger>
                    <SelectContent>
                      {TYPE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={tag} onValueChange={setTag}>
                    <SelectTrigger className="h-9 w-full sm:w-[180px]" aria-label="标签筛选">
                      <SelectValue placeholder="标签" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部标签</SelectItem>
                      {tags.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="secondary" className="font-normal">
                  共 {COLLECT_SITES.length} 个
                </Badge>
                <Badge variant="secondary" className="font-normal">
                  当前 {list.length} 个
                </Badge>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {list.map((s) => (
                <Card key={s.id} className="bg-card/40">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <CardTitle className="truncate text-base">{s.name}</CardTitle>
                        <CardDescription className="mt-1 break-words">{s.description ?? "—"}</CardDescription>
                      </div>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "shrink-0 border",
                          s.type === "Provider" && "border-sky-500/25 bg-sky-500/12 text-sky-700 dark:text-sky-300",
                          s.type === "Monitor" && "border-emerald-500/25 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
                          s.type === "Leaderboard" && "border-amber-500/25 bg-amber-500/12 text-amber-800 dark:text-amber-200",
                          s.type === "Directory" && "border-violet-500/25 bg-violet-500/12 text-violet-700 dark:text-violet-300"
                        )}
                      >
                        {getTypeLabel(s.type)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {s.tags.map((t) => (
                        <Badge key={t} variant="secondary" className="font-normal">
                          {t}
                        </Badge>
                      ))}
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/20 px-3 py-2">
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-mono text-xs text-muted-foreground">{s.url}</div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void onCopy(s.url)}
                            aria-label="复制链接"
                            className="h-8 gap-1.5"
                          >
                            <CopyIcon className="size-4" aria-hidden />
                            复制
                          </Button>
                          <Button asChild variant="secondary" size="sm" className="h-8 gap-1.5">
                            <a href={s.url} target="_blank" rel="noreferrer">
                              <ExternalLinkIcon className="size-4" aria-hidden />
                              打开
                            </a>
                          </Button>
                        </div>
                      </div>

                      <div className="text-xs text-muted-foreground">
                        提示：建议新标签页打开，避免中断当前控制台操作。
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {!list.length && (
              <div className="py-10 text-center text-sm text-muted-foreground">没有匹配的站点</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
