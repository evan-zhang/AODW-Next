#!/usr/bin/env bash
# =============================================================================
# run-skill-fixtures.sh — 自带 skill 与分发脚本的 fixture 测试驱动
# =============================================================================
# 用法: bash .aodw-next/tools/fixtures/run-skill-fixtures.sh
# 退出码: 0 = 全部 PASS；1 = 存在 FAIL
#
# 被测对象（三个都会**改文件系统**，所以判据必须查落地结果，不能只看退出码）：
#   skills/handover-pack/scripts/validate.py       交接包格式校验
#   skills/handover-pack/scripts/next-number.sh    交接包取号
#   skills/handover-pack/scripts/check-closure.sh  交接包闭合检查
#   tools/install-skills.sh                        skill 分发/卸载
#
# 与 run-fixtures.sh 分开的原因：那套守的是 rt-guard.sh 的门禁判据，用例数是
# 对外承诺过的基线；把不相干的用例混进去会让「基线数变了」失去信号意义。
# 两套共用 run_case 的断言风格，学会一套就会另一套。
#
# ── 本套的判据设计 ──────────────────────────────────────────────────────────
# 判据要能失败才算数（见 01-core/test-discipline.md）。所以：
#   · 凡是「某开关生效」的判据，都配一条**不带该开关时结果相反**的对照用例。
#     只断言「带 --dir 能跑通」是空判据——不带 --dir 时它也跑得通。
#   · 凡是「拒绝危险操作」的判据，都追加一条**目标文件仍在且内容未变**的检查。
#     只断言退出码非 0 挡不住「先删了再报错」。
#   · 校验器的判别力用「本该失败的样本」反证：未填写的模板必须校验不过。
#     一个连空模板都放行的校验器等于没有。
#
# 全部用例在临时目录里跑，不碰仓库工作区；临时 git 仓库是一次性的。
# =============================================================================

set -euo pipefail

FIXTURES_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$FIXTURES_DIR/../../.." && pwd)"
CORE="$REPO_ROOT/.aodw-next"
SKILL_DIR="$CORE/skills/handover-pack"
VALIDATE="$SKILL_DIR/scripts/validate.py"
NEXTNUM="$SKILL_DIR/scripts/next-number.sh"
CLOSURE="$SKILL_DIR/scripts/check-closure.sh"
INSTALLER="$CORE/tools/install-skills.sh"
DOC_TEMPLATE="$SKILL_DIR/templates/handover-template.md"

for f in "$VALIDATE" "$NEXTNUM" "$CLOSURE" "$INSTALLER" "$DOC_TEMPLATE"; do
  [[ -f "$f" ]] || { echo "找不到被测文件: $f" >&2; exit 1; }
done

command -v python3 >/dev/null 2>&1 || { echo "缺 python3，无法运行本套用例" >&2; exit 1; }

# pyyaml 不是硬依赖：validate.py 在缺它时会降级为逐行提取并 WARN。
# 依赖 YAML 结构解析的用例（列表里的关系类型）在降级模式下前提不成立，
# 明确 skip 而不是让它变成假红——这正是本套要守的纪律之一。
HAS_YAML=0
python3 -c 'import yaml' >/dev/null 2>&1 && HAS_YAML=1

# 临时根：用 pwd -P 展开符号链接（macOS 的 mktemp 落在 /var → /private/var），
# 否则 git 返回的 toplevel 与我们手里的路径字面量对不上。
TMP="$(cd "$(mktemp -d)" && pwd -P)"
cleanup() { rm -rf "$TMP"; }
trap cleanup EXIT

N_PASS=0
N_FAIL=0
N_SKIP=0
FAILED_NAMES=()

