# 创建新 RT

启动 AODW 工作流，创建新的 Runtime Task (RT)。

## 功能
- 自动检测需求类型（Feature/Bug/Enhancement/Refactor/Research）
- 通过交互协议采集需求信息
- 确定影响模块和风险级别
- 选择 Profile（Spec-Lite 或 Spec-Full）
- 生成 RT-ID 并创建 RT 目录结构和文档
- 更新 RT/index.yaml

## 使用场景
当用户提出新功能、Bug 修复、性能优化、重构或研究任务时使用。

## 操作步骤

### 1. 生成 RT-ID

**RT-ID 格式规则**：
- 标准 RT：`RT-{seq}`，其中 `{seq}` 为零填充数字（推荐至少 3 位，如 `RT-001`、`RT-002`）
- 特殊 RT（AODW 治理相关）：`RT-CORE-{seq}`（如 `RT-CORE-001`）

**生成步骤**：
1. 读取 `RT/index.yaml`，找到所有现有 RT 的 ID
2. 提取所有序号（支持 `RT-001` 和 `RT-CORE-001` 格式）
3. 找到最大序号，新 RT 序号 = 最大序号 + 1
4. 生成 RT-ID：`RT-{seq}`（如 `RT-001`、`RT-002`）
5. 如果是 AODW 治理相关，使用 `RT-CORE-{seq}` 格式

**详细规则见**：`.aodw/id-branch-directory-rules.md` 和 `.aodw/rt-manager.md`

### 2. 创建目录

⚠️ **重要规则**：
- 目录名必须严格遵循 `RT-{seq}` 或 `RT-CORE-{seq}` 格式
- **禁止**在目录名中添加描述性文字（如 `RT-002-unidraft-mvp` 是错误的）
- 描述性信息应放在 `meta.yaml` 的 `title` 字段中，而不是目录名

**操作步骤**：
1. 创建目录：`RT/RT-{seq}/`（例如：`RT/RT-001/`）
2. 确保目录名与 RT-ID 完全一致

### 3. 创建文档

按照 AODW 规范创建所有必需文档：
- `meta.yaml`（必须填写 `id: RT-{seq}` 和 `title`，确保 `id` 与目录名一致）
- `intake.md`
- `decision.md`
- `spec.md` 或 `spec-lite.md`（根据 Profile 选择）
- `plan.md` 或 `plan-lite.md`（根据 Profile 选择）
- `impact.md`
- `invariants.md`
- `tests.md`
- `changelog.md`

### 4. 更新索引

在 `RT/index.yaml` 中：
1. 添加新 RT 条目（包含 id、title、type、profile、status 等）
2. 更新 `last_updated_at` 字段

## 注意事项

- **目录命名**：必须严格遵循 `RT-{seq}` 格式，不能添加任何描述性文字
- **ID 一致性**：`meta.yaml` 中的 `id` 字段必须与目录名完全一致
- **描述信息**：所有描述性信息（如功能名称）应放在 `meta.yaml` 的 `title` 字段中
- **规则参考**：详细规则见 `.aodw/id-branch-directory-rules.md`


