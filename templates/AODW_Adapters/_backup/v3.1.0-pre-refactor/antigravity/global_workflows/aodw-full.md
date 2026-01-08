---
description: 切换到 Spec-Full 模式
---

# 切换到 Spec-Full

适用于复杂、跨模块的改动。

## 核心规则引用
- `.aodw/02-workflow/rt-manager.md` (Profile 定义)

## 操作步骤
1. 更新 `RT/RT-XXX/meta.yaml` 中的 `profile` 为 `Spec-Full`。
2. 确保创建所有 Spec-Full 必需文档 (`impact.md`, `invariants.md`, `tests.md`)。
