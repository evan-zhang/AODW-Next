---
id: aodw-task-pack-projection
version: 1.0.0
category: aodw/execution-profile
trigger: "sub-agent-driven 模式下，冻结 handoff/unit-<id>-input.md 之前加载"
description: >
  任务包投影规则：RT 目录里的文档如何投影成一份冻结任务包。
  定义四类操作、投影矩阵、禁投清单、四条元规则与两条机械判据。
  与 sub-agent-driven-profile.md 配套使用。
priority: high
---

# 任务包投影规则

> 版本 1.0 ｜ 依据 RT-125 九单元实践的事后审计定稿。
> 本文件每条约束都标注「谁来拦」——沿用 `sub-agent-driven-profile.md:15` 的准入元规则：
> 没有机械落点的条款不得增补进来。
>
> ⚠️ **样本量 n=1**。全库仅 RT-125 有 `handoff/` 实践（RT-123/124 虽为 sub-agent-driven
> 但无 rt-plan/handoff）。本文件的结构性结论应在积累到 3 个 RT 后重审，见 §9。

## 0. 定位

`sub-agent-driven-profile.md:89-92` 规定单元循环第 1 步是主 Agent 冻结任务包
`handoff/unit-<id>-input.md`。本文件回答该步未回答的问题：
**这些内容从哪来、哪些不能进来、谁来拦。**
（该处原表述为「目标/约束/出口判据/回执要求」四项，随本文件同批提交扩展为六节并回指本文件。）

适用：`meta.yaml` 的 `execution_mode: sub-agent-driven`，且执行 Agent 为异构 runner
（codex / zcode 等）时尤其重要——同构 runner 共享同一套规则文本，格式天然一致；
异构 runner 只认任务包文件本身（`sub-agent-driven-profile.md:38`）。

## 1. 核心判定：任务包是出口判据的**正本**

这是本文件最反直觉、也最容易做反的一条。

`rt-plan.md` 单元节里的出口判据是**草稿输入**；主 Agent 冻结任务包时对它做合并、
收紧、补充，**冻结后的任务包 §3 才是验收基线**。

实证（RT-125，全部可复核）：

| 单元 | rt-plan 判据 | 任务包 §3 | rt-plan 进度栏勾账 |
|---|---|---|---|
| U1 | 6 条（`RT/RT-125/rt-plan.md:98`） | 7 条 | `RT/RT-125/rt-plan.md:296` 记「7/7」 |
| U4 | 4 条（`RT/RT-125/rt-plan.md:181`） | 8 条 | `RT/RT-125/rt-plan.md:322` 记「8/8」 |
| U5 | 3 条（`RT/RT-125/rt-plan.md:198`） | 7 条 | `RT/RT-125/rt-plan.md:318` 记「7/7」 |
| U6 | 4+3 条（`RT/RT-125/rt-plan.md:245`、`:241`） | 6 条 | `RT/RT-125/rt-plan.md:327` 记「6/6」 |

**勾账用的是任务包的条数，不是 rt-plan 的条数。**

因此「脚本从 rt-plan 机械生成 §3」是错的方向——它会抹掉主 Agent 冻结时的判断。
但反向的风险真实存在且已发生：`RT/RT-125/rt-plan.md:241` 的 hooks 层判据③
（「`git -C <dir> commit` 变体被脚本侧识别并阻断」）在
`RT/RT-125/handoff/unit-U6-input.md:57-65` 的六条中**整条消失**，最终由执行 Agent
自己发现并回补（`RT/RT-125/handoff/unit-U6-receipt.md:59`）。

**谁来拦**：判据 C2（§8，rt-guard `G113`）——校验任务包 §3 自带的判据溯源声明
（存在、加减账自洽、删除带非空理由），不反查 rt-plan 活文档；rt-plan 侧条数的
真实性由规划/计划审查人工把关。

## 2. 四类操作

| 操作 | 含义 | 谁执行 | 防的是 |
|---|---|---|---|
| **裁剪投影** | 从 RT 文档取子集，**逐字**搬运 | 主 Agent（可脚本辅助） | 转述漂移 |
| **收窄** | RT 级约束 → 单元级约束 | 主 Agent | 权限过宽 |
| **补充** | RT 文档中没有、执行前必须知道的 | 主 Agent | 踩已知的坑 |
| **禁投** | 绝对不进任务包 | 主 Agent + §4 清单 | 锚定偏差、越界 |

**投影是主体，补充是零头。** 实测 RT-125 的 U6：来源节
`RT/RT-125/rt-plan.md:231-248` 为 4411 字符，任务包
`RT/RT-125/handoff/unit-U6-input.md` 为 4554 字符，增量 **+3.2%**。
（行数比 79:18 是排版差异——rt-plan 单元节是表格，单行可超 400 字，
如 `RT/RT-125/rt-plan.md:236`。**不要用行数当信息量的代理指标。**）

