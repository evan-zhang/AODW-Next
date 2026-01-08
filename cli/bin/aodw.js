#!/usr/bin/env node

import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

import {
  AntigravityProcessor,
  CursorProcessor,
  CopilotProcessor,
  ClaudeProcessor,
  GeminiProcessor,
  GeneralProcessor,
  BaseProcessor
} from './processors/index.js';

import { serve } from './commands/serve.js';
import { createNewRT } from './commands/new.js';
import { initTools } from './commands/init-tools.js';
import { initOverview } from './commands/init-overview.js';
import { saveProjectConfig, saveUserConfig, getProjectConfig, getUserConfig } from './utils/config.js';

const require = createRequire(import.meta.url);
const packageJson = require('../package.json');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const program = new Command();

// AODW Next 版本 - 固定配置
const CORE_DIRNAME = '.aodw-next';
const PACKAGE_NAME = packageJson.name || 'aodw-skill';

process.env.AODW_CORE_DIR = CORE_DIRNAME;
process.env.AODW_PACKAGE_NAME = PACKAGE_NAME;

const GEMINI_RULE_FILES = [
  'aodw.md',
  'aodw-analyze.md',
  'aodw-complete.md',
  'aodw-control.md',
  'aodw-decide.md',
  'aodw-governance.md',
  'aodw-implement.md',
  'aodw-init.md',
  'aodw-intake.md',
  'aodw-open.md',
  'aodw-verify.md'
];

// Define source paths (Next version - fixed paths)
const SOURCE_CORE = path.join(__dirname, '../../templates/.aodw-next');
const SOURCE_ADAPTERS = path.join(__dirname, '../../templates/AODW_Adapters');
const SOURCE_DOCS = path.join(__dirname, '../../templates/docs');
const SOURCE_TEMPLATE = path.join(SOURCE_CORE, 'templates/aodw-kernel-loader-template.md');

program
  .version(packageJson.version)
  .description('Initialize AODW in your project');

// Helper: Install file with processor
async function installFile(source, target, processorClass = BaseProcessor) {
  const processor = new processorClass(source, target);
  await processor.process();
}

