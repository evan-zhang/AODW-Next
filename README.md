# AODW Next

AODW (AI-Orchestrated Development Workflow) Next 版本 - 独立项目

## 🚀 快速开始

### 安装 AODW-Next

在您的项目根目录运行：

```bash
npx aodw-skill init
```

或者指定最新版本：

```bash
npx aodw-skill@latest init
```

### 安装步骤

1. **运行安装命令**：在项目根目录执行 `npx aodw-skill init`

2. **选择 AI 平台**：系统会引导您选择正在使用的 AI 工具（可多选）
   - ✓ Cursor (IDE with AI)
   - ✓ Antigravity (Google Gemini)
   - ✓ Claude Desktop
   - ✓ Gemini (Web / API)
   - ✓ General Agents (OpenAI, etc.)

3. **配置开发模式**：
   - **独立模式**：本地生成 RT-ID，适合个人开发
   - **协作模式**：联网获取 RT-ID，适合团队开发

4. **自动安装**：工具会自动：
   - 创建 `.aodw-next/` 目录（包含所有核心规范文件）
   - 安装对应平台的适配器文件
   - 初始化项目配置

### 安装后

1. **重启编辑器**：确保 AI 工具识别新的规则文件
2. **开始使用**：您的 AI 助手现在会遵循 AODW-Next 规范工作
3. **查看文档**：`.aodw-next/01-core/aodw-constitution.md` 包含完整的工作流说明

### 更新

更新到最新版本：

```bash
npx aodw-skill@latest init
```

或者使用更新命令：

```bash
npx aodw-skill update
```

### 卸载

从当前项目移除 AODW-Next：

```bash
npx aodw-skill uninstall
```

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

### 维护者发布标准流程（NPM）

后续版本发布请统一按以下流程执行（适用于 `aodw-skill`）：

1. **准备环境**
   - 保证工作区干净：`git status`
   - 保证已登录 npm：`npm whoami`
   - 进入 CLI 目录：`cd cli`

2. **升级版本并同步模板**
   - `./publish.sh patch`（或 `minor` / `major`）
   - 脚本会同步 `templates/`、更新 `package.json` 版本。

3. **发布到 npm**
   - 若账号策略要求 OTP：
     ```bash
     npm publish --otp=<6位验证码>
     ```
   - 若使用 Granular Access Token（并开启 bypass 2FA）：
     ```bash
     npm config set //registry.npmjs.org/:_authToken=<TOKEN>
     npm publish
     ```

4. **发布后验证**
   ```bash
   npm view aodw-skill version
   npx aodw-skill@latest --help
   ```

5. **版本落库**
   - 发布成功后，如 `cli/package.json` 版本号有变更，需提交并推送到仓库。

> 安全建议：不要在聊天或公共日志中暴露 npm token；如已暴露，请立即在 npm 后台撤销并重新生成。

## 📝 版本历史

- **0.7.8+**: 独立项目，移除 Legacy 版本依赖

## 📄 许可证

MIT License

## 🤝 贡献

欢迎贡献！请确保遵循 AODW 规范。

## 🔗 相关链接

- Legacy 版本: [aodw](https://www.npmjs.com/package/aodw)
- Next 版本: [aodw-skill](https://www.npmjs.com/package/aodw-skill)