# run_case <name> <expected_exit> [--grep-out <re>] [--grep-err <re>]
#          [--no-out <re>] -- <argv...>
#   --no-out：断言 stdout **不**含某模式，用来查「不该发生的事没发生」
run_case() {
  local name="$1" expect="$2"
  shift 2
  local grep_out="" grep_err="" no_out=""
  while [[ "$1" != "--" ]]; do
    case "$1" in
      --grep-out) grep_out="$2"; shift 2 ;;
      --grep-err) grep_err="$2"; shift 2 ;;
      --no-out)   no_out="$2";   shift 2 ;;
      *) echo "run_case 参数错误: $1" >&2; exit 1 ;;
    esac
  done
  shift # 去掉 --

  local out_f err_f rc=0
  out_f="$(mktemp)"; err_f="$(mktemp)"
  "$@" > "$out_f" 2> "$err_f" < /dev/null || rc=$?

  local verdict="PASS" why=""
  if [[ "$rc" -ne "$expect" ]]; then
    verdict="FAIL"; why="期望 exit=$expect 实得 exit=$rc"
  elif [[ -n "$grep_out" ]] && ! grep -Eq "$grep_out" "$out_f"; then
    verdict="FAIL"; why="stdout 未命中 /$grep_out/"
  elif [[ -n "$grep_err" ]] && ! grep -Eq "$grep_err" "$err_f"; then
    verdict="FAIL"; why="stderr 未命中 /$grep_err/"
  elif [[ -n "$no_out" ]] && grep -Eq "$no_out" "$out_f"; then
    verdict="FAIL"; why="stdout 不该出现 /$no_out/ 却出现了"
  fi

  if [[ "$verdict" == "PASS" ]]; then
    N_PASS=$((N_PASS + 1))
    printf 'PASS  %-32s (exit=%s)\n' "$name" "$rc"
  else
    N_FAIL=$((N_FAIL + 1))
    FAILED_NAMES+=("$name")
    printf 'FAIL  %-32s %s\n' "$name" "$why"
    printf '      cmd: %s\n' "$*"
    sed 's/^/      out| /' "$out_f"
    sed 's/^/      err| /' "$err_f"
  fi
  rm -f "$out_f" "$err_f"
}

# check_path <name> <exists|missing|symlink|file|dir> <path>
#   查落地结果。改文件系统的脚本，退出码只是它的自述，落地结果才是事实。
check_path() {
  local name="$1" kind="$2" p="$3" ok=0
  case "$kind" in
    exists)  [[ -e "$p" ]] && ok=1 ;;
    missing) [[ ! -e "$p" ]] && ok=1 ;;
    symlink) [[ -L "$p" ]] && ok=1 ;;
    file)    [[ -f "$p" && ! -L "$p" ]] && ok=1 ;;
    dir)     [[ -d "$p" && ! -L "$p" ]] && ok=1 ;;
    *) echo "check_path 类型错误: $kind" >&2; exit 1 ;;
  esac
  if [[ $ok -eq 1 ]]; then
    N_PASS=$((N_PASS + 1)); printf 'PASS  %-32s (%s)\n' "$name" "$kind"
  else
    N_FAIL=$((N_FAIL + 1)); FAILED_NAMES+=("$name")
    printf 'FAIL  %-32s 期望 %s: %s\n' "$name" "$kind" "${p#"$TMP"/}"
  fi
}

# check_grep <name> <file> <re>  — 文件内容仍是我们期望的那份
check_grep() {
  local name="$1" f="$2" re="$3"
  if [[ -f "$f" ]] && grep -Eq "$re" "$f"; then
    N_PASS=$((N_PASS + 1)); printf 'PASS  %-32s (内容匹配)\n' "$name"
  else
    N_FAIL=$((N_FAIL + 1)); FAILED_NAMES+=("$name")
    printf 'FAIL  %-32s 文件缺失或内容不含 /%s/\n' "$name" "$re"
  fi
}

skip_case() {
  N_SKIP=$((N_SKIP + 1)); printf 'SKIP  %-32s %s\n' "$1" "$2"
}

# ── fixture 构造 ────────────────────────────────────────────────────────────

# 一次性 git 仓库。显式写死身份与签名设置：fixture 不该受开发机全局 git 配置影响，
# 否则「别人机器上跑不过」会被误读成代码问题。
make_repo() {
  local r="$1"
  mkdir -p "$r"
  git -C "$r" init -q
  git -C "$r" symbolic-ref HEAD refs/heads/main   # 不依赖 init.defaultBranch（旧版 git 没有）
  git -C "$r" config user.email "fixture@example.invalid"
  git -C "$r" config user.name "AODW Fixture"
  git -C "$r" config commit.gpgsign false
}

commit_file() {  # <repo> <相对路径> <提交信息>
  local r="$1" p="$2" m="$3"
  mkdir -p "$r/$(dirname "$p")"
  printf '%s\n' "$m" >> "$r/$p"
  git -C "$r" add "$p"
  git -C "$r" commit -q -m "$m"
}

short_head() { git -C "$1" rev-parse --short HEAD; }

