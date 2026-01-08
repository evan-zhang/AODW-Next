---
trigger: always_on
---

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
- 格式：`RT-{seq}`，其中 `{seq}` 为零填充数字（推荐至少 3 位，如 `RT-001`、`RT-002`）
- RT-ID 全局唯一，所有 RT（包括 AODW 治理相关的 RT）都使用统一的 `RT-{seq}` 格式

**生成步骤**：
1. 读取 `RT/index.yaml`，找到所有现有 RT 的 ID（格式为 `RT-{seq}`）
2. 提取所有序号
3. 找到最大序号，新 RT 序号 = 最大序号 + 1
4. 生成 RT-ID：`RT-{seq}`（如 `RT-001`、`RT-002`）

**注意**：AODW 治理相关的 RT 也使用 `RT-{seq}` 格式，通过 `type` 字段（如 `type: Enhancement`）和 `modules` 字段（包含治理相关模块）来标识，而不是通过特殊的命名格式。

**详细规则见**：`.aodw/id-branch-directory-rules.md` 和 `.aodw/02-workflow/rt-manager.md`

### 2. 创建目录

⚠️ **重要规则**：
- 目录名必须严格遵循 `RT-{seq}` 格式
- **禁止**在目录名中添加描述性文字（如 `RT-002-unidraft-mvp` 是错误的）
- **禁止**使用 `RT-CORE-{seq}` 格式，所有 RT 统一使用 `RT-{seq}` 格式
- 描述性信息应放在 `meta.yaml` 的 `title` 字段中，而不是目录名

**操作步骤**：
1. 创建目录：`RT/RT-{seq}/`（例如：`RT/RT-001/`）
2. 确保目录名与 RT-ID 完全一致

### 3. 创建文档

按照 AODW 规范创建所有必需文档：

**核心文档**（位于 RT 目录根目录）：
- `meta.yaml`（必须填写 `id: RT-{seq}` 和 `title`，确保 `id` 与目录名一致）
- `intake.md`
- `decision.md`
- `spec.md` 或 `spec-lite.md`（根据 Profile 选择）
- `plan.md` 或 `plan-lite.md`（根据 Profile 选择）
- `impact.md`
- `invariants.md`
- `tests.md`
- `changelog.md`

**过程文档目录**（可选，按需创建）：
- 如果在执行过程中需要创建过程文档（如代码审查报告、验证报告、完成总结等），必须先创建 `RT/RT-XXX/docs/` 目录
- 所有过程文档必须存放在 `RT/RT-XXX/docs/` 目录下，不能与核心文档混放在根目录
- 过程文档命名使用小写字母和连字符（如 `code-review.md`、`time-command-verification.md`）
- 过程文档类型包括但不限于：
  - 代码审查报告
  - 验证测试报告
  - 完成总结报告
  - 提交信息建议
  - 状态跟踪文档
  - 根因分析文档
  - 改进方案文档
  - 其他执行过程中的辅助文档
- 详见 `.aodw/01-core/ai-knowledge-rules.md` 第 7 节"过程文档管理规则"

### 4. 更新索引

在 `RT/index.yaml` 中：
1. 添加新 RT 条目（包含 id、title、type、profile、status 等）
2. 更新 `last_updated_at` 字段（必须使用系统命令或 API 获取真实时间，见 `.aodw/02-workflow/rt-manager.md` 第 9 节）

## 注意事项

- **目录命名**：必须严格遵循 `RT-{seq}` 格式，不能添加任何描述性文字
- **ID 一致性**：`meta.yaml` 中的 `id` 字段必须与目录名完全一致
- **描述信息**：所有描述性信息（如功能名称）应放在 `meta.yaml` 的 `title` 字段中
- **规则参考**：详细规则见 `.aodw/id-branch-directory-rules.md`

