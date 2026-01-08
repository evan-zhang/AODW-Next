# Spec-Full Profile Specification  
（完整规格驱动开发流程）

Spec-Full Profile 用于处理复杂或高风险的变更，包括：

- 新功能；
- 涉及多个模块的大范围改动；
- 涉及数据模型变更；
- 涉及外部 API / 协议变更；
- 涉及性能 / 安全 / 合规性的重要特性；
- 大规模重构。

---

## 1. 文件结构

在 `RT/RT-XXX/` 目录下，Spec-Full 使用：

```text
RT/RT-XXX/
  spec.md         ← 完整需求说明
  plan.md         ← 技术实现方案
  data-model.md   ← 实体与关系
  contracts/      ← API / 消息 / 数据契约
  research.md     ← 调研与决策记录（如需要）
  tasks.md        ← 按 User Story 和 Phase 拆分的实现任务
  checklists/     ← 质量检查清单
  impact.md       ← 影响分析
  invariants.md   ← 不可破坏行为 / 边界
  tests.md        ← 测试点
  changelog.md    ← 行为变更总结
```

---

## 2. Spec 阶段：spec.md

`spec.md` 由 AI 根据用户描述和澄清问题自动生成，典型结构：

```markdown
# Spec: RT-XXX - <feature name>

## 1. 背景与动机（Background & Motivation）
- 为什么需要这个特性 / 改动？

## 2. 目标与非目标（Goals / Non-goals）
- 明确列出本 RT 的目标范围；
- 明确哪些是本次不处理的内容。

## 3. 用户故事 / 用例（User Stories）
- 角色、目标、场景；
- 主路径与备选路径。

## 4. 功能需求（Functional Requirements）
- 用编号列出可验证的需求。

## 5. 非功能需求（Non-functional Requirements）
- 性能、可用性、可靠性、安全性等。

## 6. 假设与依赖（Assumptions & Dependencies）
- 对外部系统 / 团队 / 前置条件的假设。

## 7. 成功标准（Success Criteria）
- 如何判断本 RT 成功完成。

## 8. 澄清记录（Clarifications）
- Question / Answer 列表（来自 AI 主动提问与用户回答）。
```

Spec 阶段可以融入类似原 Speckit 的 `/speckit.specify` 行为。

---

## 3. Clarification

AI 应对模糊或高影响问题提出有限数量（通常≤5）的澄清问题：

- 每个问题带选项与推荐答案；
- 用户选择后，将问答记录到 `spec.md` 的 Clarifications 部分；
- 同时更新相关需求段落，使 spec 不再依赖上下文对话。

---

## 3.5 需求阶段审计（必须）

**规则**：`spec.md` 生成后，**必须**自动执行需求阶段审计官。

**执行要求**：
- AI 必须调用 `.aodw/04-auditors/aodw-requirement-auditor-rules.md` 中的需求阶段审计官
- 审计官将检查需求完整性、一致性、可执行性
- 审计结果记录在 `RT/RT-XXX/requirement-audit-report.md`
- 如果发现阻断性问题，**必须停止流程**，要求用户修复

**审计重点**：
- 需求完整性：文档结构是否完整、目标是否明确、需求是否可验证
- 需求一致性：与 `intake.md` 是否一致
- 需求可执行性：技术方案是否足够详细

**详细规范**：详见 `.aodw/04-auditors/aodw-requirement-auditor-rules.md`

---

## 3.6 CSF 审查（可选但推荐）

在 Spec 阶段完成后，建议执行 CSF 审查（详见 `.aodw/01-core/csf-thinking-framework.md`）：

- **审查重点**：验证需求理解是否准确，目标是否清晰
- **输出**：`RT/RT-XXX/csf-review.md`（如执行）
- **触发**：用户要求或 AI 判断需要时

**注意**：CSF 审查是建设性的，需求阶段审计是批判性的，两者可以并存。

---

## 4. Plan 阶段：plan.md / research.md / data-model.md / contracts/

### 4.0 UI 任务特殊处理（如适用）

> **重要**：如果 RT 被识别为 UI 相关任务，Plan 阶段必须包含 UI 专用流程步骤。

**UI 相关任务的 Plan 必须包含**：
1. **UI 规则文件读取**：读取 `.aodw/03-standards/ui-kit/ui-kit.md`（统一 UI 设计规范文件）
2. **UI 结构与设计说明**：输出 UI 结构与设计说明
3. **静态 HTML 原型生成（强制步骤）**：
   - **必须**在 `RT/RT-XXX/docs/ui-prototype.html` 创建 HTML 原型文件
   - 生成完整的静态 HTML 原型（使用模拟数据）
   - 必须包含所有 UI 元素和交互状态
   - 必须包含完整样式，可在浏览器中直接打开查看
4. **用户确认步骤（强制门禁）**：
   - **必须**等待用户在浏览器中查看原型并明确确认
   - **严禁**在未获得用户确认前进入实现阶段
5. **UI 审查步骤**：执行 UI 质量审查
6. **UI 实现步骤**：用户确认后生成实现代码