# session 类交接包正文：八节齐全，commit 引用用 @HASH@ 占位，由 make_doc 替换。
doc_body_session() {
  cat <<'BODY'

# 示例交接包

## 0. 一句话

用一份最小样例覆盖校验器要求的全部章节。

## 1. 我们之前做了什么

改了一个示例文件（提交 @HASH@）。

## 2. 我们是怎么做的、怎么查的

跑取号脚本拿到序号，写完用校验器过一遍。

## 3. 我们希望解决的问题是什么

让交接包的格式要求可机械判定，而不是靠人记。

## 4. 当前我们发现了什么问题

暂无未决问题。

## 5. 下一步我们计划做什么

无后续动作。

## 6. 你接手时的现状变化

已复核，无变化。

## 7. 接手清单

1. 先确认环境。

## 8. 相关提交索引

提交 @HASH@ 为本次唯一改动。
BODY
}

# make_doc <目标路径> [status] [kind] [created] [last_verified] [rt] [related_items] [scope] [hash]
# 默认参数拼出一份**应当校验通过**的样例；各用例只覆盖它要坏掉的那一个字段。
make_doc() {
  local dest="$1"
  local status="${2:-active}" kind="${3:-session}"
  local created="${4:-2026-01-15}" lastv="${5:-2026-01-16}"
  local rt="${6:-RT-123}"
  # ⚠️ 含 `}` 的默认值不能写进 ${7:-...}——参数展开会在第一个 `}` 处提前收尾，
  # 把 `[{DI-007: 认领}]` 截成 `[{DI-007: 认领]}`，产出一份 YAML 语法就错的样例。
  local items="${7:-}"
  [[ -n "$items" ]] || items='[{DI-007: 认领}]'
  local scope="${8:-覆盖示例工作的交接说明，写给下一个接手的人，先读现状变化一节。}"
  local hash="${9:-0123abc}"
  mkdir -p "$(dirname "$dest")"
  {
    echo "---"
    echo "title: 示例交接包"
    echo "status: $status"
    echo "kind: $kind"
    echo "created: $created"
    echo "last_verified: $lastv"
    echo "owners: [platform-team]"
    echo "rt: $rt"
    echo "related_items: $items"
    echo "scope: $scope"
    echo "related: [README.md]"
    echo "---"
    # 用占位符替换而非展开式 heredoc：正文里的反引号在展开式 heredoc 里会被
    # 当成命令替换执行。
    doc_body_session | sed "s/@HASH@/\`$hash\`/g"
  } > "$dest"
}

echo "== handover-pack / install-skills fixtures =="
echo "   被测根: ${CORE#"$REPO_ROOT"/}"
[[ $HAS_YAML -eq 1 ]] || echo "   注意: 未安装 pyyaml，依赖 YAML 结构解析的用例将 SKIP"
echo

# ═══════════════════════════════════════════════════════════════════════════
# 一、validate.py — 交接包格式校验
# ═══════════════════════════════════════════════════════════════════════════
echo "-- validate.py --"

V="$TMP/validate"
mkdir -p "$V"

run_case validate-no-arg 2 --grep-err '用法' \
  -- python3 "$VALIDATE"

run_case validate-missing-file 2 --grep-err '文件不存在' \
  -- python3 "$VALIDATE" "$V/不存在.md"

# 正例：全过。$V 不在 git 仓库内，故 commit 存在性校验应**整体跳过并 WARN**，
# 而不是逐条报「commit 不存在」——这是校验器明确要求的「前提不成立就 skip」。
make_doc "$V/good.md"
run_case validate-good 0 --grep-out 'PASS' \
  -- python3 "$VALIDATE" "$V/good.md"
run_case validate-good-skips-commits 0 --grep-out '不在 git 仓库内，跳过' \
  -- python3 "$VALIDATE" "$V/good.md"
# 对照：跳过的同时绝不能冒出「commit 不存在」的假红
run_case validate-no-false-commit-fail 0 --no-out '在仓库中不存在' \
  -- python3 "$VALIDATE" "$V/good.md"

# 破坏实验：逐个字段坏掉，看判据是否真的抓得住
printf '没有 frontmatter 的正文\n\n## 0. 一句话\n' > "$V/no-fm.md"
run_case validate-no-frontmatter 1 --grep-out '缺 frontmatter' \
  -- python3 "$VALIDATE" "$V/no-fm.md"

make_doc "$V/bad-status.md" "进行中"
run_case validate-bad-status 1 --grep-out 'status. 取值非法' \
  -- python3 "$VALIDATE" "$V/bad-status.md"

make_doc "$V/bad-kind.md" active "手册"
run_case validate-bad-kind 1 --grep-out 'kind. 取值非法' \
  -- python3 "$VALIDATE" "$V/bad-kind.md"

make_doc "$V/bad-date.md" active session "2026/01/15"
run_case validate-bad-date 1 --grep-out 'YYYY-MM-DD' \
  -- python3 "$VALIDATE" "$V/bad-date.md"

