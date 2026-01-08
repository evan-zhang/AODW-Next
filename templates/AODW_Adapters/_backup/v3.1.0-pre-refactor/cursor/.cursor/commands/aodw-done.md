# 完成 RT

将 RT 标记为完成，执行完成前的所有检查。

## 功能
- 执行完成检查清单
- 验证所有文档完整性
- 更新 RT 状态为完成
- 更新 changelog.md
- 确保所有不变量未被违反
- 验证测试已通过

## 完成检查清单
- [ ] meta.yaml 已更新
- [ ] RT/index.yaml 已更新
- [ ] spec/spec-lite 已完成
- [ ] plan/plan-lite 已完成
- [ ] invariants.md 已验证
- [ ] impact.md 已验证
- [ ] tests.md 已完成
- [ ] 模块 README 已更新 (Knowledge Distillation)
- [ ] 治理规则已满足
- [ ] 所有功能已实现
- [ ] 所有测试已通过

## Git 操作流程（完成 RT 后自动执行）

当 RT 标记为完成后，自动执行以下 Git 操作：

1. **保存功能分支的所有改动并提交**
   - 检查功能分支是否有未提交的改动
   - 如果有未提交的改动，自动提交（使用规范的提交信息格式，包含 `Refs: ${RT-ID}` trailer）
   - 确保所有改动都已提交到功能分支

2. **合并到本地 master 分支**
   - 切换到本地 master 分支：`git checkout master`
   - 拉取远程 master 最新代码：`git pull origin master`
   - 合并功能分支到 master：`git merge ${feature-branch}`（使用 `--no-ff` 保留合并历史）
   - 解决可能的合并冲突（如有）

3. **删除本地功能分支**
   - 删除本地功能分支：`git branch -d ${feature-branch}`
   - 如果分支未完全合并，使用 `-D` 强制删除（需用户确认）

4. **推送 master 分支到远程仓库**
   - 推送本地 master 到远程：`git push origin master`
   - 确保远程 master 分支已更新

## 使用场景
当 RT 的所有工作已完成，准备标记为完成时使用。

**注意**：完成 RT 后会自动执行上述 Git 操作流程，确保代码已合并到 master 并推送到远程。
