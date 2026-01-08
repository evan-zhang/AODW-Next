---
description: 创建新 RT，启动 AODW 工作流
---

# 创建新 RT

## 核心规则引用
执行此任务前，请参考：
- `.aodw/02-workflow/rt-manager.md` (RT 生命周期与命名规范)
- `.aodw/01-core/ai-knowledge-rules.md` (文档维护规则)

## 操作步骤

### 1. 生成 RT-ID
1. 读取 `RT/index.yaml`，找到最大序号。
2. 生成新 ID `RT-{seq}` (如 `RT-001`)。

### 2. 创建目录
1. 创建目录 `RT/RT-{seq}/`。
2. **注意**：目录名必须严格匹配 ID。

### 3. 创建文档
1. 创建 `RT/RT-{seq}/meta.yaml`。
2. 创建核心文档：`intake.md`, `decision.md`, `spec.md`, `plan.md`, `impact.md`, `invariants.md`, `tests.md`, `changelog.md`。

### 4. 更新索引
1. 在 `RT/index.yaml` 中添加新条目。
2. 更新 `last_updated_at`（使用系统时间）。
