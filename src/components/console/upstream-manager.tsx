"use client"

import * as React from "react"
import { PlusIcon, ServerIcon, Trash2Icon, WrenchIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export type Upstream = {
  id: string
  name: string
  baseUrl: string
}

function isValidHttpsUrl(v: string) {
  try {
    const u = new URL(v)
    return u.protocol === "https:"
  } catch {
    return false
  }
}

export function UpstreamManager({
  upstreams,
  value,
  onValueChange,
  onUpstreamsChange,
}: {
  upstreams: Upstream[]
  value: string
  onValueChange: (id: string) => void
  onUpstreamsChange: (next: Upstream[]) => void
}) {
  const [name, setName] = React.useState("")
  const [baseUrl, setBaseUrl] = React.useState("https://")

  const add = React.useCallback(() => {
    const n = name.trim()
    const b = baseUrl.trim()
    if (!n) {
      toast.error("请输入上游名称")
      return
    }
    if (!isValidHttpsUrl(b)) {
      toast.error("上游地址必须是 https:// 开头的合法 URL")
      return
    }
    const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
    const next = [...upstreams, { id, name: n, baseUrl: b }]
    onUpstreamsChange(next)
    onValueChange(id)
    setName("")
    setBaseUrl("https://")
    toast.success("已添加上游")
  }, [baseUrl, name, onUpstreamsChange, onValueChange, upstreams])

  const remove = React.useCallback(
    (id: string) => {
      const next = upstreams.filter((u) => u.id !== id)
      onUpstreamsChange(next)
      if (value === id && next[0]) onValueChange(next[0].id)
      toast.success("已移除")
    },
    [onUpstreamsChange, onValueChange, upstreams, value]
  )

  const active = upstreams.find((u) => u.id === value) ?? upstreams[0]

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-2">
        <ServerIcon data-icon="inline-start" />
        <Select value={active?.id} onValueChange={onValueChange}>
          <SelectTrigger className="w-[260px]">
            <SelectValue placeholder="选择上游" />
          </SelectTrigger>
          <SelectContent>
            {upstreams.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="text-xs text-muted-foreground">{active?.baseUrl}</div>

      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline">
            <WrenchIcon data-icon="inline-start" />
            管理上游
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>上游列表</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="up-name">名称</Label>
              <Input id="up-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：router-prod" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="up-url">Base URL（https）</Label>
              <Input id="up-url" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://ai.router.team" className="font-mono" />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={add}>
              <PlusIcon data-icon="inline-start" />
              添加
            </Button>
          </div>

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名称</TableHead>
                  <TableHead>Base URL</TableHead>
                  <TableHead className="w-28" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {upstreams.map((u) => (
                  <TableRow key={u.id} className={u.id === value ? "bg-accent/30" : ""}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell className="font-mono text-xs">{u.baseUrl}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => remove(u.id)} disabled={upstreams.length <= 1}>
                        <Trash2Icon data-icon="inline-start" />
                        删除
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
