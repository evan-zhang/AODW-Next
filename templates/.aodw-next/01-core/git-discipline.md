# Git Discipline for AODW

本文件定义 AODW 工作流中必须遵守的 Git 操作规范。
这些规则旨在确保代码历史清晰、可回溯，并便于自动化工具检查。

> **核心原则**：AI 可以执行所有 Git 操作，但涉及不可逆操作前必须向用户明确确认，获得同意后立即执行。

---

## 0. AI 操作边界

### 核心原则：确认门控执行（Confirm-Gated Execution）

AI 可以执行所有 Git 操作，包括提交、合并、推送、打标签、创建和清理 worktree 等。

**凡涉及不可逆操作，AI 必须在执行前向用户做明确确认，获得用户同意后立即执行。**

> 背景：用户主要通过语音与 AI 交互，AI 是唯一的操作执行手。"提供脚本让用户手动执行"的模式不再适用。

---

### 需要确认门控的操作

| 操作 | 确认内容要点 |
|------|------------|
| `git commit` | 提交哪些文件、commit message 是什么、关联哪个 RT |
| `git merge --no-ff` | 从哪个分支合并到哪里、是否存在冲突风险 |
| `git push` | 推送到哪个远程、推送内容（分支 + tag） |
| `git tag` | 打什么 tag、打在哪个 commit 上 |
| `git worktree add -b` | 创建哪个 worktree、新建哪个分支、对应哪个 RT（分支与 worktree 一起创建，见 §2.1） |
| `git worktree remove` | 删除哪个 worktree、确认该 RT 已完成合并 |
| `git branch -d` | 删除哪个本地分支 |

### 确认格式规范

确认话术必须满足：
- **简短**：不超过 3 句话
- **明确**：说清楚做什么、影响是什么、是否可撤销
- **二选一**：以"要我现在执行吗？"结尾，用户回答"可以"即执行

**示例：**

```
合并前：
"RT-XXX 的代码已全部提交，我准备将 feature/RT-XXX-short-name 合并到 main，
使用 --no-ff 保留分支历史，随后打 done-RT-XXX 标签并推送。合并后无法撤销。要我现在执行吗？"

Worktree 清理：
"RT-XXX 已合并完成，我准备删除本地 worktree 目录 .claude/worktrees/RT-XXX-short-name/ 和
feature/RT-XXX-short-name 分支。要我现在执行吗？"

代码提交：
"我准备提交以下文件到 feature/RT-XXX：[文件列表]，
commit message 为 'feat(stt): xxx — Refs: RT-XXX'。要我现在执行吗？"
```

### 无需确认、AI 可直接执行的操作

- 读取文件、查看 git log / status / diff
- 创建 RT 目录和文档（在主仓库、`main` 上进行，Intake/Decision 阶段，见 §2.1）
- 切换到已存在的分支（`git checkout`）

> 注意：不要在主仓库里单独执行 `git checkout -b` 建 feature 分支——主仓库应始终停留在 `main`。分支创建统一并入 §2.1 的 `git worktree add -b`，一步完成，避免分支被临时挂在主仓库上，导致同一分支无法再 worktree 到别处（Git 报错 "already checked out"），也避免忘记切回 main 而误挡到其他并行 RT。

---

## 1. 分支命名 (Branch Naming)

所有开发工作必须在分支上进行，禁止直接在主分支（master/main）提交业务代码。
**但分支不必绑定 RT**——见下方双车道。

### 1.1 双车道（2026-08-14 重订）

> **背景**：旧规则要求分支名必须是 `feature/RT-{seq}-{short-name}`，`feature/login-fix`
> 被明确标为 ❌。这条规则与「禁止直接改 main」叠加，形成一条闭死的链：
> **改代码 → 必须开分支 → 分支必须带 RT-ID → 必须建 RT**。
> 于是每一个改动，哪怕只有 74 行、没有任何决策点，也被结构性地逼出一个 RT。
> 截至 2026-08-14 累计 115 个 RT、8 月 13 天新建 50 个——**这不是纪律松懈，是规则
> 设计的必然产物**。
>
> 业内主流（GitHub Flow / 主干开发）的共识是**分支 ≠ 工单**：任何改动都开分支、
> 都走合并单元，但分支名不要求带工单号；工单是**决策与讨论的载体**，按需开，
> 不是分支的前置条件。本节据此重订。

