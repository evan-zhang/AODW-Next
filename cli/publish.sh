#!/bin/bash

# AODW Next CLI 发布脚本
# 用法: ./publish.sh [patch|minor|major]
# 示例: ./publish.sh patch  (发布 0.7.8 -> 0.7.9)
#       ./publish.sh minor  (发布 0.7.8 -> 0.8.0)
#       ./publish.sh major  (发布 0.7.8 -> 1.0.0)

set -e  # 遇到错误立即退出

cleanup() {
  if [ -f "package.json.bak" ]; then
    mv package.json.bak package.json
  fi
}
trap cleanup EXIT

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 获取版本类型参数，默认为 patch
VERSION_TYPE=${1:-patch}

# 验证参数
if [[ ! "$VERSION_TYPE" =~ ^(patch|minor|major)$ ]]; then
  echo -e "${RED}错误: 版本类型必须是 patch, minor 或 major${NC}"
  echo "用法: ./publish.sh [patch|minor|major]"
  exit 1
fi

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  AODW Next CLI 发布脚本${NC}"
echo -e "${BLUE}========================================${NC}\n"

# 步骤 1: 检查当前目录
if [ ! -f "package.json" ]; then
  echo -e "${RED}错误: 请在 cli 目录下运行此脚本${NC}"
  exit 1
fi

# 步骤 2: 检查 Git 状态
echo -e "${YELLOW}检查 Git 状态...${NC}"
if ! git diff-index --quiet HEAD --; then
  echo -e "${RED}警告: 有未提交的更改${NC}"
  read -p "是否继续? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# 步骤 3: 同步模板文件
echo -e "${YELLOW}同步模板文件...${NC}"
TEMPLATES_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CORE_SRC="$TEMPLATES_ROOT/templates/.aodw-next"
ADAPTERS_SRC="$TEMPLATES_ROOT/templates/AODW_Adapters"
DOCS_SRC="$TEMPLATES_ROOT/templates/docs"

if [ ! -d "$CORE_SRC" ]; then
  echo -e "${RED}错误: 模板目录不存在: $CORE_SRC${NC}"
  exit 1
fi

# 复制模板到 CLI 目录
rm -rf .aodw-next AODW_Adapters docs
cp -r "$CORE_SRC" ./.aodw-next
cp -r "$ADAPTERS_SRC" ./AODW_Adapters
cp -r "$DOCS_SRC" ./docs

echo -e "${GREEN}✅ 模板文件已同步${NC}"

# 步骤 4: 更新版本号
echo -e "${YELLOW}更新版本号...${NC}"
CURRENT_VERSION=$(node -p "require('./package.json').version")
NEW_VERSION=$(npm version "$VERSION_TYPE" --no-git-tag-version | sed 's/v//')
echo -e "${GREEN}版本: ${CURRENT_VERSION} -> ${NEW_VERSION}${NC}"

# 步骤 5: 构建（如果需要）
echo -e "${YELLOW}准备发布...${NC}"

# 步骤 6: 发布到 NPM
echo -e "${YELLOW}发布到 NPM...${NC}"
read -p "确认发布版本 ${NEW_VERSION} 到 NPM? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo -e "${YELLOW}已取消发布${NC}"
  exit 0
fi

npm publish

echo -e "${GREEN}✅ 发布成功!${NC}"
echo -e "${GREEN}版本: ${NEW_VERSION}${NC}"

# 步骤 7: 提交更改
echo -e "${YELLOW}提交更改...${NC}"
git add package.json package-lock.json
git commit -m "chore: bump version to ${NEW_VERSION}" || true
git tag "v${NEW_VERSION}" || true

echo -e "${GREEN}✅ 发布完成!${NC}"
echo -e "${BLUE}下一步: git push && git push --tags${NC}"

