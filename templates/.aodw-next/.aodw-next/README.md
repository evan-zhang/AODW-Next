# AODW 快速指南

面向从零启动的新项目，说明这套 AI-Orchestrated Development Workflow 的组成与最小操作步骤。

## 1. 目录与组成
- `.aodw/`：核心规则（宪法、AI 行为、知识维护、交互、模块文档、Spec Full/Lite Profile、RT Manager、模板）以及 `.aodw/aodw_governance/` 治理与版本记录。
- `.cursor/`：运行时规则（`aodw_all.mdc` 等）供 Cursor/Claude/Codex 等加载。
- `RT/index.yaml`：RT 全局索引；每个 RT 放在 `RT/RT-XXX/`。

## 2. 初始化新仓库
1) 直接把上述目录/文件拷贝到仓库根目录。  
2) 在 `.aodw/06-project/modules-index.yaml` 登记实际模块；为每个模块用 `.aodw/templates/module-readme-template.md` 生成 README（建议放 `docs/modules/<name>.md`），写明职责/映射/不变量/历史。  
3) 创建 `RT/RT-001/`（Spec-Full）：复制 `.aodw/templates/rt-meta-template.yaml` 为 `meta.yaml`，初始化 intake/decision/spec/plan/impact/invariants/tests/changelog，记录"启用 AODW"的决策；在 `RT/index.yaml` 登记并更新 `last_updated_at`（必须使用系统命令或 API 获取真实时间）。  
4) 确认团队约定：分支前缀 `feature|bugfix|refactor/RT-XXX-short-name`，提交信息包含 `Refs: RT-XXX`。

> 可选：`.aodw/init.md` 中有面向 AI 工具的一键指令提示词，可直接粘贴给 Cursor/Claude/Codex 执行初始化。

## 3. 日常使用流程（简）
1) 有需求/bug/改进时，让 AI 依 `/.aodw/01-core/ai-interaction-rules.md` 提问并创建/挂接 RT（Spec-Lite vs Spec-Full 依规则判定）。  
2) 为该 RT 填充必要文件（meta/intake/decision/spec(-lite)/plan(-lite)/impact/invariants/tests/changelog），并同步 `RT/index.yaml`。  
3) 按 `.aodw/03-standards/ai-coding-rules.md`、`.aodw/01-core/ai-knowledge-rules.md` 开发：小步提交、保持文档与代码一致、更新模块 README。  
4) 完成前做一致性检查（meta/index、spec/plan/impact/tests、模块 README、不变量），确认后合并并更新 RT 状态。  

## 4. 给 AI 工具的加载方式
- Cursor/Claude/Codex：确保可读取 `.cursor/aodw_all.mdc` 和 `.aodw/`（含 `.aodw/aodw_governance/`）、`RT/`。  
- 如需显式提示，参考 `.aodw/init.md` 的指令，让 AI 自动完成初始化和首个 RT-CORE 创建。
