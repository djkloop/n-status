import { getUpstreamBaseFromRequest, proxyUpstreamJson } from "@/lib/upstream"

export async function POST(req: Request) {
  const base = getUpstreamBaseFromRequest(req)
  if (base instanceof Response) return base
  const url = new URL("/api/auth/login", base)
  return proxyUpstreamJson(req, url.toString())
}
