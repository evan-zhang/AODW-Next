# AODW Autopilot 准备工作清单（AI 持续编程高质量交付）

> 目标：让用户在**最少干预**下，由 AI 把一个 RT 从 `created` 推进到 `done`，且质量可验证、过程可观测。  
> 用户向协议：`templates/.aodw-next/02-workflow/autopilot-protocol.md`  
> Goal 标准：`templates/.aodw-next/02-workflow/autopilot-goal-spec.md`  
> 本文是维护者版「开工前准备」详表；用户项目内简版见 `rt-autopilot-readiness.md`。

---

## 0. 先理解：Autopilot 不是“更聪明的聊天”

Autopilot 依赖三件事同时成立：

1. **规格可验证**（完成条件能跑命令判定，不靠“我觉得做完了”）
2. **状态可续接**（进度写在文件里，不靠对话记忆）
3. **质量有回压**（每轮改动后必须跑 test/lint/guard）

缺少任一项，都会出现：中途停下、黑盒执行、或“测试通过但业务错误”。

---

## 1. 项目级准备（一次性，init 后完成）

### P1. 规则与工具已安装

- [ ] 已执行 `npx aodw-skill init`（或 update）
- [ ] 存在 `.aodw-next/` 核心规则
- [ ] 已安装 AI 适配器（Cursor / Claude / Antigravity 至少一个）
- [ ] 已启用 `pre-commit` guard（`aodw-skill enable-guard-hook` 或 init 自动安装）

### P2. 项目知识已初始化（06-project）

- [ ] `.aodw-next/06-project/ai-overview.md` 已存在（非空模板）
- [ ] `.aodw-next/06-project/modules-index.yaml` 已存在（非空模板）
- [ ] 建议：复制 `ai-init-prompt.md` 到 AI 对话，完成**深度初始化**（读真实代码补全）

### P3. 机械验证命令已明确（必须可执行）

在项目文档或 `ai-overview.md` 中写清默认命令（示例）：

| 类型 | 命令（按项目填写） | 用途 |
|------|-------------------|------|
| tests | `npm test` / `pytest` / `make test` | 功能正确性 |
| lint | `npm run lint` / `ruff check` | 风格与静态问题 |
| typecheck | `tsc --noEmit` / `mypy`（如有） | 类型安全 |
| guard | `npx aodw-skill guard` | 流程痕迹 |

- [ ] 三条命令在本地可运行（exit code 可解释）
- [ ] CI（如有）与本地命令口径一致

### P4. Git 协作约束已就绪

- [ ] 团队约定：业务改动只在 `feature/RT-XXX-*` 分支
- [ ] 禁止直接在 `main/master` 改业务代码
- [ ] 合并策略明确（PR / squash / tag 规则）

---

## 2. RT 级准备（每个 RT 开工前）

### R1. RT 脚手架完整

执行 `npx aodw-skill new` 后，应存在：

```
RT/RT-XXX/
  meta.yaml
  intake.md
  decision.md
  rt-lite.md
  state.json
  loop-prompt.md
  execution-log.md
```

- [ ] 目录与文件齐全
- [ ] `meta.yaml.id` 与目录名一致

### R2. 执行模式已决策

在 `meta.yaml` 设置：

```yaml
profile: Spec-Lite
execution_mode: collaborative   # 默认：人工 Gate
# execution_mode: autopilot    # 无人值守：机械 Gate
```

选择建议：

| 场景 | 模式 |
|------|------|
| 低风险 bug / 单模块改动 / 命令可验证 | `autopilot` |
| 跨模块 / API 变更 / 需产品决策 | `collaborative` 或 Spec-Full |

- [ ] `decision.md` 已记录模式选择理由

### R3. 完成条件已“三要素化”（最关键）

`rt-lite.md` §7 必须满足：**范围 + 证据 + 测试**。

每个条件都要对应：
- 一条可执行验证命令，或
- 一个明确文件/字段检查点

并映射到 `state.json.checklist` 字段（默认 6 项）：

