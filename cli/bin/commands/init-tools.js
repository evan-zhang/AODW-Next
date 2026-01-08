import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';
import chalk from 'chalk';
import yaml from 'js-yaml';
import inquirer from 'inquirer';

const CORE_DIR = process.env.AODW_CORE_DIR || '.aodw';
const PACKAGE_NAME = process.env.AODW_PACKAGE_NAME || 'aodw';
const TOOLS_STATUS_FILE = `${CORE_DIR}/tools-status.yaml`;

// 获取模板目录路径（支持开发环境和发布环境）
function getTemplatesDir() {
  const cwd = process.cwd();
  // 先尝试当前项目的核心目录（用户项目中的模板）
  const localTemplates = path.join(cwd, `${CORE_DIR}/templates/tools-config`);
  if (fs.existsSync(localTemplates)) {
    return localTemplates;
  }
  // 如果不存在，尝试 CLI 包内的模板（发布后的模板）
  // 注意：CLI 包内的模板路径是相对于 CLI 源码目录的
  // 路径：cli/.aodw/templates/tools-config（开发环境）
  // 或：node_modules/<package>/.aodw/templates/tools-config（发布后）
  const cliTemplates = path.join(__dirname, '../../.aodw/templates/tools-config');
  if (fs.existsSync(cliTemplates)) {
    return cliTemplates;
  }
  // 尝试发布后的路径（node_modules）
  const nodeModulesTemplates = path.join(cwd, `node_modules/${PACKAGE_NAME}/.aodw/templates/tools-config`);
  if (fs.existsSync(nodeModulesTemplates)) {
    return nodeModulesTemplates;
  }
  // 如果都不存在，返回本地路径（让错误更明显）
  return localTemplates;
}

// 检测项目类型
function detectProjectType() {
  const cwd = process.cwd();
  let hasFrontend = false;
  let hasBackend = false;

  // 检查前端特征
  if (
    fs.existsSync(path.join(cwd, 'frontend')) ||
    fs.existsSync(path.join(cwd, 'src/pages')) ||
    fs.existsSync(path.join(cwd, 'src/features')) ||
    (fs.existsSync(path.join(cwd, 'package.json')) &&
      fs.existsSync(path.join(cwd, 'tsconfig.json')))
  ) {
    hasFrontend = true;
  }

  // 检查后端特征
  if (
    fs.existsSync(path.join(cwd, 'backend')) ||
    fs.existsSync(path.join(cwd, 'app')) ||
    fs.existsSync(path.join(cwd, 'api')) ||
    fs.existsSync(path.join(cwd, 'pyproject.toml')) ||
    fs.existsSync(path.join(cwd, 'requirements.txt'))
  ) {
    hasBackend = true;
  }

  if (hasFrontend && hasBackend) return 'fullstack';
  if (hasFrontend) return 'frontend';
  if (hasBackend) return 'backend';
  return 'unknown';
}

// 检测工具是否安装（前端）
async function detectFrontendTool(toolName) {
  try {
    if (toolName === 'eslint') {
      // 检查 package.json
      const pkgPath = path.join(process.cwd(), 'package.json');
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
        if (deps.eslint || deps['@typescript-eslint/eslint-plugin']) {
          // 尝试运行版本命令
          try {
            execSync('npx eslint --version', { stdio: 'ignore' });
            return { installed: true };
          } catch (e) {
            return { installed: false, reason: '命令执行失败' };
          }
        }
      }
      return { installed: false, reason: 'package.json 中未找到依赖' };
    }
    if (toolName === 'prettier') {
      const pkgPath = path.join(process.cwd(), 'package.json');
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
        if (deps.prettier) {
          try {
            execSync('npx prettier --version', { stdio: 'ignore' });
            return { installed: true };
          } catch (e) {
            return { installed: false, reason: '命令执行失败' };
          }
        }
      }
      return { installed: false, reason: 'package.json 中未找到依赖' };
    }
  } catch (e) {
    return { installed: false, reason: e.message };
  }
  return { installed: false, reason: '未知错误' };
}

