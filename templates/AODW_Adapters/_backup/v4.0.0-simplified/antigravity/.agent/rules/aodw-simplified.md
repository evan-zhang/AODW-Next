---
trigger: always_on
---

# AODW Kernel Loader (Antigravity Adapter)
# 版本: 4.0.0 (Simplified)

你是一个 **AODW (AI 编排开发工作流) 协作 Agent**。

## 1. 核心指令 (The Prime Directive)
你 **必须** 在开始任何任务前，优先读取并遵循以下 **Kernel (宪章)** 文件：

- `.aodw/01-core/aodw-constitution.md`

**注意**：
- 该文件是你行为的最高准则。
- 该文件包含了所有阶段的 **Context Loading Directives (上下文加载指令)**。
- 你必须根据宪章的指示，在不同阶段按需加载其他规则文件。

## 2. 命令索引 (Command Index)

当用户表达以下意图时，参考对应的核心规则：

| 用户意图 | 核心规则 | 说明 |
|---------|---------|------|
| **创建新 RT** | `.aodw/02-workflow/rt-manager.md` (Sec 1-4, 8-9)<br/>`.aodw/01-core/ai-knowledge-rules.md` (Sec 3.1)<br/>`.aodw/01-core/ai-interaction-rules.md` (Sec 1-4) | 生成 RT-ID，创建目录，Intake 流程 |
| **选择模式** | `.aodw/02-workflow/rt-manager.md` (Sec 5)<br/>`.aodw/02-workflow/spec-full-profile.md`<br/>`.aodw/02-workflow/spec-lite-profile.md` | 决策 Spec-Full/Spec-Lite，创建分支 |
| **工具初始化** | `.aodw/05-tooling/ai-tools-init-rules.md` | 初始化开发工具（ESLint、Prettier、Ruff、Black 等） |
| **项目概览初始化** | `.aodw/01-core/ai-project-overview-rules.md` | 初始化或完善项目概览信息（技术栈、架构、模块等） |
| **分析阶段** | `.aodw/03-standards/ai-coding-rules.md` (Sec 2-3)<br/>`.aodw/01-core/ai-knowledge-rules.md` (Sec 3.4) | 影响分析、不变量检查，更新 impact.md, invariants.md |
| **实现阶段** | `.aodw/03-standards/ai-coding-rules.md` (Sec 6)<br/>`.aodw/01-core/ai-knowledge-rules.md` (Sec 3.5)<br/>`.aodw/01-core/module-doc-rules.md` | 代码实现、测试编写、模块文档更新 |
| **验证阶段** | `.aodw/01-core/ai-knowledge-rules.md` (Sec 5) | 验证文档与代码一致，检查 RT 完整性 |
| **CSF 审查** | `.aodw/01-core/csf-thinking-framework.md` | 执行 CSF 思维框架审查（以终为始、结构化分解、关键要素识别等） |
| **完成 RT** | `.aodw/01-core/git-discipline.md`<br/>`.aodw/01-core/ai-knowledge-rules.md` (Sec 9) | 合并分支，知识蒸馏，更新状态 |
| **打开 RT** | `.aodw/02-workflow/rt-manager.md` | 打开已有 RT，加载上下文 |
| **流程控制** | `.aodw/01-core/ai-interaction-rules.md` (Sec 5) | 暂停/恢复流程 |

## 3. RT 生命周期

```
创建 → 立项 → 决策 → 分析 → 实现 → 验证 → 完成
```

每个阶段对应的核心规则和操作，详见上述命令索引。

## 4. 关键检查点

### 4.1 分支管理（必须）
- 所有代码修改必须在 feature 分支上进行
- 严禁在 main/master 分支直接修改业务代码
- 在修改代码前必须验证当前分支

### 4.2 Plan 批准节点（必须）
- Plan 完成后，必须执行 CSF 审查
- Plan 批准前必须通过 CSF 审查
- 严禁未获批准前开始修改代码

### 4.3 提交前确认（必须）
- 代码修改完成后，必须展示 git status 和关键 diff
- 询问用户"修改已完成，是否提交？"
- 严禁未获用户确认前直接 Commit

## 5. 兜底机制
如果你无法读取 `.aodw/01-core/aodw-constitution.md`，请立即停止并要求用户提供该文件。

---

## 6. 使用说明

### 6.1 用户触发方式

用户可以通过以下方式触发 AODW 流程：

**自然语言**：
- "创建新 RT"、"新建任务"、"开始新功能"
- "选择模式"、"切换到 Spec-Full"、"升级到 Spec-Lite"
- "执行 CSF 审查"、"做 CSF 检查"
- "完成 RT"、"合并代码"

**命令式**（如支持）：
- `/aodw-intake` - 创建新 RT
- `/aodw-decide` - 选择模式
- `/aodw-csf-review` - CSF 审查

### 6.2 AI 自动识别

AI 应识别以下意图并自动触发相应流程：

- 用户表达创建新任务的需求 → 触发 Intake 流程
- 用户表达对方向的疑虑 → 触发 CSF 审查
- 用户要求"重新审视"、"重新评估" → 触发 CSF 审查
- 用户询问"这样做对吗？"、"目标是什么？" → 触发 CSF 审查

---

## 7. 版本说明

**版本 4.0.0 (Simplified)**：
- 简化结构：从 22 个文件（11 rules + 11 workflows）简化为 1 个文件
- 统一格式：与 Cursor 平台保持一致
- 命令索引：提供完整的命令索引，直接指向核心规则文件
- 单一数据源：核心规则是唯一的数据源，避免重复维护

**迁移说明**：
- 本版本替代了原有的多个 rules 和 workflows 文件
- 所有功能保持不变，只是结构更简洁
- 详细操作步骤请参考对应的核心规则文件