make_doc "$V/bad-rt.md" active session 2026-01-15 2026-01-16 "TICKET-9"
run_case validate-bad-rt 1 --grep-out 'rt. 取值非法' \
  -- python3 "$VALIDATE" "$V/bad-rt.md"

# rt: none 是正当取值——但必须在 scope 里说清工作性质。两条对照证明判据有判别力。
make_doc "$V/rt-none-short.md" active session 2026-01-15 2026-01-16 "none" "[]" "杂项"
run_case validate-rt-none-short-scope 1 --grep-out 'scope' \
  -- python3 "$VALIDATE" "$V/rt-none-short.md"

make_doc "$V/rt-none-ok.md" active session 2026-01-15 2026-01-16 "none" "[]" \
  "轻量车道的工具改进，不挂 RT；读者主要看第五节的后续建议。"
run_case validate-rt-none-ok 0 --grep-out 'PASS' \
  -- python3 "$VALIDATE" "$V/rt-none-ok.md"

if [[ $HAS_YAML -eq 1 ]]; then
  make_doc "$V/bad-rel.md" active session 2026-01-15 2026-01-16 "RT-123" "[{DI-007: 顺手看了看}]"
  run_case validate-bad-relation 1 --grep-out '关系类型非法' \
    -- python3 "$VALIDATE" "$V/bad-rel.md"
else
  skip_case validate-bad-relation "无 pyyaml，列表结构无法解析，判据前提不成立"
fi

# 章节缺失
{
  echo "---"
  echo "title: 缺章节"
  echo "status: active"
  echo "kind: session"
  echo "created: 2026-01-15"
  echo "last_verified: 2026-01-16"
  echo "owners: [platform-team]"
  echo "rt: RT-123"
  echo "related_items: []"
  echo "scope: 这份交接包故意只写一节，用来验证章节判据抓得住缺失。"
  echo "related: [README.md]"
  echo "---"
  echo
  echo "## 0. 一句话"
  echo
  echo "只有这一节。"
} > "$V/missing-sections.md"
run_case validate-missing-sections 1 --grep-out '正文缺必需章节' \
  -- python3 "$VALIDATE" "$V/missing-sections.md"

# operations 类不套用八节：同一份「只有三个小节」的正文，session 判失败、
# operations 判通过。这一对才证明分流真的生效。
ops_fm() {  # <kind>
  echo "---"
  echo "title: 示例运维手册"
  echo "status: active"
  echo "kind: $1"
  echo "created: 2026-01-15"
  echo "last_verified: 2026-01-16"
  echo "owners: [platform-team]"
  echo "rt: none"
  echo "related_items: []"
  echo "scope: 运维手册型交接，讲这个系统怎么部署、怎么体检、出事怎么办。"
  echo "related: [README.md]"
  echo "---"
  echo
  echo "## 怎么部署"
  echo "步骤一二三。"
  echo
  echo "## 怎么做健康检查"
  echo "跑体检命令。"
  echo
  echo "## 出事怎么办"
  echo "先看日志。"
}
ops_fm operations > "$V/ops.md"
ops_fm session    > "$V/ops-as-session.md"
run_case validate-operations-kind 0 --grep-out 'PASS' \
  -- python3 "$VALIDATE" "$V/ops.md"
run_case validate-operations-contrast 1 --grep-out '正文缺必需章节' \
  -- python3 "$VALIDATE" "$V/ops-as-session.md"

# 坏链接
make_doc "$V/bad-link.md"
printf '\n参见 [某文档](./完全不存在的文件.md)。\n' >> "$V/bad-link.md"
run_case validate-bad-link 1 --grep-out '链接指向的文件不存在' \
  -- python3 "$VALIDATE" "$V/bad-link.md"

# 判别力反证：随包发布的空模板**必须**校验不过（日期是 YYYY-MM-DD 占位、
# 章节是待填说明）。一个连空模板都放行的校验器没有任何价值。
run_case validate-rejects-blank-template 1 --grep-out 'FAIL' \
  -- python3 "$VALIDATE" "$DOC_TEMPLATE"

run_case validate-quiet-mode 0 --no-out '交接包校验 —' \
  -- python3 "$VALIDATE" "$V/good.md" --quiet

# ═══════════════════════════════════════════════════════════════════════════
# 二、next-number.sh — 取号
# ═══════════════════════════════════════════════════════════════════════════
echo
echo "-- next-number.sh --"

