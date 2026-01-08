---
description: 选择开发模式（Spec-Full 或 Spec-Lite）
---

# 选择开发模式

## 核心规则引用
- `.aodw/02-workflow/rt-manager.md` (Section 5)
- `.aodw/02-workflow/spec-full-profile.md`
- `.aodw/02-workflow/spec-lite-profile.md`

## 操作步骤

### 1. 评估复杂度
根据 Intake 阶段收集的信息，评估任务复杂度。

### 2. 建议 Profile
- **Spec-Full**: 复杂、跨模块、高风险
- **Spec-Lite**: 单模块、低风险、小改动

### 3. 用户确认
询问用户是否接受推荐或手动选择。

### 4. 创建对应文档
- Spec-Full: `spec.md`, `plan.md`
- Spec-Lite: `spec-lite.md`, `plan-lite.md`
