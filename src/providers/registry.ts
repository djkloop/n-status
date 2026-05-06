import type { UpstreamProvider } from "./types"
import { routerProvider } from "./router"
import { findcgProvider } from "./findcg"
import { moaiProvider } from "./moai"
import { bmaiProvider } from "./bmai"

const providers: Map<string, UpstreamProvider> = new Map()

export function registerProvider(provider: UpstreamProvider) {
  providers.set(provider.id, provider)
}

export function getProvider(id: string): UpstreamProvider | undefined {
  return providers.get(id)
}

export function getProviderByBaseUrl(baseUrl: string): UpstreamProvider {
  for (const provider of providers.values()) {
    if (baseUrl.includes(provider.id) || baseUrl.includes(new URL(provider.defaultBaseUrl).hostname)) {
      return provider
    }
  }

  const fallbackProvider = providers.get("router")
  if (!fallbackProvider) {
    throw new Error("Router provider is not registered")
  }

  return fallbackProvider
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
registerProvider(moaiProvider)
registerProvider(bmaiProvider)
