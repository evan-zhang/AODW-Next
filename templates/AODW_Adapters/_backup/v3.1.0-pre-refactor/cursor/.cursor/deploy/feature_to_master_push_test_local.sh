#!/usr/bin/env bash
# 只处理【本地存在、远端不存在】的当前功能分支：
# 1) 合并到本地主干（master/main，取决于配置）
# 2) 推送主干到测试环境（server/master）
# 3) 删除本地功能分支
# 不触碰任何其他本地功能分支；不尝试任何远端功能分支操作。
set -euo pipefail

CONFIG_FILE="${CONFIG_FILE:-project-config.json}"

# 可选开关
MERGE_NO_FF=${MERGE_NO_FF:-true}     # true: --no-ff 保留合并记录；false: --ff-only
DELETE_LOCAL_FEATURE=${DELETE_LOCAL_FEATURE:-true}  # 是否删除本地功能分支

need() { command -v "$1" >/dev/null 2>&1 || { echo "❌ 缺少依赖：$1"; exit 1; }; }
need git
need jq

echo "🚀 本地功能分支 → master → 推送测试（只处理当前分支）"

# ========== 错误处理和回滚机制 ==========
# 保存关键状态
ORIGINAL_BRANCH=""
ORIGINAL_COMMIT=""
MERGE_COMMIT=""
STASHED=0
ROLLBACK_NEEDED=false
PUSHED_TO_REMOTE=false
ERROR_OCCURRED=false

# 错误处理函数
handle_error() {
  # 防止错误处理函数本身出错导致无限循环
  if [ "$ERROR_OCCURRED" = "true" ]; then
    echo "❌ 错误处理过程中再次发生错误，强制退出"
    exit 1
  fi
  ERROR_OCCURRED=true
  
  local exit_code=${1:-$?}
  local line_number=${2:-$LINENO}
  local error_message="${3:-未知错误}"
  
  echo ""
  echo "❌ ========================================"
  echo "❌ 脚本执行失败！"
  echo "❌ ========================================"
  echo "❌ 错误位置：第 ${line_number} 行"
  echo "❌ 错误信息：${error_message}"
  echo "❌ 退出码：${exit_code}"
  echo ""
  
  # 执行回滚
  if [ "$ROLLBACK_NEEDED" = "true" ]; then
    echo "🔄 开始执行回滚..."
    rollback_changes
  else
    echo "ℹ️ 无需回滚（未执行关键操作）"
  fi
  
  # 恢复工作状态
  restore_work_state
  
  echo ""
  echo "❌ ========================================"
  echo "❌ 脚本执行失败，请检查错误信息并手动处理"
  echo "❌ ========================================"
  echo ""
  exit $exit_code
}

# 回滚函数
rollback_changes() {
  echo "🔄 执行回滚操作..."
  
  # 如果已经合并，尝试撤销合并
  if [ -n "$MERGE_COMMIT" ] && [ "$MERGE_COMMIT" != "" ] && [ -n "$ORIGINAL_COMMIT" ]; then
    echo "🔄 撤销合并提交：$MERGE_COMMIT"
    echo "🔄 回滚到提交：$ORIGINAL_COMMIT"
    set +e
    git reset --hard "$ORIGINAL_COMMIT" 2>/dev/null
    RESET_RESULT=$?
    set -e
    
    if [ $RESET_RESULT -eq 0 ]; then
      echo "✅ 已成功撤销合并"
    else
      echo "⚠️ 无法自动撤销合并，请手动执行："
      echo "   git reset --hard $ORIGINAL_COMMIT"
    fi
  fi
  
  # 如果已经推送到远程，提示用户
  if [ "$PUSHED_TO_REMOTE" = "true" ]; then
    echo ""
    echo "⚠️ ========================================"
    echo "⚠️ 重要提示：代码已推送到远程仓库"
    echo "⚠️ ========================================"
    echo "⚠️ 如果需要回滚远程分支，请手动执行："
    if [ -n "$ORIGINAL_COMMIT" ]; then
      echo "   git push $REMOTE_NAME $ORIGINAL_COMMIT:$REMOTE_MASTER --force"
    else
      echo "   # 请先确定要回滚到的提交，然后执行强制推送"
    fi
    echo "⚠️ ========================================"
    echo ""
  fi
}

