#!/usr/bin/env node

import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

import {
  AntigravityProcessor,
  CursorProcessor,
  ClaudeProcessor,
  BaseProcessor
} from './processors/index.js';

import { serve } from './commands/serve.js';
import { createNewRT } from './commands/new.js';
import { initTools } from './commands/init-tools.js';
import { saveProjectConfig, saveUserConfig, getProjectConfig, getUserConfig } from './utils/config.js';
import {
  detectTechStack,
  analyzeDirectoryStructure,
  detectModules,
  generateOverviewFile,
  generateModulesIndex
} from './commands/init-overview.js';

const require = createRequire(import.meta.url);
const packageJson = require('../package.json');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const program = new Command();

// AODW Next 版本 - 固定配置
const CORE_DIRNAME = '.aodw-next';
const PACKAGE_NAME = packageJson.name || 'aodw-skill';

process.env.AODW_CORE_DIR = CORE_DIRNAME;
process.env.AODW_PACKAGE_NAME = PACKAGE_NAME;

// Define source paths (Next version - fixed paths)
// Support both development (from source) and production (from npm package) environments
function getSourcePaths() {
  const packageRoot = path.join(__dirname, '..'); // cli/ or node_modules/aodw-skill/
  
  // Try npm package paths first (production)
  const npmCore = path.join(packageRoot, '.aodw-next');
  const npmAdapters = path.join(packageRoot, 'AODW_Adapters');

  // Try development paths (from source)
  const devCore = path.join(packageRoot, '../templates/.aodw-next');
  const devAdapters = path.join(packageRoot, '../templates/AODW_Adapters');

  // Use npm package paths if they exist, otherwise use development paths
  const SOURCE_CORE = fs.existsSync(npmCore) ? npmCore : devCore;
  const SOURCE_ADAPTERS = fs.existsSync(npmAdapters) ? npmAdapters : devAdapters;

  return { SOURCE_CORE, SOURCE_ADAPTERS };
}

const { SOURCE_CORE, SOURCE_ADAPTERS } = getSourcePaths();
const SOURCE_TEMPLATE = path.join(SOURCE_CORE, 'templates/aodw-kernel-loader-template.md');

program
  .version(packageJson.version)
  .description('Initialize AODW-Next in your project');

// Helper: Install file with processor
async function installFile(source, target, processorClass = BaseProcessor) {
  const processor = new processorClass(source, target);
  await processor.process();
}

// Helper: Recursive copy with processing
async function copyRecursive(sourceDir, targetDir, processorClass, renameFn = null) {
  // Files to exclude from distribution (maintainer-only tools)
  const excludeFiles = [
    'aodw-governance.md',  // AODW-Next 治理检查（仅维护者）
    'aodw-init.md'          // 初始化（CLI 已处理）
  ];

  const entries = await fs.readdir(sourceDir, { withFileTypes: true });
  for (const entry of entries) {
    // Skip excluded files
    if (!entry.isDirectory() && excludeFiles.includes(entry.name)) {
      console.log(chalk.gray(`    ⊖ 跳过 ${entry.name} (仅供维护者使用)`));
      continue;
    }

    const srcPath = path.join(sourceDir, entry.name);
    const destName = renameFn ? renameFn(entry.name) : entry.name;
    const destPath = path.join(targetDir, destName);

    if (entry.isDirectory()) {
      await fs.ensureDir(destPath);
      await copyRecursive(srcPath, destPath, processorClass, renameFn);
    } else {
      await installFile(srcPath, destPath, processorClass);
    }
  }
}

// Helper: Check if a file is a user-generated file (not a template)
function isUserGeneratedFile(filePath, coreDir) {
  const relativePath = path.relative(coreDir, filePath);
  
  // User-generated files that should be preserved
  const userGeneratedFiles = [
    '06-project/ai-overview.md',
    '06-project/modules-index.yaml',
    'tools-status.yaml'
  ];
  
  return userGeneratedFiles.some(pattern => relativePath === pattern || relativePath.endsWith(pattern));
}

