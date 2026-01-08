#!/usr/bin/env bash
set -euo pipefail

CONFIG_FILE="${CONFIG_FILE:-project-config.json}"

# ===== 工具检查 =====
need() { command -v "$1" >/dev/null 2>&1 || { echo "❌ 缺少依赖：$1"; exit 1; }; }
need git
need jq

echo "🚀 Promote (测试 → 生产) 自动发布脚本启动..."

# ===== 首次运行：初始化配置 =====
if [ ! -f "$CONFIG_FILE" ]; then
  echo "🧩 首次运行，开始初始化配置文件：$CONFIG_FILE"
  read -r -p "本地主干分支名（默认 master）: " project_branch
  project_branch=${project_branch:-master}

  # 默认远程名改为 server
  read -r -p "远程名（默认 server）: " remote_name
  remote_name=${remote_name:-server}

  read -r -p "服务器测试分支名（默认 master）: " remote_master
  remote_master=${remote_master:-master}

  read -r -p "服务器生产分支名（默认 release）: " remote_release
  remote_release=${remote_release:-release}

  read -r -p "是否使用 QA 标签发布？(y/N 默认否): " use_qa
  use_qa_tag=false
  if [[ "$use_qa" == "y" || "$use_qa" == "Y" ]]; then
    use_qa_tag=true
  fi

  read -r -p "QA 标签前缀（默认 qa-ok/）: " qa_tag_prefix
  qa_tag_prefix=${qa_tag_prefix:-qa-ok/}

  read -r -p "生产标签前缀（默认 prod-）: " prod_tag_prefix
  prod_tag_prefix=${prod_tag_prefix:-prod-}

  cat > "$CONFIG_FILE" <<JSON
{
  "project_branch": "$project_branch",
  "remote_name": "$remote_name",
  "remote_master": "$remote_master",
  "remote_release": "$remote_release",
  "use_qa_tag": $use_qa_tag,
  "qa_tag_prefix": "$qa_tag_prefix",
  "prod_tag_prefix": "$prod_tag_prefix"
}
JSON
  echo "✅ 已创建配置文件：$CONFIG_FILE"
fi

# ===== 读取配置 =====
PROJECT_BRANCH=$(jq -r '.project_branch' "$CONFIG_FILE")
REMOTE_NAME=$(jq -r '.remote_name' "$CONFIG_FILE")
REMOTE_MASTER=$(jq -r '.remote_master' "$CONFIG_FILE")
REMOTE_RELEASE=$(jq -r '.remote_release' "$CONFIG_FILE")
USE_QA_TAG=$(jq -r '.use_qa_tag' "$CONFIG_FILE")
QA_TAG_PREFIX=$(jq -r '.qa_tag_prefix' "$CONFIG_FILE")
PROD_TAG_PREFIX=$(jq -r '.prod_tag_prefix' "$CONFIG_FILE")

echo "📦 使用配置: local=$PROJECT_BRANCH, remote=$REMOTE_NAME, test=$REMOTE_MASTER, prod=$REMOTE_RELEASE"

# ===== 保存当前开发状态 =====
CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD || echo HEAD)"
STASHED=0
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "💾 暂存本地未提交变更..."
  git add -A
  git stash push -m "auto-stash-before-promote $(date +%F_%T)"
  STASHED=1
fi

# ===== 临时分支名称 =====
TMP="__tmp_release_promote__"

# ===== 清理函数：确保临时分支和文件被清理 =====
cleanup() {
  local exit_code=$?
  echo ""
  echo "🧹 清理临时资源..."
  
  # 切换到非临时分支（避免删除当前所在分支）
  if [ "$(git rev-parse --abbrev-ref HEAD)" = "$TMP" ]; then
    git checkout "$PROJECT_BRANCH" >/dev/null 2>&1 || git checkout "$CURRENT_BRANCH" >/dev/null 2>&1 || true
  fi
  
  # 删除临时分支（如果存在）
  if git show-ref --verify --quiet "refs/heads/$TMP"; then
    echo "🗑️  删除临时分支: $TMP"
    git branch -D "$TMP" >/dev/null 2>&1 || true
  fi
  
  # 清理可能存在的其他临时分支（兼容旧版本）
  for old_tmp in tmp_release_sync __tmp_release_promote__; do
    if git show-ref --verify --quiet "refs/heads/$old_tmp"; then
      echo "🗑️  删除遗留临时分支: $old_tmp"
      git branch -D "$old_tmp" >/dev/null 2>&1 || true
    fi
  done
  
  # 删除临时变更日志文件
  rm -f .promote_changelog_*.txt || true
  
  # 恢复原工作分支和暂存
  restore
  
  if [ $exit_code -ne 0 ]; then
    echo "⚠️  脚本执行失败（退出码: $exit_code）"
  fi
  exit $exit_code
}

restore() {
  echo "🔙 恢复原工作分支: $CURRENT_BRANCH"
  git checkout "$CURRENT_BRANCH" >/dev/null 2>&1 || true
  if [ $STASHED -eq 1 ]; then
    echo "📥 恢复暂存变更..."
    git stash pop || echo "⚠️ 恢复发生冲突，请手动处理。"
  fi
}

# 注册清理函数（在 EXIT、INT、TERM 信号时执行）
trap cleanup EXIT INT TERM

