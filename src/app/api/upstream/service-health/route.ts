import { getUpstreamBaseFromRequest, proxyUpstreamAuthedJson } from "@/lib/upstream"
import { getProviderByBaseUrl } from "@/providers"

export async function GET(req: Request) {
  const base = getUpstreamBaseFromRequest(req)
  if (base instanceof Response) return base

  const provider = getProviderByBaseUrl(base.toString())

  if (!provider.paths.serviceHealth) {
    return new Response("Service health endpoint not available", { status: 404 })
  }

  const url = provider.buildServiceHealthUrl!(base.toString(), provider.paths.serviceHealth)

  return proxyUpstreamAuthedJson(req, url.toString(), provider.getExtraHeaders(url.toString()))
}
