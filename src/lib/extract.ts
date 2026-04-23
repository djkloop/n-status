export function extractList(value: unknown): unknown[] {
  if (Array.isArray(value)) return value
  if (!value || typeof value !== "object") return []

  const v = value as Record<string, unknown>
  const candidates = [v.data, v.items, v.records, v.list, v.content]

  for (const c of candidates) {
    if (Array.isArray(c)) return c
  }

  if (v.data && typeof v.data === "object") return extractList(v.data)
  return []
}

export function extractTotal(value: unknown): number | null {
  if (!value || typeof value !== "object") return null
  const v = value as Record<string, unknown>
  const candidates = [v.total, v.count, v.totalElements, v.totalCount]
  for (const c of candidates) {
    if (typeof c === "number" && Number.isFinite(c)) return c
  }
  if (v.data && typeof v.data === "object") return extractTotal(v.data)
  return null
}

export function pickDisplayName(value: unknown) {
  if (!value || typeof value !== "object") return String(value ?? "")
  const v = value as Record<string, unknown>
  const id =
    (typeof v.id === "string" && v.id) ||
    (typeof v.groupId === "string" && v.groupId) ||
    (typeof v.uuid === "string" && v.uuid) ||
    (typeof v.code === "string" && v.code) ||
    ""

  const name =
    (typeof v.name === "string" && v.name) ||
    (typeof v.groupName === "string" && v.groupName) ||
    (typeof v.title === "string" && v.title) ||
    (typeof v.label === "string" && v.label) ||
    ""

  return name || id || "未命名"
}

export function pickId(value: unknown) {
  if (!value || typeof value !== "object") return null
  const v = value as Record<string, unknown>
  const id =
    (typeof v.id === "string" && v.id) ||
    (typeof v.groupId === "string" && v.groupId) ||
    (typeof v.uuid === "string" && v.uuid) ||
    null
  return id
}

export function pickRate(value: unknown): string | null {
  if (!value || typeof value !== "object") return null
  const v = value as Record<string, unknown>
  const candidates = [v.rate, v.rates, v.limitRate, v.qps, v.rpm]

  for (const c of candidates) {
    if (typeof c === "number" && Number.isFinite(c)) return String(c)
    if (typeof c === "string" && c.trim()) return c.trim()
  }

  if (v.config && typeof v.config === "object") return pickRate(v.config)
  return null
}

export function pickSupportedModels(value: unknown): string[] {
  if (!value || typeof value !== "object") return []
  const v = value as Record<string, unknown>
  const candidates = [v.models, v.supportedModels, v.modelList, v.availableModels, v.modelNames]

  for (const c of candidates) {
    if (Array.isArray(c)) {
      const out = c
        .map((x) => (typeof x === "string" ? x.trim() : ""))
        .filter(Boolean)
      if (out.length) return out
    }
  }

  if (v.data && typeof v.data === "object") return pickSupportedModels(v.data)
  if (v.config && typeof v.config === "object") return pickSupportedModels(v.config)
  return []
}
