import { getUpstreamBaseFromRequest, proxyUpstreamAuthedJson } from "@/lib/upstream"

export async function GET(req: Request) {
  const base = getUpstreamBaseFromRequest(req)
  if (base instanceof Response) return base
  const url = new URL("/api/user/service-health", base)
  return proxyUpstreamAuthedJson(req, url.toString())
}