// Helper: Check if a file is still a template (has template markers)
async function isTemplateFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return false;
  }

  try {
    const content = await fs.readFile(filePath, 'utf8');

    // Check for template markers in ai-overview.md
    if (filePath.endsWith('ai-overview.md')) {
      // Template has "待补充" placeholders
      const hasPlaceholder = /（待补充）/.test(content);
      return hasPlaceholder;
    }

    // Check for template markers in modules-index.yaml
    if (filePath.endsWith('modules-index.yaml')) {
      // Template has comment "# ⚠️ 项目特化文件..." and no actual modules
      const hasOnlyComments = /^version: 1\s*\n\s*# ⚠️ 项目特化文件/.test(content) &&
                              /^modules:\s*\n\s*# 示例格式/m.test(content);
      return hasOnlyComments;
    }

    // tools-status.yaml is always user-generated if it exists
    if (filePath.endsWith('tools-status.yaml')) {
      return false; // If it exists, it's user-generated
    }

    return false;
  } catch (e) {
    return false;
  }
}

// Helper: Smart copy that preserves user-generated files
async function copyCoreWithPreservation(sourceDir, targetDir, isUpdate = false) {
  const entries = await fs.readdir(sourceDir, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(sourceDir, entry.name);
    const destPath = path.join(targetDir, entry.name);
    
    if (entry.isDirectory()) {
      await fs.ensureDir(destPath);
      await copyCoreWithPreservation(srcPath, destPath, isUpdate);
    } else {
      // Check if this is a user-generated file
      if (isUserGeneratedFile(destPath, targetDir)) {
        if (isUpdate) {
          // During update, check if file exists and is not a template
          if (fs.existsSync(destPath)) {
            const isTemplate = await isTemplateFile(destPath);
            if (!isTemplate) {
              // File exists and is user-generated, skip overwriting
              console.log(chalk.gray(`    ⊖ 保留用户文件: ${path.relative(process.cwd(), destPath)}`));
              continue;
            } else {
              // File exists but is still a template, can be overwritten
              console.log(chalk.yellow(`    ↻ 更新模板文件: ${path.relative(process.cwd(), destPath)}`));
            }
          }
        }
        // During init, always copy (first time)
      }
      
      // Copy the file
      await fs.ensureDir(path.dirname(destPath));
      await fs.copy(srcPath, destPath);
    }
  }
}

// Helper: Return to menu pause
async function returnToMenu() {
  console.log(); // empty line
  await inquirer.prompt([{
    type: 'input',
    name: 'pause',
    message: chalk.dim('按回车键返回主菜单...'),
    prefix: '🔙'
  }]);
}