# ===== 脚本开始时清理可能存在的旧临时分支 =====
echo "🔍 检查并清理可能存在的旧临时分支..."
for old_tmp in tmp_release_sync __tmp_release_promote__; do
  if git show-ref --verify --quiet "refs/heads/$old_tmp" 2>/dev/null; then
    echo "🧹 发现遗留临时分支: $old_tmp，正在清理..."
    if [ "$(git rev-parse --abbrev-ref HEAD)" = "$old_tmp" ]; then
      git checkout "$PROJECT_BRANCH" >/dev/null 2>&1 || git checkout "$CURRENT_BRANCH" >/dev/null 2>&1 || true
    fi
    git branch -D "$old_tmp" >/dev/null 2>&1 || true
  fi
done

# ===== 获取远端最新信息 =====
git fetch "$REMOTE_NAME" --prune

# ===== 确定测试基线（QA 标签或 HEAD） =====
if [ "$USE_QA_TAG" = "true" ]; then
  TEST_BASE_COMMIT=$(git ls-remote --tags "$REMOTE_NAME" | awk -v pfx="refs/tags/$QA_TAG_PREFIX" '$2 ~ pfx {print $1 " " $2}' | sort -k2 | tail -n1 | awk '{print $1}')
  [ -n "$TEST_BASE_COMMIT" ] || { echo "❌ 未找到任何 ${QA_TAG_PREFIX}* 标签"; exit 1; }
  echo "✅ 使用 QA 标签作为基线: $TEST_BASE_COMMIT"
else
  TEST_BASE_COMMIT=$(git ls-remote "$REMOTE_NAME" "$REMOTE_MASTER" | awk '{print $1}')
  [ -n "$TEST_BASE_COMMIT" ] || { echo "❌ 获取 $REMOTE_NAME/$REMOTE_MASTER 失败"; exit 1; }
  echo "✅ 使用 $REMOTE_NAME/$REMOTE_MASTER HEAD 作为基线: $TEST_BASE_COMMIT"
fi

# ===== 查找上一个生产标签 =====
LAST_PROD_TAG=$(git ls-remote --tags "$REMOTE_NAME" | awk -v pfx="refs/tags/$PROD_TAG_PREFIX" '$2 ~ pfx {print $2}' | sed 's#refs/tags/##' | sort | tail -n1 || true)
echo "ℹ️ 上一个生产标签: ${LAST_PROD_TAG:-<无>}"

# ===== 临时分支合并测试基线到生产 =====
# 检查远程 release 分支是否存在
if git ls-remote --heads "$REMOTE_NAME" "$REMOTE_RELEASE" | grep -q .; then
  echo "📥 远程生产分支存在，基于远程分支创建临时分支..."
  # 基于远程 release 分支创建临时分支
  git checkout -B "$TMP" "$REMOTE_NAME/$REMOTE_RELEASE"
else
  echo "📥 远程生产分支不存在，基于当前分支创建..."
  git checkout -B "$TMP"
fi

set +e
git merge --no-ff --no-edit "$TEST_BASE_COMMIT"
MERGE_STATUS=$?
set -e
if [ $MERGE_STATUS -ne 0 ]; then
  echo "❌ 合并冲突，请手动解决后再运行（保留在 $TMP）"
  exit 1
fi

# ===== 生成标签 & 变更日志 =====
SHORTSHA=$(git rev-parse --short "$TEST_BASE_COMMIT")
NEW_PROD_TAG="${PROD_TAG_PREFIX}$(date +%Y%m%d-%H%M)-${SHORTSHA}"
CHANGELOG_FILE=".promote_changelog_${NEW_PROD_TAG}.txt"
if [ -n "$LAST_PROD_TAG" ]; then
  git log --pretty=format:'- %h %s (%an, %ad)' --date=short "${LAST_PROD_TAG}..$TEST_BASE_COMMIT" > "$CHANGELOG_FILE"
else
  git log --pretty=format:'- %h %s (%an, %ad)' --date=short "$TEST_BASE_COMMIT" > "$CHANGELOG_FILE"
fi
echo "📝 变更日志写入: $CHANGELOG_FILE"

# ===== 推送到生产分支 + 打标签 =====
echo "🚀 推送到生产分支: $REMOTE_RELEASE"
git push "$REMOTE_NAME" "$TMP:$REMOTE_RELEASE"

echo "🏷️ 推送生产标签: $NEW_PROD_TAG"
git tag -a "$NEW_PROD_TAG" -m "Promote $REMOTE_MASTER → $REMOTE_RELEASE
Base: $TEST_BASE_COMMIT
Changelog:
$(cat "$CHANGELOG_FILE")"
git push "$REMOTE_NAME" "$NEW_PROD_TAG"

# ===== 清理现场（cleanup 函数会自动处理，这里显式清理以确保及时释放） =====
if [ "$(git rev-parse --abbrev-ref HEAD)" = "$TMP" ]; then
  git checkout "$PROJECT_BRANCH" >/dev/null 2>&1 || true
fi
if git show-ref --verify --quiet "refs/heads/$TMP" 2>/dev/null; then
  git branch -D "$TMP" >/dev/null 2>&1 || true
fi
rm -f "$CHANGELOG_FILE" || true

echo "✅ 发布完成！新生产标签: $NEW_PROD_TAG"
echo "ℹ️ 回滚提示：可回滚到上一个生产标签：${LAST_PROD_TAG:-<无>}"