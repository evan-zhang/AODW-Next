# 检查不变量

检查并验证 RT 不变量，确保实现不违反任何不变量规则。

## 功能
- 读取全局不变量（ai-knowledge-rules.md）
- 读取模块不变量（模块 README）
- 读取 RT 特定不变量（invariants.md）
- 检查代码实现是否违反不变量
- 警告潜在冲突
- 建议解决方案

## 不变量类型
1. **全局不变量**：定义在 ai-knowledge-rules.md、aodw-constitution.md
2. **模块不变量**：定义在模块 README、RT invariants.md
3. **RT 特定不变量**：定义在 RT/RT-XXX/invariants.md

## 执行层次
严格性顺序：
1. 全局不变量（最高优先级）
2. 模块不变量
3. RT 特定不变量

## 使用场景
- 编码前验证设计不违反不变量
- 编码后检查实现是否违反不变量
- 检测潜在冲突并警告用户


