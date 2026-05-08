export function extractList(value: unknown): unknown[] {
  if (Array.isArray(value)) return value
  if (!value || typeof value !== "object") return []

  const v = value as Record<string, unknown>
  
  // findcg 格式: { code: 0, data: { items: [...] } }
  const code = v.code as number | undefined
  if (code === 0) {
    const data = v.data
    if (Array.isArray(data)) return data
    if (data && typeof data === "object") {
      const d = data as Record<string, unknown>
      const candidates = [d.items, d.data, d.records, d.list, d.content]
      for (const c of candidates) {
        if (Array.isArray(c)) return c
      }
      return []
    }
    return []
  }

  // 服务健康监控格式: { groups: [...], meta: {...} }
  if (Array.isArray(v.groups)) return v.groups

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
  
  const code = v.code as number | undefined
  if (code === 0 && v.data && typeof v.data === "object") {
    const d = v.data as Record<string, unknown>
    const candidates = [d.total, d.count, d.totalElements, d.totalCount]
    for (const c of candidates) {
      if (typeof c === "number" && Number.isFinite(c)) return c
    }
    return null
  }

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
    (typeof v.id === "number" && String(v.id)) ||
    (typeof v.groupId === "string" && v.groupId) ||
    (typeof v.groupId === "number" && String(v.groupId)) ||
    (typeof v.uuid === "string" && v.uuid) ||
    null
  return id
}

export function pickRate(value: unknown): string | null {
  if (!value || typeof value !== "object") return null
  const v = value as Record<string, unknown>
  const candidates = [v.rate, v.rates, v.limitRate, v.qps, v.rpm, v.rate_multiplier]

  for (const c of candidates) {
    if (typeof c === "number" && Number.isFinite(c)) return String(c)
    if (typeof c === "string" && c.trim()) return c.trim()
  }

  if (v.config && typeof v.config === "object") return pickRate(v.config)
  return null
}

export function pickPlatform(value: unknown): string | null {
if (!value || typeof value !== "object") return null
const v = value as Record<string, unknown>

const directPlatform = typeof v.platform === "string" && v.platform.trim() ? v.platform.trim() : null
if (directPlatform) return directPlatform

const textHaystack = [v.description, v.name]
.filter((x): x is string => typeof x === "string" && x.trim().length >0)
.join(" ")
.toLowerCase()

 if (textHaystack) {
 if (textHaystack.includes("反重力")) return "anthropic"
 if (textHaystack.includes("cc")) return "anthropic"
 if (textHaystack.includes("codex")) return "openai"
 if (textHaystack.includes("gpt")) return "openai"
 }

 const fallbackCandidates = [v.type, v.provider, v.groupType, v.channel]
 for (const c of fallbackCandidates) {
 if (typeof c === "string" && c.trim()) return c.trim()
 }

 const nestedCandidates = [v.config, v.meta, v.data, v.channelInfo, v.model]
 for (const c of nestedCandidates) {
 if (c && typeof c === "object") {
 const nested = pickPlatform(c)
 if (nested) return nested
 }
 }

return null
}

const PLATFORM_MODEL_MAP: Record<string, string> = {
  openai: "codex",
  anthropic: "claudecode",
  google: "gemini",
  deepseek: "deepseek",
  zhipu: "glm",
  baidu: "wenxin",
  alibaba: "qwen",
  ali: "qwen",
  moonshot: "kimi",
  minimax: "minimax",
  baichuan: "baichuan",
  yi: "yi",
  stepfun: "step",
  cohere: "cohere",
  mistral: "mistral",
  meta: "llama",
  xai: "grok",
  azure: "azure-openai",
  aws: "bedrock",
  bedrock: "bedrock",
  vertex: "vertex-ai",
  cloudflare: "workers-ai",
  together: "together",
  togetherai: "together",
  firework: "fireworks",
  fireworks: "fireworks",
  perplexity: "perplexity",
  groq: "groq",
  replicate: "replicate",
  hugging: "huggingface",
  huggingface: "huggingface",
  stability: "stable-diffusion",
  midjourney: "midjourney",
  elevenlabs: "elevenlabs",
  eleven_labs: "elevenlabs",
  assemblyai: "assemblyai",
  assembly_ai: "assemblyai",
  voyage: "voyage",
  voyageai: "voyage",
  jina: "jina",
  jinaai: "jina",
  silicon: "siliconflow",
  siliconflow: "siliconflow",
  zeroone: "zeroone",
  "01ai": "zeroone",
  "01.ai": "zeroone",
  spark: "spark",
  iflytek: "spark",
  sensenova: "sensenova",
  doubao: "doubao",
  bytedance: "doubao",
  hunyuan: "hunyuan",
  tencent: "hunyuan",
  qwen: "qwen",
  tongyi: "qwen",
  chatglm: "glm",
  ernie: "wenxin",
  wenxin: "wenxin",
  claude: "claudecode",
  gpt: "codex",
  o1: "codex",
  o3: "codex",
  o4: "codex",
  gemini: "gemini",
  kimi: "kimi",
  glm: "glm",
  codestral: "mistral",
  llama: "llama",
  grok: "grok",
  dall: "dall-e",
  suno: "suno",
  luma: "luma",
  runway: "runway",
  pika: "pika",
  kling: "kling",
  cogvideo: "cogvideo",
  cogview: "cogview",
  flux: "flux",
  sdxl: "sdxl",
  stable: "stable-diffusion",
}

export function platformToModel(platform: string | null): string {
  if (!platform) return "未知"
  const key = platform.toLowerCase().trim()
  for (const [k, v] of Object.entries(PLATFORM_MODEL_MAP)) {
    if (key.includes(k)) return v
  }
  return platform
}

export function pickStatus(value: unknown): string | null {
  if (!value || typeof value !== "object") return null
  const v = value as Record<string, unknown>
  if (typeof v.status === "string" && v.status.trim()) return v.status.trim()
  return null
}

export function pickDescription(value: unknown): string | null {
  if (!value || typeof value !== "object") return null
  const v = value as Record<string, unknown>
  if (typeof v.description === "string" && v.description.trim()) return v.description.trim()
  return null
}

export function pickKey(value: unknown): string | null {
  if (!value || typeof value !== "object") return null
  const v = value as Record<string, unknown>
  const candidates = [v.key, v.apiKey, v.api_key, v.token, v.secret, v.access_key]
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim()
  }
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
