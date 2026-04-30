export type CollectSiteType = "Provider" | "Monitor" | "Leaderboard" | "Directory"

export type CollectSite = {
  id: string
  name: string
  url: string
  type: CollectSiteType
  tags: string[]
  description?: string
}

export const COLLECT_SITES: CollectSite[] = [
  {
    id: "lmspeed-provider",
    name: "LMSpeed Provider",
    url: "https://lmspeed.net/zh/provider",
    type: "Provider",
    tags: ["提供商", "目录", "中文"],
    description: "中转站/上游提供商聚合页",
  },
  {
    id: "relaypulse",
    name: "RelayPulse",
    url: "https://relaypulse.top/",
    type: "Monitor",
    tags: ["状态", "延迟", "排行榜"],
    description: "中转站可用性与延迟观测",
  },
  {
    id: "hvoy-leaderboard",
    name: "Hvoy Leaderboard",
    url: "https://hvoy.ai/leaderboard",
    type: "Leaderboard",
    tags: ["排行榜", "排名"],
    description: "上游/中转站排行榜",
  },
]
