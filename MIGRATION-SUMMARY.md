# AODW Next 拆分迁移总结

## ✅ 已完成的工作

### 1. 目录结构创建
- ✅ 创建了 `AODW-Next/` 独立目录结构
- ✅ 复制了 Next 版本的所有模板文件
- ✅ 复制了 CLI 代码

### 2. 代码简化
- ✅ 移除了所有 `CHANNEL` 相关逻辑
- ✅ 移除了 `channelizeName` 函数
- ✅ 固定使用 `.aodw-next/` 目录
- ✅ 简化了 Processor，固定使用 `.aodw-next`
- ✅ 更新了路径引用

### 3. 配置文件
- ✅ 创建了独立的 `package.json`（基于 `package.next.json`）
- ✅ 创建了简化的 `publish.sh` 发布脚本
- ✅ 创建了 `README.md`
- ✅ 创建了 `.gitignore`

### 4. 文档
- ✅ 创建了项目 README
- ✅ 更新了脚本注释

## 📋 待完成的工作

### 1. Git 仓库初始化
```bash
cd AODW-Next
git init
git add .
git commit -m "feat: initial commit - AODW Next standalone project"
```

### 2. 远程仓库创建
- 在 GitHub/GitLab 创建新仓库 `AODW-Next`
- 添加远程仓库并推送

### 3. 测试验证
- [ ] 本地测试 CLI 功能
- [ ] 验证模板文件路径
- [ ] 验证适配器生成
- [ ] 测试发布流程

### 4. 代码清理
- [ ] 检查是否有遗留的 Legacy 版本引用
- [ ] 验证所有路径引用正确
- [ ] 运行 lint 检查

## 🔍 关键变更点

### 代码变更
1. **aodw.js**:
   - 移除 `CHANNEL` 变量
   - 固定 `CORE_DIRNAME = '.aodw-next'`
   - 移除 `channelizeName` 函数调用
   - 更新 `SOURCE_CORE` 路径

2. **processors/index.js**:
   - 固定 `AODW_DIR = '.aodw-next'`
   - 移除环境变量判断

3. **update-adapters-from-template.js**:
   - 简化为只生成 Next 版本适配器
   - 更新模板路径

4. **publish.sh**:
   - 移除分支判断逻辑
   - 简化发布流程

### 路径变更
- 模板路径：`templates/.aodw-next/`
- 适配器路径：`templates/AODW_Adapters/`
- 文档路径：`templates/docs/`
- CLI 源路径：`cli/bin/`

## 📦 发布准备

### 发布前检查清单
- [ ] 所有代码已简化，无 Legacy 引用
- [ ] 路径引用全部正确
- [ ] package.json 配置正确
- [ ] 发布脚本可执行
- [ ] README 文档完整
- [ ] Git 仓库已初始化

### 首次发布步骤
```bash
cd AODW-Next/cli
npm install
./publish.sh patch  # 或 minor/major
```

## 🎯 下一步

1. **初始化 Git 仓库**
2. **创建远程仓库并推送**
3. **本地测试验证**
4. **发布第一个版本**

## 📝 注意事项

1. **版本号独立**：Next 版本的版本号可以独立管理
2. **功能演进**：Next 版本可以快速迭代，不受 Legacy 限制
3. **用户迁移**：需要明确告知用户两个版本的区别
4. **文档同步**：核心概念文档可能需要同步更新