async function runInit() {
  console.log(chalk.blue('🚀 正在初始化 AODW-Next...'));

  // --- Safeguard: Prevent running in AODW-Next Source Repo ---
  if (fs.existsSync(path.join(process.cwd(), 'cli/bin/aodw.js')) &&
    fs.existsSync(path.join(process.cwd(), 'templates/.aodw-next'))) {
    console.log(chalk.red('\n🛑  严重错误: 您正在 AODW-Next 源码仓库中运行 "aodw-skill init"！'));
    console.log(chalk.yellow('    这将导致开发模板覆盖源文件。'));
    console.log(chalk.yellow('    如需更新模板，请使用: cd cli && ./build-local.sh'));
    return;
  }

  // --- Step 1: Project Identity ---
  const existingProjectConfig = getProjectConfig();
  let projectName = path.basename(process.cwd());

  // Try to get name from package.json
  try {
    const pkgPath = path.join(process.cwd(), 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      if (pkg.name) projectName = pkg.name;
    }
  } catch (e) {
    // ignore
  }

  if (existingProjectConfig.project_name) {
    console.log(chalk.yellow(`⚠️  发现现有项目配置: ${existingProjectConfig.project_name}`));
    const { overwrite } = await inquirer.prompt([{
      type: 'confirm',
      name: 'overwrite',
      message: '是否重新配置 (覆盖)?',
      default: false
    }]);
    if (!overwrite) {
      projectName = existingProjectConfig.project_name;
    } else {
      const answers = await inquirer.prompt([{
        type: 'input',
        name: 'projectName',
        message: '请输入项目唯一名称:',
        default: projectName,
        suffix: chalk.gray(' (提示: 如果是加入团队项目, 请先 git pull!)')
      }]);
      projectName = answers.projectName;
      await saveProjectConfig({ project_name: projectName });
    }
  } else {
    const answers = await inquirer.prompt([{
      type: 'input',
      name: 'projectName',
      message: '请输入项目唯一名称:',
      default: projectName,
      suffix: chalk.gray(' (提示: 如果是加入团队项目, 请先 git pull!)')
    }]);
    projectName = answers.projectName;
    await saveProjectConfig({ project_name: projectName });
  }

  // --- Step 2: Fixed Local Mode (independent only) ---
  const userConfig = getUserConfig();
  if (userConfig.mode !== 'independent' || userConfig.server_url) {
    await saveUserConfig({ mode: 'independent', server_url: '' });
    console.log(chalk.gray('已固定为独立模式（本地生成 ID）'));
  }

  // --- Step 3: Platform Selection (Multi-select) ---
  const { platforms } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'platforms',
      message: '选择要支持的 AI 平台 (空格选择, 回车确认):',
      choices: [
        { name: 'Cursor (IDE with AI)', value: 'cursor', checked: true },
        { name: 'Antigravity (Google Gemini)', value: 'antigravity', checked: true },
        { name: 'Claude Desktop', value: 'claude', checked: false }
      ],
      validate: (answer) => {
        if (answer.length < 1) {
          return '必须至少选择一个平台。';
        }
        return true;
      }
    }
  ]);

  // 1. Install Core Rules (channel-aware core dir)
  const targetCore = path.join(process.cwd(), CORE_DIRNAME);
  const isUpdate = fs.existsSync(targetCore);

  if (isUpdate) {
    console.log(chalk.blue('正在更新核心规则（保留用户生成的文件）...'));
    await copyCoreWithPreservation(SOURCE_CORE, targetCore, true);
  } else {
    console.log(chalk.blue('正在安装核心规则...'));
    await fs.copy(SOURCE_CORE, targetCore);
  }

  // 2. Initialize project files from templates (first time only)
  if (!isUpdate) {
    console.log(chalk.blue('正在初始化项目文件...'));
    const projectDir = path.join(targetCore, '06-project');

    // Check if project files need to be initialized
    const aiOverviewExists = fs.existsSync(path.join(projectDir, 'ai-overview.md'));
    const modulesIndexExists = fs.existsSync(path.join(projectDir, 'modules-index.yaml'));

    if (!aiOverviewExists && !modulesIndexExists) {
      // Auto-detect project info and generate files
      console.log(chalk.blue('正在检测项目信息...'));
      const techStack = await detectTechStack();
      const directoryStructure = await analyzeDirectoryStructure();
      const modules = await detectModules();

      console.log(chalk.green('  • 技术栈检测完成'));
      const techStackSummary = [];
      if (techStack.frontend.length > 0) techStackSummary.push(`前端: ${techStack.frontend.join(', ')}`);
      if (techStack.backend.length > 0) techStackSummary.push(`后端: ${techStack.backend.join(', ')}`);
      if (techStack.database.length > 0) techStackSummary.push(`数据库: ${techStack.database.join(', ')}`);
      if (techStackSummary.length > 0) {
        console.log(chalk.gray(`    检测到: ${techStackSummary.join(' | ')}`));
      }

      console.log(chalk.green('  • 目录结构分析完成'));
      console.log(chalk.green('  • 模块识别完成'));

      // Generate files with detected info
      await generateOverviewFile({ techStack, directoryStructure, modules }, null, modules);
      await generateModulesIndex(modules);
      console.log(chalk.yellow('  • 已生成 ai-overview.md（自动检测）'));
      console.log(chalk.yellow('  • 已生成 modules-index.yaml（自动检测）'));
    } else {
      console.log(chalk.gray('  • 项目文件已存在，跳过初始化'));
    }
  }

  // 3. Install Adapters based on selected platforms
  console.log(chalk.blue('正在安装适配器...'));

  // Cursor
  if (platforms.includes('cursor')) {
    console.log(chalk.yellow('  • 安装 Cursor 适配器...'));
    const targetCursor = path.join(process.cwd(), '.cursor/rules');
    await fs.ensureDir(targetCursor);
    if (fs.existsSync(SOURCE_TEMPLATE)) {
      await installFile(SOURCE_TEMPLATE, path.join(targetCursor, 'aodw-next.mdc'), CursorProcessor);
    } else {
      const sourceCursor = path.join(SOURCE_ADAPTERS, 'cursor/.cursor/rules');
      if (fs.existsSync(sourceCursor)) {
        await copyRecursive(sourceCursor, targetCursor, CursorProcessor);
      }
    }

    // Cursor deployment scripts
    const targetCursorDeploy = path.join(process.cwd(), '.cursor/deploy');
    await fs.ensureDir(targetCursorDeploy);
    const sourceCursorDeploy = path.join(SOURCE_ADAPTERS, 'cursor/.cursor/deploy');
    if (fs.existsSync(sourceCursorDeploy)) {
      await copyRecursive(sourceCursorDeploy, targetCursorDeploy, BaseProcessor);
    }

    // Cursor commands
    const targetCursorCommands = path.join(process.cwd(), '.cursor/commands');
    await fs.ensureDir(targetCursorCommands);
    const sourceCursorCommands = path.join(SOURCE_ADAPTERS, 'cursor/.cursor/commands');
    if (fs.existsSync(sourceCursorCommands)) {
      await copyRecursive(sourceCursorCommands, targetCursorCommands, BaseProcessor);
    }
  }

  // Antigravity
  if (platforms.includes('antigravity')) {
    console.log(chalk.yellow('  • 安装 Antigravity 适配器...'));
    const targetAgentRules = path.join(process.cwd(), '.agent/rules');
    await fs.ensureDir(targetAgentRules);
    if (fs.existsSync(SOURCE_TEMPLATE)) {
      await installFile(SOURCE_TEMPLATE, path.join(targetAgentRules, 'aodw-next.md'), AntigravityProcessor);
    } else {
      const sourceAodw = path.join(SOURCE_ADAPTERS, 'antigravity/.agent/rules/aodw-next.md');
      if (fs.existsSync(sourceAodw)) {
        await installFile(sourceAodw, path.join(targetAgentRules, 'aodw-next.md'), AntigravityProcessor);
      }
    }
  }

  // Claude
  if (platforms.includes('claude')) {
    console.log(chalk.yellow('  • 安装 Claude 适配器...'));
    if (fs.existsSync(SOURCE_TEMPLATE)) {
      await installFile(
        SOURCE_TEMPLATE,
        path.join(process.cwd(), `.claude/CLAUDE.md`),
        ClaudeProcessor
      );
    } else {
      await installFile(
        path.join(SOURCE_ADAPTERS, 'claude/CLAUDE.md'),
        path.join(process.cwd(), `.claude/CLAUDE.md`),
        ClaudeProcessor
      );
    }
  }

  console.log(chalk.green('\n✅ AODW-Next 初始化成功!'));
  console.log(chalk.white(`项目: ${projectName}`));

  console.log(chalk.white('模式: 独立模式 (本地)'));
  console.log(chalk.white(`平台: ${platforms.join(', ')}`));
}