// 检测工具是否安装（后端）
async function detectBackendTool(toolName) {
  try {
    // 尝试运行版本命令
    let command;
    if (toolName === 'uv') {
      command = 'uv --version';
    } else if (toolName === 'pip-tools') {
      command = 'pip-compile --version';
    } else if (toolName === 'ruff') {
      command = 'ruff --version';
    } else if (toolName === 'black') {
      command = 'black --version';
    } else if (toolName === 'pre-commit') {
      command = 'pre-commit --version';
    } else {
      return { installed: false, reason: '未知工具' };
    }

    try {
      execSync(command, { stdio: 'ignore' });
      return { installed: true };
    } catch (e) {
      return { installed: false, reason: '命令执行失败，可能未安装' };
    }
  } catch (e) {
    return { installed: false, reason: e.message };
  }
}

// 检测配置文件是否存在
function detectConfigFile(configType, projectType) {
  const cwd = process.cwd();
  const configFiles = {
    frontend: {
      eslint: ['.eslintrc.json', '.eslintrc.js', '.eslintrc.yaml', 'eslint.config.js'],
      prettier: ['.prettierrc.json', '.prettierrc.js', '.prettierrc.yaml', 'prettier.config.js'],
      tsconfig: ['tsconfig.json'],
    },
    backend: {
      ruff: ['pyproject.toml', 'ruff.toml'],
      black: ['pyproject.toml'],
      'pre-commit': ['.pre-commit-config.yaml'],
    },
  };

  const files = configFiles[projectType]?.[configType] || [];
  for (const file of files) {
    const filePath = path.join(cwd, file);
    if (fs.existsSync(filePath)) {
      return { exists: true, path: file };
    }
  }
  return { exists: false, path: null };
}

// 读取工具状态
function getToolsStatus() {
  const filepath = path.join(process.cwd(), TOOLS_STATUS_FILE);
  if (fs.existsSync(filepath)) {
    try {
      return yaml.load(fs.readFileSync(filepath, 'utf8')) || {};
    } catch (e) {
      return {};
    }
  }
  return {};
}

// 保存工具状态
async function saveToolsStatus(status) {
  const filepath = path.join(process.cwd(), TOOLS_STATUS_FILE);
  await fs.ensureDir(path.dirname(filepath));
  await fs.writeFile(filepath, yaml.dump(status), 'utf8');
}