| 车道 | 分支命名 | 何时用 | 留痕方式 |
|---|---|---|---|
| **RT 车道** | `feature/RT-{seq}-{short-name}` | `rt-manager.md` §3.4c 五问**任一为是** | RT 十件套 / rt-lite |
| **轻量车道** | `{type}/{short-name}` | 五问**全部为否** | Conventional Commit + 测试 |

轻量车道的 `{type}` 取值（与 §3 的 commit type 对齐）：
`fix` / `refactor` / `chore` / `docs` / `perf` / `test` / `style`。

示例：
- ✅ `feature/RT-118-remove-cloud-upload`（跨五层删除、推翻既有不变量 → RT 车道）
- ✅ `fix/thinking-token-nested-field`（10 行取值修复、无决策点 → 轻量车道）
- ✅ `chore/gitignore-cases-symlink`
- ❌ `login-fix`（缺少 type 前缀）
- ❌ 直接在 main 上改业务代码

### 1.2 轻量车道的护栏

轻量车道是**快进快出**，不是绕过审查的后门。必须同时满足：

1. `rt-manager.md` §3.4c 五问**全为否**——任一为是，立刻转 RT 车道；
2. **当天合并**（分支短命是主干开发的核心，长命分支必然漂移）；
3. **带测试**——没有测试兜住的改动不进轻量车道；
4. commit message 说清 **why**，不只是 what。小改动的 commit message 就是它的
   全部设计文档，写不清楚说明这件事没有想清楚，或者它其实该进 RT 车道。

**中途发现走错车道怎么办**：轻量车道做到一半发现触及不变量或需要决策，
**停下来补建 RT**，把分支改名或重开——不要"就这一次"硬做完。

### 1.4 直接提交 main 的窄范围例外

> 注意与 §1.1 轻量车道的区别：本节是**完全不开分支**，仅限不含业务逻辑的记账类
> 提交；改代码哪怕只有一行，也要走分支（轻量车道即可）。

> 背景：本项目历史上一直存在一类"不改业务逻辑、只改状态/记账信息"的提交直接落在 main 上（如 RT 状态回填、看板快照重新生成），这是既成事实的实践，而不是规则允许的行为——规则一直写着"禁止直接在主分支提交"，导致"什么时候必须开分支"全凭经验判断。现在把这个例外的边界明确写下来，收窄到不会引入业务逻辑变更的操作。

只有以下几类变更允许不经 feature 分支、直接提交到 main（其余一律必须走 §1.1 的 feature 分支流程）：

- `RT/<id>/meta.yaml` 的 `status`/`closed_at` 等状态字段回填（不改 `plan.md`/`spec.md`/代码）；
- `git tag done-<RT-ID>` 相关的收尾提交；
- §9 定义的看板快照类生成产物重新生成提交；
- 本文件（`git-discipline.md`）及其它纯文档/规则文件的勘误。

即便属于上述例外，提交前仍需按 §0 做确认门控（说明改了什么、commit message 是什么），不得静默直提。

---

## 2. Worktree 管理 (Worktree Management)

### 2.0 核心约定

**一个 RT = 一个 Worktree = 一个 Feature 分支**，三者 RT 序号严格对齐。

**但 worktree 不在立项时创建，而在真正要改代码时创建**（2026-08-13 修订）。判据
只有一条：

> **要动 `RT/` 以外的文件，才建 worktree。**

只写 meta / intake / decision / spec / plan 的阶段，**直接在 main 上写并随写随提交**。
RT 文档进 main 是安全的——它不是业务代码，不改变任何运行行为，`main` 本来就是
RT 台账的所在地。

修订依据（2026-08-13 实测）：当天经手的 6 个 worktree 里，RT-115 全部 724 行改动
都是 RT 文档，却占用了一个 98M 的 worktree，还在其中留下一处与 main 分叉的未提交
改动，收敛时差点误删。而 RT-110 当时没建 worktree、直接在 main 上写文档，反而是对的。

⚠️ **在 main 上写 RT 文档必须随写随提交。** 同一天 RT-110 的目录在 main 工作区里
放了一整天未提交（`git status` 显示 `?? RT/RT-110/`），掉盘即失。

