# Git Discipline for AODW

本文件定义 AODW 工作流中必须遵守的 Git 操作规范。
这些规则旨在确保代码历史清晰、可回溯，并便于自动化工具检查。

> **重要原则**：AI **禁止**自动执行合并和推送操作。AI 应提供完整的命令脚本，由用户确认并手动执行。

---

## 0. AI 操作边界

**AI 可以自动执行的操作：**
- 创建 feature 分支
- 切换分支
- 提交代码（`git add` + `git commit`）
- 创建标签（仅限特殊情况，如发布流程）

**AI 禁止自动执行的操作：**
- 合并分支（`git merge`）
- 推送到远程（`git push`）
- 删除分支（`git branch -d`）
- 变基操作（`git rebase`）

**原因**：AI 可能过早地认为任务完成，而实际需要多次迭代调整。用户应在充分验证后手动执行最终的合并和推送。

---

## 1. 分支命名 (Branch Naming)

所有开发工作必须在 Feature 分支上进行，禁止直接在主分支（master/main）提交。

### 1.1 命名格式
```text
feature/RT-{seq}-{short-name}
```

- **RT-{seq}**: 关联的 RT ID，必须与 `RT/` 目录下的 ID 一致（如 `RT-001`）。
- **{short-name}**: 简短描述，使用小写英文和连字符（kebab-case），建议 2-4 个单词。

### 1.2 示例
- ✅ `feature/RT-001-login-fix`
- ✅ `feature/RT-023-export-csv`
- ❌ `feature/login-fix` (缺少 RT ID)
- ❌ `RT-001/login` (格式错误)

---

## 2. 提交信息 (Commit Message)

提交信息必须遵循 Conventional Commits 规范，并包含 RT 引用。

### 2.1 格式模板
```text
<type>(<scope>): <subject>

[optional body]

Refs: <RT-ID>
```

### 2.2 字段说明
- **type**:
  - `feat`: 新功能
  - `fix`: 修复 bug
  - `docs`: 文档变更
  - `style`: 代码格式（不影响逻辑）
  - `refactor`: 重构（既不是新增功能也不是修改 bug）
  - `perf`: 性能优化
  - `test`: 增加测试
  - `chore`: 构建过程或辅助工具的变动
- **scope**: (可选) 影响范围，如 `auth`, `api`, `ui`。
- **subject**: 简短描述，使用祈使句，不加句号。
- **Refs**: (必须) 关联的 RT ID，用于链接 Git 历史与需求文档。

### 2.3 示例
```text
fix(auth): handle token expiration gracefully

Update the interceptor to refresh token on 401 error.

Refs: RT-001
```

---

## 3. 标签 (Tagging)

当一个 RT 完成并合并到主分支后，必须打标签以标记里程碑。

### 3.1 命名格式
```text
done-<RT-ID>
```

### 3.2 示例
- ✅ `done-RT-001`
- ✅ `done-RT-042`

---

## 4. 合并策略 (Merge Strategy)

- **禁止 Fast-forward**: 合并 Feature 分支时应使用 `--no-ff`，以保留分支历史。
- **Squash**: 对于琐碎的提交（如 "fix typo", "update"），建议在合并前进行 Squash，但保留关键的逻辑提交。

---

## 5. 合并前检查清单 (Pre-Merge Checklist)

在合并 feature 分支到主分支前，必须完成以下检查：

### 5.1 功能检查
- [ ] 功能测试通过
- [ ] 单元测试通过
- [ ] 集成测试通过（如适用）

### 5.2 编码规范检查（必须）

> **注意**：编码规范检查是合并的硬性要求，未通过编码规范检查的代码不能合并。

- [ ] **前端编码规范**（如涉及）：
  - [ ] ESLint 检查全部通过
  - [ ] Prettier 格式化已运行
  - [ ] 目录结构和分层符合规范（参考 `.aodw/03-standards/stacks/react-typescript/ai-coding-rules-frontend.md`）
  - [ ] 文件大小和复杂度符合规范（页面 ≤ 300 行，组件 ≤ 200 行，函数 ≤ 60 行，复杂度 ≤ 10）