> ⚠️ **关键要求**：HTML 原型创建和用户确认是**强制步骤**，不可跳过。详细规则请参考 `.aodw/02-workflow/ui-workflow-rules.md`

---

### 4.1 plan.md

`plan.md` 描述"如何实现"：

```markdown
# Plan: RT-XXX - <feature name>

## 1. 技术背景
- 当前系统相关部分的技术状况。

## 2. 方案概览
- 整体思路与关键设计决策。

## 3. 组件与模块变更
- 哪些模块会被修改 / 新增 / 删除。

## 4. 代码结构与分层设计（必须）

> **注意**：本节必须根据项目编码规范（`.aodw/03-standards/stacks/react-typescript/ai-coding-rules-frontend.md` 或 `.aodw/03-standards/stacks/python-fastapi/ai-coding-rules-backend.md`）进行设计。

### 4.1 前端代码结构（如涉及）
- **使用的页面**：`src/pages/<PageName>/`
- **新增 features 模块**（如需要）：`src/features/<domain>/`
- **组件拆分**：
  - `ComponentName.tsx`（职责说明）
  - `AnotherComponent.tsx`（职责说明）
- **Hooks**：`useHookName.ts`（职责说明）
- **Store**：`storeName.store.ts`（职责说明）
- **目录结构示例**：
  ```
  src/pages/ProjectEditorPage/
    ├── index.tsx          # 页面入口
    ├── Header.tsx         # 页面头部
    ├── Sidebar.tsx        # 侧边栏
    ├── Canvas.tsx         # 画布
    ├── hooks/             # 页面专用 hooks
    │   └── useProjectEditor.ts
    └── store/             # 页面专用 store
        └── projectEditor.store.ts
  ```

### 4.2 后端代码结构（如涉及）
- **API 路由**：`app/api/v1/<resource>.py`
- **Service**：`app/services/<resource>_service.py`
- **Repository**：`app/repositories/<resource>_repository.py`
- **Schema**：`app/schemas/<resource>_schema.py`
- **分层职责说明**：
  - API 层：接收请求，参数校验，调用 Service
  - Service 层：业务逻辑处理，调用 Repository
  - Repository 层：数据访问，数据库操作
- **目录结构示例**：
  ```
  app/
    ├── api/v1/
    │   └── project.py           # API 路由
    ├── services/
    │   └── project_service.py   # 业务逻辑
    ├── repositories/
    │   └── project_repository.py # 数据访问
    └── schemas/
        └── project_schema.py     # 数据模型
  ```

### 4.3 编码规范符合性说明
- **前端**（如涉及）：
  - [ ] 目录结构符合规范（pages / features / shared）
  - [ ] 组件拆分符合规范（单一职责、适度复用）
  - [ ] 文件大小符合规范（页面 ≤ 300 行，组件 ≤ 200 行）
- **后端**（如涉及）：
  - [ ] 分层架构符合规范（api → services → repositories）
  - [ ] 文件大小符合规范（模块 ≤ 300 行，函数 ≤ 60 行）
  - [ ] 依赖关系符合规范（不跨层调用）

## 5. 数据流与控制流
- 请求如何在系统内部流转。

## 6. 风险与缓解策略
- 潜在问题及对应的缓解方案。

## 7. 分阶段计划
- 如果需要分多个阶段实现，说明每阶段目标。
```

### 4.2 research.md（可选）

若需要对比多种实现方案、技术栈或第三方服务，可在 `research.md` 中记录：

- 备选方案；
- 评估维度（性能、成本、复杂度等）；
- 最终选择与理由。

### 4.3 data-model.md

记录本 RT 相关的实体 / 关系 / 字段变更：

- 新增实体；
- 字段语义变更；
- 关系调整。

### 4.4 contracts/

记录对外契约：

- REST / GraphQL / gRPC API；
- 消息格式、事件结构；
- 文件格式等。

### 4.5 需求阶段审计（必须）

**规则**：`plan.md` 生成后，**必须**自动执行需求阶段审计官。

**执行要求**：
- AI 必须调用 `.aodw/04-auditors/aodw-requirement-auditor-rules.md` 中的需求阶段审计官
- 审计官将检查需求完整性、一致性、可执行性，**并自动包含 CSF 审查**
- 审计结果记录在 `RT/RT-XXX/requirement-audit-report.md`
- 如果发现阻断性问题，**必须停止流程**，要求用户修复

**审计重点**：
- 需求完整性：`plan.md` 是否包含所有必要章节（技术背景、方案概览、代码结构与分层设计等）
- 需求一致性：`plan.md` 是否满足 `spec.md` 中的所有需求
- 需求可执行性：代码结构与分层设计是否明确、是否符合编码规范
- **战略对齐与 CSF 检查**（自动包含）：
  - 以终为始：验证方案是否直接贡献于目标
  - 结构化分解：验证方案分解是否 MECE
  - 关键要素识别：识别影响目标达成的 CSF
  - 流程与系统观：检查端到端关键路径
  - 多维决策：评估技术方案的合理性（至少 2-3 个备选方案）

**详细规范**：详见 `.aodw/04-auditors/aodw-requirement-auditor-rules.md`

