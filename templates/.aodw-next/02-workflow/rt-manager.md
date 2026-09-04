# RT-Manager Specification

统一请求票编排器（Request Ticket Manager）

RT-Manager 是 AODW 的核心组件，负责：
- RT 编号管理
- 立项流程
- Full / Lite（Spec-Full / Spec-Lite）流程分流
- RT 目录和分支的创建与约束

---

## 0. 核心原则

**简洁至上**：保持简单清晰的流程，避免复杂度
**自动化优先**：自动化可自动化的操作（RT-ID 生成、目录创建）
**分支隔离**：每个 RT 独立工作分支，避免相互干扰

---

## 1. 工作前强制检查

AI 在执行任何文件修改操作前，必须先执行以下检查序列：

### Step 1: 验证 RT 是否已创建
- 检查 `RT/RT-XXX/` 目录是否存在
- 检查 `meta.yaml` 是否已创建
- 按 `meta.yaml.profile` + `meta.yaml.execution_mode` 检查对应必备文件：
  - Spec-Full：`intake.md`、`decision.md`、`spec.md`、`plan.md`、`impact.md`、`invariants.md`、`tests.md`、`task.md`、`changelog.md`
  - Spec-Lite collaborative：`rt-lite.md`
  - Spec-Lite autopilot：`rt-lite.md`、`rt-plan.md`、`state.json`、`loop-prompt.md`、`execution-log.md`、`autopilot-preflight.md`

### Step 2: 按"要改什么"决定该在哪个分支

先判断本次要动的文件：

| 要改的东西 | 应在 | 检查 |
|---|---|---|
| 只有 `RT/` 下的文档（meta/intake/decision/spec/plan） | **main** | 直接改，**改完即提交** |
| `RT/` 以外的文件，且 §3.4c 五问**任一为是** | **`feature/RT-XXX-xxx` + worktree** | `git branch --show-current` |
| `RT/` 以外的文件，且 §3.4c 五问**全为否** | **轻量车道分支** `fix|chore|refactor|docs|perf|test/<slug>` | 当天合并，带测试 |

**🚨 强制规则**：严禁在 `main`/`master` 上修改**业务代码**——但"不能改 main"
**不等于"必须建 RT"**。轻量改动走轻量车道分支即可，见
`01-core/git-discipline.md` §1.1 双车道。

RT 文档不是业务代码——立项与设计阶段本就应当在 main 上完成并提交，
worktree 留到真正动代码时再建（见 §6.1）。

---

## 2. 流程状态机

```
created → intaking → decided → in-progress → reviewing → done
```

RT-Manager 统一管理全局状态机更新。

---

## 3. Intake（立项）流程

### 3.1 触发条件
用户表达以下意图时：
- 新功能
- Bug 修复
- 需求
- 改进
- 重构

### 3.2 执行模式确认（强制，最先执行）

**在生成 RT-ID、创建目录或写入任何 RT 文件之前**，AI 必须与用户确认执行模式，并获得**明确答复**。

| 模式 | `execution_mode` | 含义 |
|------|------------------|------|
| 人工干预（协作） | `collaborative` | Gate 3/4/5 需用户确认后再推进 |
| 全自动（Autopilot） | `autopilot` | 机械 Gate + `state.json` 循环；仅熔断时打断用户 |
| Agent 群组（Sub-Agent-Driven） | `sub-agent-driven` | 主 Agent 规划+计划，双审计环把关，执行 Agent 按冻结任务包逐单元推进；协议见 `02-workflow/sub-agent-driven-profile.md` |

#### 3.2.1 `sub-agent-driven` 须同时确认确认粒度（2026-08-20 RT-135 增设）

选 `sub-agent-driven` 时，**必须一并确认 `confirmation_granularity`**，写入 `meta.yaml`：

| 档 | 含义 |
|---|---|
| `全自动` | 零确认；**仅三类熔断才上报**：轮次上限 / 无安全默认的二选一 / 连续无进展 |
| `人工确认` | 每个执行单元回执交回后停一次 + 合并前确认 |

定义见 `02-workflow/sub-agent-driven-profile.md:115-118`。

