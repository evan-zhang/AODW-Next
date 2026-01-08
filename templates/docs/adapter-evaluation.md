# AODW 平台适配器能力评估报告

## 1. 评估目标
验证在 RT-010 实施“轻量级引用模式”后，各开发平台（Cursor, Claude, Gemini, General）是否仍能完整执行 AODW 流程（Intake -> Decision -> Spec -> Plan -> Execution -> Verification）。

## 2. Cursor (aodw.mdc)
- **机制**: `.cursor/rules` (Globs: `*`, AlwaysApply: `true`)
- **引用方式**: 显式列出 `@.aodw/xxx.md`。
- **执行逻辑**:
  - Cursor 的 Composer/Agent 模式在看到 `@file` 语法时，通常会尝试解析或提示用户引用。
  - 即使不自动展开，`aodw.mdc` 中的指令 "You MUST read..." 会促使具备文件读取工具（如 `grep`, `read_file`）的 Agent 主动获取内容。
- **覆盖度**: **高**。
  - Cursor 具备强大的工具调用能力，"引用模式"非常适合它。它不需要将所有规则塞入 System Prompt，而是按需读取。
- **潜在风险**: 如果用户使用的是不支持工具的旧版 Cursor 模型，或者禁用了文件读取，AI 可能无法获取核心规则。
- **结论**: **完全可行**，且更优（节省上下文）。

## 3. Claude (CLAUDE.md)
- **机制**: Claude Projects (Project Instructions + Project Knowledge)。
- **引用方式**: `CLAUDE.md` 作为 Instructions，核心规则文件作为 Project Knowledge。
- **执行逻辑**:
  - 用户必须将 `.aodw/` 目录下的核心文件添加到 "Project Knowledge" 中。
  - 只要文件在 Knowledge 中，Claude 就能通过 RAG 或长上下文完美检索到。
  - `CLAUDE.md` 中的 "Required Reading" 清单起到了索引的作用，引导 Claude 去 Knowledge 中查找。
- **覆盖度**: **高** (前提是配置正确)。
- **潜在风险**: 用户忘记将 `.aodw/` 文件添加到 Project Knowledge。
- **结论**: **可行**，依赖用户配置。

## 4. Gemini (GEMINI.md)
- **机制**: Long Context Window (1M+ tokens)。
- **引用方式**: `GEMINI.md` 指示 "You MUST load and follow..."。
- **执行逻辑**:
  - Gemini 通常用于一次性加载整个仓库或大量文件。
  - 只要 `.aodw/` 目录在上传/加载的文件列表中，Gemini 就能理解并执行。
  - 它的超长上下文使得"引用"和"内联"在理解上几乎没有区别，但"引用"能让 Prompt 更清晰。
- **覆盖度**: **极高**。
- **结论**: **完全可行**。

## 5. General Agents (AGENTS.md)
- **机制**: System Prompt / User Prompt。
- **引用方式**: 文本指令 "You must read..."。
- **执行逻辑**:
  - 这是一个通用回退方案。
  - 如果 Agent 有文件访问权限（如 AutoGPT, LangChain agent），它会去读取。
  - 如果 Agent 是网页版聊天框（无文件权限），用户需要手动粘贴核心规则内容。
- **覆盖度**: **中** (取决于 Agent 能力)。
- **结论**: **可行**，作为标准协议存在。

## 6. 总体结论
"轻量级引用模式"将 AODW 的执行压力从 **Prompt 长度** 转移到了 **AI 的上下文获取能力** (工具调用、RAG、长窗口) 上。
鉴于当前主流 AI 编码工具（Cursor, Claude Projects, Gemini 1.5）都具备极强的文件感知能力，这种转移是符合技术趋势的，能带来更低的 Token 消耗和更高的规则一致性。

## 7. 建议改进
为了降低 Claude 和 General 模式下的配置风险，建议在适配器中增加一行：
> "If you cannot read these files directly, ask the user to provide them."
> (如果无法直接读取这些文件，请要求用户提供。)
