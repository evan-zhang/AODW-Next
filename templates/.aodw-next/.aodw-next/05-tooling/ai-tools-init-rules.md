# AI 工具初始化规则

> **注意**：本文件定义 AI 如何引导用户完成开发工具的初始化配置。

**适用场景**：
- 用户说"初始化工具"、"设置开发工具"、"配置工具"等
- 用户说"检查工具配置"、"验证工具"等
- 编码前检测到工具未初始化

**必须与以下规范配合使用**：
- `.aodw/03-standards/ai-coding-rules.md`（主文件）
- `.aodw/03-standards/stacks/react-typescript/ai-coding-rules-frontend.md`（前端规范）
- `.aodw/03-standards/stacks/python-fastapi/ai-coding-rules-backend.md`（后端规范）

---

## 1. 触发条件

当用户表达以下意图时，AI 必须执行工具初始化流程：

**明确命令**：
- "初始化工具"
- "设置开发工具"
- "配置工具"
- "检查工具配置"
- "验证工具"
- "工具初始化"

**隐含意图**：
- "ESLint 怎么配置？"
- "Ruff 怎么安装？"
- "工具还没设置好"

---

## 2. 执行流程

### Step 0: 前置检查（强制）

**AI 必须**：
1. 检查 `.aodw/06-project/ai-overview.md` 是否存在且内容完整（非初始模板状态）。

**如果文件不存在或不完整**：
- AI 必须停止当前流程。
- AI 必须提示用户："**检测到项目概览尚未初始化。为了更准确地配置工具，请先执行项目概览初始化。**"
- 建议运行命令："初始化项目概览"（`aodw init-overview`）。

### Step 1: 读取项目配置


**AI 必须优先从 `ai-overview.md` 读取信息**：
- 读取 `## 1. 技术栈` 章节
- 确定项目技术栈（React / Vue / Python / Java 等）
- 确定项目类型（Frontend / Backend / Fullstack）

**仅在 `ai-overview.md` 信息不足时的回退策略**：
- 检查目录结构
- 检查配置文件
- 询问用户确认

### Step 2: 检测工具状态

AI 必须检测以下工具的状态：

**前端工具**（如果项目包含前端）：
- **React/TypeScript 项目**：
  - ESLint：是否安装？配置文件是否存在？
  - Prettier：是否安装？配置文件是否存在？
  - TypeScript Path Alias：是否配置？
- **Vue 2 项目**：
  - ESLint：是否安装？配置文件是否存在？是否支持 Vue 2？
  - Prettier：是否安装？配置文件是否存在？
  - PostCSS：是否配置？兼容性配置是否正确？

**后端工具**（如果项目包含后端）：
- **Python 项目**：
  - **uv + pip-tools**：是否安装？requirements.in 是否存在？
  - Ruff：是否安装？配置文件是否存在？
  - Black：是否安装？配置文件是否存在？
  - pre-commit：是否安装？配置文件是否存在？hooks 是否安装？
- **Rust 项目**：
  - **rustfmt**：是否安装？rustfmt.toml 是否存在？
  - **clippy**：是否安装？clippy.toml 或 Cargo.toml 中的 clippy 配置是否存在？
  - **cargo**：是否安装？Cargo.toml 是否存在？
  - pre-commit：是否安装？配置文件是否存在？hooks 是否安装？
- **Java 项目**：
  - **Maven**：是否安装？pom.xml 是否存在？
  - **Checkstyle**：是否安装？配置文件是否存在？（如果使用）
  - **Spotless**：是否安装？配置文件是否存在？（如果使用）
  - pre-commit：是否安装？配置文件是否存在？hooks 是否安装？

**检测方法**：
- 检查 `package.json`（前端工具）
- 运行版本命令（`npx eslint --version`、`ruff --version` 等）
- 检查配置文件是否存在
- 读取 `.aodw/tools-status.yaml`（如果存在）

### Step 3: 交互式引导

#### 3.1 工具未安装时的处理

