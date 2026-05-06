# N-Status 接口控制台 - Code Wiki

## 项目概述

N-Status 是一个基于 **Next.js 16** 构建的接口查询控制台应用，主要用于查询上游 API 分组与 API Key 列表，同时提供上游服务健康状态监测和站点收录功能。

### 核心功能

| 功能模块 | 路径 | 描述 |
|---------|------|------|
| **接口控制台** | `/` | 查询上游 API 分组、API Key 列表和服务健康状态 |
| **上游状态** | `/status` | 实时监控上游服务健康状态，支持自动刷新 |
| **站点收录** | `/collect` | 收录中转站上游收录/排行榜/监测站点 |

---

## 技术栈

| 类别 | 技术 | 版本 |
|------|------|------|
| 框架 | Next.js | 16.2.4 |
| 语言 | TypeScript | ^5 |
| UI组件 | shadcn/ui | ^4.4.0 |
| 样式 | Tailwind CSS | ^4 |
| 图标 | lucide-react | ^1.8.0 |
| 状态管理 | React Hooks + localStorage | - |
| 通知 | sonner | ^2.0.7 |

---

## 项目架构

```
src/
├── app/                    # 应用入口与路由
│   ├── api/                # API 路由（同域转发）
│   │   ├── bootstrap/      # 引导登录接口
│   │   └── upstream/       # 上游 API 代理
│   ├── collect/            # 站点收录页面
│   ├── status/             # 上游状态页面
│   ├── layout.tsx          # 根布局
│   └── page.tsx            # 控制台首页
├── components/             # UI 组件
│   ├── console/            # 控制台专用组件
│   ├── ui/                 # 基础 UI 组件（shadcn）
│   ├── providers.tsx       # 主题提供器
│   ├── top-nav.tsx         # 顶部导航
│   └── json-viewer.tsx     # JSON 查看器
├── hooks/                  # 自定义 Hooks
│   └── use-local-storage.ts # localStorage 封装
└── lib/                    # 工具函数
    ├── upstream.ts         # 上游代理核心逻辑
    ├── extract.ts          # 数据提取工具
    ├── collect-sites.ts    # 收录站点配置
    └── utils.ts            # 通用工具函数
```

---

## 核心模块详解

### 1. 上游代理模块 (`lib/upstream.ts`)

**职责**：处理上游 API 请求的代理转发，提供安全验证和错误处理。

**核心函数**：

| 函数名 | 功能 | 参数 | 返回值 |
|--------|------|------|--------|
| `validateUpstreamBase` | 验证上游地址合法性 | `base: string` | `URL \| null` |
| `getUpstreamBaseFromRequest` | 从请求头获取上游地址 | `req: Request` | `URL \| Response` |
| `proxyUpstreamAuthedJson` | 代理需要认证的上游请求 | `req: Request, url: string` | `Promise<Response>` |
| `proxyUpstreamJson` | 代理无需认证的上游请求 | `req: Request, url: string` | `Promise<Response>` |

**安全特性**：
- 仅允许 HTTPS 协议
- 禁止 localhost 和内网 IP（防止 SSRF 攻击）
- 支持自定义超时时间（1-60 秒）
- 自动添加请求耗时头 `x-upstream-elapsed-ms`

---

### 2. 数据提取模块 (`lib/extract.ts`)

**职责**：从上游返回的异构数据中提取统一格式的信息。

**核心函数**：

| 函数名 | 功能 | 提取字段 |
|--------|------|----------|
| `extractList` | 提取列表数据 | `data`, `items`, `records`, `list`, `content` |
| `extractTotal` | 提取总数 | `total`, `count`, `totalElements`, `totalCount` |
| `pickDisplayName` | 提取显示名称 | `name`, `title`, `label`, `id`, `code` |
| `pickId` | 提取 ID | `id`, `groupId`, `uuid` |
| `pickRate` | 提取倍率 | `rate`, `rates`, `limitRate`, `qps`, `rpm` |
| `pickSupportedModels` | 提取支持的模型 | `models`, `supportedModels`, `modelList` |

---

### 3. API 路由层 (`app/api/`)

#### 上游代理路由 (`app/api/upstream/`)

| 路径 | 方法 | 上游端点 | 认证要求 |
|------|------|----------|----------|
| `/api/upstream/auth/login` | POST | `/api/auth/login` | 否 |
| `/api/upstream/groups` | GET | `/api/user/api-keys/groups` | 是 |
| `/api/upstream/api-keys/paged` | GET | `/api/user/api-keys/paged` | 是 |
| `/api/upstream/service-health` | GET | `/api/user/service-health` | 是 |

#### 引导登录路由 (`app/api/bootstrap/login`)

- **用途**：使用当前上游对应的环境变量凭据自动登录
- **环境变量**：
  - `ROUTER_USERNAME` / `ROUTER_PASSWORD` - Router 上游登录凭据
  - `FINDCG_USERNAME` / `FINDCG_PASSWORD` - FindCG 上游登录凭据

---

### 4. 页面组件

#### 控制台首页 (`app/page.tsx`)

**功能**：主控制台页面，包含认证、分组查询、API Key 查询和状态检查。

**核心状态**：
- `upstreams` - 上游配置列表（localStorage 持久化）
- `activeUpstreamId` - 当前选中的上游
- `token` - 用户认证 Token
- `groups` - 分组列表
- `apiItems` - API Key 列表
- `health` - 服务健康状态

**关键方法**：
- `fetchGroups()` - 拉取分组列表
- `fetchApiKeys()` - 分页查询 API Key
- `fetchHealth()` - 获取服务健康状态
- `login()` - 使用当前上游对应环境变量登录