# 恢复工作状态
restore_work_state() {
  echo "🔙 恢复工作状态..."
  
  # 切回原分支
  if [ -n "$ORIGINAL_BRANCH" ] && [ "$ORIGINAL_BRANCH" != "" ]; then
    echo "🔙 尝试切回原分支：$ORIGINAL_BRANCH"
    set +e
    git checkout "$ORIGINAL_BRANCH" >/dev/null 2>&1
    CHECKOUT_RESULT=$?
    set -e
    
    if [ $CHECKOUT_RESULT -eq 0 ]; then
      echo "✅ 已切回原分支：$ORIGINAL_BRANCH"
    else
      echo "⚠️ 无法切回原分支，当前分支：$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '未知')"
    fi
  fi
  
  # 恢复暂存的修改
  if [ $STASHED -eq 1 ]; then
    echo "📥 恢复暂存的修改..."
    set +e
    git stash pop >/dev/null 2>&1
    STASH_RESULT=$?
    set -e
    
    if [ $STASH_RESULT -eq 0 ]; then
      echo "✅ 已恢复暂存的修改"
    else
      echo "⚠️ 恢复暂存时发生冲突，请手动处理："
      echo "   git stash list"
      echo "   git stash pop"
    fi
  fi
}

# 注册错误处理（使用 EXIT 而不是 ERR，因为 ERR 在 set -e 时可能不会触发）
trap 'if [ $? -ne 0 ] && [ "$ERROR_OCCURRED" != "true" ]; then handle_error $? $LINENO "脚本执行过程中发生错误"; fi' EXIT
trap 'handle_error 130 $LINENO "脚本被中断（Ctrl+C）"' INT TERM

# ========== 首次初始化配置 ==========
if [ ! -f "$CONFIG_FILE" ]; then
  echo "🧩 首次运行，初始化配置文件：$CONFIG_FILE"
  read -r -p "本地主干分支名（默认 master）: " project_branch
  project_branch=${project_branch:-master}

  read -r -p "远程名（默认 server）: " remote_name
  remote_name=${remote_name:-server}

  read -r -p "服务器测试分支名（默认 master）: " remote_master
  remote_master=${remote_master:-master}

  read -r -p "服务器生产分支名（默认 release）: " remote_release
  remote_release=${remote_release:-release}

  # 与 promote_only.sh 保持同一套字段（方便后续发布）
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

# ========== 读取配置 ==========
PROJECT_BRANCH=$(jq -r '.project_branch' "$CONFIG_FILE")
REMOTE_NAME=$(jq -r '.remote_name' "$CONFIG_FILE")
REMOTE_MASTER=$(jq -r '.remote_master' "$CONFIG_FILE")

# 验证配置是否读取成功
if [ -z "$PROJECT_BRANCH" ] || [ -z "$REMOTE_NAME" ] || [ -z "$REMOTE_MASTER" ]; then
  handle_error 1 $LINENO "配置读取失败，请检查 $CONFIG_FILE。确保配置文件中包含 project_branch、remote_name 和 remote_master 字段"
fi

# 验证配置值是否有效
if [ "$PROJECT_BRANCH" = "null" ] || [ "$REMOTE_NAME" = "null" ] || [ "$REMOTE_MASTER" = "null" ]; then
  handle_error 1 $LINENO "配置值无效（null），请检查 $CONFIG_FILE"
fi

echo "📦 配置：local=${PROJECT_BRANCH:-未定义}  remote=${REMOTE_NAME:-未定义}  test=${REMOTE_MASTER:-未定义}"

# ========== 确定"当前功能分支" ==========
CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo HEAD)"
if [ "$CURRENT_BRANCH" = "HEAD" ]; then
  handle_error 1 $LINENO "无法确定当前 Git 分支，请确保在 Git 仓库中运行此脚本"
fi

FEATURE_BRANCH="$CURRENT_BRANCH"
ORIGINAL_BRANCH="$CURRENT_BRANCH"

# 保存当前提交（用于回滚）
ORIGINAL_COMMIT="$(git rev-parse HEAD 2>/dev/null)"
if [ -z "$ORIGINAL_COMMIT" ]; then
  handle_error 1 $LINENO "无法获取当前提交哈希，请确保在有效的 Git 仓库中运行"
fi

# 如果当前已经在主干分支，跳过合并，直接推送
SKIP_MERGE=false
if [ "$FEATURE_BRANCH" = "$PROJECT_BRANCH" ]; then
  echo "ℹ️ 当前分支就是主干（${PROJECT_BRANCH:-未定义}），跳过合并步骤，直接推送"
  SKIP_MERGE=true
