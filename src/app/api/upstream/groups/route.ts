import { getUpstreamBaseFromRequest, proxyUpstreamAuthedJson } from "@/lib/upstream"
import { getProviderByBaseUrl } from "@/providers"

export async function GET(req: Request) {
  const base = getUpstreamBaseFromRequest(req)
  if (base instanceof Response) return base

  const provider = getProviderByBaseUrl(base.toString())
  const url = provider.buildGroupsUrl(base.toString(), provider.paths.groups)

  return proxyUpstreamAuthedJson(req, url.toString(), provider.getExtraHeaders(url.toString()))
}