run_case nextnum-help 0 --grep-out '用法' -- bash "$NEXTNUM" --help
run_case nextnum-bad-arg 2 --grep-err '未知参数' -- bash "$NEXTNUM" --bogus
run_case nextnum-bad-root 2 --grep-err '不是目录' -- bash "$NEXTNUM" --root "$TMP/根本没有这个目录"

R1="$TMP/num/empty"
make_repo "$R1"
commit_file "$R1" "README.md" "init"
run_case nextnum-empty-repo 0 --grep-out '^H001$' \
  -- bash "$NEXTNUM" --root "$R1" --quiet

# 工作区里未提交的文件也要算——否则同一会话里连开两份会撞号
mkdir -p "$R1/docs/handover"
: > "$R1/docs/handover/H001-first.md"
: > "$R1/docs/handover/H002-second.md"
run_case nextnum-scans-worktree 0 --grep-out '^H003$' \
  -- bash "$NEXTNUM" --root "$R1" --quiet

# 号被用过就不复用，哪怕文件后来删了（历史扫描）
git -C "$R1" add docs/handover && git -C "$R1" commit -q -m "add handover"
git -C "$R1" rm -q docs/handover/H002-second.md && git -C "$R1" commit -q -m "remove H002"
run_case nextnum-scans-history 0 --grep-out '^H003$' \
  -- bash "$NEXTNUM" --root "$R1" --quiet

# 最关键的一条：号只存在于**未合并分支**上时也必须被算进去。
# 已知事故就是栽在这——只看当前分支，占号在别的分支上，撞了才发现。
R2="$TMP/num/branch"
make_repo "$R2"
commit_file "$R2" "README.md" "init"
commit_file "$R2" "docs/handover/H001-a.md" "H001"
git -C "$R2" checkout -q -b feature      # 一次性 fixture 仓库，可随意切换
commit_file "$R2" "docs/handover/H007-b.md" "H007"
git -C "$R2" checkout -q main
check_path nextnum-branch-setup missing "$R2/docs/handover/H007-b.md"
run_case nextnum-counts-unmerged-branch 0 --grep-out '^H008$' \
  -- bash "$NEXTNUM" --root "$R2" --quiet

run_case nextnum-list 0 --grep-out 'H001' \
  -- bash "$NEXTNUM" --root "$R2" --list

# ── 落点目录可配置：每条都配一个「不带该配置时答案不同」的对照 ──
R3="$TMP/num/dirs"
make_repo "$R3"
commit_file "$R3" "README.md" "init"
commit_file "$R3" "docs/handover/H001-default.md" "默认目录里占了 H001"
commit_file "$R3" "交接/H004-custom.md" "自定义目录里占了 H004"

run_case nextnum-default-dir 0 --grep-out '^H002$' \
  -- bash "$NEXTNUM" --root "$R3" --quiet
run_case nextnum-flag-dir 0 --grep-out '^H005$' \
  -- bash "$NEXTNUM" --root "$R3" --dir "交接" --quiet
run_case nextnum-env-dir 0 --grep-out '^H005$' \
  -- env AODW_HANDOVER_DIR="交接" bash "$NEXTNUM" --root "$R3" --quiet

# config.yaml 里的 handover_dir
mkdir -p "$R3/.aodw-next"
printf 'mode: independent\nhandover_dir: 交接\n' > "$R3/.aodw-next/config.yaml"
run_case nextnum-config-dir 0 --grep-out '^H005$' \
  -- bash "$NEXTNUM" --root "$R3" --quiet
# 优先级：--dir 压过 config.yaml 与环境变量
run_case nextnum-flag-beats-config 0 --grep-out '^H002$' \
  -- env AODW_HANDOVER_DIR="交接" bash "$NEXTNUM" --root "$R3" --dir "docs/handover" --quiet
# 注释掉的键不该被读成配置值
printf 'mode: independent\n# handover_dir: 交接\n' > "$R3/.aodw-next/config.yaml"
run_case nextnum-ignores-commented-key 0 --grep-out '^H002$' \
  -- bash "$NEXTNUM" --root "$R3" --quiet

# 绝对路径落点：折算成仓库相对路径；指到仓库外要拒绝
run_case nextnum-abs-dir-inside 0 --grep-out '^H005$' \
  -- bash "$NEXTNUM" --root "$R3" --dir "$R3/交接" --quiet
run_case nextnum-abs-dir-outside 2 --grep-err '必须位于项目根内' \
  -- bash "$NEXTNUM" --root "$R3" --dir "$TMP/别处"

