# AODW — AI 编排开发工作流

## 规则文件索引

详细索引见 `manifest.yaml`。分层概览：

### 01-core（核心规范）
- `aodw-constitution.md` — 最高行为准则
- `git-discipline.md` — Git + Worktree + 确认门控
- `ai-interaction-rules.md` — AI 提问与交互协议
- `ai-knowledge-rules.md` — 文档系统与知识同步
- `csf-thinking-framework.md` — CSF 决策思考框架
- `module-doc-rules.md` — 模块文档编写规范
- `test-discipline.md` — 判据纪律（什么样的验收判据算数）

### 02-workflow（工作流）
- `rt-manager.md` — RT 完整生命周期管理
- `spec-full-profile.md` — Spec-Full 执行规范（复杂变更）
- `spec-lite-profile.md` — Spec-Lite 执行规范（简单变更）
- `ui-workflow-rules.md` — UI 专项开发流程

### 03-standards（编码规范）
- `ai-coding-rules.md` — 通用编码规范
- `ai-coding-rules-common.md` — 通用规范补充
- `stacks/` — 技术栈专项规范（按需加载）

### 04-auditors（审计器）
- `aodw-requirement-auditor-rules.md` — 需求审计
- `aodw-development-auditor-rules.md` — 开发审计
- `aodw-full-auditor-rules.md` — 完整审计规则集

### 05-tooling（工具配置）
- `ai-tools-init-rules.md` — 开发工具初始化

### 06-project（项目特化层 — 每个项目单独配置）
- `ai-overview.md` — 项目技术栈与架构概览 ⚠️
- `modules-index.yaml` — 项目模块索引 ⚠️

### templates（文档模板）
RT 生命周期各阶段文档的标准模板。

### tools（脚本）
- `rt-guard.sh` — RT 门禁检查；判据外置在 `manifests/rt-gates.yaml`
- `install-skills.sh` — 把下面的 skill 装到宿主项目的 skill 目录
- `fixtures/run-fixtures.sh` — 门禁判据的用例集（`rt-guard.sh --self-test` 即调它）
- `fixtures/run-skill-fixtures.sh` — skill 脚本与安装器的用例集

### skills（AODW 自带的 skill）
- `handover-pack/` — 把会话工作整理成规范交接包（用户主动要求时才触发）

⚠️ **skill 需要安装一次才会被发现。** 源码随 `.aodw-next/` 分发，但各家 AI 工具是从
宿主目录（`.agent/skills/` 或 `.claude/skills/`）发现 skill 的，两者需要接起来：

```bash
bash .aodw-next/tools/install-skills.sh --dry-run   # 先看计划
bash .aodw-next/tools/install-skills.sh             # 默认符号链接，改源即生效
```

装到哪、如何改用复制、如何卸载，见该脚本 `--help`。

---

## 新项目安装

1. 将 `.aodw-next/` 目录复制到新项目根目录
2. 重写项目特化文件：
   - `06-project/ai-overview.md` — 填写技术栈、架构、模块结构
   - `06-project/modules-index.yaml` — 填写模块列表
3. 在项目的 AI 配置文件中添加引用（如 CLAUDE.md）
4. 需要交接包能力时，运行 `bash .aodw-next/tools/install-skills.sh`
5. （可选）在 `project.yaml` 或 `manifest.yaml` 里记一笔采纳溯源，见下节

---

## 采纳溯源

`.aodw-next/` 是整目录拷进各项目的。拷完之后两边各自演进，过一段时间就没人说得清
「本项目这份规则是哪个版本、拷过来之后被改过什么」。

**当前提供的是纯元数据声明**：在 `project.yaml` 或 `manifest.yaml` 里取消注释
`adoption:` 块，填上来源项目、来源 commit、采纳日期、本项目自留层目录名、
启用了哪些 profile 与 skill。两处写一处即可，也可以都写。

```yaml
adoption:
  source_project: <上游项目标识>
  source_commit: <上游 commit SHA>
  adopted_at: YYYY-MM-DD
  project_specific_layer: 06-project
```

⚠️ **没有任何工具会读它、更不会因它改变行为**——不写则行为完全不变。它只解决
「可追溯」这一件事，别指望它能拦住什么。

### 将来的扩展：完整性锁（**尚未实现**）

一个自然的延伸是：对 `.aodw-next/` 逐文件算 checksum 生成 lock 文件，升级时比对，
把「本项目改过哪些规则文件」这件事变成机械可查的漂移报告。

**目前没有实现，也请不要凭空发明格式。** 一个没人校验的假 lock 文件比没有更糟——
它看起来像个保证，实际什么都不保证，还会让人误以为漂移已经被管住了。
等有真实的升级痛点和配套实现时再定契约。

---

## 版本信息

- AODW 版本：0.5.1
- Spec-Full Profile：v2.0（Skill 化）
- Spec-Lite Profile：v2.0（Skill 化）
- git-discipline：v2.0（Worktree + 确认门控）