| 角色 | 路径 | 分支 |
|------|------|------|
| 主仓库 | 项目根目录 | `main`（只读参考，禁止在此改业务代码；§1.3 列出的窄范围例外除外）|
| RT 工作区 | `.claude/worktrees/RT-{seq}-{short-name}/`（已加入 `.git/info/exclude`，本地专用不入库） | `feature/RT-{seq}-{short-name}` |

> 历史遗留：早期部分 RT（如 RT-075、RT-078）使用过仓库同级目录 `../{repo}-rt{seq}/` 的 worktree 布局。新 RT 一律使用 `.claude/worktrees/` 布局；发现同级目录布局的旧 worktree，按 2.5 节巡检处理，不要新建。

### 2.1 创建 Worktree（实现阶段，非立项阶段）

**时机**：spec/plan 已在 main 上写定，即将开始改 `RT/` 以外的文件时。不是
decision 阶段，更不是立项当天——那时还不知道这个 RT 会不会马上做，甚至不知道
它最终要不要动代码。

确认要动代码后，AI 向用户确认，用户同意后**一步创建分支与 worktree**（不要分两步做，见 §0 的说明）：

```bash
git worktree add -b feature/RT-XXX-short-name .claude/worktrees/RT-XXX-short-name main
git worktree list  # 验证
```

主仓库全程不需要 `checkout` 到这个分支——`git worktree add -b` 直接从 `main` 切出新分支到新 worktree，主仓库保持在 `main` 不动。创建完成后，后续所有 spec/plan/代码的读写都应在 `.claude/worktrees/RT-XXX-short-name/` 目录内进行。

**并行 RT 冲突检查（必须执行）**：创建新 worktree 前，AI 执行以下检查（`RT/index.yaml` 自 RT-125 起存在并由门禁维护——G109 要求关闭 RT 前有本 RT 条目；冲突检查可引用它，但 worktree 冲突判定仍以 `git worktree list` 实测为准）：

```bash
git worktree list                                    # 当前有哪些 worktree 活着
grep -l "^status: \(intaking\|decided\|in-progress\|reviewing\)$" RT/*/meta.yaml  # 当前有哪些 RT 处于活跃状态
```

对每个活跃 RT，判断它与新 RT 是否会动同一批文件。若某个活跃状态的 RT 在
`git worktree list` 里找不到对应 worktree（例如状态没有回写、worktree 已被误删），
必须先向用户说明这个不一致，不能假装它不存在。

> **不要依赖 `meta.yaml` 的 `modules:` 字段做这个判断。** 2026-08-13 实测：110 个
> RT 里只有 23 个填了该字段，本条检查因此长期形同虚设——它建立在一个大多数 RT
> 都不填的字段上。改用下面这条直接比对实际改动文件：

```bash
# 每个活跃 worktree 实际动了哪些非 RT 文档的文件
for w in $(git worktree list --porcelain | grep '^worktree' | cut -d' ' -f2); do
  b=$(git -C "$w" branch --show-current)
  echo "--- $b"
  git diff main..."$b" --name-only 2>/dev/null | grep -v '^RT/'
done
```

把新 RT 计划要改的文件与上面的输出比对。**有重叠就必须先告知用户重叠范围**，
由用户决定是并行做、还是等前一个合并后再开工。

实证（2026-08-13）：RT-115 与 RT-111 都改了 `materialize-agentic-packs.py` 的同一段
`change_instruction`，两边各写了一遍。RT-111 先合并后，RT-115 那份就成了纯冗余——
这类重复劳动正是本检查要拦的。

### 2.2 工具隔离原则

每个 AI 工具实例（Cursor / Codex 等）只能读写自己绑定的 worktree 目录，禁止跨目录操作。多个实例可并行工作于各自的 worktree，互不干扰。

### 2.3 Merge 顺序

多个 RT 同时完成时，合并顺序、冲突解决全部由用户决定，AI 不推断合并优先级。

### 2.4 状态检查命令

```bash
git worktree list              # 查看所有 worktree
git worktree prune --dry-run   # 检查可清理的 worktree
```

### 2.5 孤儿分支/worktree 巡检（必须定期执行）

> 背景：本项目曾出现 feature 分支开出后长期无人跟进、main 持续推进的情况（例如某分支只领先 main 1-3 个提交，却已落后 main 超过 150 个提交）。分支活得越久、漂移越大，回头合并的冲突成本越高，且没人会主动想起去检查一个"看起来还在"的 worktree 是否早已废弃。