> **增设缘由**：RT-135 立项时漏声明该字段，主 Agent 默认按「人工确认」档执行，并把
> 四个**均有安全默认**的技术问题（脚本缺陷、基线错位、加减账公式、入账口径）拆开抛给
> 用户裁决，被用户纠正「按规划这套流程应该全自动往下走」。复核确认四条无一符合
> `profile:116` 的熔断判据。**漏声明不会被任何门禁拦住**——`execution_mode` 是强制项而
> 本字段不是，档位缺失时主 Agent 的默认选择无人可查。
>
> **配套原则**：技术判断有分歧时**派独立裁定 Agent 处理，不问用户**（RT-135 实证：
> 裁定 Agent 不仅裁清了四条，还抓出执行 Agent 申报中的一处事实错误与一个双方都未发现的
> 空白，见 `RT/RT-135/audit/adjudication-001.md`）。

> **`execution_mode` 为封闭枚举，仅上表三值合法**（2026-08-16 RT-125 收敛）。
> 存量在用的 `implementation`/`discussion`/`planning` 等为历史遗留，不回头重标；
> 新 RT 禁止自造。谁来拦：`rt-guard.sh` 判据扩展位（观察期后收紧）。

**提问格式**（决策型，见 `01-core/ai-interaction-rules.md`）：

```
Q. 本 RT 采用哪种执行模式？

A. 人工干预模式（协作）— Gate 3/4/5 需我确认
B. 全自动模式（Autopilot）— 机械验收 + 循环推进
C. Agent 群组模式（Sub-Agent-Driven）— 双审计环 + 单元化执行 + 回执回灌

Recommended: A（首次使用 AODW 或需求/风险尚不清晰时）；
C（多单元、执行时间长、上下文压缩风险高的 RT）

请回复：A/B/C
```

**强制规则**：
- 🚫 用户未明确选择 A 或 B（或等价 custom）前，**禁止**创建 `RT/RT-XXX/`、禁止写 `meta.yaml`、禁止进入 intake/decision/实现
- 🚫 **禁止** AI 自行默认 `collaborative` 或 `autopilot` 并继续
- ✅ 用户确认后，立即写入 `meta.yaml.execution_mode` 与 `decision.md` 的「Execution Mode」节，并记录确认时间
- ✅ CLI：`aodw-skill new` 会在创建前交互选择；非交互须显式 `--execution-mode`

### 3.3 执行步骤
1. **确认执行模式**（§ 3.2，未完成则停止）
2. **立项查重**（§ 3.4b，优先复用已有 RT）
3. 生成 RT-ID（固定本地生成）
4. 创建 RT 目录结构（**在 main 上**，`execution_mode` 已写入 `meta.yaml`，
   并按 §5 一次性生成必备文件；**随写随提交**，不要留在工作区未提交）
5. 执行交互式澄清（选项化提问）
6. **现状核查**（§ 3.4a，未完成则不得形成方案倾向）
7. 记录立项信息到 `intake.md`（含查重与现状核查产出）
8. 决定使用 Spec-Full 还是 Spec-Lite profile
9. **worktree 不在此阶段创建**——见 §6.1，要动代码时才建

### 3.4a 现状核查（Prior-Art Check，强制）

> 引入原因（2026-08-13，用户定调）：多次发生"讨论新方案时不读已有代码、
> 不查历史 RT，凭空给方案，事后经用户提醒才发现已有实现或方案不可行"。
> 实证案例：RT-024 retrospective 记录三连"误以为"（skill 加载失败却以为在
> 生效、以为 claude CLI 走真 Claude 实为 GLM、以为凭记忆补偿可靠实为幸存者
> 偏差）；RT-114 立项讨论中 AI 先后提出"另加结构化投影层""保留 5 项机械校验
> + 新增 LLM 评审"两个方案，读码后才发现 RT-107 早已完成"AI 语义评审替代
> 机械门禁"，两个方案分别属于方向错误与重复造轮子。

