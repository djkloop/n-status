"use client"

import * as React from "react"
import { LogInIcon, MailIcon, ShieldIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

type UserInfo = {
  id?: number
  email?: string
  displayName?: string
  role?: string
  emailVerified?: boolean
}

function tokenStatusClass(status: "idle" | "loading" | "ok" | "error") {
  if (status === "idle") return "border border-sky-500/25 bg-sky-500/15 text-sky-700 dark:text-sky-300"
  if (status === "loading") return "border border-sky-500/25 bg-sky-500/15 text-sky-700 dark:text-sky-300"
  if (status === "ok") return "border border-emerald-500/25 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
  return "border border-rose-500/25 bg-rose-500/15 text-rose-700 dark:text-rose-300"
}

export function AuthCard({
  status,
  loginLoading,
  onLogin,
  user,
}: {
  status: "idle" | "loading" | "ok" | "error"
  loginLoading: boolean
  onLogin: () => void
  user: UserInfo | null
}) {
  return (
    <Card className="bg-card/60 backdrop-blur supports-[backdrop-filter]:bg-card/50">
      <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldIcon data-icon="inline-start" />
          认证
        </CardTitle>
        <Badge variant="secondary" className={cn("shrink-0 font-normal", tokenStatusClass(status))}>
          {status === "idle" && "就绪"}
          {status === "loading" && "请求中"}
          {status === "ok" && "已连接"}
          {status === "error" && "失败"}
        </Badge>
      </CardHeader>

      <CardContent className="flex flex-col gap-2.5 pt-0">
        <div className="flex flex-col gap-2 rounded-xl border border-border/60 bg-muted/15 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-muted-foreground">从环境变量读取凭据并刷新会话</div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={onLogin} disabled={loginLoading} className="w-full sm:w-auto">
              <LogInIcon data-icon="inline-start" />
              一键登录并写入 Token
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs font-medium tracking-wide text-muted-foreground">当前账号</div>
            {user?.role && (
              <Badge variant="outline" className="font-mono text-[11px] text-muted-foreground">
                {user.role}
              </Badge>
            )}
          </div>

          {user ? (
            <div className="rounded-lg border border-border/60 bg-background/45 px-3 py-2.5">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="rounded-md bg-muted/70 p-1.5 text-muted-foreground">
                  <MailIcon className="size-4" />
                </div>
                <div className="min-w-0 flex items-center gap-2 text-sm">
                  <span className="shrink-0 text-xs text-muted-foreground">用户名</span>
                  <span className="truncate font-medium">{user.email ?? "未返回"}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border/70 bg-muted/10 px-3 py-3 text-sm text-muted-foreground">
              登录后会在这里显示当前上游账号信息。
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
