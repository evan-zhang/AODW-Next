# 模板应用指南 (Template Application Guide)

## 1. 模板机制概述

AODW 使用**统一模板机制**来生成各个平台的适配器文件，确保所有平台的内容保持一致。

### 1.1 模板位置

**源模板**：`.aodw/templates/aodw-kernel-loader-template.md`

这个模板包含所有平台的通用内容，使用占位符标记平台差异：
- `{{REF_PREFIX}}` - 引用前缀（Cursor: `@`，其他: 空）

### 1.2 适配器文件位置

**生成的适配器文件**（在源仓库中）：
- `templates/AODW_Adapters/antigravity/.agent/rules/aodw.md`
- `templates/AODW_Adapters/cursor/.cursor/rules/aodw.mdc`
- `templates/AODW_Adapters/claude/CLAUDE.md`
- `templates/AODW_Adapters/gemini/.agent/rules/aodw.md`
- `templates/AODW_Adapters/general/AGENTS.md`

**注意**：这些文件是**回退方案**，用于向后兼容。CLI 安装时会优先使用模板直接生成。

---

## 2. 模板处理流程

### 2.1 开发阶段（源仓库）

1. **修改模板**：编辑 `.aodw/templates/aodw-kernel-loader-template.md`
2. **更新适配器**：运行 `node cli/bin/update-adapters-from-template.js`
3. **提交更改**：提交模板和生成的适配器文件

### 2.2 安装阶段（用户项目）

1. **CLI 检测模板**：检查 `.aodw/templates/aodw-kernel-loader-template.md` 是否存在
2. **使用 Processor**：根据平台选择对应的 Processor
3. **生成适配器文件**：在用户项目中生成适配器文件

**Processor 处理**：
- **AntigravityProcessor**：替换 `{{REF_PREFIX}}` 为空，注入 `trigger: always_on`
- **CursorProcessor**：替换 `{{REF_PREFIX}}` 为 `@`，注入 frontmatter（globs, alwaysApply 等）
- **ClaudeProcessor**：替换 `{{REF_PREFIX}}` 为空
- **GeminiProcessor**：替换 `{{REF_PREFIX}}` 为空
- **GeneralProcessor**：替换 `{{REF_PREFIX}}` 为空

---

## 3. 如何更新模板

### 3.1 修改模板文件

编辑 `.aodw/templates/aodw-kernel-loader-template.md`，例如：

```markdown
| **执行需求审计** | {{REF_PREFIX}}.aodw/04-auditors/aodw-requirement-auditor-rules.md | ... |
```

### 3.2 更新适配器文件

运行更新脚本：

```bash
node cli/bin/update-adapters-from-template.js
```

这个脚本会：
1. 读取模板文件
2. 使用各个 Processor 处理模板
3. 生成各个平台的适配器文件到 `templates/AODW_Adapters/`

### 3.3 验证更新

检查生成的适配器文件：

```bash
# Antigravity（应该没有 {{REF_PREFIX}}）
cat templates/AODW_Adapters/antigravity/.agent/rules/aodw.md | grep "执行需求审计"

# Cursor（应该有 @）
cat templates/AODW_Adapters/cursor/.cursor/rules/aodw.mdc | grep "执行需求审计"
```

---

## 4. Processor 说明

### 4.1 AntigravityProcessor

**处理**：
- 替换 `{{REF_PREFIX}}` 为空字符串
- 注入 `trigger: always_on` frontmatter（仅对 kernel loader）

**输出**：
- 文件：`templates/AODW_Adapters/antigravity/.agent/rules/aodw.md`
- 格式：Markdown with frontmatter

### 4.2 CursorProcessor

**处理**：
- 替换 `{{REF_PREFIX}}` 为 `@`
- 注入 frontmatter：`globs: *`, `alwaysApply: true`, `description`, `tags`
- 文件扩展名改为 `.mdc`

**输出**：
- 文件：`templates/AODW_Adapters/cursor/.cursor/rules/aodw.mdc`
- 格式：Markdown with Cursor-specific frontmatter