fi

# ========== 保护现场（stash） ==========
if [ "$SKIP_MERGE" = "false" ]; then
  if ! git diff --quiet || ! git diff --cached --quiet; then
    echo "💾 暂存当前未提交修改..."
    git add -A
    if ! git stash push -m "auto-stash-before-feature-merge $(date +%F_%T)"; then
      handle_error $? $LINENO "暂存未提交修改失败：git stash push"
    fi
    STASHED=1
  fi

  # ========== 更新本地主干，减少合并冲突 ==========
  echo "🔄 同步本地主干 ${PROJECT_BRANCH:-未定义} ..."
  if ! git fetch "$REMOTE_NAME" --prune; then
    handle_error $? $LINENO "获取远程仓库信息失败：git fetch ${REMOTE_NAME:-未定义} --prune。请检查网络连接和远程配置"
  fi
  
  if ! git checkout "$PROJECT_BRANCH"; then
    handle_error $? $LINENO "切换到主干分支失败：git checkout ${PROJECT_BRANCH:-未定义}"
  fi
  
  # 保存合并前的提交（用于回滚）
  ORIGINAL_COMMIT="$(git rev-parse HEAD 2>/dev/null)"
  if [ -z "$ORIGINAL_COMMIT" ]; then
    handle_error 1 $LINENO "无法获取主干分支的提交哈希"
  fi
  
  if ! git pull "$REMOTE_NAME" "$PROJECT_BRANCH"; then
    handle_error $? $LINENO "拉取远程主干分支失败：git pull ${REMOTE_NAME:-未定义} ${PROJECT_BRANCH:-未定义}。可能存在冲突，请手动解决"
  fi

  # ========== 合并当前功能分支到主干 ==========
  echo "🔁 合并 ${FEATURE_BRANCH:-未定义} → ${PROJECT_BRANCH:-未定义}"
  set +e
  if [ "$MERGE_NO_FF" = "true" ]; then
    git merge --no-ff --no-edit "$FEATURE_BRANCH"
    M=$?
  else
    git merge --ff-only "$FEATURE_BRANCH"
    M=$?
  fi
  set -e
  
  if [ $M -ne 0 ]; then
    handle_error $M $LINENO "合并失败或冲突：git merge ${FEATURE_BRANCH:-未定义} → ${PROJECT_BRANCH:-未定义}。请解决冲突后重试"
  fi
  
  # 保存合并后的提交（用于回滚）
  MERGE_COMMIT="$(git rev-parse HEAD 2>/dev/null)"
  if [ -z "$MERGE_COMMIT" ]; then
    handle_error 1 $LINENO "合并后无法获取提交哈希"
  fi
  ROLLBACK_NEEDED=true
  
  echo "✅ 合并成功，合并提交：$MERGE_COMMIT"
else
  # 已经在主干分支，只需要更新即可
  echo "🔄 同步本地主干 ${PROJECT_BRANCH:-未定义} ..."
  if ! git fetch "$REMOTE_NAME" --prune; then
    handle_error $? $LINENO "获取远程仓库信息失败：git fetch ${REMOTE_NAME:-未定义} --prune。请检查网络连接和远程配置"
  fi
  
  if ! git pull "$REMOTE_NAME" "$PROJECT_BRANCH"; then
    handle_error $? $LINENO "拉取远程主干分支失败：git pull ${REMOTE_NAME:-未定义} ${PROJECT_BRANCH:-未定义}。可能存在冲突，请手动解决"
  fi
  
  # 保存当前提交（用于回滚）
  ORIGINAL_COMMIT="$(git rev-parse HEAD 2>/dev/null)"
  if [ -z "$ORIGINAL_COMMIT" ]; then
    handle_error 1 $LINENO "无法获取当前提交哈希"
  fi
fi

# ========== 推送主干到测试环境 ==========
# 确保变量已设置（防止在合并过程中丢失）
if [ -z "$REMOTE_MASTER" ] || [ "$REMOTE_MASTER" = "null" ]; then
  REMOTE_MASTER=$(jq -r '.remote_master' "$CONFIG_FILE")
  if [ -z "$REMOTE_MASTER" ] || [ "$REMOTE_MASTER" = "null" ]; then
    handle_error 1 $LINENO "无法从配置文件读取 remote_master，请检查 $CONFIG_FILE"
  fi
