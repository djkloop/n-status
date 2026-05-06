import { getUpstreamBaseFromRequest, proxyUpstreamAuthedJson, UPSTREAM_CONFIGS } from "@/lib/upstream"

function detectUpstreamType(baseUrl: string) {
  if (baseUrl.includes("findcg")) return "findcg"
  return "router"
}

export async function GET(req: Request) {
  const base = getUpstreamBaseFromRequest(req)
  if (base instanceof Response) return base

  const { searchParams } = new URL(req.url)
  const page = searchParams.get("page") ?? "1"
  const size = searchParams.get("size") ?? "10"
  
  const upstreamType = detectUpstreamType(base.toString())
  const config = UPSTREAM_CONFIGS[upstreamType]
  const url = new URL(config.apiKeysPath, base)
  
  if (upstreamType === "findcg") {
    url.searchParams.set("page", page)
    url.searchParams.set("page_size", size)
    url.searchParams.set("timezone", "Asia/Shanghai")
  } else {
    url.searchParams.set("page", page)
    url.searchParams.set("size", size)
  }
  
  // 获取 Authorization 头
  const authHeader = req.headers.get("authorization")
  
  console.log(`[API Keys] ====================`)
  console.log(`[API Keys] Method: GET`)
  console.log(`[API Keys] Upstream Type: ${upstreamType}`)
  console.log(`[API Keys] Base URL: ${base.toString()}`)
  console.log(`[API Keys] API Keys Path: ${config.apiKeysPath}`)
  console.log(`[API Keys] Full URL: ${url.toString()}`)
  console.log(`[API Keys] Query Params: page=${page}, size=${size}`)
  console.log(`[API Keys] Authorization: ${authHeader ? "Bearer ***" : "none"}`)
  console.log(`[API Keys] ====================`)
  
  return proxyUpstreamAuthedJson(req, url.toString())
}