规则的强制力因此主要投在「投影不失真」，而不是「补充要写全」。

## 3. 投影矩阵

任务包来源随 `meta.yaml.profile` 分两套。**sub-agent-driven 的唯一实测组合是
Spec-Lite**（`RT/RT-125/meta.yaml`），该组合下 `invariants.md` / `spec.md` /
`impact.md` / `tests.md` **均不存在**——`sub-agent-driven-profile.md:139-148` 的文件
清单只有 `meta.yaml` / `rt-lite.md` / `rt-plan.md` / `audit/` / `handoff/` /
`replay/` / `retrospective.md`；这四个文件仅属 Spec-Full（`rt-manager.md:29`、`:286`）。

| 任务包节 | Spec-Lite 来源 | Spec-Full 来源 | 操作 |
|---|---|---|---|
| 头部冻结行 | `rt-plan.md` 版本号 + 其 commit hash | 同左 | 裁剪 |
| §0 执行环境 | `meta.yaml` 的 `branch`/`worktree` + runner 能力声明 | 同左 | 裁剪+补充 |
| §0.5 入口判据 | `rt-plan.md` 单元节入口判据字段 | 同左 | **原样；无则显式写「无」** |
| §1 已定决策 | `rt-plan.md` 本单元节 + `rt-lite.md` 本单元依赖的决策 | `plan.md` + `spec.md` 对应节 | 裁剪 |
| §2 任务 | `rt-plan.md` 本单元节 | `plan.md` 本单元节 | 展开+补充 |
| §3 出口判据 | `rt-plan.md` 单元判据（**草稿**，见 §1） | + `tests.md` 相关项 | 合并+收紧+补充 |
| §4 硬约束 | `rt-plan.md` 单元 `改动面` 字段 + RT 级白名单 | + `impact.md` 改动面、`invariants.md` 相交项 | **收窄** |
| §5 回执要求 | `sub-agent-driven-profile.md:122-131` 四节 | 同左 | 模板+单元定制追问 |

**§0.5 入口判据不得省略。** 它是依赖次序在任务包层面的唯一机械落点
（`RT/RT-125/rt-plan.md:180` 的 U4 入口判据①含「其 commit **早于**本单元的回填 commit」，
`RT/RT-125/rt-plan.md:51` 呼应其为「次序强制的机械落点」）。该判据在投影到
`RT/RT-125/handoff/unit-U4-input.md:16` 时被弱化为「非空且已提交」，次序约束丢失。

**§4 的「收窄」用已有字段，不新造。** `rt-plan.md` 单元节已有 `改动面` 字段
（`RT/RT-125/rt-plan.md:85`、`:97`、`:159`、`:179`、`:190`、`:237`，9 个单元中 6 个有）。
本规则要求它**强制存在**且为结构化路径 glob 列表（可附自然语言注释）。
RT 级白名单见 `RT/RT-125/rt-plan.md:253`。

**谁来拦**：白名单越界无机械判据，由验收时 `git diff --stat` 覆盖——主 Agent 将
回执①的该输出与任务包 §4 白名单逐路径比对；`改动面` 字段缺失由冻结前人工把关。

## 4. 禁投清单

| 禁投对象 | 理由 |
|---|---|
| `audit/*.md` | **最危险**。执行 Agent 看到审计 findings 会转去迎合审计意见，而非解决问题本身。审计是对主 Agent 规划的质疑，不是对执行的指令。 |
| `intake.md` | 含大量「曾考虑但否决」的方案，执行 Agent 无法分辨死活。 |
| `decision.md` | profile 与执行模式决策，对单元执行零信息量。 |
| **并行中 / 未开工**单元的 `unit-*-input.md`、`unit-*-receipt.md` | 越界诱因：看到隔壁在改什么就会「顺手也改」，直接违反 `sub-agent-driven-profile.md:52` 的白名单禁令。 |
| `spec.md` / `rt-lite.md` **全文** | 只投影本单元承接的验收标准。给全文诱发 scope 扩张——执行 Agent 看到整体目标未达成会主动超出本单元范围。 |
| `task.md` / `changelog.md` | 非交付契约、无版本冻结点，且是主 Agent 的账本。 |

### 4.1 反向规定：直接上游已完成单元的回执**属必投**

`RT/RT-125/handoff/unit-U2a-input.md:18` 明令执行 Agent 读
`RT/RT-125/handoff/unit-U1-receipt.md`（「含架子的设计决定与已知局限」）；
`RT/RT-125/retrospective.md:102` 记载 U1 回执 ③-7 的六条实测手感「全部进入 U2b
任务包与实现」。**上游回执是下游单元的一等信息源。**