fi
if [ -z "$REMOTE_NAME" ] || [ "$REMOTE_NAME" = "null" ]; then
  REMOTE_NAME=$(jq -r '.remote_name' "$CONFIG_FILE")
  if [ -z "$REMOTE_NAME" ] || [ "$REMOTE_NAME" = "null" ]; then
    handle_error 1 $LINENO "无法从配置文件读取 remote_name，请检查 $CONFIG_FILE"
  fi
fi

# 验证远程仓库是否存在
if ! git remote get-url "$REMOTE_NAME" >/dev/null 2>&1; then
  handle_error 1 $LINENO "远程仓库 '${REMOTE_NAME:-未定义}' 不存在，请检查 Git 远程配置：git remote -v"
fi

echo "⏫ 推送 ${PROJECT_BRANCH:-未定义} → ${REMOTE_NAME:-未定义}/${REMOTE_MASTER:-未定义}（测试环境）"
if ! git push "$REMOTE_NAME" "$PROJECT_BRANCH:$REMOTE_MASTER"; then
  handle_error $? $LINENO "推送到远程失败：git push ${REMOTE_NAME:-未定义} ${PROJECT_BRANCH:-未定义}:${REMOTE_MASTER:-未定义}。请检查网络连接和权限"
fi

# 推送成功后，标记需要回滚（如果后续步骤失败）
PUSHED_TO_REMOTE=true
ROLLBACK_NEEDED=true

# ========== 删除本地功能分支（仅本地！不动远端） ==========
if [ "$SKIP_MERGE" = "false" ] && [ "$DELETE_LOCAL_FEATURE" = "true" ]; then
  echo "🧹 删除本地功能分支：$FEATURE_BRANCH"
  # 先确保当前不在该分支
  if ! git checkout "$PROJECT_BRANCH"; then
    # 删除分支失败不是致命错误，但需要记录
    echo "⚠️ 切换到主干分支失败（删除功能分支前），跳过删除操作"
  else
    set +e
    git branch -d "$FEATURE_BRANCH" 2>/dev/null
    DELETE_RESULT=$?
    set -e
    
    if [ $DELETE_RESULT -ne 0 ]; then
      echo "⚠️ 无法安全删除（可能未完全合并），执行强制删除"
      set +e
      git branch -D "$FEATURE_BRANCH" 2>/dev/null
      DELETE_RESULT=$?
      set -e
      if [ $DELETE_RESULT -eq 0 ]; then
        echo "✅ 已强制删除功能分支：$FEATURE_BRANCH"
      else
        echo "⚠️ 删除功能分支失败，但这不是致命错误，请手动删除：git branch -D $FEATURE_BRANCH"
      fi
    else
      echo "✅ 已删除功能分支：$FEATURE_BRANCH"
    fi
  fi
elif [ "$SKIP_MERGE" = "false" ]; then
  echo "ℹ️ 按配置保留本地功能分支：$FEATURE_BRANCH"
fi

# 所有操作成功，清除错误处理 trap（避免在正常退出时触发错误处理）
trap - EXIT INT TERM

# 清除回滚标记
ROLLBACK_NEEDED=false
PUSHED_TO_REMOTE=false

# 恢复工作状态（成功时）
if [ "$SKIP_MERGE" = "false" ] && [ -n "$ORIGINAL_BRANCH" ] && [ "$ORIGINAL_BRANCH" != "$PROJECT_BRANCH" ]; then
  # 如果原分支还存在且不是主干，切回原分支
  if git show-ref --verify --quiet "refs/heads/$ORIGINAL_BRANCH" 2>/dev/null; then
    echo "🔙 切回原分支：$ORIGINAL_BRANCH"
    git checkout "$ORIGINAL_BRANCH" >/dev/null 2>&1 || {
      echo "⚠️ 无法切回原分支，但操作已成功完成"
    }
  fi
fi

echo ""
echo "✅ ========================================"
if [ "$SKIP_MERGE" = "true" ]; then
  echo "✅ 完成：直接推送 ${PROJECT_BRANCH:-未定义} → 测试环境"
else
  echo "✅ 完成：${FEATURE_BRANCH:-未定义} → ${PROJECT_BRANCH:-未定义} → 推送测试"
fi
echo "✅ ========================================"
echo ""