# 非 ASCII 目录名下，历史扫描与分支扫描也必须照常工作。
# 这里刻意让工作区**空**：号只存在于历史和未合并分支上。若 git 把路径 C 转义了
# （core.quotepath 默认行为），这两路扫描会静默失效、退回只看工作区，答案变成 H001。
R4="$TMP/num/cjk"
make_repo "$R4"
commit_file "$R4" "README.md" "init"
commit_file "$R4" "交接/H003-gone.md" "历史里占过 H003"
git -C "$R4" rm -q "交接/H003-gone.md" && git -C "$R4" commit -q -m "删掉 H003，但号不复用"
git -C "$R4" checkout -q -b feature
commit_file "$R4" "交接/H009-branch.md" "未合并分支上占了 H009"
git -C "$R4" checkout -q main
check_path nextnum-cjk-worktree-empty missing "$R4/交接/H009-branch.md"
run_case nextnum-cjk-dir-history-and-branch 0 --grep-out '^H010$' \
  -- bash "$NEXTNUM" --root "$R4" --dir "交接" --quiet

# 不给 --root 时按当前工作目录的 git 顶层走
run_case nextnum-cwd-default 0 --grep-out '^H002$' \
  -- bash -c 'cd "$1" && exec bash "$2" --quiet' _ "$R3" "$NEXTNUM"
# 环境变量指定项目根
run_case nextnum-env-root 0 --grep-out '^H002$' \
  -- env AODW_PROJECT_ROOT="$R3" bash "$NEXTNUM" --quiet

# ═══════════════════════════════════════════════════════════════════════════
# 三、check-closure.sh — 闭合检查
# ═══════════════════════════════════════════════════════════════════════════
echo
echo "-- check-closure.sh --"

run_case closure-no-arg 2 --grep-err '用法' -- bash "$CLOSURE"
run_case closure-missing-file 2 --grep-err '用法' -- bash "$CLOSURE" "$TMP/不存在.md"

C1="$TMP/closure/covered"
make_repo "$C1"
commit_file "$C1" "src/a.txt" "feat: 第一件事"
H1="$(short_head "$C1")"
make_doc "$C1/docs/handover/H001-demo.md" active session 2026-01-15 2026-01-16 \
  "RT-123" "[{DI-007: 认领}]" "示例会话的交接说明。" "$H1"
git -C "$C1" add docs/handover && git -C "$C1" commit -q -m "docs: 交接包"

# 交接包之后只有「交接动作自身」的提交 → 已豁免，可以关会话
run_case closure-covered 0 --grep-out '已覆盖到 HEAD' \
  -- bash "$CLOSURE" "$C1/docs/handover/H001-demo.md"
run_case closure-lists-exempt 0 --grep-out '已豁免' \
  -- bash "$CLOSURE" "$C1/docs/handover/H001-demo.md"

# 出现实质改动 → 有缺口
commit_file "$C1" "src/b.txt" "feat: 交接后又干了活"
run_case closure-detects-gap 1 --grep-out '未被交接包提及' \
  -- bash "$CLOSURE" "$C1/docs/handover/H001-demo.md"

# 自定义豁免前缀可以把它放行——对照上一条，证明 --exempt 真的改变了结果
run_case closure-custom-exempt 0 --grep-out '已覆盖到 HEAD' \
  -- bash "$CLOSURE" "$C1/docs/handover/H001-demo.md" --exempt "src/"
run_case closure-env-exempt 0 --grep-out '已覆盖到 HEAD' \
  -- env AODW_HANDOVER_EXEMPT="src/" bash "$CLOSURE" "$C1/docs/handover/H001-demo.md"

# skill 自身的改动属于「交接动作自身」，默认豁免
C2="$TMP/closure/skillpath"
make_repo "$C2"
commit_file "$C2" "src/a.txt" "feat: 第一件事"
H2="$(short_head "$C2")"
make_doc "$C2/docs/handover/H001-demo.md" active session 2026-01-15 2026-01-16 \
  "RT-123" "[{DI-007: 认领}]" "示例会话的交接说明。" "$H2"
git -C "$C2" add docs/handover && git -C "$C2" commit -q -m "docs: 交接包"
commit_file "$C2" ".aodw-next/skills/handover-pack/SKILL.md" "chore: 顺手改了交接工具"
run_case closure-exempts-skill-path 0 --grep-out '已覆盖到 HEAD' \
  -- bash "$CLOSURE" "$C2/docs/handover/H001-demo.md"

# 落点目录可配置：同一个提交，配对了目录才算豁免
C3="$TMP/closure/dirs"
make_repo "$C3"
commit_file "$C3" "src/a.txt" "feat: 第一件事"
H3="$(short_head "$C3")"
make_doc "$C3/交接/H001-demo.md" active session 2026-01-15 2026-01-16 \
  "RT-123" "[{DI-007: 认领}]" "示例会话的交接说明。" "$H3"