**在 decision.md / spec.md 形成任何方案倾向之前**，必须完成三项动作并把产出
写入 `intake.md`（Spec-Lite 写入 `rt-lite.md` 对应节）：

1. **代码实读**：列出与改动面相关的入口文件，逐个实际打开读过。凭记忆、
   凭文档、凭上一次会话的印象描述现状均视为未核实。
2. **历史 RT 检索**：至少执行一轮 `grep RT/*/meta.yaml`（按关键词）与
   `git log --grep`，列出相关 RT 及各自结论，并明确本 RT 与它们的关系：
   **承接 / 推翻 / 无关**（写进 `meta.yaml.related_rts` 并附一行说明）。
3. **三问判定**（逐问明确回答，写入 intake）：
   - 已有实现吗？（有 → 本 RT 是否重复造轮子）
   - 与既有逻辑冲突吗？（冲突 → 是需求变更推翻旧结论，还是方案错误）
   - 能承接既有演进路径吗？（列出承接点）

**机械可查的硬门**：decision.md / spec.md 中每一条"现状断言"（描述系统
当前如何工作的句子）必须带引用——`file:line`、RT-ID 或 commit hash。
无引用的现状断言按未核实处理，审计官（04-auditors）审计时视为缺陷。

**边界**：不要求"遍历所有代码"——那既不可行也无必要。要求的是**改动面
锚定的强制实读**＋**无引用不断言**。范围由 impact 分析的改动面决定：改哪个
入口，就必须读过那个入口及其直接依赖；引用哪段历史，就必须打开过那个 RT。

### 3.4b 立项查重：优先复用，而不是不断开新 RT

**在生成 RT-ID 之前**执行，产出写进 `intake.md`：

```bash
grep -il "<关键词>" RT/*/meta.yaml | head              # 标题/触发因素命中
grep -l "^status: \(paused\|intaking\|decided\)$" RT/*/meta.yaml   # 未走完的 RT
```

对命中的 RT 判断三选一，**结论写进 `intake.md` 并在 `meta.yaml.related_rts` 标注**：

| 判定 | 处置 |
|---|---|
| **重复** | 不建新 RT。直接在原 RT 上继续，或更新其 scope |
| **可复用** | 原 RT 处于 `paused` 且正好覆盖当前需求 → **重启它**，把状态改回 `in-progress`，不新建 |
| **同目标未竟** | 原 RT 的**验收目标**其实没达成（只是提前收口了）→ **重开原 RT**，不要新建。见 §3.4c 与 §7.3 |
| **承接 / 推翻 / 无关** | 先过 §3.4c 的门槛。够格才建新 RT，并在 `related_rts` 写明关系 |

⚠️ **查重的产出是"关联"，不是"阻止"。** 找到相关 RT 不等于不能建新的——
RT-116（文档型任务包统一）与 RT-056（章节包统一）方向相同但阶段不同，属于承接
关系，硬拦就错了。要区分的是「这件事已经有人做过」和「这件事有前人基础」。

**转出台账扫描（2026-08-16 RT-125 增设）**：查重时必须同时扫
`RT/_deferred-items.md` 的「未认领」段——若新 RT 主题命中某条 DI，须在 intake
显式处置（认领并更新台账状态，或说明不认领理由）。谁来拦：复盘 Gate 核对
intake 是否含台账处置记录；台账写入与认领约定见 §3.4b-2（机械门禁 G114/G115）。

真正该复用的典型：某个 `paused` 的 RT 线还在、只是当时停下了。例如 RT-096
（搜索策略 free/contract 路由）——将来若要提升章节质量而重新分析搜索策略，
应当取回该 RT 续做，而不是新开一个同主题 RT，否则它积累的 8 份同条件对照实验
报告就白放了。

---

### 3.4b-2 遗留事项台账（DI）：写入与认领约定

本 RT 的目标已能验收，但过程中发现了不该塞进本次的问题 —— 记为**遗留事项**
（Deferred Item, DI）。**不是**把没做完的本目标拆出去然后关 RT：本目标没达成，
就继续做或重开本 RT（§3.4c、§7.3）。

两处落点，缺一不可：

