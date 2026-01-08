# AODW 双版本安装方案

本方案用于同时支持 legacy 与 next 两条路线，并确保互不影响。

## 1. 安装目标

- legacy：保持现有稳定方案
- next：引入三层架构优化（manifest + workflow-guide + summaries）
- 两套安装可并行存在，互不覆盖

## 2. 安装命令

### 2.1 legacy（稳定版）

```bash
npx aodw init
```

更新：
```bash
npx aodw update
```

卸载：
```bash
npx aodw uninstall
```

### 2.2 next（新方案线）

```bash
npx aodw-skill init
```

更新：
```bash
npx aodw-skill update
```

卸载：
```bash
npx aodw-skill uninstall
```

## 3. 安装路径与隔离

### 3.1 legacy 目录

- `.aodw/`  
- 保持与现有 CLI 完全一致

### 3.2 next 目录

- `.aodw-next/`  
- 不与 legacy 共享目录或文件

## 4. 适配器隔离原则

- legacy 继续写入原有适配器路径
- next 使用独立适配器路径（避免覆盖）

示例约定：
- legacy：`.aodw/` + `AODW_Adapters/`
- next：`.aodw-next/` + 独立命名文件（如 `aodw-next.mdc`）

适配器文件命名示例（next）：
- Cursor：`.cursor/rules/aodw-next.mdc`
- Claude：`.claude/CLAUDE-NEXT.md`
- Antigravity/Gemini：`.agent/rules/aodw-next*.md`
- Gemini：`.gemini/GEMINI-NEXT.md`

## 5. 并行使用策略

1. legacy 线用于稳定生产项目
2. next 线用于试验与新用户
3. 两者升级互不影响

## 6. 兼容性说明

- 不强制依赖 Skills
- 保持多平台可用性（Cursor / Claude / Gemini 等）

## 7. 维护者打包说明

- 发布脚本会根据当前分支自动选择渠道：legacy / next
- `release/next` 或 `*-next*` 分支将发布 `aodw-skill`
- 其他分支默认发布 `aodw`
- next 渠道使用独立模板目录：`templates/.aodw-next`、`templates/AODW_Adapters_next`、`templates/docs-next`
