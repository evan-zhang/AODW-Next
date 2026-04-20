# NPM 包瘦身候选清单（aodw-skill）

本文档用于记录 `.aodw-next` 中可能不需要随 npm 包发布的文件，目标是减少安装体积和维护复杂度。

## 已处理

- 已将 `templates/.aodw-next/07-optimization/token-usage-analysis.md` 迁移到仓库维护区：`maintainers/token-usage-analysis.md`。
- 该文档不再参与 `cli/publish.sh` 的模板同步，不会进入 npm 包。
- 已将以下高置信候选迁移到 `maintainers/pruned-from-template/`（保留原目录结构）：
  - `templates/.aodw-next/01-core/ai-interaction-rules-summary.md`
  - `templates/.aodw-next/01-core/ai-knowledge-rules-summary.md`
  - `templates/.aodw-next/01-core/git-discipline-summary.md`
  - `templates/.aodw-next/02-workflow/rt-manager-summary.md`
  - `templates/.aodw-next/02-workflow/ui-workflow-rules-summary.md`
  - `templates/.aodw-next/templates/tools-config/README.md`
- 已将 `templates/.aodw-next/02-workflow/rt-id-generation-rules.md` 迁移到 `maintainers/pruned-from-template/02-workflow/rt-id-generation-rules.md`，并合并其规则到 `templates/.aodw-next/02-workflow/rt-manager.md`。
  - `templates/.aodw-next/06-project/README.md`

## 高置信候选（已处理）

这些文件目前未进入核心加载链路（Kernel/Constitution/命令索引），更像维护说明或摘要材料：

以上条目已完成迁移，不再进入 npm 包。

## 需要谨慎验证的候选

以下候选已完成迁移到 `maintainers/pruned-from-template/`：

- `templates/.aodw-next/03-standards/stacks/rust-axum/ai-coding-rules-backend.md`
- `templates/.aodw-next/templates/TEMPLATE-APPLICATION-GUIDE.md`
- `templates/.aodw-next/templates/checklists/coding-standards-template.md`
- `templates/.aodw-next/templates/csf-review-template.md`

## 明显应保留（当前 CLI/规则有直接依赖）

- `templates/.aodw-next/templates/ai-overview.template.md`
- `templates/.aodw-next/templates/modules-index.template.yaml`
- `templates/.aodw-next/templates/aodw-kernel-loader-template.md`
- `templates/.aodw-next/templates/tools-config/**`
- 命令索引中直接引用的核心规则集（`01-core`、`02-workflow`、`03-standards`、`04-auditors`、`05-tooling`）

## 第三阶段模板清理（2026-04-20）

确认并迁移了 9 个无引用模板：

| 模板文件 | 引用情况 | 操作 |
|---------|---------|------|
| `audit-report-template.md` | 无引用 | ✅ 已迁移 |
| `changelog-template.md` | 无引用 | ✅ 已迁移 |
| `impact-template.md` | 无引用 | ✅ 已迁移 |
| `invariants-template.md` | 无引用 | ✅ 已迁移 |
| `plan-lite-template.md` | 无引用 | ✅ 已迁移 |
| `rt-decision-template.md` | 无引用 | ✅ 已迁移 |
| `rt-intake-template.md` | 无引用 | ✅ 已迁移 |
| `spec-lite-template.md` | 无引用 | ✅ 已迁移 |
| `tests-template.md` | 无引用 | ✅ 已迁移 |

同时修复了 `ui-workflow-rules.md` 中对不存在的 `ui-prototype.template.html` 的悬空引用。

**保留的模板（有明确引用）**：
- `module-readme-template.md` — 被 `module-doc-rules.md` 引用
- `ai-overview.template.md` — CLI 命令直接依赖
- `modules-index.template.yaml` — CLI 命令直接依赖
- `aodw-kernel-loader-template.md` — CLI/适配器生成依赖
- `tools-config/**` — `init-tools` 直接读取

