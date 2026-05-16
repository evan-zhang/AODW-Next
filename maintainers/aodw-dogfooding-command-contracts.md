# AODW-Next 命令接口草案（Command Contracts v1）

> 当前执行基线：以 `maintainers/aodw-v0-one-pager.md` 为准。命令设计以 `audit` 单命令优先，其它命令暂不作为当前阶段实现承诺。

## 1. 文档目的

本草案用于定义后续工具化实现的命令契约，确保实现前对输入输出、错误处理、降级行为达成一致。

覆盖命令（按优先级）：

- `aodw audit`（v0 必做）
- `aodw rt advance`（v1 候选）
- `aodw rt resolve`（v1 候选）

说明：本文档为接口设计，不代表已实现。

---

## 2. 共通设计约定

## 2.1 输出模式

每个命令支持两种输出：

- human-readable（默认）
- machine-readable（`--json`）

## 2.2 退出码建议

- `0`：成功
- `1`：业务失败（参数合法但不满足执行前提）
- `2`：参数错误
- `3`：环境错误（如 git 状态不可读）

## 2.3 幂等性原则

- 对同一输入重复执行，不应造成不可控重复写入
- 对可能覆盖内容的写入，需支持 `--dry-run` 预览

## 2.4 安全原则

- 默认不做 destructive 覆盖
- 需要覆盖时显式 `--force`

---

## 3. `aodw audit` 契约

## 3.1 命令意图

基于工作区改动或提交记录，生成“执行记录草稿”，用于快速补齐文档痕迹。

## 3.2 输入参数（建议）

- `--rt <id>`：任务 ID（可选，未来若存在 RT 则建议必填）
- `--source <working-tree|staged|commit>`：审计来源，默认 `staged`
- `--commit <sha>`：当 source=commit 时必填
- `--format <md|yaml|json>`：输出内容格式，默认 `md`
- `--write`：将结果写入目标文件
- `--dry-run`：仅打印预览，不写文件
- `--json`：机器可读输出

## 3.3 核心输出字段（逻辑模型）

- `change_summary`：改动摘要
- `files_changed`：文件列表与分类
- `impact_scope`：影响范围草稿
- `verification_todos`：待验证项
- `risk_notes`：风险提示
- `uncertainties`：不确定点（需人工确认）

## 3.4 成功条件

- 能读取指定来源的改动
- 能至少生成基础摘要与文件列表
- 在 `--write` 时成功落盘到目标位置

## 3.5 失败与降级

失败场景：

- 无可审计改动
- git 上下文不可读
- 输出路径不可写

降级策略：

- 至少输出“可手工填充模板骨架”
- 明确列出失败原因和下一步建议

---

## 4. `aodw rt advance` 契约（延期，非 v0）

## 4.1 命令意图

推进任务状态，自动处理常见元数据更新（例如 `updated_at`、阶段字段）。

## 4.2 输入参数（建议）

- `<rt-id>`：任务 ID（必填）
- `--to <status>`：目标状态（必填）
- `--note <text>`：状态推进说明（可选）
- `--owner <name>`：更新 owner（可选）
- `--dry-run`：仅预览变更
- `--json`：机器可读输出

## 4.3 状态机约束（v1 建议）

- 仅允许定义好的前向流转
- 非法跳转需显式 `--force` 才允许

示意（非最终）：

- `intake -> design -> impl -> review -> done`

## 4.4 成功输出（建议）

- `previous_status`
- `current_status`
- `updated_fields`
- `warnings`（如存在不完整字段）

## 4.5 失败与降级

失败场景：

- 找不到任务 ID
- 目标状态非法
- 状态跳转不被允许

降级策略：

- 输出“允许的目标状态列表”
- 提示下一条可执行命令

---

## 5. `aodw rt resolve` 契约（延期，非 v0）

## 5.1 命令意图

在任务完成时执行收口操作，统一更新完成态字段与最小完成检查。

## 5.2 输入参数（建议）

- `<rt-id>`：任务 ID（必填）
- `--summary <text>`：完成摘要（可选但建议）
- `--close-at <timestamp>`：关闭时间（默认当前）
- `--check-minimum`：执行最小完成检查
- `--dry-run`：仅预览
- `--json`：机器可读输出

## 5.3 最小完成检查（v1 建议）

- 是否存在基本变更记录
- 是否存在最小验证步骤
- 元数据关键字段是否完整

## 5.4 成功输出（建议）

- `resolved: true`
- `closed_at`
- `check_result`（pass/warn）
- `followups`（若有告警）

## 5.5 失败与降级

失败场景：

- 关键字段缺失且不能自动修复
- 检查失败且未指定强制完成

降级策略：

- 输出缺失字段清单
- 提供“一键补齐建议命令链”

---

## 6. 与 Hook/CI 的接口衔接建议（v0 仅 hook 提示）

## 6.1 Hook 调用策略

提交前校验失败时，优先推荐调用：

- `aodw audit --source staged --write`

## 6.2 CI 调用策略（v0 暂缓）

在 CI 中可做只读检查：

- `aodw audit --source commit --commit <sha> --dry-run --json`

## 6.3 机器可读输出要求

需稳定字段，便于脚本判断：

- `ok`
- `code`
- `message`
- `details`

---

## 7. v1 非目标

以下不纳入第一版契约：

- 全自动语义级变更归因
- 自动修复所有文档冲突
- 多任务并发合并策略自动决策
- 跨仓库统一任务编排

---

## 8. 评审焦点（供下一轮讨论，v0 先看前三项）

1. `audit` 在无 RT 场景的写入路径如何定义
2. `audit` 输出最小字段是否还能再减
3. hook 失败提示文案是否足够清晰
4. `advance/resolve` 是否确有必要进入 v1

