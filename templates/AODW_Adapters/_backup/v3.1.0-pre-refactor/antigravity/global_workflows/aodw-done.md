---
description: 完成并关闭 AODW 任务
---

# 完成 RT

完成当前 RT 并更新状态。

## 核心规则引用
- `.aodw/02-workflow/rt-manager.md` (完成标准)

## 操作步骤
1. 确认所有任务已完成。
2. 更新 `RT/RT-XXX/meta.yaml` 状态为 `done`。
3. 设置 `closed_at` 时间戳。
4. 更新 `RT/index.yaml` 状态。