**AI 必须**：
1. 说明工具的作用和必要性
2. 提供安装命令
3. 询问用户是否立即安装

**交互格式**（遵循 `ai-interaction-rules.md`）：

```
Q1. ESLint 未安装，是否立即安装？

A. 立即安装（推荐）
B. 稍后手动安装
C. 跳过

Recommended: A（理由：ESLint 是必需的代码质量检查工具，建议立即安装）

请回复：A/B/C
```

**如果用户选择 A（立即安装）**：
- AI 执行安装命令（`npm install -D eslint ...` 或 `pip install ruff`）
- 等待安装完成
- 继续下一步

**如果用户选择 B 或 C**：
- AI 记录用户选择
- 提醒用户稍后需要安装
- 继续检测其他工具

#### 3.2 配置文件已存在时的处理

**AI 必须**：
1. 读取现有配置文件
2. 读取配置模板（`.aodw/templates/tools-config/`）
3. 对比差异，给出合并建议
4. 询问用户如何处理

**交互格式**：

```
检测到 .eslintrc.json 已存在，但缺少以下配置项：
- max-lines 规则（文件大小限制）
- complexity 规则（复杂度限制）
- import/order 规则（import 排序）

Q1. 如何处理配置文件？

A. 合并配置（推荐）- 保留现有配置，添加缺失的配置项
B. 覆盖配置 - 使用 AODW 标准配置替换现有配置
C. 跳过 - 保持现有配置不变

Recommended: A（理由：合并配置可以保留您的自定义设置，同时添加必要的规范配置）

请回复：A/B/C
```

**如果用户选择 A（合并配置）**：
- AI 读取现有配置
- AI 读取配置模板
- AI 合并配置（保留现有，添加缺失）
- AI 保存合并后的配置
- 更新状态文件

**如果用户选择 B（覆盖配置）**：
- AI 备份现有配置文件（添加 `.backup` 后缀）
- AI 使用模板生成新配置
- AI 保存新配置
- 更新状态文件

**如果用户选择 C（跳过）**：
- AI 记录用户选择
- 提醒用户配置可能不符合 AODW 规范
- 继续检测其他工具

#### 3.3 配置文件不存在时的处理

**AI 必须**：
1. 说明需要生成配置文件
2. 询问用户是否生成

**交互格式**：

```
Q1. ESLint 配置文件不存在，是否生成？

A. 立即生成（推荐）
B. 稍后手动生成
C. 跳过

Recommended: A（理由：配置文件是必需的，建议立即生成）

请回复：A/B/C
```

**如果用户选择 A（立即生成）**：
- AI 读取配置模板
- AI 生成配置文件
- 更新状态文件

### Step 4: 验证工具配置

**AI 必须**：
1. 运行工具验证命令（`npx eslint --version`、`ruff check .` 等）
2. 检查配置文件语法是否正确
3. 如果验证失败，提示用户修复

### Step 5: 更新状态文件

**AI 必须**：
1. 更新 `.aodw/tools-status.yaml`
2. 记录：
   - 工具安装状态
   - 配置文件状态
   - 配置来源（generated / merged / existing）
   - 初始化时间

### Step 6: 输出总结

**AI 必须**：
1. 输出工具初始化总结
2. 列出已安装和配置的工具
3. 列出未完成的项目（如果有）
4. **提供下一步建议**：
   - "项目概览与工具链均已就绪，您可以开始进行 RT 开发任务。"
   - "推荐运行：`aodw intake` 创建第一个需求。"

---

## 3. 配置文件合并策略

### 3.1 ESLint 配置合并

**现有配置 + 模板配置**：
- 保留现有的 `extends`、`plugins`、`rules`（如果存在）
- 添加模板中的必需规则（`max-lines`、`max-lines-per-function`、`complexity`）
- 合并 `settings`（保留现有，添加模板中的）

### 3.2 Prettier 配置合并

**现有配置 + 模板配置**：
- 如果现有配置存在，询问用户是否覆盖
- 如果不存在，直接使用模板

