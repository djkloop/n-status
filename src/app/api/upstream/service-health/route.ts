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
  
  if (config.serviceHealthPath) {
    const url = new URL(config.serviceHealthPath, base)
    if (upstreamType === "findcg") {
      url.searchParams.set("timezone", "Asia/Shanghai")
    }
    return proxyUpstreamAuthedJson(req, url.toString())
  }
  
  return new Response("Service health endpoint not available", { status: 404 })
}

