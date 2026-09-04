#!/usr/bin/env bash
# =============================================================================
# next-number.sh — 给新交接包取一个不会撞的 H 序号
# =============================================================================
# 用法：
#   next-number.sh                    打印下一个可用序号（如 H004）与占用情况
#   next-number.sh --quiet            只打印序号本身，便于脚本取用
#   next-number.sh --list             列出全部已占用序号及其来源
#   next-number.sh --dir <path>       指定交接包目录（默认 docs/handover）
#   next-number.sh --root <dir>       指定项目根（默认取当前 git 顶层）
#
# 目录与项目根也可用环境变量或配置指定，优先级见 _common.sh：
#   --dir  >  $AODW_HANDOVER_DIR  >  .aodw-next/config.yaml 的 handover_dir  >  docs/handover
#   --root >  $AODW_PROJECT_ROOT  >  当前 git 顶层  >  脚本所在仓库顶层
#
# 为什么不能只 ls 一下工作区：
#   人工取号有两类已知事故——①在**未合并的分支**上占了号，合并时整块丢失，
#   数日后才靠翻 git 历史找回；②同一个问题隔了些天被登记两次。
#   只看当前工作区，这两类坑都挡不住。
#   故本脚本扫三处：①工作区文件 ②HEAD 的历史提交 ③**全部分支（含未合并的）**。
#
# 退出码：0 正常 / 2 用法错误
# =============================================================================
set -uo pipefail

# shellcheck source=_common.sh
. "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/_common.sh"

MODE="normal"
DIR_OPT=""
ROOT_OPT=""

while [[ $# -gt 0 ]]; do
  case "${1:-}" in
    --quiet) MODE="quiet"; shift ;;
    --list)  MODE="list"; shift ;;
    --dir)   DIR_OPT="${2:-}"; shift 2 ;;
    --root)  ROOT_OPT="${2:-}"; shift 2 ;;
    -h|--help) sed -n '2,20p' "$0"; exit 0 ;;
    *) echo "未知参数：${1}（用 --help 看用法）" >&2; exit 2 ;;
  esac
done

REPO="$(hp_resolve_root "$ROOT_OPT")" || {
  echo "定位不到项目根（不在 git 仓库内？）——无法可靠取号。" >&2
  echo "可用 --root <dir> 或 AODW_PROJECT_ROOT 显式指定。" >&2
  exit 2; }
cd "$REPO" || exit 2

DIR="$(hp_resolve_dir "$DIR_OPT" "$REPO")" || exit 2

# ① 工作区
scan_worktree() {
  [[ -d "$DIR" ]] || return 0
  ls "$DIR" 2>/dev/null | grep -o "^H[0-9]\{3\}" | sed 's/^/工作区 /'
}
# ② 历史提交（文件可能已改名或删除，但号被用过就不该复用）
# core.quotepath=false：git 默认把非 ASCII 路径输出成 C 转义串
# （`交接/H004.md` → `"\344\272\244\346\216\245/H004.md"`），那样下面的 grep 全部落空，
# 历史与分支两路扫描静默失效——只剩工作区一路，正好漏掉它要防的那两类撞号事故。
scan_history() {
  git -c core.quotepath=false log --all --pretty=format: --name-only --diff-filter=A -- "$DIR" 2>/dev/null \
    | grep -o "$DIR/H[0-9]\{3\}" | sed "s|$DIR/||" | sed 's/^/历史   /'
}
# ③ 全部分支的当前内容（含未合并分支——已知事故 ① 正是栽在这）
scan_branches() {
  for ref in $(git for-each-ref --format='%(refname)' refs/heads refs/remotes 2>/dev/null); do
    git -c core.quotepath=false ls-tree -r --name-only "$ref" -- "$DIR" 2>/dev/null \
      | grep -o "$DIR/H[0-9]\{3\}" | sed "s|$DIR/||" \
      | sed "s|^|$(basename "$ref") |"
  done
}

ALL="$(printf '%s\n%s\n%s\n' "$(scan_worktree)" "$(scan_history)" "$(scan_branches)" | grep -v '^$' || true)"
USED="$(printf '%s' "$ALL" | awk '{print $2}' | sort -u | grep -v '^$' || true)"

if [[ "$MODE" == "list" ]]; then
  echo "已占用的 H 序号（目录：$DIR；来源含未合并分支）："
  if [[ -z "$USED" ]]; then echo "  （无）"; else
    while read -r n; do
      [[ -n "$n" ]] || continue
      src="$(printf '%s' "$ALL" | awk -v n="$n" '$2==n{printf "%s ", $1}' | tr ' ' '\n' | sort -u | tr '\n' ' ')"
      printf '  %s  ← %s\n' "$n" "$src"
    done <<< "$USED"
  fi
  exit 0
fi

max=0
while read -r n; do
  [[ -n "$n" ]] || continue
  v=$((10#${n#H}))
  (( v > max )) && max=$v
done <<< "$USED"

next="$(printf 'H%03d' $((max + 1)))"

if [[ "$MODE" == "quiet" ]]; then
  echo "$next"; exit 0
fi

count="$(printf '%s' "$USED" | grep -c . || true)"
echo "交接包取号"
echo "  目录：  $DIR（相对 $REPO）"
echo "  已占用：$count 个（扫描范围：工作区 + 历史提交 + 全部分支含未合并）"
[[ -n "$USED" ]] && echo "  已用号：$(printf '%s' "$USED" | tr '\n' ' ')"
echo
echo "  下一个可用：$next"
echo
echo "  用法：$DIR/${next}-<主题>.md"
echo "  ⚠️ 取号后请尽快提交占位，长期只在本地分支持有会让别人看不到。"