## 第四阶段适配器清理（2026-04-20）

精简支持的 AI 工具适配器，仅保留三个主流平台：

| 适配器 | 操作 | 原因 |
|-------|------|------|
| **Cursor** | ✅ 保留 | 主流 AI IDE |
| **Antigravity (Gemini)** | ✅ 保留 | Google Gemini 官方适配器 |
| **Claude** | ✅ 保留 | Anthropic Claude Code 支持 |
| **Gemini (Web/API)** | ❌ 删除 | 功能与 Antigravity 重复 |
| **General (OpenAI 等)** | ❌ 删除 | 通用适配器维护成本高，优先支持核心平台 |

同时清理的代码：
- 移除 `GeminiProcessor` 和 `GeneralProcessor`（与 `ClaudeProcessor` 功能相同）
- 移除 `CopilotProcessor`（不再使用）
- 更新 `cli/bin/aodw.js` 中的平台选择选项
- 更新 `cli/bin/update-adapters-from-template.js`
- 更新 `cli/README.md` 文档

**当前支持的适配器**：
```
templates/AODW_Adapters/
├── cursor/
│   └── .cursor/rules/aodw-next.mdc
├── antigravity/
│   └── .agent/rules/aodw-next.md
└── claude/
    └── CLAUDE.md
```

## 第五阶段文档更新（2026-04-20）

同步更新 `templates/docs/` 中的用户文档，确保与当前支持的适配器和目录结构一致：

| 文档 | 更新内容 |
|------|---------|
| **README.md** | 更新目录引用 `.aodw/` → `.aodw-next/`，更新维护者文档路径 |
| **adapter-evaluation.md** | 移除 Gemini (Web/API) 和 General Agents 评估，保留三个主流平台 |
| **platform-matrix.md** | 移除 GitHub Copilot 部分，更新 Frontmatter 规范，添加当前支持的适配器表格 |
| **installation-variants.md** | 更新适配器命名约定，移除已删除的 Gemini 独立适配器 |
| **migration-guide-0.2.0.md** | 更新命令引用 `create-aodw` → `aodw-skill`，更新目录路径 |

**保持不变**：
- `backend-guidelines.md` - 技术栈相关内容，无需修改
- `frontend-guidelines.md` - 技术栈相关内容，无需修改

**注意**：由于 `templates/docs` 目录已删除（见第六阶段），上述文档更新实际上无需保留。

## 第六阶段删除未使用的 docs 目录（2026-04-20）

删除 `templates/docs/` 目录及其相关代码引用：

| 项目 | 操作 | 原因 |
|------|------|------|
| **templates/docs/** | ✅ 已删除 | `SOURCE_DOCS` 定义后从未使用，实际不会安装到用户项目 |
| **cli/bin/aodw.js** | ✅ 已清理 | 移除 `npmDocs`、`devDocs`、`SOURCE_DOCS` 定义 |
| **cli/publish.sh** | ✅ 已清理 | 移除 `DOCS_SRC` 变量和 `cp -r “$DOCS_SRC” ./docs` 复制逻辑 |

**删除的文档内容**：
- `README.md` - 用户文档索引
- `adapter-evaluation.md` - 平台能力评估
- `platform-matrix.md` - 平台功能矩阵
- `installation-variants.md` - 双版本安装方案
- `migration-guide-0.2.0.md` - 迁移指南
- `backend-guidelines.md` - 后端开发规范
- `frontend-guidelines.md` - 前端开发规范

**理由**：
- 这些文档设计但未实现，实际不会发布到 npm 包
- 过时内容（如已删除的 Copilot 适配器）会误导用户
- 用户文档应放在 GitHub 仓库的 `docs/` 目录，而非随 npm 包发布

## 下一步执行建议

1. 在本地执行一次完整 smoke test：
   - `aodw-skill init`
   - `aodw-skill new`
   - 工具初始化提示词与项目概览提示词生成
2. 通过后再处理”需要谨慎验证的候选”。