投必须**钉 commit hash**，不得只写文件名——回执文件在上游单元收尾后仍可能被修订。

### 4.2 「活文档」不是禁投理由

RT-125 的 7 份任务包**全部**在头部引用 `rt-plan.md`（该文件 `RT/RT-125/rt-plan.md:19`
自称活文档），且 `RT/RT-125/handoff/unit-U1-input.md:18`、
`RT/RT-125/handoff/unit-U2a-input.md:15`、`RT/RT-125/handoff/unit-U6-input.md:13`
都命令执行 Agent 去读它。禁 `task.md`/`changelog.md` 的真实理由
是「非交付契约」，不是「是活文档」。引用活文档时用 §7 元规则 3 的版本钉法。

## 5. 主 Agent 补充类型（清单，非强制项）

以下类型脚本做不到，须主 Agent 判断。**这是清单不是检查表**——不适用时不必凑数。
出现率基于 RT-125 的 7 份任务包实测：

| 类型 | 出现率 | 样例 |
|---|---|---|
| 环境差异预警 | 7/7 | `RT/RT-125/handoff/unit-U6-input.md:25-26`（主仓库该文件有 3 行未提交改动，worktree 内改的是 HEAD 版，两个基线不同） |
| **跨文档分歧裁决** | — | `RT/RT-125/handoff/unit-U1-input.md:31-33`（脚本放 `tools/` 不是 `bin/`，「本任务包裁决之」）。**脚本永远做不到，最需主 Agent 的一类。** |
| 显式「不改」清单 | — | `RT/RT-125/handoff/unit-U5-input.md:32-33`、`:55-56`（「一个字都不多改——尤其不要顺手『优化』邻近文字」）。白名单的对偶，scope 扩张的直接抑制器。 |
| 失败路径预置 | 5/7 | `RT/RT-125/handoff/unit-U6-input.md:53-55`（headless 不可用时的降级验证 + 须在回执③说明） |
| 反模式警告 | 5/7 | `RT/RT-125/handoff/unit-U6-input.md:30`（参考文档里那段配置骨架已被证伪，不得照抄） |
| 回执定制追问 | 5/7 | `RT/RT-125/handoff/unit-U6-input.md:78-79` |

## 6. 异构执行器

**任务包正文保持 runner-agnostic**（`sub-agent-driven-profile.md:30`）。
codex / zcode 的差异只在 §0 以「能力假设」形式出现：

```markdown
## 0. 执行环境
- 执行器：codex ｜ 能力假设：需联网检索、需 workspace-write 沙箱
- 禁用能力：派生 subagent、向操作员提问、进入 Plan 模式、与同侪通信
- worktree：<path>　开工第一步：git -C <worktree> merge main --no-edit
```

「禁用能力」取自 `resources/manifests/zcode-runtime.json:9-17` 的 `disallowedTools`
（7 项：`Agent`/`AskUserQuestion`/`EnterPlanMode`/`ExitPlanMode`/`SendMessage`/
`TaskOutput`/`TaskStop`），其理由与本模式一致：一个单元由且仅由一个执行 Agent 完成。
其中 **`SendMessage` 被禁正面支持了** `sub-agent-driven-profile.md:38`——派发只依赖
冻结任务包文件，不依赖执行器专属的消息/编排 API。

**禁提问是自足性的检验**：执行 Agent 问不了，任务包写不全就只能瞎猜，问题必然在
回执③暴露。

派发匹配：需按单元切换模型的批次不派给 zcode——`resources/manifests/zcode-runtime.json:20`
说明它无 per-invocation 的 `--model`，模型来自 `~/.zcode/cli/config.json`
（可改配置钉死，但同一批次内不能按单元切）。

**白名单在异构 runner 上无沙箱强制**（`resources/manifests/zcode-runtime.json:8`
是 `permissionMode: yolo`）。故 §4 必须附一条 runner-agnostic 的落点：执行 Agent 结束前
跑 `git status --porcelain` 与 `git diff --stat`，全量输出贴进回执①，主 Agent 复核时
与白名单机械比对（`RT/RT-125/handoff/unit-U6-receipt.md:22` 已自发这么做）。

## 7. 四条元规则

1. **单向可追溯**：任务包每条约束要么带 RT 文档的 `file:line`，要么显式标注
   「主 Agent 补充」。二者必居其一。
2. **裁剪不豁免**：§4 必须含兜底句——「未列出的不变量同样不得破坏；遇到疑似冲突
   **停下**并写进回执③」。裁剪必有遗漏，兜底句把遗漏转成可见信号而非静默违规。
