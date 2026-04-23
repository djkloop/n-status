"use client"

import * as React from "react"
import { EyeIcon, EyeOffIcon, KeyRoundIcon, LogInIcon, MailIcon, ShieldIcon } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { useLocalStorageString } from "@/hooks/use-local-storage"
import { cn } from "@/lib/utils"

type UserInfo = {
  id?: number
  email?: string
  displayName?: string
  role?: string
  emailVerified?: boolean
}

function getLoginKeys(upstreamId: string) {
  return {
    username: `console:login:username:${upstreamId}`,
    password: `console:login:password:${upstreamId}`,
  }
}

function tokenStatusClass(status: "idle" | "loading" | "ok" | "error") {
  if (status === "idle") return "border border-sky-500/25 bg-sky-500/15 text-sky-700 dark:text-sky-300"
  if (status === "loading") return "border border-sky-500/25 bg-sky-500/15 text-sky-700 dark:text-sky-300"
  if (status === "ok") return "border border-emerald-500/25 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
  return "border border-rose-500/25 bg-rose-500/15 text-rose-700 dark:text-rose-300"
}

export function AuthCard({
  token,
  onTokenChange,
  persistToken,
  onPersistTokenChange,
  status,
  loginLoading,
  onLogin,
  onLoginWithDefault,
  user,
  upstreamId,
}: {
  token: string
  onTokenChange: (v: string) => void
  persistToken: boolean
  onPersistTokenChange: (v: boolean) => void
  status: "idle" | "loading" | "ok" | "error"
  loginLoading: boolean
  onLogin: (payload: { username: string; password: string }) => void
  onLoginWithDefault: () => void
  user: UserInfo | null
  upstreamId: string
}) {
  const [showToken, setShowToken] = React.useState(false)

  const [rememberUsername, setRememberUsername] = React.useState(true)
  const [rememberPassword, setRememberPassword] = React.useState(false)

  const [savedUsername, setSavedUsername] = useLocalStorageString(getLoginKeys(upstreamId).username, "")
  const [savedPassword, setSavedPassword] = useLocalStorageString(getLoginKeys(upstreamId).password, "")

  const [usernameDraft, setUsernameDraft] = React.useState("")
  const [passwordDraft, setPasswordDraft] = React.useState("")

  const username = rememberUsername ? savedUsername : usernameDraft
  const password = rememberPassword ? savedPassword : passwordDraft

  React.useEffect(() => {
    try {
      if (rememberUsername) setSavedUsername(username)
      else setSavedUsername("")

      if (rememberPassword) setSavedPassword(password)
      else setSavedPassword("")
    } catch {}
  }, [password, rememberPassword, rememberUsername, setSavedPassword, setSavedUsername, username])

  return (
    <Card className="bg-card/60 backdrop-blur supports-[backdrop-filter]:bg-card/50">
      <CardHeader className="flex flex-col gap-1">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldIcon data-icon="inline-start" />
          认证
        </CardTitle>
        <CardDescription>先登录写入 Token；也支持直接粘贴 Token。</CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-4">
          <div className="text-xs text-muted-foreground">方式一：登录获取 Token</div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="username">用户名（邮箱）</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => {
                  const v = e.target.value
                  if (rememberUsername) setSavedUsername(v)
                  else setUsernameDraft(v)
                }}
                autoComplete="username"
                placeholder="name@example.com"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                value={password}
                onChange={(e) => {
                  const v = e.target.value
                  if (rememberPassword) setSavedPassword(v)
                  else setPasswordDraft(v)
                }}
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-3">
                <Switch
                  checked={rememberUsername}
                  onCheckedChange={(v) => {
                    setRememberUsername(v)
                    if (v) {
                      setSavedUsername(usernameDraft)
                      setUsernameDraft("")
                    } else {
                      setUsernameDraft(savedUsername)
                      setSavedUsername("")
                    }
                  }}
                  id="remember-username"
                />
                <Label htmlFor="remember-username">记住账号</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={rememberPassword}
                  onCheckedChange={(v) => {
                    if (v) toast.message("已开启记住密码（仅本机 localStorage）")
                    setRememberPassword(v)
                    if (v) {
                      setSavedPassword(passwordDraft)
                      setPasswordDraft("")
                    } else {
                      setPasswordDraft(savedPassword)
                      setSavedPassword("")
                    }
                  }}
                  id="remember-password"
                />
                <Label htmlFor="remember-password">记住密码</Label>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={onLoginWithDefault} disabled={loginLoading}>
                一键登录
              </Button>
              <Button
                onClick={() => onLogin({ username, password })}
                disabled={loginLoading || !username.trim() || !password}
              >
                <LogInIcon data-icon="inline-start" />
                登录并写入 Token
              </Button>
            </div>
          </div>

          {user && (
            <>
              <Separator />
              <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MailIcon data-icon="inline-start" />
                  <span className="truncate">{user.email ?? "—"}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate">{user.displayName ?? "—"}</span>
                  <span className="font-mono text-xs text-muted-foreground">{user.role ?? "—"}</span>
                </div>
              </div>
            </>
          )}
        </div>

        <Separator />

        <div className="flex flex-col gap-4">
          <div className="text-xs text-muted-foreground">方式二：直接填写 Token</div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="token">Authorization Bearer Token</Label>
            <div className="flex items-center gap-2">
              <Input
                id="token"
                value={token}
                onChange={(e) => onTokenChange(e.target.value)}
                type={showToken ? "text" : "password"}
                placeholder="粘贴 token（不会自动附加 User-Agent）"
                spellCheck={false}
                autoComplete="off"
                className="font-mono"
              />
              <Button type="button" variant="outline" onClick={() => setShowToken((v) => !v)}>
                {showToken ? <EyeOffIcon data-icon="inline-start" /> : <EyeIcon data-icon="inline-start" />}
                {showToken ? "隐藏" : "显示"}
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Switch checked={persistToken} onCheckedChange={onPersistTokenChange} id="persist" />
              <Label htmlFor="persist">仅本机保存（localStorage）</Label>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <KeyRoundIcon data-icon="inline-start" />
              <span>状态：</span>
              <Badge variant="secondary" className={cn("font-normal", tokenStatusClass(status))}>
                {status === "idle" && "就绪"}
                {status === "loading" && "请求中"}
                {status === "ok" && "已连接"}
                {status === "error" && "失败"}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
