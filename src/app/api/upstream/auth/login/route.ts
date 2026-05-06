import { getUpstreamBaseFromRequest, proxyUpstreamJson } from "@/lib/upstream"
import { getProviderByBaseUrl } from "@/providers"

export async function POST(req: Request) {
  const base = getUpstreamBaseFromRequest(req)
  if (base instanceof Response) return base

  const provider = getProviderByBaseUrl(base.toString())
  const url = new URL(provider.paths.login, base)

  return proxyUpstreamJson(req, url.toString(), provider.getExtraHeaders(url.toString()))
}