| 字段 | 含义 |
|------|------|
| `plan_complete` | §1-§4、§7 完整 |
| `tests_pass` | 测试命令 exit 0 |
| `lint_pass` | lint/type 命令 exit 0 |
| `guard_pass` | `aodw-skill guard` 通过 |
| `docs_synced` | rt-lite §5-§6 已更新 |
| `auditor_pass` | development auditor 无 P0 |

- [ ] §7 无模糊表述（禁止“做完功能”“改好代码”）
- [ ] §5.4 已填写 tests/lint/guard 命令
- [ ] `state.json.checklist` 与 §7 一一对应

### R4. 范围与边界已锁定

- [ ] `rt-lite.md` §2.1 修改点文件清单明确
- [ ] `rt-lite.md` §4 Invariants 已列出不可破坏项
- [ ] 已确认不触碰范围外模块

### R5. 分支与环境就绪

```bash
git checkout -b feature/RT-XXX-short-name
git branch --show-current
```

- [ ] 当前在 feature 分支
- [ ] 依赖安装完成（npm/pip/uv 等）
- [ ] 必要环境变量已配置（`.env` 示例齐全）

---

## 3. 运行级准备（Autopilot 循环期间）

### A1. 每轮迭代固定动作（AI 必须执行）

1. 读取 `state.json` + `rt-plan.md` + `rt-lite.md` + `loop-prompt.md`
2. 只处理 `rt-plan.md` 未完成步骤 + 对应 checklist 项（1-2 项/轮）
3. 改动后立即跑 backpressure（tests/lint/guard）
4. 更新 `state.json`、`rt-plan.md`、`execution-log.md`、`rt-lite.md`（§5-§6）

### A2. 熔断条件（触发即停，转人工）

- 同一文件连续修改 > 3 次
- checklist 连续 2 轮无进展
- 出现 `blockers` 且 2 轮无法消除
- 迭代数达到上限（默认 `max_iterations=20`）

### A3. 完成判定（机械 Done）

全部满足才可 `done`（双条件，对齐 Goal Spec）：

- [ ] `rt-plan.md` 进度区全部 `[x]`
- [ ] `state.json.checklist` 全 `true`
- [ ] §5.4 tests/lint/guard 均已通过
- [ ] `state.json.phase=done`
- [ ] `meta.yaml.status=done`
- [ ] `RT/index.yaml` 已同步（如项目启用）

---

## 4. 人工仅在这些场景介入

- 产品/架构二选一决策
- 测试长期失败且 AI 无法定位根因
- 熔断触发（无进展/超迭代）
- 安全/合规高风险变更

其余步骤不应要求用户逐步确认（Gate 3/4/5 由机械 Gate 替代）。

---

## 5. 开工前 60 秒自检（可直接复制）

```markdown
## Autopilot 开工自检 - RT-XXX

- [ ] 项目：06-project 已初始化，tests/lint/guard 命令可跑
- [ ] RT：rt-lite §7 + state.json checklist 对齐
- [ ] 分支：feature/RT-XXX-* 已切换
- [ ] 模式：meta.execution_mode=autopilot
- [ ] 边界：§2 修改点 + §4 invariants 已锁定
- [ ] 观测：execution-log.md 可写入
```

---

## 6. 相关文件索引

| 文件 | 作用 |
|------|------|
| `02-workflow/spec-lite-profile.md` | 协作模式（人工 Gate） |
| `02-workflow/autopilot-protocol.md` | 总协议 |
| `02-workflow/autopilot-goal-spec.md` | Goal 三要素 + Fuse |
| `02-workflow/spec-lite-autopilot-profile.md` | Autopilot 执行规则 |
| `02-workflow/rt-manager.md` | RT 生命周期与分支规则 |
| `templates/rt-lite.template.md` | rt-lite 标准结构（含 §7） |
| `templates/rt-state.template.json` | 迭代状态模板 |
| `templates/rt-loop-prompt.template.md` | 每轮 AI 提示词模板 |
| `templates/execution-log.template.md` | 可观测日志模板 |

---

## 7. 最小结论（给负责人）

> **Autopilot 能否高质量交付，不取决于 prompt 写得多好，而取决于开工前是否把“完成条件、验证命令、状态文件、边界范围”文件化。**

先把准备做满，再启动循环；否则只是在放大 AI 的随机性。
