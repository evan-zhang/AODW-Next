# AODW Next

AODW (AI-Orchestrated Development Workflow) Next 版本 - 独立项目

## 🚀 快速开始

在您的项目中安装 AODW Next：

```bash
npx aodw-skill init
```

系统会引导您选择正在使用的 AI 工具（Cursor / Gemini / Claude），并自动完成配置。

## 📁 项目结构

```
AODW-Next/
├── cli/                    # CLI 工具源码
│   ├── bin/
│   │   ├── aodw.js        # 主入口
│   │   ├── commands/      # 命令实现
│   │   └── processors/   # 文件处理器
│   ├── package.json
│   └── publish.sh         # 发布脚本
├── templates/
│   ├── .aodw-next/        # 核心规范文件（Runtime Kernel）
│   ├── AODW_Adapters/     # AI 工具适配器模板
│   └── docs/              # 文档
└── README.md
```

## 🎯 与 Legacy 版本的区别

### AODW Next 特性

1. **渐进式披露架构**：三层架构（manifest → workflow-guide → 详细规则）
2. **Token 优化**：优先使用摘要文件，按需加载详细规则
3. **独立目录**：使用 `.aodw-next/` 目录，与 Legacy 版本完全隔离
4. **简化代码**：移除版本切换逻辑，代码更清晰

### 安装路径

- **Legacy 版本**：`.aodw/`（通过 `npx aodw init`）
- **Next 版本**：`.aodw-next/`（通过 `npx aodw-skill init`）

两套安装可以并行存在，互不覆盖。

## 📚 核心概念

### AODW 是什么？

AODW 定义了一套规范化的开发流程：

- **RT (Request Ticket)**: 每个需求/功能/Bug 都作为一个独立的 RT 管理
- **文档驱动**: 先写规范文档（Spec），再写代码
- **AI 协作**: AI 遵循统一规范，与人类开发者高效协作
- **可回溯**: 所有决策、变更都有完整记录

### 主要特性

✅ **跨工具兼容** - 支持 Cursor、Gemini、Claude 等多种 AI 工具  
✅ **规范化流程** - 统一的 RT 管理、文档模板、Git 规范  
✅ **渐进式披露** - 三层架构，按需加载，优化 Token 使用  
✅ **Token 优化** - 摘要文件优先，减少不必要的上下文加载  

## 🔧 开发

### 本地开发

```bash
cd cli
npm link
aodw-skill init  # 测试本地版本
```

### 发布

```bash
cd cli
./publish.sh patch  # 或 minor, major
```

## 📝 版本历史

- **0.7.8+**: 独立项目，移除 Legacy 版本依赖

## 📄 许可证

MIT License

## 🤝 贡献

欢迎贡献！请确保遵循 AODW 规范。

## 🔗 相关链接

- Legacy 版本: [aodw](https://www.npmjs.com/package/aodw)
- Next 版本: [aodw-skill](https://www.npmjs.com/package/aodw-skill)