// Helper: Recursive copy with processing
async function copyRecursive(sourceDir, targetDir, processorClass, renameFn = null) {
  // Files to exclude from distribution (maintainer-only tools)
  const excludeFiles = [
    'aodw-governance.md',  // AODW 治理检查（仅维护者）
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
      // Template has empty tech stack sections like "- 前端：\n- 后端："
      const hasEmptyTechStack = /- 前端：\s*\n\s*- 后端：/.test(content);
      // Template has placeholder text
      const hasPlaceholder = /（由 AI 或人工在首次接入 AODW 时填写/.test(content);
      return hasEmptyTechStack || hasPlaceholder;
    }
    
    // Check for template markers in modules-index.yaml
    if (filePath.endsWith('modules-index.yaml')) {
      // Template has only example comments, no actual modules
      const hasOnlyComments = /^version: 1\s*\n\s*# 模块索引/.test(content) && 
                              !/^modules:\s*\n\s*- name:/.test(content);
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

// Helper: Check server health
async function checkServerHealth(url) {
  try {
    // Ensure URL has protocol
    if (!url.startsWith('http')) {
      url = `http://${url}`;
    }

    // Create timeout signal
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000); // 3s timeout

    const res = await fetch(`${url}/api/health`, {
      method: 'GET',
      signal: controller.signal
    });

    clearTimeout(timeout);
    return res.ok;
  } catch (error) {
    return false;
  }
}

async function runInit() {
  console.log(chalk.blue('🚀 正在初始化 AODW...'));

  // --- Safeguard: Prevent running in AODW Source Repo ---
  if (fs.existsSync(path.join(process.cwd(), 'cli/bin/aodw.js')) &&
    (fs.existsSync(path.join(process.cwd(), 'templates/.aodw')) ||
     fs.existsSync(path.join(process.cwd(), 'templates/.aodw-next')))) {
    console.log(chalk.red('\n🛑  严重错误: 您正在 AODW 源码仓库中运行 "aodw init"！'));
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

  // --- Step 2: Configure Mode (if not configured) ---
  const userConfig = getUserConfig();
  if (!userConfig.mode) {
    await configureMode(false); // Run config first time, no pause
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
        { name: 'Claude Desktop', value: 'claude', checked: false },
        { name: 'Gemini (Web / API)', value: 'gemini', checked: false },
        { name: 'General Agents (OpenAI, etc.)', value: 'general', checked: false }
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

  // 3. Install Adapters based on selected platforms
  console.log(chalk.blue('正在安装适配器...'));

  // Cursor
  if (platforms.includes('cursor')) {
    console.log(chalk.yellow('  • 安装 Cursor 适配器...'));
    const targetCursor = path.join(process.cwd(), '.cursor/rules');
    await fs.ensureDir(targetCursor);
    if (fs.existsSync(SOURCE_TEMPLATE)) {
      await installFile(SOURCE_TEMPLATE, path.join(targetCursor, 'aodw.mdc'), CursorProcessor);
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
      await installFile(SOURCE_TEMPLATE, path.join(targetAgentRules, 'aodw.md'), AntigravityProcessor);
    } else {
      const sourceAodw = path.join(SOURCE_ADAPTERS, 'antigravity/.agent/rules/aodw.md');
      if (fs.existsSync(sourceAodw)) {
        await installFile(sourceAodw, path.join(targetAgentRules, 'aodw.md'), AntigravityProcessor);
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

  // Gemini
  if (platforms.includes('gemini')) {
    console.log(chalk.yellow('  • 安装 Gemini 适配器...'));
    const targetGeminiRules = path.join(process.cwd(), '.agent/rules');
    await fs.ensureDir(targetGeminiRules);
    if (fs.existsSync(SOURCE_TEMPLATE)) {
      await installFile(SOURCE_TEMPLATE, path.join(targetGeminiRules, 'aodw.md'), GeminiProcessor);
    } else {
      const sourceGeminiRules = path.join(SOURCE_ADAPTERS, 'gemini/.agent/rules');
      if (fs.existsSync(sourceGeminiRules)) {
        await copyRecursive(sourceGeminiRules, targetGeminiRules, AntigravityProcessor);
      }
    }
    const sourceGemini = path.join(SOURCE_ADAPTERS, 'gemini/GEMINI.md');
    if (fs.existsSync(sourceGemini)) {
      await installFile(
        sourceGemini,
        path.join(process.cwd(), `.gemini/GEMINI.md`),
        BaseProcessor
      );
    }
  }

  // General
  if (platforms.includes('general')) {
    console.log(chalk.yellow('  • 安装通用适配器 (General)...'));
    if (fs.existsSync(SOURCE_TEMPLATE)) {
      await installFile(
        SOURCE_TEMPLATE,
        path.join(process.cwd(), CORE_DIRNAME, 'AGENTS.md'),
        GeneralProcessor
      );
    } else {
      await installFile(
        path.join(SOURCE_ADAPTERS, 'general/AGENTS.md'),
        path.join(process.cwd(), CORE_DIRNAME, 'AGENTS.md'),
        BaseProcessor
      );
    }
    const sourceCopilot = path.join(SOURCE_ADAPTERS, 'general/.github/copilot-instructions.md');
    if (fs.existsSync(sourceCopilot)) {
      await installFile(
        sourceCopilot,
        path.join(process.cwd(), `.github/copilot-instructions.md`),
        BaseProcessor
      );
    }
  }

  console.log(chalk.green('\n✅ AODW Next 初始化成功!'));
  console.log(chalk.white(`项目: ${projectName}`));

  const updatedConfig = getUserConfig();
  console.log(chalk.white(`模式: ${updatedConfig.mode === 'independent' ? '独立模式 (本地)' : '协作模式 (联网)'}`));
  if (updatedConfig.mode === 'collaborative') {
    console.log(chalk.white(`服务器: ${updatedConfig.server_url}`));
  }
  console.log(chalk.white(`平台: ${platforms.join(', ')}`));
}

async function runUpdate() {
  console.log(chalk.blue('🔄 正在更新 AODW...'));
  await runInit();
}

async function runUninstall() {
  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: `确定要卸载 AODW Next 吗? 这将删除 ${CORE_DIRNAME} 目录（包含 ui-kit）。`,
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
    await removeIfExists(path.join(cwd, '.cursor/rules', 'aodw.mdc'));

    // Antigravity
    await removeIfExists(path.join(cwd, '.agent/rules', 'aodw.md'));

    // Claude
    await removeIfExists(path.join(cwd, '.claude', 'CLAUDE.md'));

    // Gemini rules
    for (const ruleFile of GEMINI_RULE_FILES) {
      await removeIfExists(path.join(cwd, '.agent/rules', ruleFile));
    }
    await removeIfExists(path.join(cwd, '.gemini', 'GEMINI.md'));

    // General
    await removeIfExists(path.join(cwd, CORE_DIRNAME, 'AGENTS.md'));
    await removeIfExists(path.join(cwd, '.github', 'copilot-instructions.md'));

    console.log(chalk.green('✅ AODW 已卸载。'));
  }
}

async function showHelp() {
  const deployDocPath = path.join(__dirname, '../DEPLOY.md');
  if (fs.existsSync(deployDocPath)) {
    const content = fs.readFileSync(deployDocPath, 'utf8');
    console.log(chalk.cyan('\n=== AODW 部署指南 ===\n'));
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
  
  let overviewPrompt = `请帮我${hasOverview || hasModulesIndex ? '更新' : '初始化'}项目的 AODW 项目概览文档。

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
- ✅ **这些文件在更新 AODW 时会被保护，不会被覆盖**
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
  
  toolsPrompt += `- ✅ **工具状态文件在更新 AODW 时会被保护，不会被覆盖**
- ✅ **工具配置文件在项目根目录，不会被 AODW 更新影响**
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

async function configureMode(pause = true, forceConnect = false) {
  const { mode } = await inquirer.prompt([{
    type: 'list',
    name: 'mode',
    message: '选择开发模式:',
    choices: [
      { name: '独立模式 (本地生成 ID, 适合个人开发)', value: 'independent' },
      { name: '协作模式 (联网获取 ID, 适合团队开发)', value: 'collaborative' }
    ]
  }]);

  let serverUrl = '';
  if (mode === 'collaborative') {
    while (true) {
      const answers = await inquirer.prompt([{
        type: 'input',
        name: 'serverUrl',
        message: '请输入 AODW ID 服务器地址:',
        default: 'http://114.67.218.31:2005',
        validate: (input) => {
          if (!input || input.trim() === '') {
            return '协作模式必须提供服务器地址';
          }
          return true;
        }
      }]);
      serverUrl = answers.serverUrl.trim();

      process.stdout.write(chalk.gray(`正在测试连接 ${serverUrl}... `));
      const healthy = await checkServerHealth(serverUrl);

      if (healthy) {
        console.log(chalk.green('✅ 连接成功'));
        break;
      } else {
        console.log(chalk.red('❌ 连接失败'));
        const { action } = await inquirer.prompt([{
          type: 'list',
          name: 'action',
          message: '无法连接到 ID 服务器，请选择:',
          choices: [
            { name: '重试输入', value: 'retry' },
            { name: '强制保存 (离线使用)', value: 'force' },
            { name: '切换回独立模式', value: 'switch_independent' }
          ]
        }]);

        if (action === 'force') break;
        if (action === 'switch_independent') {
          await saveUserConfig({ mode: 'independent', server_url: '' });
          console.log(chalk.green('✅ 全局配置已保存 (切换为独立模式)'));
          return;
        }
        // retry continues loop
      }
    }
  }

  await saveUserConfig({ mode, server_url: serverUrl });
  console.log(chalk.green('✅ 全局配置已保存!'));
}

async function showMainMenu() {
  while (true) {
    console.clear();
    console.log(chalk.bold.blue('=== AODW CLI 管理器 ==='));
    console.log(chalk.gray('版本: ' + packageJson.version));

    // Show current config summary
    const config = getUserConfig();
    const modeStr = config.mode === 'independent' ? '🏠 独立模式' : '🌐 协作模式';
    console.log(chalk.gray(`当前配置: ${modeStr} ${config.mode === 'collaborative' ? `(${config.server_url})` : ''}`));
    console.log('');

    const { action } = await inquirer.prompt([{
      type: 'list',
      name: 'action',
      message: '请选择操作:',
      pageSize: 10,
      choices: [
        new inquirer.Separator('--- 核心功能 ---'),
        { name: '1. 初始化 / 更新 AODW (在本项目)', value: 'init' },
        { name: '2. 配置全局开发模式 (单机/联网)', value: 'config' },

        new inquirer.Separator('--- 工具箱 ---'),
        { name: '3. 项目概览初始化 (Architecture) - 生成提示词', value: 'init-overview-prompt' },
        { name: '4. 工具初始化 (ESLint/Ruff/Stack) - 生成提示词', value: 'init-tools-prompt' },

        new inquirer.Separator('--- 帮助与维护 ---'),
        { name: '5. 查看帮助 & 部署指南', value: 'help' },
        { name: '6. 卸载 AODW', value: 'uninstall' },
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
        case 'config':
          await configureMode();
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
  .description('Initialize AODW')
  .action(runInit);

program
  .command('update')
  .description('Update AODW')
  .action(runUpdate);

program
  .command('uninstall')
  .description('Uninstall AODW')
  .action(runUninstall);

program
  .command('serve')
  .description('Start the AODW ID Server')
  .option('-p, --port <number>', 'Port to listen on', 2005)
  .action(serve);

program
  .command('new')
  .description('Create a new Request Ticket (RT)')
  .option('--server <url>', 'URL of the ID server')
  .option('--project <name>', 'Project identifier')
  .option('--title <string>', 'Title of the RT')
  .action(createNewRT);

program
  .command('init-tools')
  .alias('tools')
  .description('Initialize development tools (ESLint, Prettier, Ruff, Black, etc.)')
  .action(initTools);

program
  .command('init-overview')
  .alias('overview')
  .description('Initialize or update project overview (tech stack, architecture, modules)')
  .option('--update', 'Update mode: only update changed parts (default)', true)
  .option('--force', 'Force mode: full rescan and update', false)
  .option('--scan-only', 'Scan only: detect changes without updating files', false)
  .option('--no-interactive', 'Non-interactive mode: skip confirmations', false)
  .action((options) => {
    initOverview({
      update: options.update !== false,
      force: options.force || false,
      scanOnly: options.scanOnly || false,
      interactive: options.interactive !== false,
    });
  });

// Main Entry Point
if (!process.argv.slice(2).length) {
  showMainMenu();
} else {
  program.parse(process.argv);
}