3. **版本钉死**：头部固定钉 `rt-plan.md` 的 commit hash（冻结前即可取得，
   如 `RT/RT-125/handoff/unit-U0-input.md:4` 的 `275a71e`）。任务包**自身**的 hash
   由主 Agent 在派发指令里带给执行 Agent，回执引用它。
   同时须写明**任务包提交所在分支**与执行 Agent 的取包动作——RT-125 实测
   （`RT/RT-125/rt-plan.md:282-285`）worktree 停在旧 commit 时，`handoff/` 目录
   在执行 Agent 眼里根本不存在。异构 runner 不会自己 merge。
4. **冻结前一致性校验**：拿 §3 每条判据命令对 §2 正文实跑一遍，命中即改写文案。
   改写分两类（`RT/RT-135/audit/adjudication-001.md` 裁定三）：**纯复述型**——
   §1/§2 指称待清除内容时用 `文件:行` 代替逐字引文即可两全；**替换文案本身含
   待清除串型**——那是判据错而非文案错，须收紧 grep 模式，改写措辞治不了。
   实证事故：`RT/RT-125/handoff/unit-U5-input.md:46` 给的目标文案含其判据 4
   （`:68`）要 grep 的目标子串「plan 批准前必须执行」，照抄则该判据恒不通过；
   靠执行 Agent 识破并改词序才没炸（`RT/RT-125/handoff/unit-U5-receipt.md:89-93`）。
   `RT/RT-125/retrospective.md:261-263` 已明点「本应是冻结前动作」。

**跨文档引用一律带文件名**，禁止裸 `§N`。依据：`RT/RT-125/retrospective.md:185-187`
——跨文档裸节号词面不可判定，占 U2b 自举检查 32 处误报中的 26 处。

## 8. 两条机械判据

两条都是纯文本比对，**不依赖解析 rt-plan 的表格结构**，已挂进
`.aodw-next/tools/rt-guard.sh` 与 `.aodw-next/manifests/rt-gates.yaml`
（判据 `G112`/`G113`）。

| 判据 | 内容 | 级别 | 触发时机 |
|---|---|---|---|
| **C1** | 冻结件自相矛盾检测：**只处理零命中类**（§3 形如「`<grep cmd>` → 期望 0」且模式可提取）；非 grep 类、期望非零的一律 skip 计数，不入实跑 | error | 冻结任务包前 |
| **C2** | 判据不减检测：校验任务包 §3 自带的溯源声明（存在、加减账自洽、删除带非空理由）；**不反查 rt-plan** | warn | 冻结任务包前 |

**为什么判据针对主 Agent 而非执行 Agent**：`RT/RT-125/retrospective.md:189-193`
的实证结论——「本 RT 全部违规无一例外发生在主 Agent 亲手环节：勾账、自检、任务包文案、
审计落盘、状态机推进。执行 Agent 在冻结任务包约束下的合规率显著高于主 Agent 在自由裁量
下的合规率。**下一步机械化的对象应当是主 Agent 的义务**，而不是继续加码执行 Agent。」

## 9. 已知局限

1. **n=1**。全部结构性结论来自 RT-125 单个 RT。7 份任务包中只有 U6 符合本文件的节序；
   U0 无 §0 且硬约束在判据前，U2a/U2b/U5 的硬约束在出口判据之前（U5 那种「最重要的
   一条放最前」是有意为之）。**故节序为规范而非强制**，允许硬约束前置。
2. **不写生成脚本**。`.aodw-next/templates/rt-plan.template.md:3` 是 autopilot 的 Ralph
   模板，没有「单元节」概念；RT-125 的单元节格式是一次性发明且内部不自洽
   （U6 有两处出口判据行 `RT/RT-125/rt-plan.md:241` 与 `:245`；U2a 判据溢出表格；
   U5 的表格结构含重复分隔行）。给未定型的 schema 写解析器是为还会变的东西付成本。
   积累到 3 个 RT、单元节格式稳定后再评估。
3. **RT 级白名单含不可机械化成分**。`RT/RT-125/rt-plan.md:253` 第 7 项「新增门禁脚本」
   是自然语言而非路径；白名单越界检测由验收时 `git diff --stat` 人工比对覆盖，
   该类条目只能逐条人工判断。
4. **本文件扩展了 `sub-agent-driven-profile.md:89-92`** 的任务包定义——原为四项
   （目标/约束/出口判据/回执要求），现为六节；该处与 `rt-manager.md:358` 的加载清单
   已随本文件同批提交同步。
5. **`file:line` 引用本身是脆弱的**。本文件落盘时实测：仅因把
   `sub-agent-driven-profile.md` 的一行改成四行，该文件 `:89` 之后的所有行号偏移 3，
   本文件曾有 4 处引用（`:92`/`:119`/`:119-128`/`:136-145`）当场失效。
   **修改被引用文件后必须回扫引用它的规则文件**；`rt-guard.sh` 的 G110（xref 判据）
   只能查悬空，查不出「行号还在但内容已变」这一类。判据 C1/C2 同理受此限制。
