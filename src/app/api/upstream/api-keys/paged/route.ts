import { getUpstreamBaseFromRequest, proxyUpstreamAuthedJson } from "@/lib/upstream"
import { getProviderByBaseUrl } from "@/providers"

export async function GET(req: Request) {
  const base = getUpstreamBaseFromRequest(req)
  if (base instanceof Response) return base

  const { searchParams } = new URL(req.url)
  const page = Number(searchParams.get("page") ?? "1")
  const size = Number(searchParams.get("size") ?? "10")

  const provider = getProviderByBaseUrl(base.toString())
  const url = provider.buildApiKeysUrl(base.toString(), provider.paths.apiKeys, page, size)

  return proxyUpstreamAuthedJson(req, url.toString(), provider.getExtraHeaders(url.toString()))
}
