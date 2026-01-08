# RT-ID 获取规则（强制要求）

⚠️ **关键规则**：AI 在创建新 RT 时，**必须**先检查 `.aodw/config.yaml` 确定开发模式，然后按照相应规则获取 RT-ID。

本文件定义了 AODW 中 RT-ID（Request Ticket ID）的获取规则，确保团队协作时 ID 的唯一性和一致性。

---

## 1. 配置文件检查流程

**强制检查步骤**（AI 必须按顺序执行）：

1. **读取配置文件**
   - 路径：`.aodw/config.yaml`
   - 必须读取 `mode` 和 `server_url` 字段

2. **确定开发模式**
   - 如果 `mode === 'collaborative'`：协作模式（从远程服务器获取）
   - 如果 `mode === 'independent'` 或未设置：独立模式（本地生成）
   - 如果 `mode` 字段不存在：默认为独立模式

3. **执行相应获取逻辑**
   - 根据模式执行对应的 RT-ID 获取流程（见第 2 节和第 3 节）

---

## 2. 协作模式（Collaborative Mode）

**适用场景**：团队协作开发，需要统一的 RT-ID 分配，避免 ID 冲突。

**配置要求**：
```yaml
# .aodw/config.yaml
mode: collaborative
server_url: http://114.67.218.31:2005  # 或团队自定义服务器地址
```

**RT-ID 获取流程**：

1. **验证配置**
   - ✅ 检查 `mode === 'collaborative'`
   - ✅ 检查 `server_url` 是否存在且非空
   - ❌ 如果 `server_url` 为空：**立即报错**，提示用户配置服务器地址

2. **调用远程 API**
   - 端点：`{server_url}/api/next-id?project={project_name}`
   - 方法：`GET`
   - 默认服务器：`http://114.67.218.31:2005`
   - ⚠️ **强制要求**：**必须**带上 `project` 参数，否则服务器无法正确分配 ID
   - 项目名获取优先级：
     1. 命令行参数 `--project <name>`
     2. `.aodw/project.yaml` 的 `project_name` 字段
     3. `package.json` 的 `name` 字段
     4. 当前目录名（fallback）

3. **处理响应**
   - 成功：使用返回的 `id` 字段（格式：`RT-XXX`）
   - 失败：提示错误信息，询问是否降级到本地生成（**不推荐**，可能导致冲突）

4. **本地 vs 服务器 ID 冲突处理**（⚠️ 重要）
   
   **问题场景**：服务器返回的 ID 可能小于本地已有的最大 ID（例如离线创建或服务器数据不同步）。
   
   **强制规则**：
   - 获取服务器 ID 后，必须与本地最大 ID 比较
   - 如果 `服务器 ID ≤ 本地最大 ID`，则使用 `本地最大 ID + 1`
   - 同时调用服务器 API 更新服务器端的计数器
   
   **比较逻辑**：
   ```
   serverSeq = 从服务器 ID 提取序号（如 RT-015 → 15）
   localMaxSeq = 本地 RT/ 目录下最大序号（如已有 RT-016 → 16）
   
   if (serverSeq <= localMaxSeq) {
       finalSeq = localMaxSeq + 1
       finalId = `RT-${padStart(finalSeq, 3, '0')}`
       // 调用服务器 API 更新计数器
       syncIdToServer(serverUrl, project, finalSeq)
   } else {
       finalId = 服务器返回的 ID
   }
   ```
   
   **服务器同步 API**：
   - 端点：`{server_url}/api/sync-id?project={project_name}&seq={finalSeq}`
   - 方法：`POST`
   - 作用：将服务器计数器更新为 `finalSeq`，确保下次获取的 ID 正确

5. **错误处理**
   - 网络错误：提示检查网络连接和服务器状态
   - 服务器错误：提示联系管理员或检查服务器配置
   - 超时：提示重试或检查服务器状态
   - 同步失败：记录警告，但不阻塞 RT 创建

**示例代码逻辑**：
```javascript
if (userConfig.mode === 'collaborative') {
    if (!serverUrl || serverUrl.trim() === '') {
        // 必须报错，不能静默降级
        throw new Error('Collaborative mode requires server_url');
    }
    
    // ⚠️ 必须带上项目标识
    // 项目名获取优先级：命令行参数 > .aodw/project.yaml > package.json > 目录名
    const project = getProjectName(); // 必须获取项目标识
    
    // 调用远程 API（必须带上 project 参数）
    let serverId = await fetchIdFromServer(serverUrl, project);
    let serverSeq = parseInt(serverId.replace('RT-', ''), 10);
    
    // 获取本地最大 ID
    let localMaxSeq = getLocalMaxSeq();
    
    // 比较并选择
    if (serverSeq <= localMaxSeq) {
        let finalSeq = localMaxSeq + 1;
        id = `RT-${String(finalSeq).padStart(3, '0')}`;
        console.warn(`服务器 ID (${serverId}) ≤ 本地最大 ID (RT-${localMaxSeq})，使用本地 ID: ${id}`);
        
        // 同步到服务器（必须带上 project 参数）
        await syncIdToServer(serverUrl, project, finalSeq);
    } else {
        id = serverId;
    }
} else {
    // 独立模式：强制本地生成，忽略 server_url
    id = getLocalNextId();
    // 即使配置了 server_url，也不会联网
}
```