| 落点 | 作用 |
|---|---|
| 本 RT 的 `rt-lite.md`「遗留事项」段 | 这次交接了什么，给人看 |
| `RT/_deferred-items.md` | 全仓库需求池 / 改进池，立项查重与定期选题都查这里 |

**写入台账（转出）：**

1. 取台账里 `### DI-` 的最大序号 + 1，**不要复用已有编号**。
2. 追加到「待认领」段，标题行必须是 `### DI-0NN — 短标题`。
3. 条目用「字段 | 内容」两列表格，填全：**发现于**（哪个 RT / 什么场合）、
   **问题**、**为何不在本 RT 做**、**建议处置**、**状态**（初始 `未认领`）。
4. 在本 RT 的 `meta.yaml.deferred_items_raised` 列出这些编号。没转出就不写该字段。

**认领：**

- 从「未认领」段挑条目时，列出编号、标题、发现于、当时为什么没做、建议处置，
  按「会不会反复咬人」排序 —— 不要只丢一串编号给用户。
- 用户选定后**立即**把台账状态改成 `已认领（RT-XXX，日期）`，**不要等收口**；
  并在本 RT 的 `meta.yaml.deferred_items_claimed` 写上编号。
- 关闭时：做完的改 `已结清（RT-XXX）`；只做了一半，写明做了什么，剩下的留在
  台账里可继续认领。

**机械门禁（G114 / G115，均 warn 级）：**

| 判据 | 读什么 | 拦什么 |
|---|---|---|
| G114 | `meta.yaml.deferred_items_raised` | 声称转出的编号在台账没条目，或条目「发现于」不是本 RT（编号被占，你的内容没落盘） |
| G115 | `meta.yaml.deferred_items_claimed` | 声称认领的编号不存在，或台账「状态」值单元格仍写「未认领」/ 没写本 RT-ID（会导致别人重复认领） |

两条判据只读上述**结构化字段**：注释、`rt-lite.md`、审计稿里出现的 DI 编号
多是查重论证（「扫过、主题不同、无需认领」），不是转出/认领声明，不参与判定。
判据也只锚定条目**标题行**与**状态值单元格**，不做全文 grep —— 台账条目之间
互相引用编号是常态，全文搜会把「被别人提到过」误判成「自己有条目」。

字段缺失即判据不适用（返回 PASS 并说明「无声明可校验」），**未采用本节约定的
项目零影响**。首发取 warn 级；升 error 的条件与理由见
`.aodw-next/manifests/rt-gates.yaml` 中 G114/G115 上方的注释。

---

### 3.4c 建 RT 的门槛：五问（2026-08-14 新增）

§3.4b 解决的是「这件事是不是已经有 RT 了」，本节解决的是**「这件事值不值得建 RT」**
——两者正交，都要过。

**五问全部为否 → 不建 RT**，走 `git-discipline.md` §1.1 的**轻量车道分支**
（`fix|chore|refactor|docs|perf|test/<slug>`），靠 Conventional Commit + 测试留痕。
**注意「不建 RT」不等于「改 main」**——业务代码任何时候都要走分支：

| # | 问题 |
|---|---|
| 1 | 有需要用户拍板的决策点吗？ |
| 2 | 会推翻或修改既有不变量吗？ |
| 3 | 改动跨 ≥2 个模块，或触及对外契约（API / CLI / schema / 交付物格式）吗？ |
| 4 | 做错了代价高、难回滚吗？（删数据、动生产、对外发信号） |
| 5 | 需要留档给未来的人看「为什么这么做」吗？ |

**任一为是 → 建 RT。**

> **为什么需要这条门槛**：截至 2026-08-14 共 115 个 RT，8 月 13 天里新建 50 个
> （3.8 个/天），近 40 个 RT 中约 37% 的代码改动量在 700 行以下。真正的代价不是
> 磁盘，是**查重失效**——RT 一多、type 取值一杂，§3.4b 要求的「这事以前做过没有」
> 就查不动了，`related_rts` 链随之失真，AODW 最核心的「知识可追溯」资产贬值。

**反面案例（真实）**：

