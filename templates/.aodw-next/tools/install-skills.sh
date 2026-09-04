#!/usr/bin/env bash
# =============================================================================
# install-skills.sh — 把 AODW 自带的 skill 安装到宿主项目的 skill 目录
# =============================================================================
# 为什么需要它：`.aodw-next/` 是可整体拷贝到其它项目的 AODW 框架目录，它自带的
# skill（`.aodw-next/skills/*`）跟着一起走；但各家 AI 工具是从**宿主目录**
# （如 `.agent/skills/` 或 `.claude/skills/`）发现 skill 的。本脚本负责把前者接到后者。
#
# 用法：
#   bash .aodw-next/tools/install-skills.sh                 # 安装（默认符号链接）
#   bash .aodw-next/tools/install-skills.sh --copy          # 复制而非链接
#   bash .aodw-next/tools/install-skills.sh --target <dir>  # 指定宿主 skill 目录
#   bash .aodw-next/tools/install-skills.sh --dry-run       # 只打印将要做什么，不改动
#   bash .aodw-next/tools/install-skills.sh --check         # 只检查安装状态，不改动
#   bash .aodw-next/tools/install-skills.sh --uninstall     # 移除本脚本装过的入口
#
# 目标目录的解析优先级（**不猜宿主是哪家工具**，只按下面的顺序）：
#   --target <dir>  >  $AODW_SKILLS_TARGET  >  已存在的 <root>/.agent/skills
#   >  已存在的 <root>/.claude/skills  >  新建 <root>/.agent/skills
# 项目根用 --root / $AODW_PROJECT_ROOT 指定，默认取 .aodw-next/ 的上级目录。
#
# 默认用**符号链接**：源码只有一份（在 .aodw-next/ 里），改了立刻生效，
# 也不会出现「宿主目录里的副本和 AODW 里的源不一致」这种老问题。
# 若你的环境不支持符号链接（部分 Windows / 某些同步盘），用 --copy。
#
# ── 安全约束 ────────────────────────────────────────────────────────────────
# 1. **绝不覆盖不是本脚本装的东西。** 目标已存在且非本脚本所建时一律跳过并报出。
# 2. 复制安装会在副本里留一个来源标记文件（见 MARKER），`--uninstall` **只删带
#    标记的副本**——宿主自己写的同名 skill 不会被误删。
# 3. `--dry-run` / `--check` 全程只读。
#
# 退出码：0 成功 / 1 有失败项（或 --check 发现未安装）/ 2 用法错误
# =============================================================================
set -uo pipefail

MARKER=".aodw-installed"   # 复制安装的来源标记；uninstall 据此判定「是我装的」

MODE="link"      # link | copy
ACTION="install" # install | check | uninstall
TARGET=""
ROOT_OPT=""
DRY_RUN=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --copy)      MODE="copy"; shift ;;
    --check)     ACTION="check"; shift ;;
    --uninstall) ACTION="uninstall"; shift ;;
    --dry-run)   DRY_RUN=1; shift ;;
    --target)    TARGET="${2:-}"; shift 2 ;;
    --root)      ROOT_OPT="${2:-}"; shift 2 ;;
    -h|--help)   sed -n '2,33p' "$0"; exit 0 ;;
    *)           echo "未知参数：$1（用 --help 看用法）" >&2; exit 2 ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AODW_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SKILLS_SRC="$AODW_DIR/skills"

if [[ -n "$ROOT_OPT" ]]; then
  [[ -d "$ROOT_OPT" ]] || { echo "指定的 --root 不是目录：$ROOT_OPT" >&2; exit 2; }
  PROJECT_ROOT="$(cd "$ROOT_OPT" && pwd)"
elif [[ -n "${AODW_PROJECT_ROOT:-}" ]]; then
  [[ -d "$AODW_PROJECT_ROOT" ]] || {
    echo "AODW_PROJECT_ROOT 不是目录：$AODW_PROJECT_ROOT" >&2; exit 2; }
  PROJECT_ROOT="$(cd "$AODW_PROJECT_ROOT" && pwd)"