async function runUpdate() {
  console.log(chalk.blue('🔄 正在更新 AODW-Next...'));
  await runInit();
}

async function runUninstall() {
  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: `确定要卸载 AODW-Next 吗? 这将删除 ${CORE_DIRNAME} 目录（包含 ui-kit）。`,
      default: false
    }
  ]);

  if (confirm) {
    const cwd = process.cwd();
    await fs.remove(path.join(cwd, CORE_DIRNAME));

    const removeIfExists = async (filePath) => {
      if (fs.existsSync(filePath)) {
        await fs.remove(filePath);
      }
    };

    // Cursor
    await removeIfExists(path.join(cwd, '.cursor/rules', 'aodw-next.mdc'));

    // Antigravity (Gemini)
    await removeIfExists(path.join(cwd, '.agent/rules', 'aodw-next.md'));

    // Claude
    await removeIfExists(path.join(cwd, '.claude', 'CLAUDE.md'));

    console.log(chalk.green('✅ AODW-Next 已卸载。'));
  }
}

async function showHelp() {
  const deployDocPath = path.join(__dirname, '../DEPLOY.md');
  if (fs.existsSync(deployDocPath)) {
    const content = fs.readFileSync(deployDocPath, 'utf8');
    console.log(chalk.cyan('\n=== AODW-Next 部署指南 ===\n'));
    console.log(content);
  } else {
    console.log(chalk.red('未找到帮助文件。'));
  }
}

