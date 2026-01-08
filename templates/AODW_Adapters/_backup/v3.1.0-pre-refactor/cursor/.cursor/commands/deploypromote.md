# deploy/promote

执行以下操作：

1. 在项目根目录下运行自动发布脚本 `.cursor/deploy/promote_only.sh`；
2. 该脚本会：
   - 检查依赖（git/jq）；
   - 若首次运行则引导生成 `project-config.json`；
   - 自动获取测试分支最新通过版本；
   - 将其合并到生产分支；
   - 自动生成生产标签（prod-YYYYMMDD-HHMM-SHA）；
   - 生成变更日志与可回滚标记；
   - 发布完成后恢复到原开发分支。
3. 不会推送本地新提交到测试环境，不影响正在开发的功能。

请直接执行以下命令（无需再确认）：

```bash
bash .cursor/deploy/promote_only.sh
```