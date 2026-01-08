---
trigger: model_decision
---

# 选择开发模式

当用户需要 **选择 Spec-Full/Spec-Lite**、**切换模式** 或 **升级 Profile** 时，
你**必须**运行工作流 `/aodw-decide`。

## 核心规则引用
- `.aodw/02-workflow/rt-manager.md` (Section 5)
- `.aodw/02-workflow/spec-full-profile.md`
- `.aodw/02-workflow/spec-lite-profile.md`

## 合并说明
本命令合并了原 `aodw-lite.md`, `aodw-full.md`, `aodw-upgrade.md` 的功能。