* RT-119 与 RT-121 是**同一个 bug**（Book1 升版基线判定不全）。RT-119 只修了
  「占位符」一种形态就收口合并打标签，两小时后发现「旧契约形态」同样中招，
  又开 RT-121 把全套流程重走一遍。按本节：这本该是一个 RT；按 §3.4b 新增的
  「同目标未竟」档：应当重开 RT-119 而不是新建。
* RT-087 与 RT-088 都是「单行脏数据击穿全站」的两个入口，各约 146 行，
  连号分列两个 RT。按本节：合一。

#### 批次 RT

**同一个验收目标下的多个小修复，用一个「批次 RT」承载，不要按缺陷个数拆。**

判据是**共享同一个验收目标**——它们要么一起达成目标，要么一起没达成。

例：2026-08-13 为「Book1 存量批量重生成」做的三项前置修复（占位符不作基线、
思考 token 统计、T-IDR 基线判据）被拆成 RT-119/120/121 三个 RT，实际应当是**一个**
批次 RT「Book1 批量重生成前置修复」，内含三个 commit，一次收口。

批次 RT 的收口标准是**批次目标达成**（例中即「批量能跑出正确形态」），
而不是「某个 commit 合并了」——这同时消解了提前收口的问题，见 §7.3。

---

### 3.4d `type` 枚举（2026-08-14 收敛）

`meta.yaml.type` **只能取以下六值之一**，禁止自造、禁止组合值：

| type | 含义 |
|---|---|
| `Feature` | 新增能力 |
| `Bugfix` | 修复缺陷 |
| `Refactor` | 不改行为的结构调整（含删除退役代码） |
| `Infrastructure` | 流水线 / 工具 / 运行时 / 可观测性 |
| `Design` | 只出设计与决策，不落代码 |
| `Experiment` | 对照实验，结论可能是"不采纳" |

> **为什么收敛**：截至 2026-08-14，存量 115 个 RT 用出了 **22 种 type**，
> `Bugfix` 与 `Fix` 并存，还有 `Bugfix + Feature` 与 `Feature + Bugfix` 两个
> 方向相反的组合值。分类失控会直接削弱 §3.4b 的查重能力——查重靠的就是按类别
> 和关键词收敛候选集。

一个 RT 同时像两类时，**选主要矛盾**，把次要的写进 `title` 或 `scope`。
存量 RT 不回头重标。

> **「不回头重标」的机械落点**：`rt-guard.sh` G101 对存量 RT 豁免六值约束，判据
> 与 G103/G111 同形——`RT/index.yaml` 里本 RT 条目带 `backfill` 键即存量。没有
> `index.yaml`、条目不存在、或条目不带该键（= 新 RT 关闭时自己写的条目），六值
> 约束照常硬失败。没有本约定的项目不受影响：无 `index.yaml` 即无豁免。

**`type` 为必填字段（2026-08-16 RT-125 增设）**：新建 RT 的 meta.yaml 必须含
`type` 且取六值之一。存量 20 个缺失者不追溯。谁来拦：`rt-guard.sh` G103
（当前告警级；本条款落地后 G103 对**新** RT 升硬失败的判定依据是 index.yaml
条目不带 `backfill` 键——带该键即存量，豁免）。

## 4. 流程分流决策

### 4.1 Spec-Full 适用场景
- 跨模块影响
- 数据模型/schema 变更
- 外部 API/协议变更
- 高风险或高复杂度变更

### 4.2 Spec-Lite 适用场景
- Bug 修复
- 单模块小改进
- 简单 UI 或交互调整
- 不涉及数据结构与 API 约约变更的工作

---

## 5. 目录结构

### 5.1 Spec-Full

```
RT/RT-XXX/
  meta.yaml          ← RT 元数据
  intake.md          ← 立项记录
  decision.md        ← Profile 决策
  spec.md            ← Spec-Full 完整需求
  plan.md            ← Spec-Full 技术方案
  impact.md          ← 影响分析
  invariants.md      ← 不可破坏边界
  tests.md           ← 验证计划
  task.md            ← AI 任务追踪
  changelog.md       ← 变更记录
```

