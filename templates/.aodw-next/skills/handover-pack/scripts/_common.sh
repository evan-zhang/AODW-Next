#!/usr/bin/env bash
# =============================================================================
# _common.sh — 交接包脚本的共享配置解析（被 next-number.sh / check-closure.sh 引用）
# =============================================================================
# 本文件不单独执行，只供 source。它把「项目根」和「交接包落点目录」这两件
# 随宿主项目而变的事收敛成一处，避免各脚本各写一份硬编码路径。
#
# ── 解析顺序（越靠前优先级越高）─────────────────────────────────────────────
#
# 项目根 root：
#   1. 显式 --root <dir>
#   2. 环境变量 AODW_PROJECT_ROOT
#   3. 当前工作目录所在的 git 顶层        ← 默认；「宿主项目」的正确语义
#   4. 本脚本所在目录所在的 git 顶层      ← 兜底
#
#   为什么以 CWD 优先：skill 可能以符号链接方式挂在 .agent/skills/ 下，也可能
#   整个 .aodw-next/ 是指向共享位置的链接。此时「脚本在哪」不等于「项目在哪」，
#   而用户总是在宿主项目里执行命令。第 4 条保留脚本目录兜底，保证在
#   非 git 的 CWD 下调用时行为与旧版一致。
#
# 交接包目录 handover_dir（相对 root）：
#   1. 显式 --dir <path>
#   2. 环境变量 AODW_HANDOVER_DIR
#   3. <root>/.aodw-next/config.yaml 的 handover_dir 键
#   4. 内置默认 docs/handover
#
#   用 sed 而非 YAML 库读 config.yaml：干净的 CI 解释器没有 PyYAML，
#   本层不该因此挂掉（与 rt-guard.sh 退回子集解析器同一理由）。
# =============================================================================

# 本文件所在目录（解析符号链接后的真实位置）
hp_script_dir() {
  cd "$(dirname "${BASH_SOURCE[0]}")" && pwd
}

# 解析项目根。$1 = 显式指定值（可为空）。失败返回非 0。
hp_resolve_root() {
  local explicit="${1:-}" r=""

  if [[ -n "$explicit" ]]; then
    [[ -d "$explicit" ]] || { echo "指定的 --root 不是目录：$explicit" >&2; return 2; }
    (cd "$explicit" && pwd)
    return 0
  fi

  if [[ -n "${AODW_PROJECT_ROOT:-}" ]]; then
    [[ -d "$AODW_PROJECT_ROOT" ]] || {
      echo "AODW_PROJECT_ROOT 不是目录：$AODW_PROJECT_ROOT" >&2; return 2; }
    (cd "$AODW_PROJECT_ROOT" && pwd)
    return 0
  fi

  r="$(git rev-parse --show-toplevel 2>/dev/null)" && [[ -n "$r" ]] && { echo "$r"; return 0; }

  local sd
  sd="$(hp_script_dir)"
  r="$(git -C "$sd" rev-parse --show-toplevel 2>/dev/null)" && [[ -n "$r" ]] && { echo "$r"; return 0; }

  return 1
}

# 解析交接包目录，输出**相对 root** 的路径（无尾斜杠）。
# $1 = 显式指定值（可为空）；$2 = 已解析的 root。
hp_resolve_dir() {
  local explicit="${1:-}" root="${2:-}" d=""

  if [[ -n "$explicit" ]]; then
    d="$explicit"
  elif [[ -n "${AODW_HANDOVER_DIR:-}" ]]; then
    d="$AODW_HANDOVER_DIR"
  elif [[ -n "$root" && -f "$root/.aodw-next/config.yaml" ]]; then
    d="$(sed -n 's/^[[:space:]]*handover_dir:[[:space:]]*["'"'"']\{0,1\}\([^"'"'"'#]*\)["'"'"']\{0,1\}.*$/\1/p' \
         "$root/.aodw-next/config.yaml" | head -1 | sed 's/[[:space:]]*$//')"
  fi

  [[ -n "$d" ]] || d="docs/handover"

  # 绝对路径 → 折算成相对 root（git ls-tree / git log 的 pathspec 需要仓库相对路径）
  if [[ "$d" = /* ]]; then
    case "$d" in
      "$root"/*) d="${d#"$root"/}" ;;
      "$root")   d="." ;;
      *) echo "交接包目录必须位于项目根内：$d（root=$root）" >&2; return 2 ;;
    esac
  fi

  # 去尾斜杠与前导 ./
  d="${d%/}"
  d="${d#./}"
  [[ -n "$d" ]] || { echo "交接包目录解析为空" >&2; return 2; }
  echo "$d"
}