async function generateOverviewPrompt() {
  console.clear();
  console.log(chalk.bold.cyan('\n=== 项目概览初始化提示词 ===\n'));
  console.log(chalk.yellow('📋 请将以下提示词复制给您的 AI 助手（Cursor/Claude/Gemini 等）：\n'));
  
  const overviewFile = path.join(process.cwd(), CORE_DIRNAME, '06-project/ai-overview.md');
  const modulesIndexFile = path.join(process.cwd(), CORE_DIRNAME, '06-project/modules-index.yaml');
  const hasOverview = fs.existsSync(overviewFile);
  const hasModulesIndex = fs.existsSync(modulesIndexFile);
  
  let overviewPrompt = `请帮我${hasOverview || hasModulesIndex ? '更新' : '初始化'}项目的 AODW-Next 项目概览文档。

**任务说明**：
根据当前项目的代码结构、技术栈和架构，生成或完善以下文档：
1. \`${CORE_DIRNAME}/06-project/ai-overview.md\` - 项目概览文档
2. \`${CORE_DIRNAME}/06-project/modules-index.yaml\` - 模块索引文件

**文件位置**：
- 项目概览文档：\`${overviewFile}\`
- 模块索引文件：\`${modulesIndexFile}\`

**参考规则**：
- 请参考 \`${CORE_DIRNAME}/01-core/ai-project-overview-rules.md\` 中的详细规则
- 需要检测项目的技术栈（前端、后端、数据库、消息系统等）
- 需要识别项目的模块结构
- 需要分析项目的架构模式

**执行步骤**：
1. 先读取 \`${CORE_DIRNAME}/01-core/ai-project-overview-rules.md\` 了解规则
2. ${hasOverview ? `读取现有的 \`${CORE_DIRNAME}/06-project/ai-overview.md\` 了解当前项目信息` : '分析项目结构，检测技术栈'}
3. ${hasModulesIndex ? `读取现有的 \`${CORE_DIRNAME}/06-project/modules-index.yaml\` 了解当前模块结构` : '识别项目模块'}
4. 生成或更新 \`ai-overview.md\` 和 \`modules-index.yaml\`

**重要提示**：
- ✅ **这些文件在更新 AODW-Next 时会被保护，不会被覆盖**
- ${hasOverview ? '如果项目已经有部分概览文档，请基于现有内容进行完善' : '如果项目已经有部分概览文档，请基于现有内容进行完善'}
- 确保技术栈信息准确
- 确保模块索引完整
- **此命令可以重复执行**，每次执行会基于现有内容进行更新和完善

请开始执行。`;

  console.log(chalk.white(overviewPrompt));
  console.log(chalk.gray('\n' + '='.repeat(60)));
  console.log(chalk.green('\n✅ 提示词已生成，请复制上面的内容给您的 AI 助手。'));
  if (hasOverview || hasModulesIndex) {
    console.log(chalk.blue('\n📝 检测到已有文件，将基于现有内容进行更新。'));
  }
  console.log(chalk.yellow('\n💡 提示：完成项目概览初始化后，再执行"工具初始化"可以更准确地识别技术栈。\n'));
}