### 5.2 Spec-Lite collaborative

```
RT/RT-XXX/
  meta.yaml          ← RT 元数据
  rt-lite.md         ← 单文件整合所有内容
```

### 5.3 Spec-Lite autopilot（强制 7 件套）

```
RT/RT-XXX/
  meta.yaml              ← RT 元数据（execution_mode: autopilot）
  rt-lite.md             ← Goal（静态）：§1-§7
  rt-plan.md             ← Plan（动态）：每轮更新
  state.json             ← 机器状态：checklist、phase、熔断信号
  loop-prompt.md         ← 每轮 Ralph 执行指令
  execution-log.md       ← 人读时间线
  autopilot-preflight.md ← 开工许可清单
```

**注意**：Spec-Lite 的“单文档模式”只合并需求/方案/影响/边界/验证/变更记录，不取消 Autopilot 的状态、计划、日志和开工许可文件。

---

## 6. 分支命名与隔离策略

**分支命名**：RT 车道 `feature/RT-XXX-short-name`；轻量车道见 git-discipline §1.1
**工作区隔离**：每个 RT 对应一个独立的 Git worktree

**🚨 关键规则**：一个 RT = 一个 Worktree = 一个 Feature 分支

### 6.1 worktree 按阶段创建，不在立项时创建（2026-08-13 修订）

| 阶段 | status | 在哪做 | 产物 |
|---|---|---|---|
| 立项与设计 | `intaking` / `decided` | **main，随写随提交** | meta / intake / decision / spec / plan |
| 实现 | `in-progress` 起 | worktree + feature 分支 | 代码、测试、资源 |

判据只有一条：**要动 `RT/` 以外的文件，才建 worktree。**

很多 RT 在讨论完之后并不会马上启动，也可能最终根本不涉及代码改动（纯设计稿、
纯台账整理）。给这类 RT 建 worktree 是白占约 100M 磁盘，还会让并行 worktree
数量虚高、真正需要并行时看不清局面。

实测依据见 `01-core/git-discipline.md` §2.0。完整创建步骤与前置检查见该文档 §2.1。

### 6.2 建 worktree 前的三问（必答）

1. **当前有几个活跃 worktree？** `git worktree list`。超过 2–3 个先停一下——
   同时并行那么多 RT，合并顺序和冲突面都会失控。
2. **要改的文件与其它活跃 worktree 有重叠吗？** 具体命令见 git-discipline §2.1。
   有重叠必须先告知用户，由用户决定并行还是串行。
3. **这件事非要新 RT 不可吗？** 见 §3.4b 的查重。

答不上来就不要建。

---

## 7. Profile 调用规范

AI 根据决策结果，加载对应的 Profile：

- Spec-Full → 加载 `02-workflow/spec-full-profile.md`
- Spec-Lite + `execution_mode=collaborative` → 加载 `02-workflow/spec-lite-profile.md`
- Spec-Lite + `execution_mode=autopilot` → 加载 `02-workflow/spec-lite-autopilot-profile.md` + `02-workflow/autopilot-protocol.md` + `02-workflow/rt-autopilot-readiness.md`
- 任意 profile + `execution_mode=sub-agent-driven` → 加载 `02-workflow/sub-agent-driven-profile.md` + `04-auditors/aodw-plan-auditor-rules.md`；进入单元循环、要冻结任务包时另加载 `02-workflow/task-pack-projection.md`

### 7.1 Autopilot RT 附加文件（Spec-Lite）

当 `meta.yaml.execution_mode: autopilot` 时，以下文件**必须在开工前存在**：

| 文档 | 角色 |
|------|------|
| `rt-lite.md` | Goal（静态）：§7 完成条件，三要素写法见 `autopilot-goal-spec.md` |
| `rt-plan.md` | Plan（动态）：每轮更新的步骤清单 |
| `state.json` | 机器状态：checklist、phase、熔断信号 |
| `loop-prompt.md` | 每轮 Ralph 执行指令 |
| `execution-log.md` | 人读时间线（防黑盒） |
| `autopilot-preflight.md` | 开工许可 |