### 3.3 TypeScript Path Alias 合并

**现有 tsconfig.json + 模板配置**：
- 保留现有的 `compilerOptions`
- 合并 `paths` 配置（保留现有，添加模板中的）

### 3.4 pyproject.toml 合并（Ruff、Black）

**现有 pyproject.toml + 模板配置**：
- 读取现有的 `[tool.ruff]` 和 `[tool.black]` 配置
- 合并配置项（保留现有，添加缺失的）
- 如果配置冲突，询问用户选择

### 3.5 pre-commit 配置合并

**现有 .pre-commit-config.yaml + 模板配置**：
- 读取现有的 hooks
- 添加模板中的 hooks（如果不存在）
- 如果 hooks 冲突，询问用户选择

---

## 4. 安装命令参考

### 4.1 前端工具安装命令

**ESLint 完整安装**：
```bash
npm install -D eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser eslint-plugin-react eslint-plugin-react-hooks eslint-plugin-import eslint-plugin-jsx-a11y eslint-config-prettier
```

**Prettier 安装**：
```bash
npm install -D prettier
```

### 4.2 后端工具安装命令

**依赖管理工具（uv + pip-tools）安装**：
```bash
# 安装 uv
curl -LsSf https://astral.sh/uv/install.sh | sh

# 使用 uv 安装 pip-tools
uv pip install pip-tools

# 创建 requirements.in 和 requirements-dev.in（如果不存在）
touch requirements.in requirements-dev.in

# 编译依赖（如果存在 Makefile）
make compile-deps

# 或手动编译
uv pip compile requirements.in -o requirements.txt
uv pip compile requirements-dev.in -o requirements-dev.txt
```

**Ruff 安装**（通过 uv + pip-tools）：
```bash
# 1. 编辑 requirements-dev.in
echo "ruff>=0.1.0,<1.0.0" >> requirements-dev.in

# 2. 编译依赖
make compile-deps
# 或: uv pip compile requirements-dev.in -o requirements-dev.txt

# 3. 同步环境
make sync
# 或: uv pip sync requirements-dev.txt
```

**Black 安装**（通过 uv + pip-tools）：
```bash
# 1. 编辑 requirements-dev.in
echo "black>=23.0.0,<24.0.0" >> requirements-dev.in

# 2. 编译依赖
make compile-deps

# 3. 同步环境
make sync
```

**pre-commit 安装**（通过 uv + pip-tools）：
```bash
# 1. 编辑 requirements-dev.in
echo "pre-commit>=3.0.0,<4.0.0" >> requirements-dev.in

# 2. 编译依赖
make compile-deps

# 3. 同步环境
make sync

# 4. 安装 hooks
pre-commit install
```

**⚠️ 重要**：所有 Python 后端工具必须通过 `uv + pip-tools` 安装，禁止使用 `pip install` 直接安装。

### 4.3 Rust 后端工具安装命令

**rustfmt 和 clippy**（Rust 工具链自带）：
```bash
# rustfmt 和 clippy 是 Rust 工具链的一部分，通常随 Rust 安装
# 检查是否已安装
rustfmt --version
cargo clippy --version

# 如果未安装，安装 Rust 工具链
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env

# 安装 rustfmt 和 clippy（如果未包含）
rustup component add rustfmt
rustup component add clippy
```

**rustfmt 配置**：
```bash
# 从模板生成 rustfmt.toml
cp .aodw/templates/tools-config/backend/rustfmt.config.template.toml rustfmt.toml
```

**clippy 配置**：
```bash
# 方式 1：创建独立的 clippy.toml 文件
cp .aodw/templates/tools-config/backend/clippy.config.template.toml clippy.toml

# 方式 2：在 Cargo.toml 中添加配置
# [lints.clippy]
# warn = "all"
# deny = ["warnings"]
# cognitive_complexity_threshold = 15
# cyclomatic_complexity_threshold = 15
# too_many_lines_threshold = 400
```