### 4.3 ClaudeProcessor

**处理**：
- 替换 `{{REF_PREFIX}}` 为空字符串
- 不注入 frontmatter

**输出**：
- 文件：`templates/AODW_Adapters/claude/CLAUDE.md`
- 格式：标准 Markdown

### 4.4 GeminiProcessor

**处理**：
- 替换 `{{REF_PREFIX}}` 为空字符串
- 不注入 frontmatter

**输出**：
- 文件：`templates/AODW_Adapters/gemini/.agent/rules/aodw.md`
- 格式：标准 Markdown

### 4.5 GeneralProcessor

**处理**：
- 替换 `{{REF_PREFIX}}` 为空字符串
- 不注入 frontmatter

**输出**：
- 文件：`templates/AODW_Adapters/general/AGENTS.md`
- 格式：标准 Markdown

---

## 5. CLI 安装流程

### 5.1 安装脚本逻辑

```javascript
// 1. 检查模板是否存在
if (fs.existsSync(SOURCE_TEMPLATE)) {
  // 2. 使用模板 + Processor 生成适配器文件
  await installFile(SOURCE_TEMPLATE, targetPath, Processor);
} else {
  // 3. 回退到旧文件（向后兼容）
  await installFile(sourceAdapterFile, targetPath, Processor);
}
```

### 5.2 安装路径

**用户项目中的适配器文件**：
- Antigravity: `.agent/rules/aodw.md`
- Cursor: `.cursor/rules/aodw.mdc`
- Claude: `.claude/CLAUDE.md`
- Gemini: `.agent/rules/aodw.md`
- General: `.aodw/AGENTS.md`

---

## 6. 最佳实践

### 6.1 修改模板后

1. ✅ **必须运行更新脚本**：`node cli/bin/update-adapters-from-template.js`
2. ✅ **验证生成的适配器文件**：检查各个平台的文件是否正确
3. ✅ **提交所有更改**：包括模板和生成的适配器文件

### 6.2 添加新平台

1. 创建新的 Processor（继承 `BaseProcessor`）
2. 在 `update-adapters-from-template.js` 中添加新平台的更新逻辑
3. 在 `cli/bin/aodw.js` 中添加新平台的安装逻辑

### 6.3 模板占位符

**当前占位符**：
- `{{REF_PREFIX}}` - 引用前缀

**添加新占位符**：
1. 在模板中使用 `{{PLACEHOLDER_NAME}}`
2. 在各个 Processor 的 `transform` 方法中处理占位符

---

## 7. 故障排查

### 7.1 模板未应用

**问题**：用户项目中的适配器文件还是旧内容

**原因**：
- 模板文件不存在（CLI 回退到旧文件）
- Processor 处理失败

**解决**：
1. 检查 `.aodw/templates/aodw-kernel-loader-template.md` 是否存在
2. 检查 Processor 是否正确处理占位符
3. 重新运行 `aodw init`

### 7.2 占位符未替换

**问题**：生成的适配器文件中还有 `{{REF_PREFIX}}`

**原因**：
- Processor 的 `transform` 方法未正确处理占位符

**解决**：
1. 检查 Processor 的 `transform` 方法
2. 确保使用 `replace` 方法替换占位符

### 7.3 Frontmatter 未注入

**问题**：生成的适配器文件缺少 frontmatter

**原因**：
- Processor 的 `injectFrontmatter` 方法未正确调用

**解决**：
1. 检查 Processor 的 `transform` 方法
2. 确保在适当的时候调用 `injectFrontmatter`

---

## 8. 相关文件

- **模板文件**：`.aodw/templates/aodw-kernel-loader-template.md`
- **更新脚本**：`cli/bin/update-adapters-from-template.js`
- **Processor 实现**：`cli/bin/processors/index.js`
- **CLI 安装脚本**：`cli/bin/aodw.js`
- **适配器文件**：`templates/AODW_Adapters/`

---

## 9. 版本历史

- **v4.0.0**：引入统一模板机制
- **v4.0.1**：添加审计官命令索引
- **v4.0.2**：更新模板应用指南