// 生成配置文件（如果不存在）
async function generateConfigFile(configType, projectType) {
  const templatesDir = getTemplatesDir();
  
  // 特殊处理 tsconfig 模板文件名
  let templateFileName;
  if (configType === 'tsconfig' && projectType === 'frontend') {
    templateFileName = 'tsconfig.paths.template.json';
  } else {
    const ext = projectType === 'frontend' ? 'json' : (projectType === 'backend' && configType === 'pre-commit' ? 'yaml' : 'toml');
    templateFileName = `${configType}.config.template.${ext}`;
  }
  
  const templatePath = path.join(templatesDir, projectType, templateFileName);

  if (!fs.existsSync(templatePath)) {
    console.log(chalk.yellow(`⚠️  配置模板不存在: ${templatePath}`));
    return false;
  }

  const template = fs.readFileSync(templatePath, 'utf8');
  const cwd = process.cwd();

  if (projectType === 'frontend') {
    if (configType === 'eslint') {
      const targetPath = path.join(cwd, '.eslintrc.json');
      if (!fs.existsSync(targetPath)) {
        fs.writeFileSync(targetPath, template);
        console.log(chalk.green(`✔ 已生成 ESLint 配置文件: .eslintrc.json`));
        return true;
      }
    } else if (configType === 'prettier') {
      const targetPath = path.join(cwd, '.prettierrc.json');
      if (!fs.existsSync(targetPath)) {
        fs.writeFileSync(targetPath, template);
        console.log(chalk.green(`✔ 已生成 Prettier 配置文件: .prettierrc.json`));
        return true;
      }
    } else if (configType === 'tsconfig') {
      const targetPath = path.join(cwd, 'tsconfig.json');
      try {
        const templateObj = JSON.parse(template);
        if (fs.existsSync(targetPath)) {
          // 合并到现有 tsconfig.json
          const existing = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
          const merged = {
            ...existing,
            compilerOptions: {
              ...existing.compilerOptions,
              ...templateObj.compilerOptions,
            },
          };
          fs.writeFileSync(targetPath, JSON.stringify(merged, null, 2));
          console.log(chalk.green(`✔ 已更新 tsconfig.json，添加了 path alias 配置`));
          return true;
        } else {
          fs.writeFileSync(targetPath, JSON.stringify(templateObj, null, 2));
          console.log(chalk.green(`✔ 已生成 tsconfig.json`));
          return true;
        }
      } catch (error) {
        console.error(chalk.red(`✗ 解析模板文件失败: ${error.message}`));
        return false;
      }
    }
  } else if (projectType === 'backend') {
    if (configType === 'ruff' || configType === 'black') {
      const targetPath = path.join(cwd, 'pyproject.toml');
      if (fs.existsSync(targetPath)) {
        console.log(chalk.yellow(`⚠️  pyproject.toml 已存在，需要手动合并配置`));
        console.log(chalk.blue(`   参考模板: ${templatePath}`));
        console.log(chalk.gray(`   或通过 AI 命令"初始化工具"进行交互式配置合并`));
        return false;
      } else {
        // 创建新的 pyproject.toml（只包含当前工具的配置）
        fs.writeFileSync(targetPath, template);
        console.log(chalk.green(`✔ 已生成 pyproject.toml`));
        return true;
      }
    } else if (configType === 'pre-commit') {
      const targetPath = path.join(cwd, '.pre-commit-config.yaml');
      if (!fs.existsSync(targetPath)) {
        fs.writeFileSync(targetPath, template);
        console.log(chalk.green(`✔ 已生成 .pre-commit-config.yaml`));
        return true;
      }
    }
  }

  return false;
}

// 询问用户是否安装工具
async function askToInstall(toolName, description, installMethod) {
  const { install } = await inquirer.prompt([{
    type: 'confirm',
    name: 'install',
    message: `${toolName} 未安装。${description}\n是否立即安装？`,
    default: true
  }]);
  return install;
}