git -C "$C3" add 交接 && git -C "$C3" commit -q -m "docs: 交接包放在自定义目录"
run_case closure-custom-dir-exempts 0 --grep-out '已覆盖到 HEAD' \
  -- bash "$CLOSURE" "$C3/交接/H001-demo.md" --dir "交接"
run_case closure-default-dir-contrast 1 --grep-out '未被交接包提及' \
  -- bash "$CLOSURE" "$C3/交接/H001-demo.md"

# 没有任何 commit 引用 → 判不了，明确报 2 而不是假装通过
C4="$TMP/closure/nohash"
make_repo "$C4"
commit_file "$C4" "src/a.txt" "feat: 第一件事"
{ echo "---"; echo "title: 无引用"; echo "---"; echo; echo "## 0. 一句话"; } \
  > "$C4/nohash.md"
run_case closure-no-commit-ref 2 --grep-err '未引用任何 commit' \
  -- bash "$CLOSURE" "$C4/nohash.md"

# 引用的 commit 不在本分支历史里 → 同样是「判不了」，不能静默放行
make_doc "$C4/ghost.md" active session 2026-01-15 2026-01-16 \
  "RT-123" "[{DI-007: 认领}]" "引用了不存在的提交。" "deadbee"
run_case closure-unknown-commit 2 --grep-err '无法判定' \
  -- bash "$CLOSURE" "$C4/ghost.md"

# ═══════════════════════════════════════════════════════════════════════════
# 四、install-skills.sh — 分发与卸载
# ═══════════════════════════════════════════════════════════════════════════
echo
echo "-- install-skills.sh --"

run_case install-help 0 --grep-out '用法' -- bash "$INSTALLER" --help
run_case install-bad-arg 2 --grep-err '未知参数' -- bash "$INSTALLER" --bogus
run_case install-bad-root 2 --grep-err '不是目录' -- bash "$INSTALLER" --root "$TMP/根本没有这个目录"

# ── dry-run 必须真的什么都不做 ──
T1="$TMP/inst/t1"; mkdir -p "$T1"
run_case install-dry-run 0 --grep-out 'dry-run' \
  -- bash "$INSTALLER" --root "$T1" --target "$T1/.agent/skills" --dry-run
check_path install-dry-run-writes-nothing missing "$T1/.agent/skills/handover-pack"

# 未安装时 --check 要报未安装（否则这个开关没意义）
run_case install-check-before 1 --grep-out '未安装' \
  -- bash "$INSTALLER" --root "$T1" --target "$T1/.agent/skills" --check

run_case install-link 0 --grep-out '已链接' \
  -- bash "$INSTALLER" --root "$T1" --target "$T1/.agent/skills"
check_path install-link-created symlink "$T1/.agent/skills/handover-pack"
check_grep install-link-resolves "$T1/.agent/skills/handover-pack/SKILL.md" 'handover'

run_case install-check-after 0 --grep-out '已链接' \
  -- bash "$INSTALLER" --root "$T1" --target "$T1/.agent/skills" --check

# 幂等：重复安装不该失败、也不该变成嵌套目录
run_case install-idempotent 0 --grep-out '已链接' \
  -- bash "$INSTALLER" --root "$T1" --target "$T1/.agent/skills"
check_path install-idempotent-still-link symlink "$T1/.agent/skills/handover-pack"
check_path install-no-nesting missing "$T1/.agent/skills/handover-pack/handover-pack"

# 卸载 dry-run 同样只说不做
run_case uninstall-dry-run 0 --grep-out '将移除' \
  -- bash "$INSTALLER" --root "$T1" --target "$T1/.agent/skills" --uninstall --dry-run
check_path uninstall-dry-run-keeps symlink "$T1/.agent/skills/handover-pack"

run_case install-uninstall 0 --grep-out '已移除' \
  -- bash "$INSTALLER" --root "$T1" --target "$T1/.agent/skills" --uninstall
check_path install-uninstalled missing "$T1/.agent/skills/handover-pack"

# ── 复制模式：留来源标记，卸载能认出来 ──
T2="$TMP/inst/t2"; mkdir -p "$T2"
run_case install-copy 0 --grep-out '已复制' \
  -- bash "$INSTALLER" --root "$T2" --target "$T2/.agent/skills" --copy
