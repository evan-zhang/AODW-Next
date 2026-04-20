# AODW Tool Adapters

此目录包含不同 AI 工具的配置模板，用于将 AODW 规范桥接到具体的开发工具。

## 📦 支持的工具

### `cursor/`
**Cursor IDE 适配器**
- `.cursor/rules/aodw-next.mdc` - Cursor 规则文件
- 使用 Cursor 的 `.mdc` (Markdown Component) 格式
- 支持命令索引和上下文加载指令

### `claude/`
**Anthropic Claude 适配器**
- `CLAUDE.md` - Claude Code 项目指令文件
- 适用于 claude.ai/code 和 Claude Code VSCode 扩展

### `antigravity/`
**Google Gemini Antigravity 适配器**
- `.agent/rules/aodw-next.md` - Gemini Agent 规则文件
- 适用于 Antigravity AI 平台

## 🚀 使用方法

### 作为用户

用户**不应该**直接使用此目录，而是通过 CLI 工具自动安装：

```bash
npx aodw-skill init
```

CLI 会根据选择自动将对应的适配器文件复制到项目根目录。

### 作为开发者

#### 添加新工具适配器

1. **创建新目录**：
   ```bash
   mkdir AODW_Adapters/vscode
   ```

2. **添加配置文件**：
   - 工具特定的配置
   - 提示词文件
   - 规则定义

3. **更新 CLI**：
   编辑 `cli/bin/aodw.js`，在选项列表中添加新工具：
   ```javascript
   choices: [
     { name: 'All (Install all adapters)', value: 'all' },
     { name: 'Cursor', value: 'cursor', checked: true },
     { name: 'Anthropic Claude', value: 'claude' },
     { name: 'Google Gemini (Antigravity)', value: 'antigravity' },
     { name: 'VS Code', value: 'vscode' }  // 新增
   ]
   ```

4. **更新逻辑**：
   确保 `toolsToInstall` 逻辑包含新工具：
   ```javascript
   const toolsToInstall = tools.includes('all')
     ? ['cursor', 'claude', 'antigravity', 'vscode']  // 新增
     : tools;
   ```

5. **发布新版本**：
   ```bash
   cd cli
   ./publish.sh minor  # 新功能使用 minor
   ```

#### 更新现有适配器

1. 修改对应目录下的文件
2. 运行 `cli/publish.sh patch` 发布补丁版本
3. 用户运行 `npx aodw-skill update` 即可获得更新

## 🏗️ 设计原则

### "薄适配器"原则

适配器应该**尽量轻量**：

❌ **错误做法** - 在适配器中重复规范内容：
```markdown
<!-- CLAUDE.md -->
# AODW 规范
## RT 管理
RT-ID 格式为 RT-XXX...（大量重复 .aodw 中的内容）
```

✅ **正确做法** - 引导 AI 阅读核心规范：
```markdown
<!-- CLAUDE.md -->
你正在一个 AODW 项目中工作。
请优先阅读 `.aodw-next/01-core/aodw-constitution.md` 了解核心规范。
当处理 RT 时，参考 `.aodw-next/02-workflow/rt-manager.md`。
```

### 职责边界

- **适配器的职责**：将工具特定的接口映射到 AODW 规范
- **核心规范的职责**：定义"什么是 AODW"

## 📝 目录结构

```
AODW_Adapters/
├── README.md           # 本文件
├── cursor/
│   └── .cursor/
│       └── rules/
│           └── aodw-next.mdc
├── claude/
│   └── CLAUDE.md
└── antigravity/
    └── .agent/
        └── rules/
            └── aodw-next.md
```

## 🔄 版本同步

适配器版本与 AODW 核心规范保持同步：
- 当 `.aodw-next/` 更新时，适配器也应相应调整
- CLI 的 `update` 命令会同时更新核心和适配器

## 🤝 贡献

欢迎为新工具贡献适配器！请确保：
1. 遵循"薄适配器"原则
2. 测试适配器在目标工具中的效果
3. 提供清晰的使用说明