**总协议**：`02-workflow/autopilot-protocol.md`（Ralph 循环、机械 Gate、反模式、子模式、进度友好）。

Autopilot 流程摘要：
1. 用户确认模式（§3.2）→ 2. Goal 定稿 + 自检 → 3. Preflight → 4. Gate-Plan → 5. Ralph 循环 → 6. Gate-Commit/Done  
熔断时交还人工；不得跳过 Goal 自检进入循环。

### 7.2 关闭一致性检查

关闭任一 RT 前，AI 必须检查：

- `meta.yaml.status`、`state.json.phase`、`rt-lite.md` 元数据行的 `status` 三者一致。
- Spec-Lite autopilot RT 必须具备 §5.3 的 7 件套。
- `rt-plan.md` 无未完成步骤，或未完成项已明确转入后续 RT。
- `execution-log.md` 记录最新验证命令和关闭结论。

### 7.3 收口前验**目标**，不是验**改动**（2026-08-14 新增）

**关闭前必须回答的是「这个 RT 的验收目标达成了没有」，而不是「我改的代码对不对」。**
两者不是一回事：改动可以全部正确，目标依然没达成。

做法：拿 `spec.md` §验收标准（Spec-Full）或 `rt-lite.md` §5 验证计划（Spec-Lite）
**逐条对照实跑**，而不是只跑测试套件。测试证明的是「我写的那部分按我的预期工作」，
验收标准证明的是「要解决的问题解决了」。

> **反面案例（真实）**：RT-119「占位符不得被当作升版基线」。目标是**让 Book1 批量
> 重生成能跑出正确形态**。实现只覆盖了「占位符」这一种非法基线，新增用例全绿、
> 全量 1120 passed，于是收口、合并、打 `done-RT-119` 标签。
>
> 两小时后，批量开跑前的全量预检发现：**20 个存量 case 会全部误选错误 Skill**
> ——它们的旧 §0–§10 契约形态同样不是合法基线。目标根本没达成，只好再开 RT-121
> 把立项→CSF→实现→测试→合并→打标签的全套流程重走一遍。
>
> **那个"22 个 case 全量预检"，本该在 RT-119 收口前就跑**。跑了，两个修复就是
> 一个 commit 的事；没跑，就多了一个 RT、多了一次全套仪式。
>
> 判据很简单：**如果验收标准里写的是"批量能跑对"，那收口前就必须真的去批量预检
> 一次**——不能用"我改的这行逻辑测过了"替代。

配套：若收口后发现目标未达成，按 §3.4b 的 **`同目标未竟`** 档**重开原 RT**，
不要新建。

---

## 8. 集成规范

与以下规范配合使用：
- `01-core/git-discipline.md`（分支与提交规范）
- `01-core/ai-interaction-rules.md`（交互规范）
- `01-core/ai-knowledge-rules.md`（知识同步规范）

---

## 9. RT-ID 本地生成规则

### 9.1 强制策略

AODW 使用本地生成 RT-ID，不依赖远程服务。

### 9.2 生成逻辑

1. 取两个来源的**并集**找最大序号 `N`：
   - `RT/` 目录下所有 `RT-XXX` 格式的目录；
   - `RT/index.yaml` 的全部条目 id。
   **只扫目录会撞号**：index 里存在「有条目、无目录」的合法占号 RT
   （立项在其他分支、或目录尚未合入 main）。实证：2026-08-18 RT-128 收口
   期间按目录扫号取了 RT-129，与 index 已登记的同号 RT（序列语义贯穿）
   冲突，返工撤号（见 RT-128 retrospective.md）。
2. 生成新 ID：`RT-{N+1}`（补零到 3 位，如 `RT-001`, `RT-002`）
3. 如果生成的 ID 在**任一来源**已存在：递增序号直到找到可用 ID

### 9.3 检查清单

- [ ] 已取 `RT/` 目录与 `RT/index.yaml` 条目的并集找到最大序号
- [ ] 已生成 `RT-{N+1}` 格式的 ID
- [ ] 已确认该 ID 在目录与 index 中均不存在
