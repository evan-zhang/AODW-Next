# feature/to-tester

执行以下操作：

1. 在项目根目录下运行功能分支合并脚本 `.cursor/deploy/feature_to_master_push_test_local.sh`；
2. 该脚本会：
   - 检查依赖（git/jq）；
   - 若首次运行则引导生成 `project-config.json`；
   - 自动识别当前功能分支；
   - 暂存当前未提交的修改（如有）；
   - 更新本地主干分支（master/main）；
   - 将当前功能分支合并到本地主干；
   - 推送主干到测试环境（server/master）；
   - 删除本地功能分支（可选，默认删除）；
   - 恢复暂存的修改（如有）；
3. 只处理当前所在的功能分支，不影响其他本地功能分支；
4. **不会操作任何远端功能分支**。

## ⚠️ 重要规则

**功能分支管理原则**：
- **功能分支只在本地存在，禁止推送到远程**
- **禁止执行**：`git push origin feature/*` 或类似的推送操作
- **功能分支的代码通过合并到测试分支（mac-version）后推送到远程**
- **如果远程存在功能分支，应该删除它**（因为这是错误的操作导致的）

请直接执行以下命令（无需再确认）：

```bash
bash .cursor/deploy/feature_to_master_push_test_local.sh
```