**pre-commit 配置（Rust 项目）**：
```bash
# 1. 安装 pre-commit（如果未安装）
cargo install pre-commit-hook

# 2. 在 .pre-commit-config.yaml 中添加 Rust hooks
# repos:
#   - repo: https://github.com/doublify/pre-commit-rust
#     rev: v1.0
#     hooks:
#       - id: fmt
#       - id: clippy
#       - id: cargo-check
```

**验证工具配置**：
```bash
# 验证 rustfmt
cargo fmt -- --check

# 验证 clippy（零警告策略）
cargo clippy -- -D warnings

# 运行测试
cargo test
```

### 4.4 Java 后端工具安装命令

**Maven**（依赖管理，必须）：
```bash
# 检查是否已安装
mvn --version

# 如果未安装，安装 Maven
# macOS
brew install maven

# Linux
sudo apt-get install maven  # Debian/Ubuntu
sudo yum install maven      # CentOS/RHEL

# 或使用 Maven Wrapper（推荐）
mvn wrapper:wrapper
```

**Checkstyle**（代码风格检查，推荐）：
```bash
# 在 pom.xml 中添加 Checkstyle 插件
# <plugin>
#   <groupId>org.apache.maven.plugins</groupId>
#   <artifactId>maven-checkstyle-plugin</artifactId>
#   <version>3.3.0</version>
#   <configuration>
#     <configLocation>checkstyle.xml</configLocation>
#   </configuration>
# </plugin>

# 从模板生成 checkstyle.xml（如果模板存在）
# cp .aodw/templates/tools-config/backend/checkstyle.config.template.xml checkstyle.xml

# 验证 Checkstyle
mvn checkstyle:check
```

**Spotless**（代码格式化，推荐）：
```bash
# 在 pom.xml 中添加 Spotless 插件
# <plugin>
#   <groupId>com.diffplug.spotless</groupId>
#   <artifactId>spotless-maven-plugin</artifactId>
#   <version>2.40.0</version>
#   <configuration>
#     <java>
#       <googleJavaFormat>
#         <version>1.17.0</version>
#         <style>GOOGLE</style>
#       </googleJavaFormat>
#     </java>
#   </configuration>
# </plugin>

# 格式化代码
mvn spotless:apply

# 检查格式
mvn spotless:check
```

**pre-commit 配置（Java 项目）**：
```bash
# 1. 安装 pre-commit（如果未安装）
# 通过 pip 或 npm 安装
pip install pre-commit
# 或
npm install -g pre-commit

# 2. 在 .pre-commit-config.yaml 中添加 Java hooks
# repos:
#   - repo: https://github.com/checkstyle/checkstyle
#     rev: checkstyle-10.12.0
#     hooks:
#       - id: checkstyle
#   - repo: https://github.com/diffplug/spotless
#     rev: v2.40.0
#     hooks:
#       - id: spotless
```

**验证工具配置**：
```bash
# 验证 Maven
mvn clean compile

# 验证 Checkstyle（如果使用）
mvn checkstyle:check

# 验证 Spotless（如果使用）
mvn spotless:check

# 运行测试
mvn test

# 验证 pre-commit（如果使用）
pre-commit run --all-files
```

---

## 5. 配置模板位置

**前端配置模板**：
- ESLint：`.aodw/templates/tools-config/frontend/eslint.config.template.json`
- Prettier：`.aodw/templates/tools-config/frontend/prettier.config.template.json`
- TypeScript Path Alias：`.aodw/templates/tools-config/frontend/tsconfig.paths.template.json`

**后端配置模板**：
- 依赖管理：`.aodw/templates/tools-config/backend/requirements.in.template`（如果存在）
- Ruff：`.aodw/templates/tools-config/backend/ruff.config.template.toml`
- Black：`.aodw/templates/tools-config/backend/black.config.template.toml`
- pre-commit：`.aodw/templates/tools-config/backend/pre-commit.config.template.yaml`