async function generateToolsPrompt() {
  console.clear();
  console.log(chalk.bold.cyan('\n=== 工具初始化提示词 ===\n'));
  console.log(chalk.yellow('📋 请将以下提示词复制给您的 AI 助手（Cursor/Claude/Gemini 等）：\n'));
  
  // 检查是否已有项目概览和工具状态
  const overviewFile = path.join(process.cwd(), CORE_DIRNAME, '06-project/ai-overview.md');
  const toolsStatusFile = path.join(process.cwd(), CORE_DIRNAME, 'tools-status.yaml');
  const hasOverview = fs.existsSync(overviewFile);
  const hasToolsStatus = fs.existsSync(toolsStatusFile);
  
  let toolsPrompt = `请帮我${hasToolsStatus ? '更新' : '初始化'}项目的开发工具配置。

**任务说明**：
根据当前项目的技术栈，初始化相应的代码质量工具（ESLint、Prettier、Ruff、Black、rustfmt、clippy 等）。

**文件位置**：
- 工具状态文件：\`${toolsStatusFile}\`
- 工具配置文件：根据技术栈生成在项目根目录（如 \`.eslintrc.json\`, \`ruff.toml\`, \`rustfmt.toml\` 等）

**参考规则**：
- 请参考 \`${CORE_DIRNAME}/05-tooling/ai-tools-init-rules.md\` 中的详细规则
- 需要根据项目的技术栈选择合适的工具
- 需要生成相应的配置文件
- 需要设置 pre-commit hooks（如适用）

**执行步骤**：
1. 先读取 \`${CORE_DIRNAME}/05-tooling/ai-tools-init-rules.md\` 了解规则
2. ${hasOverview ? `读取 \`${CORE_DIRNAME}/06-project/ai-overview.md\` 了解技术栈` : '检测项目的技术栈（如果项目概览文档不存在，请先分析项目结构识别技术栈）'}
3. ${hasToolsStatus ? `读取现有的 \`${CORE_DIRNAME}/tools-status.yaml\` 了解当前工具状态` : '检查当前工具安装状态'}
4. 根据技术栈选择需要初始化的工具：
   - 前端（React/Vue）：ESLint、Prettier、PostCSS
   - 后端（Python）：Ruff、Black、pre-commit
   - 后端（Java）：Maven、Checkstyle、Spotless、pre-commit
   - 后端（Rust）：rustfmt、clippy、pre-commit
