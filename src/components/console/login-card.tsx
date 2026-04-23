"use client"

import * as React from "react"
import { LogInIcon, MailIcon, ShieldIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { useLocalStorageString } from "@/hooks/use-local-storage"

type UserInfo = {
  id?: number
  email?: string
  displayName?: string
  role?: string
  emailVerified?: boolean
}

function getKeys(upstreamId: string) {
  return {
    username: `console:login:username:${upstreamId}`,
    password: `console:login:password:${upstreamId}`,
  }
}

export function LoginCard({
  loading,
  onLogin,
  onLoginWithDefault,
  user,
  upstreamId,
}: {
  loading: boolean
  onLogin: (payload: { username: string; password: string }) => void
  onLoginWithDefault: () => void
  user: UserInfo | null
  upstreamId: string
}) {
  const [rememberUsername, setRememberUsername] = React.useState(true)
  const [rememberPassword, setRememberPassword] = React.useState(false)

  const [savedUsername, setSavedUsername] = useLocalStorageString(getKeys(upstreamId).username, "")
  const [savedPassword, setSavedPassword] = useLocalStorageString(getKeys(upstreamId).password, "")

  const [usernameDraft, setUsernameDraft] = React.useState("")
  const [passwordDraft, setPasswordDraft] = React.useState("")

  const username = rememberUsername ? savedUsername : usernameDraft
  const password = rememberPassword ? savedPassword : passwordDraft

  React.useEffect(() => {
    try {
      if (rememberUsername) {
        setSavedUsername(username)
      } else {
        setSavedUsername("")
      }

      if (rememberPassword) {
        setSavedPassword(password)
      } else {
        setSavedPassword("")
      }
    } catch {}
  }, [password, rememberPassword, rememberUsername, setSavedPassword, setSavedUsername, upstreamId, username])

  return (
    <Card className="bg-card/60 backdrop-blur supports-[backdrop-filter]:bg-card/50">
      <CardHeader className="flex flex-col gap-1">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldIcon data-icon="inline-start" />
          登录（可选）
        </CardTitle>
        <CardDescription>用于获取 accessToken；密码默认不保存。</CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
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
            <Button variant="secondary" onClick={onLoginWithDefault} disabled={loading}>
              一键登录
            </Button>
            <Button
              onClick={() => onLogin({ username, password })}
              disabled={loading || !username.trim() || !password}
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
      </CardContent>
    </Card>
  )
}
