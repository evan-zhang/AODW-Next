# Spec-Lite Profile Specification  
（原 TPCW 第二 / 三阶段的 AODW 化精简版）

Spec-Lite Profile 用于处理小范围变更，例如：

- bug 修复；
- 单个模块的小改进；
- 简单的 UI 或交互调整；
- 不涉及数据结构与 API 契约变更的工作。

Spec-Lite 保持与 Spec-Full 类似的文档结构，但采用更精简的模板和流程。

---

## 1. 文件结构

在 `RT/RT-XXX/` 目录下，Spec-Lite 将使用以下文件：

```text
RT/RT-XXX/
  spec-lite.md     ← 需求与场景描述（精简版 spec）
  plan-lite.md     ← 技术方案（精简版 plan）
  impact.md        ← 影响分析
  invariants.md    ← 不可破坏行为 / 边界
  tests.md         ← 测试点列表
  changelog.md     ← 本次改动对系统行为的总结
```

这些文件由 AI 主导创建与维护。

---

## 2. 流程概览

1. RT-Manager 完成 Intake 与 Profile 决策（Spec-Lite）；
  
2. **创建并切换到 feature 分支**（强制步骤）
   - 生成分支名：`feature/RT-{seq}-{short-name}`
   - 执行：`git checkout -b feature/RT-XXX-xxx`
   - 验证：`git branch` 显示 `* feature/RT-XXX-xxx`
   - **在此步骤完成前，严禁修改任何代码**
  
3. AI 基于 Intake 信息与现有代码结构，自动生成初版：
   - `spec-lite.md`
   - **需求阶段审计**（必须）：`spec-lite.md` 生成后，自动执行需求阶段审计官
   - `plan-lite.md`
   - **需求阶段审计**（必须）：`plan-lite.md` 生成后，自动执行需求阶段审计官（包含 CSF 审查）
   
   > **UI 任务特殊处理**：如果 RT 被识别为 UI 相关任务，在 `plan-lite.md` 中必须包含 UI 专用流程步骤（规则文件读取、UI 结构与设计说明、**静态 HTML 原型生成（必须在 `RT/RT-XXX/docs/ui-prototype.html` 创建文件）**、**用户确认（强制门禁）**、UI 审查、UI 实现）。详细规则请参考 `.aodw/02-workflow/ui-workflow-rules.md`
   
   > ⚠️ **关键要求**：UI 相关任务**必须**创建 HTML 原型文件 `RT/RT-XXX/docs/ui-prototype.html`，并**必须**获得用户确认后才能进入实现阶段。
  
  > [!IMPORTANT] 🛑 强制暂停点 (Mandatory Stop)
  > **在此处必须停止并呼叫用户 (Call notify_user)**。
  > 展示 Plan 摘要，并询问："计划已就绪，是否批准执行？"
  > **严禁**在未获用户批准的情况下直接进入下一步（生成 impact/invariants 或修改代码）。
  
4. 在修改代码前，AI 必须生成或更新：
   - `impact.md`
   - **需求阶段审计**（必须）：`impact.md` 生成后，自动执行需求阶段审计官
   - `invariants.md`
   - **需求阶段审计**（必须）：`invariants.md` 生成后，自动执行需求阶段审计官
  
5. **开发准备（Dev Ready）**
   - [ ] **工具已初始化**：检查 `.aodw/tools-status.yaml` 中 `initialized: true`
   - [ ] **编码规范已加载**：
     - [ ] 如果涉及前端：已读取 `.aodw/03-standards/stacks/react-typescript/ai-coding-rules-frontend.md`
     - [ ] 如果涉及后端：已读取 `.aodw/03-standards/stacks/python-fastapi/ai-coding-rules-backend.md`
     - [ ] 已读取 `.aodw/03-standards/ai-coding-rules-common.md`（通用规范）

