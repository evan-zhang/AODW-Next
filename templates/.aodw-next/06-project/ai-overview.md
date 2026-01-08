# AI System Overview  
（本文件列出 AI 理解本系统所需的全局信息）

> 说明：本文件是骨架模板，AI 可以在后续 RT 中逐步补全。  
> 修改架构或模块职责时，AI 必须同步更新本文件。

---

## 1. 技术栈

- 前端：
- 后端：
- 数据库：
- 消息系统：
- 缓存：
- 运维 / 部署：
- 其他：

（由 AI 或人工在首次接入 AODW 时填写，后续在架构变动时更新）

---

## 2. 整体架构概览

可以使用文字或 ASCII 图描述系统架构，例如：

```text
[ Web / Mobile Client ]
           |
        [ API ]
           |
   [ Services / Domain ]
           |
        [ DB / MQ ]
```

AI 应在理解架构后，将关键组件简要记录在此处。

---

## 3. 目录结构（只列关键部分）

请根据实际项目补充，例如：

- `/apps/web` - 前端应用
- `/apps/api` - 后端 API
- `/packages/shared` - 共享代码（类型、工具等）
- `/infra` - 基础设施与部署脚本
- `/RT` - 每个 Request Ticket 的本地知识库
- `/aodw` - AODW 配置与规则文件（本目录）

AI 在修改目录结构时，需要在此更新说明。

---

## 4. 核心业务模块

为每个重要业务模块列出简要说明（AI 可从模块 README 中提取信息汇总到这里）。

示例模板：

### 4.1 用户模块（User Module）

- **职责**：认证、授权、用户资料管理等
- **关键路径**：
  - Web UI：`apps/web/src/features/user/...`
  - API：`apps/api/src/users/...`
- **依赖关系**：
  - 调用：订单模块、通知模块等
  - 被调用：认证中间件等
- **关键约束**：
  - 不得在 controller 中直接访问数据库，必须通过 service / repository 层；
  - 密码与敏感字段必须加密或脱敏。

### 4.2 订单模块（Order Module）

（同样结构）

---

## 5. 系统级 Invariants（不可破坏原则）

AI 在修改任何代码前必须确认不会违反以下约束：

- 不得绕过 service 层直接访问 DB；
- 不得无故更改对外 API 返回格式（除非走 Spec-Full 流程）；
- 不得在热路径引入明显的性能退化；
- 不得引入明显的安全风险（如绕过认证、明文敏感信息）。

根据系统演进，这些 Invariants 可以在 RT 中进行讨论与更新。

---

## 6. 模块 README 映射表

为 AI 提供“代码目录 → 模块文档”的索引示例：

```text
apps/api/src/users/**      → docs/modules/users.md
apps/api/src/orders/**     → docs/modules/orders.md
apps/web/src/features/**   → docs/modules/web-features.md
```

AI 在创建新模块或重构模块结构时，应同步维护此映射关系。

---

## 7. 历史关键变更（可选）

可记录一些对架构或业务影响较大的里程碑，例如：

- 2025-01：引入新订单系统；
- 2025-03：从单体拆分为微服务；
- 2025-05：迁移认证机制到 OAuth2。

这些信息便于 AI 理解系统随时间的演进。
