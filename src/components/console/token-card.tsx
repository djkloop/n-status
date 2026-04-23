"use client"

import * as React from "react"
import { EyeIcon, EyeOffIcon, KeyRoundIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

export type ConsoleStatus = "idle" | "loading" | "ok" | "error"

export function TokenCard({
  token,
  onTokenChange,
  persistToken,
  onPersistTokenChange,
  status,
}: {
  token: string
  onTokenChange: (v: string) => void
  persistToken: boolean
  onPersistTokenChange: (v: boolean) => void
  status: ConsoleStatus
}) {
  const [show, setShow] = React.useState(false)

  return (
    <Card className="bg-card/60 backdrop-blur supports-[backdrop-filter]:bg-card/50">
      <CardHeader>
        <div className="flex flex-col gap-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRoundIcon data-icon="inline-start" />
            Token
          </CardTitle>
          <CardDescription className="flex items-center gap-2">
            <span>
              状态：
              {status === "idle" && "就绪"}
              {status === "loading" && "请求中"}
              {status === "ok" && "已连接"}
              {status === "error" && "失败"}
            </span>
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="token">Authorization Bearer Token</Label>
          <div className="flex items-center gap-2">
            <Input
              id="token"
              value={token}
              onChange={(e) => onTokenChange(e.target.value)}
              type={show ? "text" : "password"}
              placeholder="粘贴 token（不会自动附加 User-Agent）"
              spellCheck={false}
              autoComplete="off"
              className="font-mono"
            />
            <Button type="button" variant="outline" onClick={() => setShow((v) => !v)}>
              {show ? <EyeOffIcon data-icon="inline-start" /> : <EyeIcon data-icon="inline-start" />}
              {show ? "隐藏" : "显示"}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Switch checked={persistToken} onCheckedChange={onPersistTokenChange} id="persist" />
            <Label htmlFor="persist">仅本机保存（localStorage）</Label>
          </div>
          <div className="text-xs text-muted-foreground">
            说明：Token 只用于请求头 Authorization，页面不设置 User-Agent。
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
