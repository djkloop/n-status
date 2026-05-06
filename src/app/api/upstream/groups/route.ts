import { getUpstreamBaseFromRequest, proxyUpstreamAuthedJson, UPSTREAM_CONFIGS } from "@/lib/upstream"

function detectUpstreamType(baseUrl: string) {
  if (baseUrl.includes("findcg")) return "findcg"
  return "router"
}

export async function GET(req: Request) {
  const base = getUpstreamBaseFromRequest(req)
  if (base instanceof Response) return base
  
  const upstreamType = detectUpstreamType(base.toString())
  const config = UPSTREAM_CONFIGS[upstreamType]
  const url = new URL(config.groupsPath, base)
  
  if (upstreamType === "findcg") {
    url.searchParams.set("timezone", "Asia/Shanghai")
  }
  
  // 获取 Authorization 头
  const authHeader = req.headers.get("authorization")
  
  console.log(`[API Groups] ====================`)
  console.log(`[API Groups] Method: GET`)
  console.log(`[API Groups] Upstream Type: ${upstreamType}`)
  console.log(`[API Groups] Base URL: ${base.toString()}`)
  console.log(`[API Groups] Groups Path: ${config.groupsPath}`)
  console.log(`[API Groups] Full URL: ${url.toString()}`)
  console.log(`[API Groups] Authorization: ${authHeader ? "Bearer ***" : "none"}`)
  console.log(`[API Groups] ====================`)
  
  return proxyUpstreamAuthedJson(req, url.toString())
}
