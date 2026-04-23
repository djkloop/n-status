"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

export function JsonViewer({
  value,
  className,
}: {
  value: unknown
  className?: string
}) {
  const text = React.useMemo(() => {
    try {
      return JSON.stringify(value, null, 2)
    } catch {
      return String(value)
    }
  }, [value])

  return (
    <pre
      className={cn(
        "max-h-[50vh] overflow-auto rounded-lg bg-muted/40 p-4 text-xs leading-5 text-foreground",
        className
      )}
    >
      {text}
    </pre>
  )
}
