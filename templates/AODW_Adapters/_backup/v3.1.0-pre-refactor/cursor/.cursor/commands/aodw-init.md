# AODW 初始化命令

## 场景说明

你现在在一个启用 AODW 的新仓库，已有完整的目录结构：
- `.aodw/`（含 `.aodw/aodw_governance/`）
- `.cursor/`
- `RT/index.yaml`

## 执行步骤

请按 AODW 规则完成启动准备，按以下步骤执行：

### 1. 读取核心规则文档

读取以下文档以了解 AODW 规则体系：
- `.aodw/aodw-constitution.md`
- `.aodw/ai-coding-rules.md`
- `.aodw/ai-knowledge-rules.md`
- `.aodw/ai-interaction-rules.md`
- `.aodw/module-doc-rules.md`
- `.aodw/rt-manager.md`
- `.cursor/rules/aodw.mdc`

### 2. 初始化模块索引和文档

- 在 `.aodw/modules-index.yaml` 中填入现有模块
- 为每个模块使用 `.aodw/templates/module-readme-template.md` 创建 README
  - 存放位置：`docs/modules/<name>.md` 或团队约定路径
  - 内容要求：写明职责/映射/不变量/历史

### 3. 创建初始化 RT（需求追踪）

**检查是否已初始化**：
- 检查 `RT/RT-CORE-001/` 目录是否存在
- 检查 `RT/index.yaml` 中是否已有 RT-CORE-001 条目
- **如果已存在，跳过此步骤，不重复初始化**

**如果未初始化，则执行以下操作**：
- 创建 `RT/RT-CORE-001/`（Spec-Full 类型）
- 复制 `.aodw/templates/rt-meta-template.yaml` 为 `meta.yaml`
- 初始化以下文档文件：
  - `intake.md`
  - `decision.md`
  - `spec.md`
  - `plan.md`
  - `impact.md`
  - `invariants.md`
  - `tests.md`
  - `changelog.md`
- 内容记录："启用 AODW" 的初始化决策

### 4. 更新 RT 索引

**检查是否已存在条目**：
- 检查 `RT/index.yaml` 中是否已有 RT-CORE-001 条目
- **如果已存在，跳过添加条目，仅更新 `last_updated_at` 字段**

**如果不存在，则执行以下操作**：
- 添加 RT-CORE-001 条目
- 更新 `last_updated_at` 字段

### 5. 生成状态汇总

完成后给出状态汇总，包括：
- 改动文件列表
- 待补充信息（如模块职责细节）
- 下一步建议

## 交互规范

- 严格遵守 `.aodw/ai-interaction-rules.md` 中的提问规范
- 关键问题使用选项 + 推荐理由的形式
- 保持中文输出
- 路径使用反引号标记（如 `` `docs/modules/example.md` ``）