- [ ] **后端编码规范**（如涉及）：
  - [ ] Ruff 检查全部通过
  - [ ] Black 格式化已运行
  - [ ] 分层架构符合规范（api → services → repositories，参考 `.aodw/03-standards/stacks/python-fastapi/ai-coding-rules-backend.md`）
  - [ ] 文件大小和复杂度符合规范（模块 ≤ 300 行，函数 ≤ 60 行）
- [ ] **通用编码规范**：
  - [ ] 文件大小符合规范（参考 `.aodw/03-standards/ai-coding-rules-common.md`）
  - [ ] 函数/方法长度符合规范
  - [ ] 复杂度符合规范

### 5.3 文档检查
- [ ] 相关文档已更新（spec / plan / changelog）
- [ ] 模块 README 已更新（如涉及）

### 5.4 CI 检查
- [ ] CI 检查全部通过
- [ ] 代码覆盖率符合要求（如适用）

---

## 6. 自动化检查 (Automation)

AI 或 CI 工具应检查：

### Step 0: Knowledge Distillation (知识蒸馏) - **必须优先执行**
在合并代码前，必须检查：
1.  **模块文档更新**：本次改动是否修改了系统行为？如果是，对应的 `docs/modules/*.md` 是否已更新？
2.  **索引一致性**：`modules-index.yaml` 是否准确反映了当前的模块结构？

### Step 1: Git 规范检查
1.  当前分支名是否符合 `feature/RT-*` 格式。
2.  提交信息是否包含 `Refs: RT-*`。
3.  RT 完成时是否已创建对应的 `done-*` 标签。

### Step 2: 编码规范检查
1.  前端代码（如涉及）：ESLint 和 Prettier 检查是否通过
2.  后端代码（如涉及）：Ruff 和 Black 检查是否通过
3.  文件大小和复杂度是否符合规范

---

## 7. RT 完成流程 (Completion Workflow)

当 RT 的所有工作完成后，AI **必须**遵循以下流程：

### Step 1: 知识蒸馏（Knowledge Distillation）
AI 自动执行：
1. 读取 `modules-index.yaml`，找到受影响的模块
2. 更新对应的模块文档（`docs/modules/*.md`）
3. 确认文档与代码一致

### Step 2: 提供完成脚本
AI **不得自动执行**，而应提供完整的手动命令脚本，例如：

```bash
# RT-XXX 完成脚本（请逐行检查后执行）

# 1. 确认当前在 feature 分支
git branch

# 2. 确认所有改动已提交
git status

# 3. 切换到主分支并拉取最新代码
git checkout main
git pull origin main

# 4. 合并 feature 分支（保留分支历史）
git merge --no-ff feature/RT-XXX-short-name

# 5. 打标签
git tag done-RT-XXX

# 6. 推送代码和标签
git push origin main
git push origin done-RT-XXX

# 7. 删除本地 feature 分支
git branch -d feature/RT-XXX-short-name

# 8. 更新 RT 状态
# 编辑 RT/index.yaml，将 RT-XXX 的 status 改为 done
```

### Step 3: 用户确认
用户应：
1. **验证代码质量**：Review 代码改动，运行测试
2. **验证文档更新**：检查模块文档是否准确
3. **手动执行脚本**：逐行检查并执行上述命令
4. **验证推送结果**：确认远程仓库已更新

---

## 8. 紧急情况例外

仅在以下特殊情况下，AI 可以自动 push（需明确用户授权）：
- 用户明确说"直接 push"、"自动推送"等
- 紧急 hotfix 场景（需事先约定）
- 自动化发布流程（如 CI/CD）

**默认行为**：AI 始终提供手动命令，等待用户执行。
