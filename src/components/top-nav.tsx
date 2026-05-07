"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { BookmarkIcon, MoonIcon, SunIcon, TerminalIcon } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  { href: "/", label: "控制台", Icon: TerminalIcon },
  { href: "/collect", label: "收录", Icon: BookmarkIcon },
]

export function TopNav() {
  const pathname = usePathname()
  const { resolvedTheme, setTheme } = useTheme()
  const mounted = React.useRef(false)
  const [ready, setReady] = React.useState(false)

  React.useEffect(() => {
    mounted.current = true
    setReady(true)
  }, [])

  const isDark = ready && resolvedTheme === "dark"

  return (
    <header className="sticky top-0 z-20 border-b bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/55">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="text-sm font-semibold tracking-tight">接口控制台</div>
          <div className="hidden h-5 w-px bg-border md:block" />
          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map(({ href, label, Icon }) => {
              const active = href === "/" ? pathname === "/" : pathname?.startsWith(href)
              return (
                <Button
                  key={href}
                  asChild
                  size="sm"
                  variant={active ? "secondary" : "ghost"}
                  className={cn("gap-1.5", active && "border border-border")}
                >
                  <Link href={href}>
                    <Icon data-icon="inline-start" />
                    {label}
                  </Link>
                </Button>
              )
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden text-xs text-muted-foreground md:block">
            同域转发：/api/upstream/*（避免浏览器 CORS）
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            aria-label={isDark ? "切换到浅色模式" : "切换到深色模式"}
            className="gap-1.5"
          >
            {isDark ? <SunIcon data-icon="inline-start" /> : <MoonIcon data-icon="inline-start" />}
            <span className="hidden sm:inline">{isDark ? "浅色" : "深色"}</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
