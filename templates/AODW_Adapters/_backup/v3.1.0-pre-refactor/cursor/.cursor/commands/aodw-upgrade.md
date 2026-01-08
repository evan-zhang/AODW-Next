# 升级到 Spec-Full

将当前 RT 从 Spec-Lite 升级到 Spec-Full。

## 功能
- 检测是否需要升级的条件
- 询问用户确认升级
- 创建完整的 Full 文档
- 更新 meta.yaml 中的 profile
- 更新 RT/index.yaml

## 升级条件
当检测到以下任何情况时，必须升级：
- 更改影响多个模块
- 更改修改或引入不变量
- 更改影响数据库 schema 或数据模型
- 更改修改 API 契约
- 存在性能、并发或安全影响
- 用户明确要求更可靠的长期设计

## 文档转换
- spec-lite.md → spec.md
- plan-lite.md → plan.md
- 创建 impact.md、invariants.md（如果不存在）
- 更新 tests.md 为完整测试矩阵


