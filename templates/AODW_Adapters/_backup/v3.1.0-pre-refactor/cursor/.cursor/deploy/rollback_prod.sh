#!/usr/bin/env bash
# 回滚生产分支到某个已发布的生产标签（默认回滚到上一枚 prod-* 标签）
# 依赖：git、jq；使用同目录/项目根的 project-config.json
set -euo pipefail

CONFIG_FILE="${CONFIG_FILE:-project-config.json}"

need() { command -v "$1" >/dev/null 2>&1 || { echo "❌ 缺少依赖：$1"; exit 1; }; }
need git
need jq

# 读取配置
[ -f "$CONFIG_FILE" ] || { echo "❌ 缺少 $CONFIG_FILE，请先运行 promote_only.sh 初始化"; exit 1; }
REMOTE_NAME=$(jq -r '.remote_name' "$CONFIG_FILE")
REMOTE_RELEASE=$(jq -r '.remote_release' "$CONFIG_FILE")
PROD_TAG_PREFIX=$(jq -r '.prod_tag_prefix' "$CONFIG_FILE")

# 参数解析（可选）：
#   --to-tag <tag>      指定要回滚到的标签
#   --dry-run           只显示将要执行的动作，不真正推送
TO_TAG=""
DRY_RUN=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --to-tag)
      TO_TAG="${2:-}"; shift 2;;
    --dry-run)
      DRY_RUN=1; shift;;
    *)
      echo "未知参数: $1"; exit 1;;
  esac
done

echo "🔁 准备回滚生产分支（${REMOTE_NAME}/${REMOTE_RELEASE}），标签前缀: ${PROD_TAG_PREFIX}"

# 拉取远端最新
git fetch "$REMOTE_NAME" --prune --tags

# 获取所有 prod 标签（按字典序/时间戳命名会自然有序）
readarray -t PROD_TAGS < <(git tag -l "${PROD_TAG_PREFIX}*" | sort)

if [[ -z "$TO_TAG" ]]; then
  # 自动选择“上一枚”生产标签（倒数第二个）
  CNT=${#PROD_TAGS[@]}
  if (( CNT < 2 )); then
    echo "❌ 生产标签少于 2 个，无法自动回滚（至少需要一个当前标签和一个上一个标签）"
    exit 1
  fi
  CURRENT="${PROD_TAGS[$((CNT-1))]}"
  TARGET="${PROD_TAGS[$((CNT-2))]}"
else
  TARGET="$TO_TAG"
  # 当前最新标签用于展示
  if ((${#PROD_TAGS[@]} > 0)); then
    CURRENT="${PROD_TAGS[-1]}"
  else
    CURRENT="<未知>"
  fi
  # 校验目标标签存在
  if ! git rev-parse -q --verify "refs/tags/$TARGET" >/dev/null; then
    echo "❌ 指定的标签不存在: $TARGET"
    exit 1
  fi
fi

echo "🧭 当前最新生产标签: $CURRENT"
echo "🎯 目标回滚到的标签: $TARGET"

# 解析目标提交
TARGET_COMMIT="$(git rev-list -n 1 "$TARGET")"
[ -n "$TARGET_COMMIT" ] || { echo "❌ 无法解析目标标签提交: $TARGET"; exit 1; }

echo "📌 目标提交: $TARGET_COMMIT"

# 预览动作
echo "📝 将把远端分支 ${REMOTE_NAME}/${REMOTE_RELEASE} 指向 ${TARGET}（强制推送）"
if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "🔎 DRY-RUN: 不会真正推送。"
  exit 0
fi

# 强制把 release 指向目标标签对应的提交
git push "$REMOTE_NAME" "$TARGET:refs/heads/$REMOTE_RELEASE" --force

# 生成一次回滚标记标签（可选但建议保留审计）
ROLLBACK_TAG="rollback-$(date +%Y%m%d-%H%M)-${TARGET}"
if git rev-parse -q --verify "refs/tags/$ROLLBACK_TAG" >/dev/null; then
  # 极少数情况下重名，则附加随机后缀
  ROLLBACK_TAG="${ROLLBACK_TAG}-$(openssl rand -hex 2 2>/dev/null || echo rnd)"
fi

git tag -a "$ROLLBACK_TAG" -m "Rollback ${REMOTE_RELEASE} to ${TARGET}
From: ${CURRENT}
To:   ${TARGET}
At:   $(date +'%F %T')"
git push "$REMOTE_NAME" "$ROLLBACK_TAG" || echo "⚠️ 回滚标记标签推送失败（非致命）"

echo "✅ 回滚完成：${REMOTE_NAME}/${REMOTE_RELEASE} → ${TARGET}"
echo "ℹ️ 审计标签：$ROLLBACK_TAG"