#### 上游状态页 (`app/status/page.tsx`)

**功能**：实时监控上游服务健康状态，支持自动刷新。

**特色功能**：
- 自动刷新（30秒/1分钟/5分钟可选）
- 分组健康统计卡片
- 时间线热力图可视化
- 分栏/表格两种视图切换
- 异常分组优先排序

#### 站点收录页 (`app/collect/page.tsx`)

**功能**：收录中转站相关的第三方站点，支持搜索和筛选。

**站点类型**：
- `Provider` - 提供商目录
- `Monitor` - 状态监测
- `Leaderboard` - 排行榜
- `Directory` - 目录导航

---

### 5. 控制台组件

| 组件 | 路径 | 功能 |
|------|------|------|
| `AuthCard` | `components/console/auth-card.tsx` | 认证卡片（自动登录） |
| `GroupsCard` | `components/console/groups-card.tsx` | 分组列表展示 |
| `ApiKeysCard` | `components/console/api-keys-card.tsx` | API Key 分页表格 |
| `StatusCard` | `components/console/status-card.tsx` | 服务健康状态卡片 |
| `UpstreamManager` | `components/console/upstream-manager.tsx` | 上游配置管理 |

---

### 6. 自定义 Hooks

#### `useLocalStorageString` (`hooks/use-local-storage.ts`)

**功能**：封装 localStorage 字符串读写，支持跨标签页同步。

```typescript
const [value, setValue] = useLocalStorageString('key', 'default')
```

#### `useLocalStorageJson` (`hooks/use-local-storage.ts`)

**功能**：封装 localStorage JSON 对象读写，带验证函数。

```typescript
const [data, setData] = useLocalStorageJson('key', defaultValue, validator)
```

---

## 数据流架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        客户端浏览器                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐ │
│  │  用户操作    │───▶│  React State │───▶│  localStorage       │ │
│  └─────────────┘    └─────────────┘    └─────────────────────┘ │
│         │                    │                                  │
│         ▼                    ▼                                  │
│  ┌─────────────┐    ┌─────────────┐                            │
│  │  API 请求   │◀───│  业务逻辑    │                            │
│  └─────────────┘    └─────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Next.js Server                           │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    API Routes                              │  │
│  │  /api/upstream/*  ──────────────────────────────────────▶ │  │
│  │         │                                                 │  │
│  │         ▼                                                 │  │
│  │  ┌───────────────────────────────────────────────────┐    │  │
│  │  │           lib/upstream.ts                         │    │  │
│  │  │  • 验证上游地址 • 添加认证头 • 代理请求 • 错误处理 │    │  │
│  │  └───────────────────────────────────────────────────┘    │  │
│  │         │                                                 │  │
│  │         ▼                                                 │  │
│  │  ┌───────────────────────────────────────────────────┐    │  │
│  │  │           上游 API 服务器                           │    │  │
│  │  │         (ai.router.team)                          │    │  │
│  │  └───────────────────────────────────────────────────┘    │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 运行方式

### 开发环境

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev
```

### 生产构建

```bash
pnpm build
pnpm start
```

### Docker 部署

```bash
docker-compose up -d
```

### 环境变量

| 变量名 | 描述 | 默认值 |
|--------|------|--------|
| `ROUTER_USERNAME` | Router 登录用户名 | - |
| `ROUTER_PASSWORD` | Router 登录密码 | - |
| `FINDCG_USERNAME` | FindCG 登录用户名 | - |
| `FINDCG_PASSWORD` | FindCG 登录密码 | - |

---

## 安全设计

### CORS 绕过方案

项目通过 **同域转发** 模式绕过浏览器 CORS 限制：

1. 前端请求 `/api/upstream/*`（同域）
2. Next.js API 路由代理到上游服务
3. 上游响应返回到前端

### 安全限制

- **HTTPS 强制**：上游地址必须使用 HTTPS
- **内网禁止**：禁止 localhost 和内网 IP（防止 SSRF）
- **超时控制**：默认 12 秒超时，支持自定义（1-60秒）
- **Token 安全**：Token 仅存储在 localStorage，不发送到服务器

---

## 本地存储结构

```
console:upstreams          → [{ id, name, baseUrl }, ...]
console:activeUpstreamId   → "router"
console:token:{upstreamId} → "Bearer xxx"
console:login:username:{upstreamId} → "user@example.com"
console:login:password:{upstreamId} → "******"
status:enabled:{upstreamId} → "1"
status:intervalMs          → "60000"
```

---

## 代码约定

### 命名规范

- 文件：`kebab-case.tsx`
- 组件：`PascalCase.tsx`
- 变量：`camelCase`
- 常量：`UPPER_CASE_SNAKE`

### 类型定义

- 使用 TypeScript 严格模式
- 导出类型使用 `type` 关键字
- 组件 Props 使用接口定义

### 错误处理

- API 响应使用 `ApiErrorPayload` 统一格式
- 使用 `sonner` toast 进行用户通知
- 网络异常区分超时（504）和连接失败（502）

---

## 扩展建议

### 待添加功能

1. **多环境切换**：支持开发/测试/生产环境配置
2. **请求日志**：记录历史请求和响应
3. **批量操作**：批量复制 API Key
4. **告警规则**：配置异常告警阈值
5. **Dark Mode**：完整的暗色主题支持

### 性能优化

1. **请求防抖**：搜索输入添加防抖
2. **缓存策略**：合理设置缓存头
3. **懒加载**：组件按需加载
4. **虚拟滚动**：大数据列表优化
