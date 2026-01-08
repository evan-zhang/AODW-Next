# AODW 主命令

AODW (AI-Orchestrated Development Workflow) 主入口，显示可用命令和快速帮助。

## 可用命令

### RT 管理
- `aodw-new` - 创建新 RT
- `aodw-open` - 打开 RT
- `aodw-done` - 完成 RT
- `aodw-check` - RT 一致性检查

### Profile 管理
- `aodw-lite` - 切换到 Spec-Lite 模式
- `aodw-full` - 切换到 Spec-Full 模式
- `aodw-upgrade` - 升级到 Spec-Full

### 文档管理
- `aodw-module` - 更新模块文档
- `aodw-impact` - 更新影响分析
- `aodw-invariants` - 检查不变量
- `aodw-tests` - 生成测试计划

### 流程控制
- `aodw-pause` - 暂停 AODW
- `aodw-resume` - 恢复 AODW

### 治理
- `aodw-governance` - AODW 治理检查

## 快速开始

1. **创建新 RT**：使用 `aodw-new` 创建新的 Runtime Task
2. **选择 Profile**：根据改动范围选择 Spec-Lite 或 Spec-Full
3. **完成工作**：实现功能并更新文档
4. **检查一致性**：使用 `aodw-check` 验证完整性
5. **标记完成**：使用 `aodw-done` 完成 RT

## 模式说明

### Spec-Lite
适用于局部化、小范围的改动：
- 单模块更改
- 不涉及数据模型/API 变更
- UI 层微调
- 内部实现优化

### Spec-Full
适用于复杂、跨模块的改动：
- 跨模块调整
- 数据模型更改
- API 契约演进
- 架构决策
- 性能/并发/安全影响

## 文档结构

每个 RT 包含：
- `meta.yaml` - RT 元数据（权威来源）
- `intake.md` - 需求采集
- `decision.md` - 核心决策
- `spec.md` / `spec-lite.md` - 行为规格
- `plan.md` / `plan-lite.md` - 实施计划
- `impact.md` - 影响分析
- `invariants.md` - 不变量
- `tests.md` - 测试计划
- `changelog.md` - 变更记录


