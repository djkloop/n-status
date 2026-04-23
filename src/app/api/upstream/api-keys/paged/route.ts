import { getUpstreamBaseFromRequest, proxyUpstreamAuthedJson } from "@/lib/upstream"

export async function GET(req: Request) {
  const base = getUpstreamBaseFromRequest(req)
  if (base instanceof Response) return base

  const { searchParams } = new URL(req.url)
  const page = searchParams.get("page") ?? "1"
  const size = searchParams.get("size") ?? "10"
  const url = new URL("/api/user/api-keys/paged", base)
  url.searchParams.set("page", page)
  url.searchParams.set("size", size)
  return proxyUpstreamAuthedJson(req, url.toString())
}
