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

## 下一步执行建议

1. 在本地执行一次完整 smoke test：
   - `aodw-skill init`
   - `aodw-skill new`
   - 工具初始化提示词与项目概览提示词生成
2. 通过后再处理“需要谨慎验证的候选”。