**注意**：
- 需求阶段审计官自动包含 CSF 审查，因此不需要单独执行 CSF 审查
- 如果用户希望获得建设性的 CSF 审查建议，可以单独执行 CSF Review（输出到 `csf-review.md`）

---

## 5. tasks.md 和 checklists/

### 5.1 tasks.md

以严格的 checklist 格式列出实现步骤：

```markdown
- [ ] T001 [US1] 在后端添加 X 实体的存储逻辑（apps/api/src/...）
- [ ] T002 [US1] 为 X 实体添加 API 路由（apps/api/src/...）
- [ ] T003 [US1] 在前端页面展示 X 列表（apps/web/src/...）
```

- 可以使用 [P] 标记可并行的任务；
- 任务应按 Phase 编组，使每一阶段都能形成可验证的增量成果。

### 5.2 checklists/

为不同维度的质量提供“English 单元测试”式的 checklist，例如：

- requirements.md：需求是否完整、清晰、一致；
- design.md：方案是否符合架构原则，是否可扩展；
- **coding-standards.md**：编码规范是否符合项目规范（前端/后端，参考 `.aodw/templates/checklists/coding-standards-template.md`）；
- security.md：安全要求是否明确、是否有相应对策；
- performance.md：性能目标是否量化、是否有测量方案。

AI 在实现前应尽量确保 checklist 通过，或在失败项上记录原因。

---

## 6. 开发阶段要求

### 6.1 开发准备（Dev Ready）

在开始编码前，AI 必须确认：

- [ ] **工具已初始化**：检查 `.aodw/tools-status.yaml` 中 `initialized: true`
- [ ] **编码规范已加载**：
  - [ ] 如果涉及前端：已读取 `.aodw/03-standards/stacks/react-typescript/ai-coding-rules-frontend.md`
  - [ ] 如果涉及后端：已读取 `.aodw/03-standards/stacks/python-fastapi/ai-coding-rules-backend.md`
  - [ ] 已读取 `.aodw/03-standards/ai-coding-rules-common.md`（通用规范）

### 6.2 开发过程中

- **必须遵守**项目编码规范（前端/后端）
- **必须通过**工具自动检查（ESLint / Ruff / Black）
- **必须符合**plan.md 中设计的代码结构与分层

### 6.3 开发结束前自检

在提交代码前，AI 必须完成：

- [ ] **运行 Lint 检查**：
  - 前端：`npm run lint` 或 `npx eslint .`
  - 后端：`ruff check .`
- [ ] **运行格式化检查**：
  - 前端：`npm run format` 或 `npx prettier --write .`
  - 后端：`black .`
- [ ] **文件大小和复杂度符合规范**（参考 `.aodw/03-standards/ai-coding-rules-common.md`）

### 6.4 开发阶段审计（必须）

**规则**：代码实现完成后，**必须**自动执行开发阶段审计官。

**执行要求**：
- AI 必须调用 `.aodw/04-auditors/aodw-development-auditor-rules.md` 中的开发阶段审计官
- 审计官将检查代码质量、工具状态、架构合规性、知识维护
- 审计结果记录在 `RT/RT-XXX/development-audit-report.md`
- 如果发现阻断性问题，**必须停止流程**，要求用户修复

**审计重点**：
- 硬性技术约束：函数长度、文件长度、代码复杂度、分层架构、分支管理
- 工具前置检查：工具初始化状态、工具检查结果
- 架构合规性：分层架构、依赖管理
- 知识维护：文档与代码一致性、知识蒸馏

**详细规范**：详见 `.aodw/04-auditors/aodw-development-auditor-rules.md`

---

## 7. impact / invariants / tests / changelog

即使是 Spec-Full，仍需与 Spec-Lite 一样维护这几个文件：

- `impact.md`：在实现前，对影响面进行全面分析；
- `invariants.md`：列出在本次变更中必须保持不变的行为与结构；
- `tests.md`：列出测试点与测试覆盖范围；
- `changelog.md`：总结本 RT 对系统行为带来的变化，便于后续回溯。

---

## 7. 与 RT-Manager / Git Discipline 的关系

- RT-Manager 负责启动 Spec-Full Profile，并为其创建 RT 目录与分支；
- Spec-Full 完成后通过 Git Discipline 进行合并、打 tag、更新状态；
- 在整个过程结束后，AI 与用户应能：

  - 从 `spec.md` + `plan.md` + `tasks.md` + `changelog.md` 理解本 RT 的前因后果；
  - 从 Git 历史与 tag 中定位具体实现提交。

---

## 8. 从 Spec-Lite 升级到 Spec-Full

如果在 Spec-Lite 执行中发现：

- 涉及数据模型变动；
- 涉及对外 API 变动；
- 与 invariants 无法同时满足；

则 AI 应建议将本 RT 升级为 Spec-Full：

1. 补充完整的 `spec.md` 与 `plan.md`；
2. 将已有的 `spec-lite` / `plan-lite` 内容迁移或引用到新的文档；
3. 对数据模型和 contracts 进行补充；
4. 对 tasks 和 checklists 进行补足。

升级过程应在 `changelog.md` 中明确记录。