6. **在 feature 分支上**实现代码修改

   > [!CAUTION] 🛑 最后的防线 (Last Line of Defense)
   > **立即执行** `git branch --show-current`。
   > 如果结果不是 `feature/RT-XXX-xxx`：
   > 1. **立即停止**任何写入操作。
   > 2. 向用户报错："严重错误：尝试在非 Feature 分支上修改代码。"
   > 3. **严禁**尝试"静默修复"或"自动切换"，必须显式通知用户。
   - **开始修改前再次验证**：`git status` 确认在正确的分支上
   - 如果不在 feature 分支，立即停止并切换到正确分支
   - **开发过程中**：
     - 必须遵守项目编码规范（前端/后端）
     - 必须通过工具自动检查（ESLint / Ruff / Black）
     - 必须符合 plan-lite.md 中设计的代码结构与分层

7. **开发结束前自检**
   - [ ] **运行 Lint 检查**：
     - 前端：`npm run lint` 或 `npx eslint .`
     - 后端：`ruff check .`
   - [ ] **运行格式化检查**：
     - 前端：`npm run format` 或 `npx prettier --write .`
     - 后端：`black .`
   - [ ] **文件大小和复杂度符合规范**（参考 `.aodw/03-standards/ai-coding-rules-common.md`）

8. **开发阶段审计**（必须）
   - 代码实现完成后，**必须**自动执行开发阶段审计官
   - 审计结果记录在 `RT/RT-XXX/development-audit-report.md`
   - 如果发现阻断性问题，**必须停止流程**，要求用户修复
   - 详细规范：详见 `.aodw/04-auditors/aodw-development-auditor-rules.md`

9. 实现完成后，AI 必须更新：
   - `tests.md`
   - `changelog.md`
  
9. 最后通过 Git Discipline 完成合并与收尾。

**分支管理强制要求**：
- 所有代码修改必须在 feature 分支上进行
- 严禁在 master/main 分支直接修改代码
- 在开始修改代码前必须验证当前分支

---

## 3. spec-lite.md 模板

推荐模板结构如下：

```markdown
# Spec-Lite: RT-XXX - <short title>

## 1. 背景（Context）
- 当前存在的问题 / 需求：
- 触发端（用户操作 / 定时任务 / API 调用 等）：

## 2. 目标（Goal）
- 本次改动希望达到的效果（用户视角 / 业务视角）：

## 3. 当前行为（Current Behavior）
- 当前系统在相关场景下的行为说明：

## 4. 期望行为（Desired Behavior）
- 修改后在相同场景下的预期行为：
- 与当前行为的差异（如有）：

## 5. 影响范围（Scope）
- 涉及的模块 / 文件 / API：
- 预期不应受影响的模块 / 功能：
```

AI 在生成 spec-lite 时，应尽量使用清晰且业务友好的描述。

---

## 4. plan-lite.md 模板

推荐结构：

```markdown
# Plan-Lite: RT-XXX - <short title>

## 1. 修改点（Change Points）
- 计划修改的模块 / 文件路径：
  - e.g. apps/api/src/orders/order_service.ts
  - e.g. apps/web/src/features/orders/OrderList.tsx

## 2. 方案描述（Solution Outline）
- 简要描述计划采取的技术方案：
  - 调整哪一层的逻辑（Controller / Service / Repository / UI 等）
  - 是否引入新函数 / 新类 / 新组件
  - 是否删除 / 废弃某些路径

## 3. 代码结构与分层设计（必须）

> **注意**：即使是 Spec-Lite，也必须明确代码结构与分层设计，确保符合项目编码规范（`.aodw/03-standards/stacks/react-typescript/ai-coding-rules-frontend.md` 或 `.aodw/03-standards/stacks/python-fastapi/ai-coding-rules-backend.md`）。

### 3.1 修改的文件与结构
- **前端**（如涉及）：
  - 修改文件：`src/pages/XXX/Component.tsx`
  - 目录结构：是否符合 pages / features / shared 规范？
  - 组件拆分：是否需要拆分？拆分后的结构？
- **后端**（如涉及）：
  - 修改文件：`app/api/v1/xxx.py`、`app/services/xxx_service.py`
  - 分层架构：是否符合 api → services → repositories 规范？
  - 依赖关系：是否跨层调用？

### 3.2 编码规范符合性说明
- **前端**（如涉及）：
  - [ ] 目录结构符合规范
  - [ ] 文件大小符合规范（页面 ≤ 300 行，组件 ≤ 200 行）
- **后端**（如涉及）：
  - [ ] 分层架构符合规范
  - [ ] 文件大小符合规范（模块 ≤ 300 行，函数 ≤ 60 行）

## 4. 风险与注意事项（Risks & Caveats）
- 潜在的边界情况：
- 与其他模块的隐含耦合：
- 需要特别关注的回归场景：
```