**依赖管理配置**：
- 项目必须使用 `uv + pip-tools` 管理依赖
- 必须存在 `requirements.in` 和 `requirements-dev.in` 文件
- 必须存在 `Makefile` 或相关编译脚本（推荐）

---

## 6. 状态文件格式

**位置**：`.aodw/tools-status.yaml`

**格式**：
```yaml
tools_init:
  initialized: true
  initialized_at: "2025-01-15T10:30:00Z"
  last_updated_at: "2025-01-15T10:30:00Z"
  initialized_by: "ai-rule"  # 或 "cli"
  project_type: "fullstack"
  
  frontend:
    eslint:
      installed: true
      configured: true
      config_file: ".eslintrc.json"
      config_source: "merged"  # generated | merged | existing
    prettier:
      installed: true
      configured: true
      config_file: ".prettierrc.json"
      config_source: "generated"
    typescript_path_alias:
      configured: true
      config_file: "tsconfig.json"
      config_source: "merged"
  
  backend:
    # Python 项目工具
    dependency_manager:
      uv_installed: true
      pip_tools_installed: true
      configured: true
      requirements_in_exists: true
      requirements_dev_in_exists: true
      makefile_exists: true
    ruff:
      installed: true
      configured: true
      config_file: "pyproject.toml"
      config_source: "merged"
    black:
      installed: true
      configured: true
      config_file: "pyproject.toml"
      config_source: "merged"
    # Rust 项目工具
    rustfmt:
      installed: true
      configured: true
      config_file: "rustfmt.toml"
      config_source: "generated"
    clippy:
      installed: true
      configured: true
      config_file: "clippy.toml"  # 或 Cargo.toml 中的 [lints.clippy]
      config_source: "generated"
    cargo:
      installed: true
      cargo_toml_exists: true
    # Java 项目工具
    maven:
      installed: true
      configured: true
      pom_xml_exists: true
    checkstyle:
      installed: true
      configured: true
      config_file: "checkstyle.xml"  # 或 pom.xml 中的插件配置
      config_source: "generated"
    spotless:
      installed: true
      configured: true
      config_file: "pom.xml"  # Spotless 配置在 pom.xml 中
      config_source: "generated"
    pre_commit:
      installed: true
      configured: true
      hooks_installed: true
      config_file: ".pre-commit-config.yaml"
      config_source: "generated"
```

---

## 7. 交互规范

AI 在执行工具初始化时，必须严格遵守 `.aodw/01-core/ai-interaction-rules.md` 中的规范：

1. **问题类型**：决策型问题（提供选项 + 推荐）
2. **问题格式**：Q1. <问题> / A. <选项1> / B. <选项2> / Recommended: A（理由）
3. **问题数量**：每轮最多 3 个问题
4. **节奏控制**：逐步推进，等待用户回答后再继续

---

## 8. 错误处理

### 8.1 工具安装失败

- AI 必须显示错误信息
- AI 提供故障排查建议
- AI 询问用户是否重试或跳过

### 8.2 配置文件生成失败

- AI 必须显示错误信息
- AI 提供手动配置建议
- AI 提供配置模板位置

### 8.3 配置验证失败

- AI 必须显示验证错误
- AI 提供修复建议
- AI 询问用户是否继续

---

## 9. 完成后的提示

工具初始化完成后，AI 必须：

1. **输出总结**：
   ```
   ✅ 工具初始化完成
   
   已安装和配置：
   - ✅ ESLint (已安装并配置)
   - ✅ Prettier (已安装并配置)
   - ✅ Ruff (已安装并配置)
   - ✅ Black (已安装并配置)
   - ✅ pre-commit (已安装并配置)
   
   状态已保存到: .aodw/tools-status.yaml
   ```

2. **提供下一步建议**：
   - "现在可以开始开发了"
   - "如果遇到工具相关问题，可以再次运行工具初始化"

3. **提醒编码规范**：
   - "工具已初始化，编码时将自动检查工具状态"
   - "如果工具状态异常，编码将被阻止"