5. 生成工具配置文件（参考 \`${CORE_DIRNAME}/templates/tools-config/\` 中的模板）
6. 更新 \`${CORE_DIRNAME}/tools-status.yaml\` 记录工具状态

**重要提示**：
`;

  if (!hasOverview) {
    toolsPrompt += `- ⚠️ **建议先执行"项目概览初始化"**，以便更准确地识别技术栈
- 如果项目概览文档不存在，请先分析项目结构识别技术栈
`;
  } else {
    toolsPrompt += `- ✅ 项目概览文档已存在，请先读取 \`${CORE_DIRNAME}/06-project/ai-overview.md\` 了解技术栈
`;
  }
  
  toolsPrompt += `- ✅ **工具状态文件在更新 AODW-Next 时会被保护，不会被覆盖**
- ✅ **工具配置文件在项目根目录，不会被 AODW-Next 更新影响**
- 确保生成的配置文件符合项目规范
- 如果工具已存在，请检查配置是否需要更新
- **此命令可以重复执行**，每次执行会检查并更新工具配置

请开始执行。`;

  console.log(chalk.white(toolsPrompt));
  console.log(chalk.gray('\n' + '='.repeat(60)));
  console.log(chalk.green('\n✅ 提示词已生成，请复制上面的内容给您的 AI 助手。'));
  
  if (!hasOverview) {
    console.log(chalk.yellow('\n⚠️  检测到项目概览文档不存在，建议先执行"项目概览初始化"。\n'));
  } else {
    console.log(chalk.green('\n✅ 项目概览文档已存在，可以基于它来初始化工具。\n'));
  }
  
  if (hasToolsStatus) {
    console.log(chalk.blue('📝 检测到已有工具状态文件，将基于现有状态进行更新。\n'));
  }
}

async function showMainMenu() {
  while (true) {
    console.clear();
    console.log(chalk.bold.blue('=== AODW-Next CLI 管理器 ==='));
    console.log(chalk.gray('版本: ' + packageJson.version));

    // Show current config summary
    console.log(chalk.gray('当前配置: 🏠 独立模式 (本地生成 ID)'));
    console.log('');

    const { action } = await inquirer.prompt([{
      type: 'list',
      name: 'action',
      message: '请选择操作:',
      pageSize: 10,
      choices: [
        new inquirer.Separator('--- 核心功能 ---'),
        { name: '1. 初始化 / 更新 AODW-Next (在本项目)', value: 'init' },

        new inquirer.Separator('--- 工具箱 ---'),
        { name: '2. 项目概览初始化 (Architecture) - 生成提示词', value: 'init-overview-prompt' },
        { name: '3. 工具初始化 (ESLint/Ruff/Stack) - 生成提示词', value: 'init-tools-prompt' },

        new inquirer.Separator('--- 帮助与维护 ---'),
        { name: '4. 查看帮助 & 部署指南', value: 'help' },
        { name: '5. 卸载 AODW-Next', value: 'uninstall' },
        new inquirer.Separator(),
        { name: '0. 退出 (Exit)', value: 'exit' }
      ]
    }]);

    if (action === 'exit') {
      console.log(chalk.blue('再见! 👋'));
      process.exit(0);
    }

    try {
      switch (action) {
        case 'init':
          await runInit();
          await returnToMenu();
          break;
        case 'init-overview-prompt':
          await generateOverviewPrompt();
          await returnToMenu();
          break;
        case 'init-tools-prompt':
          await generateToolsPrompt();
          await returnToMenu();
          break;
        case 'help':
          await showHelp();
          await returnToMenu();
          break;
        case 'uninstall':
          await runUninstall();
          await returnToMenu();
          break;
      }
    } catch (error) {
      console.error(chalk.red('\n执行出错:'), error);
      await returnToMenu();
    }
  }
}

// --- Commands ---

program
  .command('init')
  .description('Initialize AODW-Next')
  .action(runInit);

program
  .command('update')
  .description('Update AODW-Next')
  .action(runUpdate);

program
  .command('uninstall')
  .description('Uninstall AODW-Next')
  .action(runUninstall);

program
  .command('serve')
  .description('Start the AODW-Next ID Server')
  .option('-p, --port <number>', 'Port to listen on', 2005)
  .action(serve);

program
  .command('new')
  .description('Create a new Request Ticket (RT)')
  .option('--project <name>', 'Project identifier')
  .option('--title <string>', 'Title of the RT')
  .action(createNewRT);

program
  .command('init-tools')
  .alias('tools')
  .description('Initialize development tools (ESLint, Prettier, Ruff, Black, etc.)')
  .action(initTools);


// Main Entry Point
if (!process.argv.slice(2).length) {
  showMainMenu();
} else {
  program.parse(process.argv);
}