// 安装前端工具（ESLint）
async function installESLint() {
  console.log(chalk.blue('📦 正在安装 ESLint 及其插件...'));
  try {
    // 先尝试正常安装
    execSync('npm install -D eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser eslint-plugin-react eslint-plugin-react-hooks eslint-plugin-import eslint-plugin-jsx-a11y eslint-config-prettier', {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    console.log(chalk.green('✔ ESLint 安装完成\n'));
    return true;
  } catch (error) {
    // 如果出现依赖冲突，尝试使用 --legacy-peer-deps
    if (error.message.includes('ERESOLVE') || error.message.includes('could not resolve')) {
      console.log(chalk.yellow('⚠️  检测到依赖冲突，尝试使用 --legacy-peer-deps 安装...'));
      try {
        execSync('npm install -D eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser eslint-plugin-react eslint-plugin-react-hooks eslint-plugin-import eslint-plugin-jsx-a11y eslint-config-prettier --legacy-peer-deps', {
          stdio: 'inherit',
          cwd: process.cwd()
        });
        console.log(chalk.green('✔ ESLint 安装完成（使用 --legacy-peer-deps）\n'));
        return true;
      } catch (retryError) {
        console.error(chalk.red(`✗ ESLint 安装失败: ${retryError.message}\n`));
        console.log(chalk.yellow('💡 提示：您可以手动运行安装命令并添加 --legacy-peer-deps 或 --force 选项\n'));
        return false;
      }
    } else {
      console.error(chalk.red(`✗ ESLint 安装失败: ${error.message}\n`));
      return false;
    }
  }
}

// 安装前端工具（Prettier）
async function installPrettier() {
  console.log(chalk.blue('📦 正在安装 Prettier...'));
  try {
    // 先尝试正常安装
    execSync('npm install -D prettier', {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    console.log(chalk.green('✔ Prettier 安装完成\n'));
    return true;
  } catch (error) {
    // 如果出现依赖冲突，尝试使用 --legacy-peer-deps
    if (error.message.includes('ERESOLVE') || error.message.includes('could not resolve')) {
      console.log(chalk.yellow('⚠️  检测到依赖冲突，尝试使用 --legacy-peer-deps 安装...'));
      try {
        execSync('npm install -D prettier --legacy-peer-deps', {
          stdio: 'inherit',
          cwd: process.cwd()
        });
        console.log(chalk.green('✔ Prettier 安装完成（使用 --legacy-peer-deps）\n'));
        return true;
      } catch (retryError) {
        console.error(chalk.red(`✗ Prettier 安装失败: ${retryError.message}\n`));
        console.log(chalk.yellow('💡 提示：您可以手动运行 "npm install -D prettier --legacy-peer-deps" 或 "npm install -D prettier --force"\n'));
        return false;
      }
    } else {
      console.error(chalk.red(`✗ Prettier 安装失败: ${error.message}\n`));
      return false;
    }
  }
}

// 确保 requirements-dev.in 存在
function ensureRequirementsDevIn() {
  const requirementsDevInPath = path.join(process.cwd(), 'requirements-dev.in');
  if (!fs.existsSync(requirementsDevInPath)) {
    console.log(chalk.blue('📝 创建 requirements-dev.in 文件...'));
    fs.writeFileSync(requirementsDevInPath, '# Development dependencies\n');
    console.log(chalk.green('✔ requirements-dev.in 已创建\n'));
  }
  return requirementsDevInPath;
}

// 通过 uv + pip-tools 安装后端工具
async function installBackendToolViaPipTools(toolName, versionConstraint) {
  const requirementsDevInPath = ensureRequirementsDevIn();
  
  // 检查依赖是否已存在
  const content = fs.readFileSync(requirementsDevInPath, 'utf8');
  if (content.includes(toolName)) {
    console.log(chalk.yellow(`⚠️  ${toolName} 已在 requirements-dev.in 中\n`));
    return true;
  }
  
  // 添加依赖到 requirements-dev.in
  console.log(chalk.blue(`📝 添加 ${toolName} 到 requirements-dev.in...`));
  fs.appendFileSync(requirementsDevInPath, `${toolName}${versionConstraint}\n`);
  console.log(chalk.green(`✔ ${toolName} 已添加到 requirements-dev.in\n`));
  
  // 检查是否有 Makefile
  const makefilePath = path.join(process.cwd(), 'Makefile');
  const hasMakefile = fs.existsSync(makefilePath);
  
  if (hasMakefile) {
    // 使用 Makefile
    console.log(chalk.blue('📦 编译依赖（make compile-deps）...'));
    try {
      execSync('make compile-deps', {
        stdio: 'inherit',
        cwd: process.cwd()
      });
      console.log(chalk.green('✔ 依赖编译完成\n'));
      
      console.log(chalk.blue('📦 同步环境（make sync）...'));
      execSync('make sync', {
        stdio: 'inherit',
        cwd: process.cwd()
      });
      console.log(chalk.green('✔ 环境同步完成\n'));
      return true;
    } catch (error) {
      console.error(chalk.red(`✗ 依赖安装失败: ${error.message}\n`));
      console.log(chalk.yellow('💡 提示：请确保已安装 uv 和 pip-tools，并配置了 Makefile\n'));
      return false;
    }
  } else {
    // 直接使用 uv pip compile 和 sync
    console.log(chalk.blue('📦 编译依赖（uv pip compile）...'));
    try {
      execSync('uv pip compile requirements-dev.in -o requirements-dev.txt', {
        stdio: 'inherit',
        cwd: process.cwd()
      });
      console.log(chalk.green('✔ 依赖编译完成\n'));
      
      console.log(chalk.blue('📦 同步环境（uv pip sync）...'));
      execSync('uv pip sync requirements-dev.txt', {
        stdio: 'inherit',
        cwd: process.cwd()
      });
      console.log(chalk.green('✔ 环境同步完成\n'));
      return true;
    } catch (error) {
      console.error(chalk.red(`✗ 依赖安装失败: ${error.message}\n`));
      console.log(chalk.yellow('💡 提示：请确保已安装 uv 和 pip-tools\n'));
      return false;
    }
  }
}

// 安装 pre-commit hooks
async function installPreCommitHooks() {
  console.log(chalk.blue('📦 安装 pre-commit hooks...'));
  try {
    execSync('pre-commit install', {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    console.log(chalk.green('✔ pre-commit hooks 安装完成\n'));
    return true;
  } catch (error) {
    console.error(chalk.red(`✗ pre-commit hooks 安装失败: ${error.message}\n`));
    return false;
  }
}

// 主函数
export async function initTools() {
  console.log(chalk.blue('🔧 AODW 工具初始化检查...\n'));

  // Step 1: 检测项目类型
  const projectType = detectProjectType();
  if (projectType === 'unknown') {
    console.log(chalk.yellow('⚠️  无法检测项目类型，请确认项目结构'));
    console.log(chalk.gray('   前端项目应包含: frontend/ 或 src/pages/ 或 package.json + tsconfig.json'));
    console.log(chalk.gray('   后端项目应包含: backend/ 或 app/ 或 pyproject.toml'));
    return;
  }

  console.log(chalk.blue(`📦 检测到项目类型: ${projectType}\n`));

  const status = {
    tools_init: {
      initialized: true,
      initialized_at: new Date().toISOString(),
      last_updated_at: new Date().toISOString(),
      initialized_by: 'cli',
      project_type: projectType,
      frontend: {},
      backend: {},
    },
  };

  // Step 2: 检测前端工具
  if (projectType === 'frontend' || projectType === 'fullstack') {
    console.log(chalk.blue('🔍 检查前端工具...\n'));

    // ESLint
    const eslintStatus = await detectFrontendTool('eslint');
    const eslintConfig = detectConfigFile('eslint', 'frontend');
    status.tools_init.frontend.eslint = {
      installed: eslintStatus.installed,
      configured: eslintConfig.exists,
      config_file: eslintConfig.path || null,
      config_source: eslintConfig.exists ? 'existing' : null,
    };

    if (!eslintStatus.installed) {
      console.log(chalk.yellow('⚠️  检测到 ESLint 未安装'));
      const shouldInstall = await askToInstall(
        'ESLint',
        'ESLint 是必需的代码质量检查工具，用于检查代码风格和潜在问题。',
        'npm install'
      );
      if (shouldInstall) {
        const installed = await installESLint();
        if (installed) {
          status.tools_init.frontend.eslint.installed = true;
        }
      } else {
        console.log(chalk.gray('   跳过 ESLint 安装。您稍后可以手动安装。\n'));
      }
    }
    
    // 检查配置（无论是否刚安装）
    if (!eslintConfig.exists && status.tools_init.frontend.eslint.installed) {
      console.log(chalk.yellow('⚠️  ESLint 已安装，但配置文件不存在'));
      const shouldGenerate = await askToInstall(
        'ESLint 配置文件',
        '是否生成 ESLint 配置文件？',
        'generate config'
      );
      if (shouldGenerate) {
        await generateConfigFile('eslint', 'frontend');
        status.tools_init.frontend.eslint.configured = true;
      }
    } else if (eslintConfig.exists) {
      console.log(chalk.green(`✔ ESLint 已安装并配置 (${eslintConfig.path})\n`));
    }

    // Prettier
    const prettierStatus = await detectFrontendTool('prettier');
    const prettierConfig = detectConfigFile('prettier', 'frontend');
    status.tools_init.frontend.prettier = {
      installed: prettierStatus.installed,
      configured: prettierConfig.exists,
      config_file: prettierConfig.path || null,
      config_source: prettierConfig.exists ? 'existing' : null,
    };

    if (!prettierStatus.installed) {
      console.log(chalk.yellow('⚠️  检测到 Prettier 未安装'));
      const shouldInstall = await askToInstall(
        'Prettier',
        'Prettier 是代码格式化工具，用于统一代码风格。',
        'npm install'
      );
      if (shouldInstall) {
        const installed = await installPrettier();
        if (installed) {
          status.tools_init.frontend.prettier.installed = true;
        }
      } else {
        console.log(chalk.gray('   跳过 Prettier 安装。您稍后可以手动安装。\n'));
      }
    }
    
    // 检查配置（无论是否刚安装）
    if (!prettierConfig.exists && status.tools_init.frontend.prettier.installed) {
      console.log(chalk.yellow('⚠️  Prettier 已安装，但配置文件不存在'));
      const shouldGenerate = await askToInstall(
        'Prettier 配置文件',
        '是否生成 Prettier 配置文件？',
        'generate config'
      );
      if (shouldGenerate) {
        await generateConfigFile('prettier', 'frontend');
        status.tools_init.frontend.prettier.configured = true;
      }
    } else if (prettierConfig.exists) {
      console.log(chalk.green(`✔ Prettier 已安装并配置 (${prettierConfig.path})\n`));
    }

    // TypeScript Path Alias
    const tsconfigPath = path.join(process.cwd(), 'tsconfig.json');
    const tsconfigExists = fs.existsSync(tsconfigPath);
    let tsconfigHasPaths = false;
    if (tsconfigExists) {
      try {
        const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
        tsconfigHasPaths = !!(tsconfig.compilerOptions?.paths);
      } catch (e) {
        // ignore
      }
    }

    status.tools_init.frontend.typescript_path_alias = {
      configured: tsconfigHasPaths,
      config_file: tsconfigExists ? 'tsconfig.json' : null,
      config_source: tsconfigHasPaths ? 'existing' : null,
    };

    if (!tsconfigHasPaths) {
      console.log(chalk.yellow('⚠️  TypeScript path alias 未配置'));
      await generateConfigFile('tsconfig', 'frontend');
    } else {
      console.log(chalk.green('✔ TypeScript path alias 已配置\n'));
    }
  }

  // Step 3: 检测后端工具
  if (projectType === 'backend' || projectType === 'fullstack') {
    console.log(chalk.blue('🔍 检查后端工具...\n'));

    // 依赖管理工具（uv + pip-tools）
    const uvStatus = await detectBackendTool('uv');
    const pipToolsStatus = await detectBackendTool('pip-tools');
    const requirementsInExists = fs.existsSync(path.join(process.cwd(), 'requirements.in'));
    const requirementsDevInExists = fs.existsSync(path.join(process.cwd(), 'requirements-dev.in'));
    const makefileExists = fs.existsSync(path.join(process.cwd(), 'Makefile'));

    status.tools_init.backend.dependency_manager = {
      uv_installed: uvStatus.installed,
      pip_tools_installed: pipToolsStatus.installed,
      configured: requirementsInExists && (makefileExists || pipToolsStatus.installed),
      requirements_in_exists: requirementsInExists,
      requirements_dev_in_exists: requirementsDevInExists,
      makefile_exists: makefileExists,
    };

    if (!uvStatus.installed) {
      console.log(chalk.yellow('⚠️  检测到 uv 未安装'));
      console.log(chalk.blue('   建议运行: curl -LsSf https://astral.sh/uv/install.sh | sh'));
      console.log(chalk.gray('   或通过 AI 命令"初始化工具"进行交互式配置\n'));
    } else if (!pipToolsStatus.installed) {
      console.log(chalk.yellow('⚠️  检测到 pip-tools 未安装'));
      console.log(chalk.blue('   建议运行: uv pip install pip-tools'));
      console.log(chalk.gray('   或通过 AI 命令"初始化工具"进行交互式配置\n'));
    } else if (!requirementsInExists) {
      console.log(chalk.yellow('⚠️  依赖管理未配置（缺少 requirements.in）'));
      console.log(chalk.blue('   建议创建 requirements.in 和 requirements-dev.in 文件'));
      console.log(chalk.gray('   或通过 AI 命令"初始化工具"进行交互式配置\n'));
    } else {
      console.log(chalk.green('✔ 依赖管理工具已配置（uv + pip-tools）\n'));
    }

    // Ruff
    const ruffStatus = await detectBackendTool('ruff');
    const ruffConfig = detectConfigFile('ruff', 'backend');
    status.tools_init.backend.ruff = {
      installed: ruffStatus.installed,
      configured: ruffConfig.exists,
      config_file: ruffConfig.path || null,
      config_source: ruffConfig.exists ? 'existing' : null,
    };

    if (!ruffStatus.installed) {
      console.log(chalk.yellow('⚠️  检测到 Ruff 未安装'));
      const shouldInstall = await askToInstall(
        'Ruff',
        'Ruff 是 Python 代码质量检查工具，用于检查代码风格、复杂度和潜在问题。',
        'uv + pip-tools'
      );
      if (shouldInstall) {
        const installed = await installBackendToolViaPipTools('ruff', '>=0.1.0,<1.0.0');
        if (installed) {
          status.tools_init.backend.ruff.installed = true;
        }
      } else {
        console.log(chalk.gray('   跳过 Ruff 安装。您稍后可以手动安装。\n'));
      }
    }
    
    // 检查配置（无论是否刚安装）
    if (!ruffConfig.exists && status.tools_init.backend.ruff.installed) {
      console.log(chalk.yellow('⚠️  Ruff 已安装，但配置文件不存在'));
      const shouldGenerate = await askToInstall(
        'Ruff 配置文件',
        '是否生成 Ruff 配置文件？',
        'generate config'
      );
      if (shouldGenerate) {
        await generateConfigFile('ruff', 'backend');
        status.tools_init.backend.ruff.configured = true;
      }
    } else if (ruffConfig.exists) {
      console.log(chalk.green(`✔ Ruff 已安装并配置 (${ruffConfig.path})\n`));
    }

    // Black
    const blackStatus = await detectBackendTool('black');
    const blackConfig = detectConfigFile('black', 'backend');
    status.tools_init.backend.black = {
      installed: blackStatus.installed,
      configured: blackConfig.exists,
      config_file: blackConfig.path || null,
      config_source: blackConfig.exists ? 'existing' : null,
    };

    if (!blackStatus.installed) {
      console.log(chalk.yellow('⚠️  检测到 Black 未安装'));
      const shouldInstall = await askToInstall(
        'Black',
        'Black 是 Python 代码格式化工具，用于统一代码风格。',
        'uv + pip-tools'
      );
      if (shouldInstall) {
        const installed = await installBackendToolViaPipTools('black', '>=23.0.0,<24.0.0');
        if (installed) {
          status.tools_init.backend.black.installed = true;
        }
      } else {
        console.log(chalk.gray('   跳过 Black 安装。您稍后可以手动安装。\n'));
      }
    }
    
    // 检查配置（无论是否刚安装）
    if (!blackConfig.exists && status.tools_init.backend.black.installed) {
      console.log(chalk.yellow('⚠️  Black 已安装，但配置文件不存在'));
      const shouldGenerate = await askToInstall(
        'Black 配置文件',
        '是否生成 Black 配置文件？',
        'generate config'
      );
      if (shouldGenerate) {
        await generateConfigFile('black', 'backend');
        status.tools_init.backend.black.configured = true;
      }
    } else if (blackConfig.exists) {
      console.log(chalk.green(`✔ Black 已安装并配置 (${blackConfig.path})\n`));
    }

    // pre-commit
    const precommitStatus = await detectBackendTool('pre-commit');
    const precommitConfig = detectConfigFile('pre-commit', 'backend');
    let hooksInstalled = false;
    if (precommitStatus.installed) {
      const hooksPath = path.join(process.cwd(), '.git/hooks/pre-commit');
      hooksInstalled = fs.existsSync(hooksPath);
    }

    status.tools_init.backend.pre_commit = {
      installed: precommitStatus.installed,
      configured: precommitConfig.exists,
      hooks_installed: hooksInstalled,
      config_file: precommitConfig.path || null,
      config_source: precommitConfig.exists ? 'existing' : null,
    };

    if (!precommitStatus.installed) {
      console.log(chalk.yellow('⚠️  检测到 pre-commit 未安装'));
      const shouldInstall = await askToInstall(
        'pre-commit',
        'pre-commit 是 Git hooks 工具，用于在提交前自动检查代码质量。',
        'uv + pip-tools'
      );
      if (shouldInstall) {
        const installed = await installBackendToolViaPipTools('pre-commit', '>=3.0.0,<4.0.0');
        if (installed) {
          status.tools_init.backend.pre_commit.installed = true;
          // 安装 hooks
          await installPreCommitHooks();
          status.tools_init.backend.pre_commit.hooks_installed = true;
        }
      } else {
        console.log(chalk.gray('   跳过 pre-commit 安装。您稍后可以手动安装。\n'));
      }
    }
    
    // 检查配置（无论是否刚安装）
    if (!precommitConfig.exists && status.tools_init.backend.pre_commit.installed) {
      console.log(chalk.yellow('⚠️  pre-commit 已安装，但配置文件不存在'));
      const shouldGenerate = await askToInstall(
        'pre-commit 配置文件',
        '是否生成 pre-commit 配置文件？',
        'generate config'
      );
      if (shouldGenerate) {
        await generateConfigFile('pre-commit', 'backend');
        status.tools_init.backend.pre_commit.configured = true;
      }
      if (!hooksInstalled && status.tools_init.backend.pre_commit.installed) {
        console.log(chalk.yellow('⚠️  pre-commit hooks 未安装'));
        const shouldInstallHooks = await askToInstall(
          'pre-commit hooks',
          'pre-commit hooks 用于在 Git 提交前自动运行代码检查。',
          'pre-commit install'
        );
        if (shouldInstallHooks) {
          const installed = await installPreCommitHooks();
          if (installed) {
            status.tools_init.backend.pre_commit.hooks_installed = true;
          }
        }
      }
    } else {
      if (!hooksInstalled && status.tools_init.backend.pre_commit.installed) {
        console.log(chalk.yellow('⚠️  pre-commit hooks 未安装'));
        const shouldInstallHooks = await askToInstall(
          'pre-commit hooks',
          'pre-commit hooks 用于在 Git 提交前自动运行代码检查。',
          'pre-commit install'
        );
        if (shouldInstallHooks) {
          const installed = await installPreCommitHooks();
          if (installed) {
            status.tools_init.backend.pre_commit.hooks_installed = true;
          }
        }
      } else if (hooksInstalled) {
        console.log(chalk.green(`✔ pre-commit 已安装并配置 (${precommitConfig.path})\n`));
      }
    }
  }

  // Step 4: 保存状态
  await saveToolsStatus(status);

  // Step 5: 输出总结
  console.log(chalk.blue('\n📊 工具初始化检查完成'));
  console.log(chalk.gray(`状态已保存到: ${TOOLS_STATUS_FILE}`));
  console.log(chalk.gray('\n💡 提示: 如果工具未完全配置，可以通过 AI 命令"初始化工具"进行交互式配置'));
}