---

## 5. impact.md 模板

推荐结构：

```markdown
# Impact Analysis: RT-XXX - <short title>

## 1. 问题触发点（Trigger）
- 用户或系统如何触发问题：
- 典型复现步骤（如已知）：

## 2. 直接影响（Direct Impact）
- 受影响的模块 / 文件：
- 受影响的具体行为：

## 3. 间接影响（Indirect Impact）
- 依赖本模块的上游 / 下游：
- 可能受影响的其他功能：

## 4. 风险评估（Risk Evaluation）
- 数据损坏风险：
- 安全风险：
- 性能风险：
- 用户体验风险：
```

AI 在开始修改代码前，必须填充或更新本文件。

---

## 6. invariants.md 模板

推荐结构：

```markdown
# Invariants: RT-XXX - <short title>

> 本文件列出在本次改动中必须保持不变的行为与约束。

## 1. 业务行为 Invariants
- 不改变的业务规则：
- 不改变的用户流程：

## 2. 接口 Invariants
- 不改变的 API 路径：
- 不改变的请求 / 响应格式：
- 不改变的错误码语义：

## 3. 技术结构 Invariants
- 不允许绕过的中间层：
- 不允许使用的捷径（例如直接访问某些内部接口）：
```

如果在方案设计过程中发现无法同时满足 invariants 与需求，AI 应提示用户考虑：

- 升级为 Spec-Full；
- 或通过新的 RT 对 invariants 本身进行修正。

---

## 7. tests.md 模板

推荐结构：

```markdown
# Tests: RT-XXX - <short title>

## 1. 新增测试用例（New Tests）
- [ ] 用例 1 描述（对应文件路径）
- [ ] 用例 2 描述（对应文件路径）

## 2. 回归测试（Regression）
- [ ] 回归用例 1（原始功能点描述）
- [ ] 回归用例 2

## 3. 手动验证建议（Manual Checks）
- [ ] 手动步骤 1
- [ ] 手动步骤 2
```

AI 负责在实现前后补全这些内容，并在适当情况下生成实际测试代码。

---

## 8. changelog.md 模板

推荐结构：

```markdown
# Changelog: RT-XXX - <short title>

## 1. 变更摘要（Summary）
- 概述本次改动对系统行为带来的变化：

## 2. 用户可感知变化（User-visible Changes）
- UI / 文案 / 流程上的变化：

## 3. 不可见但重要的变化（Non-visible but Important）
- 内部逻辑的重构：
- 性能改善：
- 错误处理方式的调整：

## 4. 与其他 RT / 模块的关系
- 本 RT 依赖的其他 RT：
- 将来可能需要跟进的 RT：
```

完成后，changelog.md 可作为未来调试或审计的重要参考。

---

## 9. 与 Git Discipline 的关系

Spec-Lite 的完成阶段应始终由统一的 Git Discipline 规则约束：

- 在 feature 分支上完成所有工作；
- 提交信息包含 `Refs: RT-XXX`；
- 合并前确保 tests.md 中关键测试已执行；
- 合并后打标签、清理分支；
- RT 状态更新为 `done`。

Spec-Lite 应尽量保持流程轻量，但不牺牲可追踪性和可回滚性。
