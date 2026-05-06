import type { UpstreamProvider } from "./types"
import { routerProvider } from "./router"
import { findcgProvider } from "./findcg"

const providers: Map<string, UpstreamProvider> = new Map()

export function registerProvider(provider: UpstreamProvider) {
  providers.set(provider.id, provider)
}

export function getProvider(id: string): UpstreamProvider | undefined {
  return providers.get(id)
}

export function getProviderByBaseUrl(baseUrl: string): UpstreamProvider | undefined {
  for (const provider of providers.values()) {
    if (baseUrl.includes(provider.id) || baseUrl.includes(new URL(provider.defaultBaseUrl).hostname)) {
      return provider
    }
  }
  return providers.get("router")
}

export function getAllProviders(): UpstreamProvider[] {
  return Array.from(providers.values())
}

export function getDefaultUpstreams() {
  return getAllProviders().map((p) => ({
    id: p.id,
    name: p.name,
    baseUrl: p.defaultBaseUrl,
  }))
}

registerProvider(routerProvider)
registerProvider(findcgProvider)