创建新 worktree 前，或者用户提到"清理一下分支"之类的意图时，AI 执行：

```bash
git for-each-ref --format='%(refname:short) %(committerdate:iso8601)' refs/heads/feature/  # 各 feature 分支最后提交时间
git rev-list --count <branch>..main   # main 领先该分支多少个提交
git rev-list --count main..<branch>   # 该分支领先 main 多少个提交
```

命中以下任一条件即视为可疑分支，必须向用户报告（不得自行删除或 rebase）：
- 分支最后一次提交距今超过 7 天；
- `main` 领先该分支超过 50 个提交。

报告内容包括：分支名、对应 RT、最后提交时间、落后 main 的提交数、`RT/<id>/meta.yaml` 里记录的 `status`。由用户决定是继续推进（先 rebase/merge main）、还是关闭并清理 worktree。

---

## 3. 提交信息 (Commit Message)

提交信息必须遵循 Conventional Commits 规范，并包含 RT 引用。

### 3.1 格式模板
```text
<type>(<scope>): <subject>

[optional body]

Refs: <RT-ID>
```

### 3.2 字段说明
- **type**:
  - `feat`: 新功能
  - `fix`: 修复 bug
  - `docs`: 文档变更
  - `style`: 代码格式（不影响逻辑）
  - `refactor`: 重构（既不是新增功能也不是修改 bug）
  - `perf`: 性能优化
  - `test`: 增加测试
  - `chore`: 构建过程或辅助工具的变动
- **scope**: (可选) 影响范围，如 `auth`, `api`, `ui`。
- **subject**: 简短描述，使用祈使句，不加句号。
- **Refs**: (必须) 关联的 RT ID，用于链接 Git 历史与需求文档。

### 3.3 示例
```text
fix(auth): handle token expiration gracefully

Update the interceptor to refresh token on 401 error.

Refs: RT-001
```

---

## 4. 标签 (Tagging)

当一个 RT 完成并合并到主分支后，必须打标签以标记里程碑。

### 4.1 命名格式
```text
done-<RT-ID>
```

### 4.2 示例
- ✅ `done-RT-001`
- ✅ `done-RT-042`

---

## 5. 合并策略 (Merge Strategy)

- **禁止 Fast-forward**: 合并 Feature 分支时应使用 `--no-ff`，以保留分支历史。
- **Squash**: 对于琐碎的提交（如 "fix typo", "update"），建议在合并前进行 Squash，但保留关键的逻辑提交。

---

## 6. 合并前检查清单 (Pre-Merge Checklist)

在合并 feature 分支到主分支前，必须完成以下检查：

### 6.1 功能检查
- [ ] 功能测试通过
- [ ] 单元测试通过
- [ ] 集成测试通过（如适用）

### 6.2 编码规范检查（必须）

> **注意**：编码规范检查是合并的硬性要求，未通过编码规范检查的代码不能合并。

- [ ] **前端编码规范**（如涉及）：
  - [ ] ESLint 检查全部通过
  - [ ] Prettier 格式化已运行
  - [ ] 目录结构和分层符合规范（参考 `.aodw-next/03-standards/stacks/react-typescript/ai-coding-rules-frontend.md`）
  - [ ] 文件大小和复杂度符合规范（页面 ≤ 300 行，组件 ≤ 200 行，函数 ≤ 60 行，复杂度 ≤ 10）
- [ ] **后端编码规范**（如涉及）：
  - [ ] Ruff 检查全部通过
  - [ ] Black 格式化已运行
  - [ ] 分层架构符合规范（api → services → repositories，参考 `.aodw-next/03-standards/stacks/python-fastapi/ai-coding-rules-backend.md`）
  - [ ] 文件大小和复杂度符合规范（模块 ≤ 300 行，函数 ≤ 60 行）
- [ ] **通用编码规范**：
  - [ ] 文件大小符合规范（参考 `.aodw-next/03-standards/ai-coding-rules-common.md`）
  - [ ] 函数/方法长度符合规范
  - [ ] 复杂度符合规范

### 6.3 文档检查
- [ ] 相关文档已更新（spec / plan / changelog）
- [ ] 模块 README 已更新（如涉及）