check_path install-copy-is-real-dir dir "$T2/.agent/skills/handover-pack"
check_path install-copy-marker file "$T2/.agent/skills/handover-pack/.aodw-installed"
run_case install-copy-check 0 --grep-out '已复制' \
  -- bash "$INSTALLER" --root "$T2" --target "$T2/.agent/skills" --check
run_case install-copy-uninstall 0 --grep-out '已移除' \
  -- bash "$INSTALLER" --root "$T2" --target "$T2/.agent/skills" --uninstall
check_path install-copy-removed missing "$T2/.agent/skills/handover-pack"

# ── 安全底线：宿主自己的同名 skill 绝不覆盖、绝不删除 ──
# 只断言退出码不够——「先删了再报错」也会非 0。必须查文件还在、内容没变。
T3="$TMP/inst/t3"; mkdir -p "$T3/.agent/skills/handover-pack"
printf -- '---\nname: handover-pack\n---\n宿主自己写的同名 skill，不许动。\n' \
  > "$T3/.agent/skills/handover-pack/SKILL.md"

run_case install-refuses-foreign 1 --grep-out '非本脚本所建' \
  -- bash "$INSTALLER" --root "$T3" --target "$T3/.agent/skills"
check_grep install-foreign-intact "$T3/.agent/skills/handover-pack/SKILL.md" '宿主自己写的同名 skill'
check_path install-foreign-not-linked dir "$T3/.agent/skills/handover-pack"

run_case uninstall-refuses-foreign 1 --grep-out '非本脚本所装' \
  -- bash "$INSTALLER" --root "$T3" --target "$T3/.agent/skills" --uninstall
check_grep uninstall-foreign-intact "$T3/.agent/skills/handover-pack/SKILL.md" '宿主自己写的同名 skill'

# --check 也要把「目标存在但不是我们装的」报成问题，而不是当成已安装
run_case check-flags-foreign 1 --grep-out '非本脚本所装' \
  -- bash "$INSTALLER" --root "$T3" --target "$T3/.agent/skills" --check

# ── 目标目录解析顺序 ──
T4="$TMP/inst/t4"; mkdir -p "$T4"
run_case install-env-target 0 --grep-out '已链接' \
  -- env AODW_SKILLS_TARGET="$T4/自定义位置" bash "$INSTALLER" --root "$T4"
check_path install-env-target-used symlink "$T4/自定义位置/handover-pack"

# 已存在 .claude/skills 而无 .agent/skills → 装进 .claude
T5="$TMP/inst/t5"; mkdir -p "$T5/.claude/skills"
run_case install-detects-claude 0 --grep-out '已链接' -- bash "$INSTALLER" --root "$T5"
check_path install-claude-used symlink "$T5/.claude/skills/handover-pack"
check_path install-agent-not-created missing "$T5/.agent"

# 两个都在 → .agent 优先
T6="$TMP/inst/t6"; mkdir -p "$T6/.agent/skills" "$T6/.claude/skills"
run_case install-prefers-agent 0 --grep-out '已链接' -- bash "$INSTALLER" --root "$T6"
check_path install-agent-preferred symlink "$T6/.agent/skills/handover-pack"
check_path install-claude-untouched missing "$T6/.claude/skills/handover-pack"

# 都不在 → 新建 .agent/skills
T7="$TMP/inst/t7"; mkdir -p "$T7"
run_case install-creates-default 0 --grep-out '已链接' -- bash "$INSTALLER" --root "$T7"
check_path install-default-created symlink "$T7/.agent/skills/handover-pack"

# 没有 SKILL.md 的目录不是合法 skill，要跳过而不是照装
T8="$TMP/inst/t8"; mkdir -p "$T8/fake/.aodw-next/skills/不是skill" "$T8/proj"
cp "$INSTALLER" "$T8/fake/.aodw-next/"
mkdir -p "$T8/fake/.aodw-next/tools"
mv "$T8/fake/.aodw-next/install-skills.sh" "$T8/fake/.aodw-next/tools/install-skills.sh"
run_case install-skips-invalid 0 --grep-out '不是合法 skill' \
  -- bash "$T8/fake/.aodw-next/tools/install-skills.sh" --root "$T8/proj" --target "$T8/proj/.agent/skills"
check_path install-invalid-not-created missing "$T8/proj/.agent/skills/不是skill"

# ═══════════════════════════════════════════════════════════════════════════
echo
echo "== 汇总: PASS=$N_PASS FAIL=$N_FAIL SKIP=$N_SKIP =="
if [[ $N_FAIL -gt 0 ]]; then
  echo "失败用例: ${FAILED_NAMES[*]}"
  exit 1
fi
exit 0
