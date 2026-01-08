# aodw

> AI-Orchestrated Development Workflow (AODW) CLI 工具

[![npm version](https://badge.fury.io/js/aodw.svg)](https://www.npmjs.com/package/aodw)

## 简介

`aodw` 是一个命令行工具，用于在您的项目中快速初始化 AODW (AI-Orchestrated Development Workflow) 开发规范。

AODW 定义了一种 **AI 主导、文档驱动、可回溯** 的软件开发范式，帮助团队通过统一的工作流提升协作效率和代码质量。

## 快速开始

在您的项目根目录运行：

```bash
npx aodw
```

next 版本（独立安装，不覆盖 legacy）：

```bash
npx aodw-skill
```

该命令会：
1. 安装 AODW 核心规范（`.aodw` 或 `.aodw-next` 目录）
2. 根据您的选择安装对应的 AI 工具适配器（Cursor / Gemini / Claude）
3. 初始化 `RT` 目录用于管理开发任务

## 使用方法

### 初始化安装

```bash
npx aodw
```

系统会询问：
- 您正在使用哪个 AI 工具？（可多选）
  - ✓ All (Install all adapters)
  - ✓ Cursor
  - ✓ Google Gemini
  - ✓ Anthropic Claude

根据您的选择,工具会自动安装相应的配置文件。

### 更新 AODW

更新到最新版本：

```bash
npx aodw update
```

next 版本更新：
```bash
npx aodw-skill update
```

该命令会：
- 更新 `.aodw` 核心规范到最新版本
- 可选：同时更新已安装的适配器文件

### 卸载 AODW

从当前项目移除 AODW：

```bash
npx aodw uninstall
```

next 版本卸载：
```bash
npx aodw-skill uninstall
```

该命令会删除：
- `.aodw` 或 `.aodw-next` 目录
- 渠道对应的适配器文件（.cursor、.agent 等）

### 安装后

1. **重启编辑器**：确保 AI 工具识别新的规则文件
2. **开始使用**：您的 AI 助手现在会遵循 AODW 规范工作
3. **查看文档**：`.aodw/aodw-constitution.md` 包含完整的工作流说明

## 项目结构

安装完成后，您的项目会包含：

```
your-project/
├── .aodw/ 或 .aodw-next/     # AODW 核心规范
│   ├── aodw-constitution.md
│   ├── rt-manager.md
│   ├── git-discipline.md
│   └── ...
├── RT/                     # 运行时任务目录
└── [适配器文件]             # 如 .cursor、GEMINI.md 等
```

## 支持的 AI 工具

- **Cursor**: 安装 `.cursor` 目录
- **Google Gemini**: 安装 `.agent` 目录和 `GEMINI.md`
- **Anthropic Claude**: 安装 `CLAUDE.md`

## 了解更多

- [AODW 完整文档](#)
- [贡献指南](#)
- [问题反馈](https://github.com/your-repo/issues)

## License

MIT © AODW Team