### 6.4 CI 检查
- [ ] CI 检查全部通过
- [ ] 代码覆盖率符合要求（如适用）

---

## 7. 自动化检查 (Automation)

AI 或 CI 工具应检查：

### Step 0: Knowledge Distillation (知识蒸馏) - **必须优先执行**
在合并代码前，必须检查：
1.  **模块文档更新**：本次改动是否修改了系统行为？如果是，对应的 `docs/modules/*.md` 是否已更新？
2.  **索引一致性**：`modules-index.yaml` 是否准确反映了当前的模块结构？

### Step 1: Git 规范检查
1.  当前分支名是否符合 `feature/RT-*` 格式。
2.  提交信息是否包含 `Refs: RT-*`。
3.  RT 完成时是否已创建对应的 `done-*` 标签。

### Step 2: 编码规范检查
1.  前端代码（如涉及）：ESLint 和 Prettier 检查是否通过
2.  后端代码（如涉及）：Ruff 和 Black 检查是否通过
3.  文件大小和复杂度是否符合规范

---

## 8. RT 完成流程 (Completion Workflow)

当 RT 的所有工作完成后，AI 按以下步骤逐一向用户确认并执行。

### Step 1：知识蒸馏（自动执行，无需确认）
1. 读取 `modules-index.yaml`，找到受影响的模块
2. 更新对应的模块文档（`docs/modules/*.md`）
3. 向用户报告更新结果

### Step 2：确认合并

AI 向用户确认：
> "RT-XXX 的知识蒸馏已完成。我准备将 feature/RT-XXX-short-name 合并到 main，使用 --no-ff 保留分支历史，随后打 done-RT-XXX 标签并推送到远程。合并后无法撤销。要我现在执行吗？"

用户确认后，AI 依次执行：
```bash
git checkout main
git pull origin main
git merge --no-ff feature/RT-XXX-short-name
git tag done-RT-XXX
git push origin main
git push origin done-RT-XXX
```

### Step 3：确认清理

AI 向用户确认：
> "RT-XXX 已成功合并并推送。我准备删除本地 worktree 目录 .claude/worktrees/RT-XXX-short-name/ 和 feature/RT-XXX-short-name 分支，并更新 RT/RT-XXX/meta.yaml 状态为 done。要我现在执行吗？"

用户确认后，AI 依次执行：
```bash
git worktree remove .claude/worktrees/RT-XXX-short-name
git branch -d feature/RT-XXX-short-name
# 更新 RT/RT-XXX/meta.yaml：status → done, closed_at → 当前时间
```

### Step 4：播报完成

> "RT-XXX 全部完成。main 已更新，标签 done-RT-XXX 已推送，worktree 已清理。"

---

## 9. 生成产物入库策略 (Generated Artifacts)

> 背景：`RT-076/site/app/data/case-snapshot.json` 这类看板快照文件被纳入了版本控制，但内容是脚本（如 `sync_case_snapshot.py`）跑出来的运行时快照，不是手写的业务代码。多个并行 feature 分支各自重新生成它，会在合并时反复产生和业务逻辑无关的巨型 diff 冲突；历史上已经出现过至少 7 次提交只是"重新生成看板快照（同步时间戳）"，纯属噪音提交。

对这类"入库但内容由脚本生成"的文件，适用以下规则：

- **功能分支内不重新生成**：在 feature 分支上开发时，除非本次改动确实改变了快照的生成逻辑或字段，否则不要顺手跑生成脚本并把结果一起提交。快照内容的变化不是本次业务改动的一部分，会污染 PR diff、增加冲突面。
- **合并后单独重新生成**：需要刷新快照数据时，在 main 上单独执行生成脚本并提交，commit message 用 `chore(dashboard): 重新生成看板快照`，按 §1.3 例外直接提交 main。
- **合并前如遇快照冲突**：优先级是"以 main 上最新快照为准，废弃 feature 分支里的快照变更"，冲突解决后在 main 上重新跑一次生成脚本，而不是手工合并 JSON diff。
- **新增此类生成文件前**：优先考虑能否像 `cases/` 一样整体 gitignore、改为部署/构建时生成；确实需要静态入库（例如前端构建时直接 import 的数据文件，没有运行时生成条件）才保留入库。
