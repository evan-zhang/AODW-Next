---
name: aodw-agents
version: "{VERSION}"
description: AODW 项目级 Agent 指引。说明规范目录结构与开发流程。
---

# AODW-Next 项目级 Agent 指引

本文档为 OpenClaw 平台上的 AI Agent 提供项目级的工作指引。

## 1. 规范目录结构

AODW 规范文件位于项目根目录下的 `.aodw-next/` 目录中：

```
.aodw-next/
├── manifest.yaml                    # 规则索引与元数据（渐进式加载）
├── 01-core/                         # 核心宪章（最高优先级）
│   ├── aodw-constitution.md         # 主宪章（必须首先读取）
│   ├── ai-interaction-rules.md      # AI 交互规则
│   ├── ai-knowledge-rules.md        # 知识管理规则
│   ├── csf-thinking-framework.md    # CSF 思维框架
│   └── ...
├── 02-workflow/                     # 工作流程
│   ├── rt-manager.md                # RT 生命周期管理
│   ├── spec-full-profile.md         # 完整 Spec 档案
│   ├── spec-lite-profile.md          # 简化 Spec 档案
│   └── ...
├── 03-standards/                    # 编码标准
│   ├── ai-coding-rules.md           # AI 编码规则
│   └── ...
├── 04-auditors/                     # 审计官
│   ├── aodw-requirement-auditor-rules.md
│   ├── aodw-development-auditor-rules.md
│   └── aodw-full-auditor-rules.md
├── 05-tooling/                      # 工具初始化
│   └── ai-tools-init-rules.md
└── 06-project/                      # 项目特化文件（用户生成）
    ├── ai-overview.md               # 项目概览（技术栈、架构）
    ├── modules-index.yaml           # 模块索引
    └── tools-status.yaml            # 工具状态
```

## 2. 规则索引系统

所有规则的元数据定义在 `manifest.yaml` 中。每个规则文件包含：
- `summary_preferred`: 是否使用摘要模式
- `load_when`: 加载时机标签
- `priority`: 优先级（critical/high/medium）
- `size_kb`: 文件大小（token 优化）

Agent 应根据当前任务阶段，从 manifest 中查询需要加载的规则文件。

## 3. 开发流程概览

AODW 定义了文档驱动的开发流程：

### 3.1 创建 RT (Request Ticket)
- 命令：`npx aodw-skill new`
- 生成 RT-ID（如 `RT-20250123-001`）
- 创建 feature 分支
- 执行 Intake 流程（需求澄清）

### 3.2 决策模式
- **Spec-Full**: 完整规范流程（复杂功能）
- **Spec-Lite**: 简化规范流程（小改动）

### 3.3 分析阶段
- 影响分析 (impact.md)
- 不变量检查 (invariants.md)
- 技术方案设计

### 3.4 实现阶段
- 代码实现
- 测试编写
- 模块文档更新

### 3.5 验证阶段
- 文档与代码一致性检查
- RT 完整性验证

### 3.6 完成阶段
- 合并分支
- 知识蒸馏
- 更新 RT 状态

## 4. 核心检查点

### 4.1 分支管理
- 所有代码修改必须在 feature 分支进行
- 严禁在 main/master 分支直接修改

### 4.2 Plan 批准
- Plan 完成后必须执行 CSF 审查
- 未获批准前不得开始修改代码

### 4.3 提交确认
- 代码完成后展示 git status 和 diff
- 询问用户确认后再提交

## 5. Agent 行为准则

### 5.1 语言要求
- 使用中文进行所有交互和文档编写

### 5.2 上下文加载
- 必须首先读取 `.aodw-next/01-core/aodw-constitution.md`
- 根据任务阶段按需加载其他规则
- 遵循 token 优化原则

### 5.3 质量标准
- 遵循编码规范（见 `03-standards/`）
- 执行相应的审计流程（见 `04-auditors/`）
- 保持文档与代码同步

## 6. 常用命令参考

```bash
# 初始化项目
npx aodw-skill init

# 创建新 RT
npx aodw-skill new

# 初始化开发工具
npx aodw-skill init-tools

# 更新 AODW
npx aodw-skill update

# 启用 guard hook
npx aodw-skill enable-guard-hook
```

## 7. 获取帮助

- 项目概览：`.aodw-next/06-project/ai-overview.md`
- 模块索引：`.aodw-next/06-project/modules-index.yaml`
- 主宪章：`.aodw-next/01-core/aodw-constitution.md`
- 规则索引：`.aodw-next/manifest.yaml`