---

## 3. 独立模式（Independent Mode）

**适用场景**：个人开发或小团队，不需要统一的 ID 分配。

**配置要求**：
```yaml
# .aodw/config.yaml
mode: independent
# server_url 即使配置也会被忽略，不会联网
```

**RT-ID 获取流程**：

1. **强制本地生成**
   - ⚠️ **关键规则**：独立模式下**必须**使用本地生成，**禁止**联网获取
   - 即使配置了 `server_url`，也会被忽略，不会发起任何网络请求
   - 这是为了确保用户选择独立模式后，完全离线工作

2. **本地生成逻辑**
   - 扫描 `RT/` 目录下所有 `RT-XXX` 格式的目录
   - 找到最大序号 `N`
   - 生成新 ID：`RT-{N+1}`（补零到 3 位，如 `RT-001`, `RT-002`）

3. **冲突检查**
   - 如果生成的 ID 对应的目录已存在：递增序号直到找到可用 ID

---

## 4. 决策树（Decision Tree）

AI 在创建 RT 时必须遵循以下决策树：

```
开始创建 RT
    ↓
读取 .aodw/config.yaml
    ↓
mode 字段存在？
    ├─ 是 → mode === 'collaborative'?
    │          ├─ 是 → 检查 server_url
    │          │          ├─ 存在且非空 → 调用远程 API 获取 RT-ID
    │          │          └─ 不存在或为空 → ❌ 报错，提示配置服务器
    │          └─ 否 → 独立模式
    │                  └─ 本地生成 RT-ID（忽略 server_url）
    └─ 否 → 独立模式（默认）
            └─ 本地生成 RT-ID
```

---

## 5. 强制检查清单

AI 在获取 RT-ID 前必须完成以下检查：

- [ ] ✅ 已读取 `.aodw/config.yaml` 文件
- [ ] ✅ 已确定 `mode` 字段的值
- [ ] ✅ 如果是协作模式，已验证 `server_url` 存在且非空
- [ ] ✅ 已确定项目名称（从 `.aodw/project.yaml` 或目录名获取）
- [ ] ✅ 已按照决策树执行相应的获取流程
- [ ] ✅ 已验证获取到的 RT-ID 格式正确（`RT-XXX`）
- [ ] ✅ 已检查 RT-ID 对应的目录不存在（避免冲突）

---

## 6. 常见错误与处理

| 错误情况          | 原因                   | 处理方式                                    |
| ----------------- | ---------------------- | ------------------------------------------- |
| `server_url` 为空 | 协作模式下未配置服务器 | ❌ **必须报错**，提示运行 `aodw config` 配置 |
| 网络连接失败      | 无法访问远程服务器     | 提示检查网络，询问是否降级（警告风险）      |
| 服务器返回错误    | 服务器端问题           | 提示联系管理员，记录错误信息                |
| 本地目录冲突      | 生成的 ID 已存在       | 自动递增序号，直到找到可用 ID               |

---

## 7. 配置示例

**协作模式配置**（推荐团队使用）：
```yaml
# .aodw/config.yaml
mode: collaborative
server_url: http://114.67.218.31:2005
```

**独立模式配置**（个人开发）：
```yaml
# .aodw/config.yaml
mode: independent
```

**独立模式配置说明**：
```yaml
# .aodw/config.yaml
mode: independent
# server_url 即使配置也会被忽略，不会联网
```

---

## 8. 执行规范

**AI 必须遵守的规则**：

1. **禁止静默降级**：协作模式下如果 `server_url` 为空，**必须报错**，不能自动降级到本地生成
2. **必须检查配置**：创建 RT 前必须先读取 `.aodw/config.yaml`
3. **必须验证模式**：根据 `mode` 字段执行对应的获取逻辑
4. **独立模式禁止联网**：独立模式下**必须**使用本地生成，**禁止**联网，即使配置了 `server_url` 也要忽略
5. **必须带上项目标识**：协作模式下调用服务器 API 时，**必须**带上 `project` 参数，否则服务器无法正确分配 ID
6. **必须处理错误**：网络错误或服务器错误时，必须明确提示用户
7. **必须验证 ID**：获取到 RT-ID 后，必须验证格式和唯一性

**违反规则的后果**：
- 如果 AI 在协作模式下静默使用本地生成，可能导致团队内 ID 冲突
- 如果 AI 未检查配置就生成 ID，可能使用错误的模式

---

## 9. 相关文档

- `.aodw/02-workflow/rt-manager.md` - RT-Manager 完整规范
- `.aodw/01-core/aodw-constitution.md` - AODW 宪法（包含 RT-Manager 概述）
- `cli/bin/commands/new.js` - RT 创建命令实现

---

## 10. 服务器部署

如需部署自己的 RT-ID 服务器，请参考：
- `cli/DEPLOY.md` - 服务器部署指南
- `cli/test-server.js` - 服务器测试脚本
- `cli/TEST-SERVER.md` - 测试文档

默认服务器地址：`http://114.67.218.31:2005`
