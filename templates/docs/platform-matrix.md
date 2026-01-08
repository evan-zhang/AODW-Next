# AODW 平台适配矩阵 (Platform Support Matrix)

本文档详细定义了 AODW 在各个 AI 开发平台上的适配规范，是 CLI 实现的**唯一真理来源 (Single Source of Truth)**。
重点明确了 **Frontmatter 配置**，以确保规则在各种环境下都能被稳定触发和执行。

## 1. 核心概念

*   **Scope (范围)**:
    *   **Project**: 仅对当前项目生效。
    *   **Global**: 对当前用户的所有项目生效。
*   **Capability (能力)**:
    *   **Rules**: 被动上下文规则 (System Prompt / Context)。
    *   **Commands**: 主动触发的工作流 (Slash Commands)。

---

## 2. Antigravity (Google)

Antigravity 依赖 **Intent Classification** (意图识别) 来动态加载规则。

| Scope                | Capability   | Path                         | Frontmatter Specification (必须严格遵守)                                                                                           |
| :------------------- | :----------- | :--------------------------- | :--------------------------------------------------------------------------------------------------------------------------------- |
| **Project & Global** | **Rules**    | `.agent/rules/aodw-*.md`     | ```yaml<br>---<br>trigger: model_decision<br>---<br>```<br>**说明**: `model_decision` 允许模型根据用户输入自动判断是否加载此规则。 |
| **Project & Global** | **Commands** | `.agent/workflows/aodw-*.md` | ```yaml<br>---<br>description: [简短描述]<br>---<br>```<br>**说明**: `description` 用于帮助用户和模型理解此工作流的功能。          |

---

## 3. Cursor (Anysphere)

Cursor 依赖 `.mdc` 文件中的 `globs` 和 `alwaysApply` 字段来决定规则的生效范围。

| Scope                | Capability   | Path                     | Frontmatter Specification (必须严格遵守)                                                                                                                                                                                                            |
| :------------------- | :----------- | :----------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Project & Global** | **Rules**    | `.cursor/rules/aodw.mdc` | ```yaml<br>---<br>description: AODW Core Framework<br>globs: *<br>alwaysApply: true<br>---<br>```<br>**说明**: <br>1. `globs: *`: AODW 是底层框架，必须匹配所有文件。<br>2. `alwaysApply: true`: 必须始终激活，防止 AI 在未加载规则时生成违规代码。 |
| **Project & Global** | **Commands** | `.cursor/commands/*.md`  | *Standard Markdown (No Frontmatter required)*<br>**说明**: Cursor 自动识别 `.cursor/commands/` 下的所有 `.md` 文件为 Slash Commands。                                                                                                               |

---

## 4. Claude (Anthropic)

Claude Code 主要依赖文件路径和内容结构，对 Frontmatter 依赖较少。

| Scope                | Capability   | Path                    | Frontmatter Specification                                                                           |
| :------------------- | :----------- | :---------------------- | :-------------------------------------------------------------------------------------------------- |
| **Project & Global** | **Rules**    | `CLAUDE.md`             | *Standard Markdown*<br>**说明**: 文件内容必须包含明确的章节结构 (如 `# AODW Rules`, `# Commands`)。 |
| **Project & Global** | **Commands** | `.claude/commands/*.md` | *Standard Markdown*<br>**说明**: 文件名即命令名。支持 `$ARGUMENTS` 占位符。                         |

---

## 5. GitHub Copilot (Microsoft)

Copilot 对 Prompt 文件有严格的元数据要求，否则可能无法正确执行或使用错误的模型。

| Scope       | Capability         | Path                              | Frontmatter Specification (必须严格遵守)                                                                                                                                                                                   |
| :---------- | :----------------- | :-------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Project** | **Rules**          | `.github/copilot-instructions.md` | *Standard Markdown*<br>**说明**: 作为 System Prompt 注入，无特殊 Frontmatter。                                                                                                                                             |
| **Project** | **Commands**       | `.github/prompts/*.prompt.md`     | ```yaml<br>---<br>model: gpt-4o<br>mode: chat<br>description: [简短描述]<br>---<br>```<br>**说明**: <br>1. `model: gpt-4o`: 强制使用高智商模型，确保复杂工作流 (Spec/Plan) 的执行质量。<br>2. `mode: chat`: 指定交互模式。 |
| **Global**  | **Rules/Commands** | *Manual Config*                   | *N/A (CLI 暂不自动处理)*                                                                                                                                                                                                   |

---

## 6. CLI 实现检查清单

CLI 的 `FileProcessor` 必须在写入文件前执行以下 **Frontmatter 注入/校验逻辑**：

1.  **Cursor Processor**:
    *   目标文件: `*.mdc`
    *   检查: 是否存在 `alwaysApply: true` 和 `globs: *`。
    *   动作: 如果缺失或值为 `false`，强制覆盖为 `true` 和 `*`。

2.  **Antigravity Processor**:
    *   目标文件: `.agent/rules/*.md`
    *   检查: 是否存在 `trigger: model_decision`。
    *   动作: 如果缺失，强制注入。

3.  **Copilot Processor**:
    *   目标文件: `.github/prompts/*.prompt.md`
    *   检查: 是否存在 `model` 和 `mode`。
    *   动作: 强制注入 `model: gpt-4o` 和 `mode: chat`。

4.  **Common**:
    *   确保所有生成的 Markdown 文件都是 UTF-8 编码。
    *   确保目录结构存在 (`mkdir -p`)。