else
  PROJECT_ROOT="$(cd "$AODW_DIR/.." && pwd)"
fi

[[ -d "$SKILLS_SRC" ]] || { echo "AODW 未自带 skill（$SKILLS_SRC 不存在），无需安装"; exit 0; }

# ── 探测宿主 skill 目录 ──────────────────────────────────────────────────────
detect_target() {
  [[ -n "$TARGET" ]] && { echo "$TARGET"; return; }
  [[ -n "${AODW_SKILLS_TARGET:-}" ]] && { echo "$AODW_SKILLS_TARGET"; return; }
  for d in "$PROJECT_ROOT/.agent/skills" "$PROJECT_ROOT/.claude/skills"; do
    [[ -d "$d" ]] && { echo "$d"; return; }
  done
  echo "$PROJECT_ROOT/.agent/skills"   # 都不存在时的默认落点
}
TARGET_DIR="$(detect_target)"

# 相对路径展示，避免把本机绝对路径写进输出/日志
rel_to_root() {
  case "$1" in
    "$PROJECT_ROOT"/*) printf '%s' "${1#"$PROJECT_ROOT"/}" ;;
    "$PROJECT_ROOT")   printf '.' ;;
    *)                 printf '%s' "$1" ;;
  esac
}

echo "AODW skill 安装器"
echo "  项目根：$(rel_to_root "$PROJECT_ROOT")  ($PROJECT_ROOT)"
echo "  源：    $(rel_to_root "$SKILLS_SRC")"
echo "  目标：  $(rel_to_root "$TARGET_DIR")"
echo "  模式：  $([[ "$MODE" == link ]] && echo '符号链接（改源即生效）' || echo '复制')"
[[ $DRY_RUN -eq 1 ]] && echo "  ⚠️ dry-run：以下动作**不会真的执行**"
echo

fails=0
installed=0
planned=0

# 判定目标是不是本脚本装的：符号链接 = 是；带 MARKER 的目录 = 是；其余 = 不是
is_ours() {
  local d="$1"
  [[ -L "$d" ]] && return 0
  [[ -d "$d" && -f "$d/$MARKER" ]] && return 0
  return 1
}

for src in "$SKILLS_SRC"/*/; do
  [[ -d "$src" ]] || continue
  name="$(basename "$src")"
  [[ -f "$src/SKILL.md" ]] || { echo "  跳过 $name（无 SKILL.md，不是合法 skill）"; continue; }
  dst="$TARGET_DIR/$name"

  case "$ACTION" in
    check)
      if [[ -L "$dst" ]]; then
        printf '  %-18s 已链接 → %s\n' "$name" "$(readlink "$dst")"
      elif [[ -d "$dst" && -f "$dst/$MARKER" ]]; then
        printf '  %-18s 已复制（本脚本所装；源更新后需重装）\n' "$name"
      elif [[ -d "$dst" ]]; then
        printf '  %-18s ⚠ 目标存在但非本脚本所装（无 %s 标记）\n' "$name" "$MARKER"
        fails=$((fails+1))
      else
        printf '  %-18s ✗ 未安装\n' "$name"; fails=$((fails+1))
      fi
      ;;

    uninstall)
      if [[ -L "$dst" ]]; then
        if [[ $DRY_RUN -eq 1 ]]; then
          printf '  %-18s [dry-run] 将移除链接\n' "$name"; planned=$((planned+1))
        else
          rm -f "$dst"; printf '  %-18s 已移除链接\n' "$name"
        fi
      elif [[ -d "$dst" && -f "$dst/$MARKER" ]]; then
        if [[ $DRY_RUN -eq 1 ]]; then
          printf '  %-18s [dry-run] 将移除副本\n' "$name"; planned=$((planned+1))
        else
          rm -rf "$dst"; printf '  %-18s 已移除副本\n' "$name"
        fi
      elif [[ -e "$dst" ]]; then
        # 关键安全项：没有来源标记 = 不是我们装的 = 绝不删
        printf '  %-18s ⚠ 目标存在但无 %s 标记，非本脚本所装，跳过不删\n' "$name" "$MARKER"
        fails=$((fails+1))
      else
        printf '  %-18s 本就未安装\n' "$name"
      fi
      ;;

    install)
      # 已存在且不是我们装的 → 不覆盖，报出来让人决定
      if [[ -e "$dst" ]] && ! is_ours "$dst"; then
        printf '  %-18s ⚠ 目标已存在且非本脚本所建，跳过（如需覆盖请先手动移除）\n' "$name"
        fails=$((fails+1)); continue
      fi

      if [[ $DRY_RUN -eq 1 ]]; then
        if [[ "$MODE" == "link" ]]; then
          printf '  %-18s [dry-run] 将链接 → %s\n' "$name" "$(rel_to_root "${src%/}")"
        else
          printf '  %-18s [dry-run] 将复制（并写入 %s 标记）\n' "$name" "$MARKER"
        fi
        planned=$((planned+1)); continue
      fi

      mkdir -p "$TARGET_DIR"
      # 幂等：先清掉旧入口（此时已确认是我们装的），再重建
      rm -rf "$dst"

      if [[ "$MODE" == "link" ]]; then
        # 用相对路径链接：仓库整体移动位置后仍然有效
        rel="$(python3 -c "import os,sys;print(os.path.relpath(sys.argv[1],sys.argv[2]))" "$src" "$TARGET_DIR" 2>/dev/null)"
        if [[ -n "$rel" ]] && ln -s "${rel%/}" "$dst" 2>/dev/null; then
          printf '  %-18s ✓ 已链接 → %s\n' "$name" "${rel%/}"
        elif ln -s "${src%/}" "$dst" 2>/dev/null; then
          printf '  %-18s ✓ 已链接（绝对路径回退）\n' "$name"
        else
          printf '  %-18s ✗ 链接失败——改用 --copy 重试\n' "$name"; fails=$((fails+1)); continue
        fi
      else
        if cp -R "${src%/}" "$dst"; then
          # 写来源标记：uninstall 据此确认「这是我装的」，绝不误删宿主自有 skill
          printf '%s\n' \
            "# 本目录由 .aodw-next/tools/install-skills.sh --copy 安装，可被 --uninstall 移除。" \
            "# 源：.aodw-next/skills/$name（改源后需重新运行安装脚本）" \
            > "$dst/$MARKER"
          printf '  %-18s ✓ 已复制\n' "$name"
        else
          printf '  %-18s ✗ 复制失败\n' "$name"; fails=$((fails+1)); continue
        fi
      fi
      installed=$((installed+1))
      ;;
  esac
done

echo
if [[ "$ACTION" == "install" ]]; then
  if [[ $DRY_RUN -eq 1 ]]; then
    echo "  dry-run 完成：计划安装 $planned 个，将跳过 $fails 个（未做任何改动）"
  else
    echo "  完成：成功 $installed 个，失败 $fails 个"
    if [[ $installed -gt 0 ]]; then
      echo
      echo "  ⚠️ 两件事："
      echo "     1. 符号链接方式下，建议把 $(rel_to_root "$TARGET_DIR") 下的入口"
      echo "        **加入 .gitignore**——源已经在 .aodw-next/ 里受控，两处都跟踪会重复。"
      echo "     2. 新会话可能需要重启才能发现新装的 skill。"
    fi
  fi
elif [[ "$ACTION" == "check" ]]; then
  echo "  检查完成：有问题的 $fails 个"
elif [[ "$ACTION" == "uninstall" ]]; then
  if [[ $DRY_RUN -eq 1 ]]; then
    echo "  dry-run 完成：计划移除 $planned 个，将跳过 $fails 个（未做任何改动）"
  else
    echo "  卸载完成：跳过 $fails 个（非本脚本所装的一律不删）"
  fi
fi

[[ $fails -eq 0 ]] || exit 1
exit 0
