# AODW 适配器重构 - 迁移指南

**版本**: 0.1.x → 0.2.0  
**发布日期**: 2025-12-06

---

## 概述

AODW 0.2.0 版本对 Antigravity 平台的适配器规则进行了重构，简化了命令结构，提升了可用性。

### 主要变更

- ✅ 规则数量从 16 个精简为 11 个（用户可见 9 个）
- ✅ 按 RT 生命周期阶段重新组织命令
- ✅ 排除维护者专用命令（不会分发到用户项目）
- ✅ 符合"薄适配器"设计原则

---

## 命令对照表

### 旧版本 → 新版本 (v0.2.0)

| 旧命令                                        | 新命令            | 变化说明                      |
| --------------------------------------------- | ----------------- | ----------------------------- |
| `/aodw-new`                                   | `/aodw-intake`    | 重命名，更符合立项流程语义    |
| `/aodw-lite` + `/aodw-full` + `/aodw-upgrade` | `/aodw-decide`    | **合并**为一个决策命令        |
| `/aodw-impact` + `/aodw-invariants`           | `/aodw-analyze`   | **合并**为分析阶段命令        |
| `/aodw-tests` + `/aodw-module`                | `/aodw-implement` | **合并**为实现阶段命令        |
| `/aodw-check`                                 | `/aodw-verify`    | 重命名，更清晰                |
| `/aodw-done`                                  | `/aodw-complete`  | 重命名，更清晰                |
| `/aodw-pause` + `/aodw-resume`                | `/aodw-control`   | **合并**为流程控制命令        |
| `/aodw-open`                                  | `/aodw-open`      | **保持不变**                  |
| `/aodw`                                       | `/aodw`           | **保持不变**（Kernel Loader） |

### 移除的命令（仅维护者可见）

| 命令               | 说明          | 影响                                          |
| ------------------ | ------------- | --------------------------------------------- |
| `/aodw-governance` | AODW 治理检查 | 不再分发给用户，仅在 AODW 仓库中使用          |
| `/aodw-init`       | 初始化 AODW   | CLI (`npx create-aodw init`) 已处理，无需手动 |

---

## 迁移步骤

### 对于新用户

无需任何操作，直接使用新版本即可：

```bash
npx create-aodw init
```

### 对于现有用户

#### 选项 1：更新到最新版本

```bash
# 更新 AODW（会覆盖现有 .agent/rules 和 .agent/workflows）
npx create-aodw init
```

**注意**：如果你自定义了规则文件，请先备份。

#### 选项 2：继续使用旧版本

如果你已经习惯了旧命令，可以继续使用 v3.1.0：

```bash
# 不运行 init 命令，保持现有配置
```

但建议尽快迁移到新版本，以获得更好的体验。

---

## 新命令使用指南

### 1. `/aodw-intake` - 创建新 RT

**用途**: 替代原 `/aodw-new`

**使用场景**:
- 创建新功能
- 修复 Bug
- 性能优化
- 代码重构

**示例**:
```
你: "创建一个新RT，我想添加用户登录功能"
AI: (自动运行 /aodw-intake)
```

### 2. `/aodw-decide` - 选择开发模式

**用途**: 替代原 `/aodw-lite`, `/aodw-full`, `/aodw-upgrade`

**使用场景**:
- 选择 Spec-Full 或 Spec-Lite
- 从 Spec-Lite 升级到 Spec-Full

**示例**:
```
你: "这个改动比较复杂，用 Spec-Full"
AI: (自动运行 /aodw-decide，选择 Spec-Full)
```

### 3. `/aodw-analyze` - 分析阶段

**用途**: 替代原 `/aodw-impact`, `/aodw-invariants`

**使用场景**:
- 分析影响范围
- 确定不变量

**示例**:
```
你: "分析一下这个改动的影响"
AI: (自动运行 /aodw-analyze，更新 impact.md 和 invariants.md)
```

### 4. `/aodw-implement` - 实现阶段

**用途**: 替代原 `/aodw-tests`, `/aodw-module`

**使用场景**:
- 更新测试计划
- 更新模块文档

**示例**:
```
你: "代码写完了，更新一下测试和文档"
AI: (自动运行 /aodw-implement)
```

### 5. `/aodw-verify` - 验证阶段

**用途**: 替代原 `/aodw-check`

**使用场景**:
- 检查 RT 一致性
- 验证文档与代码匹配

**示例**:
```
你: "检查一下文档和代码是否一致"
AI: (自动运行 /aodw-verify)
```

### 6. `/aodw-complete` - 完成 RT

**用途**: 替代原 `/aodw-done`

**使用场景**:
- 合并代码
- 完成 RT
- 知识蒸馏

**示例**:
```
你: "完成这个 RT"
AI: (自动运行 /aodw-complete，合并分支)
```

### 7. `/aodw-control` - 流程控制

**用途**: 替代原 `/aodw-pause`, `/aodw-resume`

**使用场景**:
- 暂停 AODW 流程
- 恢复 AODW 流程

**示例**:
```
你: "暂停一下 AODW"
AI: (自动运行 /aodw-control，暂停流程)

你: "继续 AODW"
AI: (自动运行 /aodw-control，恢复流程)
```

---

## 常见问题 (FAQ)

### Q1: 为什么要合并命令？

**A**: 为了减少认知负担。原有 16 个命令过多，新版按 RT 生命周期阶段组织为 9 个，更易理解和使用。

### Q2: 旧命令还能用吗？

**A**: 旧命令已被移除。但新命令功能完全覆盖旧命令，只是名称和组织方式变化。

### Q3: 我自定义了规则，升级会覆盖吗？

**A**: 是的。如果你自定义了 `.agent/rules/` 下的文件，升级前请备份。

### Q4: 新版本有什么好处？

**A**: 
- ✅ 命令更少，更易记
- ✅ 符合 RT 工作流，更直观
- ✅ 遵循薄适配器原则，更简洁
- ✅ 排除维护者命令，更专注

### Q5: 如何回退到旧版本？

**A**: 
```bash
# 删除当前配置
rm -rf .agent

# 从备份恢复（如果有）
cp -r .agent.backup .agent
```

---

## 技术细节

### 薄适配器原则

新版本严格遵循"薄适配器"设计原则：
- 规则文件简洁（平均 367 字节）
- 不重复核心规范内容
- 通过引用指向详细文档

### 三层架构

```
Layer 1 (.aodw/)          → 详细规则说明
Layer 2 (.agent/rules/)   → 简洁触发器
Layer 3 (global_workflows/) → 具体操作步骤
```

每层职责清晰，避免重复。

---

## 获取帮助

如有问题，请查看：
- AODW 文档: `.aodw/README.md`
- 实施计划: `docs/aodw-adapter-refactoring-plan.md`
- 架构分析: `docs/aodw-rules-structure-analysis.md`

或联系 AODW 维护者。
