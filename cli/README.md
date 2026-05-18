# aodw-skill

> AODW-Next: AI-Orchestrated Development Workflow (Skill 化版本)

[![npm version](https://badge.fury.io/js/aodw-skill.svg)](https://www.npmjs.com/package/aodw-skill)

## 简介

`aodw-skill` 是 AODW-Next 的命令行工具，用于在您的项目中快速初始化 AODW 开发规范。

AODW 定义了一种 **AI 主导、文档驱动、可回溯** 的软件开发范式，帮助团队通过统一的工作流提升协作效率和代码质量。

## 快速开始

在您的项目根目录运行：

```bash
npx aodw-skill
```

该命令会：
1. 安装 AODW-Next 核心规范（`.aodw-next` 目录）
2. 自动检测项目信息（技术栈、架构、模块结构）
3. 生成项目概览文档（`ai-overview.md` 和 `modules-index.yaml`）
4. 根据您的选择安装对应的 AI 工具适配器（Cursor / Claude / Antigravity）

## 使用方法

### 初始化安装

```bash
npx aodw-skill
```

系统会询问：
- 您正在使用哪个 AI 工具？（可多选）
  - ✓ Cursor (IDE with AI)
  - ✓ Antigravity (Google Gemini)
  - ✓ Anthropic Claude

根据您的选择，工具会自动安装相应的配置文件。

### 更新 AODW-Next

更新到最新版本：

```bash
npx aodw-skill update
```

该命令会：
- 更新 `.aodw-next` 核心规范到最新版本
- 保留用户生成的文件（如 `ai-overview.md`、`modules-index.yaml`、`tools-status.yaml`）
- 可选：同时更新已安装的适配器文件

### 卸载 AODW-Next

从当前项目移除 AODW-Next：

```bash
npx aodw-skill uninstall
```

该命令会删除：
- `.aodw-next` 目录
- 渠道对应的适配器文件（.cursor、.agent、.claude 等）

### 安装后

1. **重启编辑器**：确保 AI 工具识别新的规则文件
2. **项目深度初始化（推荐）**：`init` 结束时会输出一段提示词，复制到 AI 对话窗口执行，完善 `06-project/` 文档
3. **开始使用**：您的 AI 助手现在会遵循 AODW-Next 规范工作
4. **查看文档**：`.aodw-next/01-core/aodw-constitution.md` 包含完整的工作流说明

## 项目结构

安装完成后，您的项目会包含：

```
your-project/
├── .aodw-next/            # AODW-Next 核心规范
│   ├── 01-core/            # 核心规则
│   ├── 02-workflow/        # 工作流程
│   ├── 03-standards/       # 编码规范
│   ├── 04-auditors/        # 审计器
│   ├── 05-tooling/         # 工具初始化
│   ├── 06-project/         # 项目概览（用户生成）
│   └── tools-status.yaml   # 工具状态（用户生成）
├── RT/                     # 运行时任务目录
└── [适配器文件]             # 如 .cursor、CLAUDE.md 等
```

## 支持的 AI 工具

- **Cursor**: 安装 `.cursor` 目录和 `aodw-next.mdc`
- **Antigravity (Google Gemini)**: 安装 `.agent` 目录
- **Anthropic Claude**: 安装 `.claude/CLAUDE.md`

## 更多命令

### 工具初始化

```bash
npx aodw-skill init-tools
```

根据项目技术栈，初始化相应的开发工具（ESLint、Prettier、Ruff、Black、rustfmt、clippy 等）。

### 创建 RT (Request Ticket)

```bash
npx aodw-skill new
```

交互式创建新的开发任务 Ticket。

### AODW v0 防漏记（推荐）

```bash
npx aodw-skill enable-guard-hook
```

默认行为（更自动）：
- `npx aodw-skill init` 时会自动尝试安装 guard hook（若无自定义 hook 冲突）
- 提交时自动执行 `guard --auto-fix --stage-audit`
- 若 `latest` 版本尚未包含 `guard` 命令，hook 会自动回退尝试 `aodw-skill@beta`

在当前项目安装 `pre-commit` guard，自动处理：
- 改了代码目录（如 `cli/`、`templates/`、`src/` 等）
- 但没有任何流程痕迹更新（如 `RT/`、`maintainers/`、`.aodw-next/06-project/`）
- 自动生成并暂存 `.aodw-next/06-project/audit-latest.md` 作为最小补录

手动命令：

```bash
npx aodw-skill guard
npx aodw-skill audit --write
```

用途：
- `guard`: 提交前检查是否“有改动无痕迹”
- `audit --write`: 生成最小补录草稿到 `.aodw-next/06-project/audit-latest.md`

## 维护者发布流程

后续版本发布统一采用以下方式：

1. 进入目录并确认状态

```bash
cd cli
git status
npm whoami
```

2. 版本升级（会同步模板并更新版本号）

```bash
./publish.sh patch   # 或 minor / major
```

3. 发布到 npm

- 先检查实际入包文件（推荐）：

```bash
npm run pack:check
```

- OTP 模式（账号策略要求 2FA）：

```bash
npm publish --otp=<6位验证码>
```

- Token 模式（Granular Access Token + bypass 2FA）：

```bash
npm config set //registry.npmjs.org/:_authToken=<TOKEN>
npm publish
```

4. 发布校验

```bash
npm view aodw-skill version
npx aodw-skill@latest --help
```

5. 收尾

- 如 `package.json` 版本号变更未提交，请补充 commit 并 push。
- 若 token 曾在不安全位置暴露，请立即撤销并更换。

## 了解更多

- [AODW-Next 完整文档](#)
- [贡献指南](#)
- [问题反馈](https://github.com/your-repo/issues)

## License

MIT © AODW Team
