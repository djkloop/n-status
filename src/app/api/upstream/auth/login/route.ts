import { getUpstreamBaseFromRequest, proxyUpstreamJson, UPSTREAM_CONFIGS, type UpstreamType } from "@/lib/upstream"

function detectUpstreamType(baseUrl: string): UpstreamType {
  if (baseUrl.includes("findcg")) return "findcg"
  return "router"
}

export async function POST(req: Request) {
  const base = getUpstreamBaseFromRequest(req)
  if (base instanceof Response) return base
  
  const upstreamType = detectUpstreamType(base.toString())
  const config = UPSTREAM_CONFIGS[upstreamType]
  const url = new URL(config.loginPath, base)
  
  // 读取请求体
  let body: unknown = null
  try {
    const clonedReq = req.clone()
    body = await clonedReq.json()
  } catch {
    body = null
  }
  
  console.log(`[API Login] ====================`)
  console.log(`[API Login] Method: POST`)
  console.log(`[API Login] Upstream Type: ${upstreamType}`)
  console.log(`[API Login] Base URL: ${base.toString()}`)
  console.log(`[API Login] Login Path: ${config.loginPath}`)
  console.log(`[API Login] Full URL: ${url.toString()}`)
  console.log(`[API Login] Request Body:`, JSON.stringify(body, null, 2))
  console.log(`[API Login] ====================`)
  
  const response = await proxyUpstreamJson(req, url.toString())
  
  // 如果响应不是 200，打印错误详情
  if (!response.ok) {
    const errorBody = await response.clone().json()
    console.log(`[API Login] ❌ ERROR RESPONSE:`)
    console.log(`[API Login] Status: ${response.status}`)
    console.log(`[API Login] Error Body:`, JSON.stringify(errorBody, null, 2))
    console.log(`[API Login] ====================`)
  }
  
  return response
}
