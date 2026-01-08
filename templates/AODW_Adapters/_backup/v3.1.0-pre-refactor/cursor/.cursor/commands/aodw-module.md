# 更新模块文档

更新或创建模块文档，维护模块的职责、不变量和历史记录。

## 功能
- 读取或创建模块 README
- 更新模块职责描述
- 更新模块不变量
- 更新 related_rts 列表
- 更新 modules-index.yaml
- 更新文件映射

## 使用场景
- 代码修改影响模块行为时
- 创建新模块时
- 模块边界改变时
- 职责在模块间移动时

## 必需操作
1. 修改代码前：阅读相关模块 README 和不变量
2. 代码修改后：更新模块 README 和 related_rts
3. 创建新模块：创建 docs/modules/<module>.md 并注册到 modules-index.yaml


