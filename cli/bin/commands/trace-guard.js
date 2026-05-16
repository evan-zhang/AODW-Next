import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';
import chalk from 'chalk';

const CORE_DIR = process.env.AODW_CORE_DIR || '.aodw-next';

function getStagedFiles() {
  try {
    const output = execSync('git diff --cached --name-only --diff-filter=ACMR', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return output
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  } catch (error) {
    throw new Error('无法读取 staged 文件，请确认当前目录是 git 仓库并且 git 可用。');
  }
}

function isCodePath(filePath) {
  const normalized = filePath.replace(/\\/g, '/');

  // v0: 先覆盖最关键目录，避免规则过重
  if (normalized.startsWith('cli/') || normalized.startsWith('templates/')) {
    return true;
  }

  // 面向用户项目的常见代码目录（保持宽松，不做复杂识别）
  const commonCodeDirs = ['src/', 'app/', 'backend/', 'frontend/', 'api/'];
  return commonCodeDirs.some((dir) => normalized.startsWith(dir));
}

function isTracePath(filePath) {
  const normalized = filePath.replace(/\\/g, '/');

  const tracePrefixes = [
    'RT/',
    'maintainers/',
    `${CORE_DIR}/06-project/`,
  ];

  if (tracePrefixes.some((prefix) => normalized.startsWith(prefix))) {
    return true;
  }

  const traceFileNames = ['rt-lite.md', 'meta.yaml', 'changelog.md', 'tests.md'];
  return traceFileNames.some((name) => normalized.endsWith(`/${name}`) || normalized === name);
}

function splitFiles(stagedFiles) {
  const codeFiles = stagedFiles.filter(isCodePath);
  const traceFiles = stagedFiles.filter(isTracePath);
  const otherFiles = stagedFiles.filter((filePath) => !codeFiles.includes(filePath) && !traceFiles.includes(filePath));

  return { codeFiles, traceFiles, otherFiles };
}

function writeAuditDraft(stagedFiles, splitResult) {
  const { codeFiles, traceFiles, otherFiles } = splitResult;
  const now = new Date().toISOString();
  const lines = [
    '# AODW Audit Draft',
    '',
    `- generated_at: ${now}`,
    `- staged_files_count: ${stagedFiles.length}`,
    '',
    '## 1) Code Changes',
    ...(codeFiles.length > 0 ? codeFiles.map((f) => `- ${f}`) : ['- (none)']),
    '',
    '## 2) Trace Updates',
    ...(traceFiles.length > 0 ? traceFiles.map((f) => `- ${f}`) : ['- (none)']),
    '',
    '## 3) Other Changes',
    ...(otherFiles.length > 0 ? otherFiles.map((f) => `- ${f}`) : ['- (none)']),
    '',
    '## 4) Fill-in Checklist',
    '- 改了什么（1-3 行）：',
    '- 影响范围（模块/目录）：',
    '- 验证方式（最小步骤）：',
    '',
  ];

  const outputPath = path.join(process.cwd(), CORE_DIR, '06-project', 'audit-latest.md');
  fs.ensureDirSync(path.dirname(outputPath));
  fs.writeFileSync(outputPath, `${lines.join('\n')}\n`, 'utf8');
  return outputPath;
}

function stageFile(filePath) {
  const relativePath = path.relative(process.cwd(), filePath);
  execSync(`git add "${relativePath}"`, { stdio: ['ignore', 'pipe', 'pipe'] });
}

export function guardDocTrace(options = {}) {
  const { autoFix = false, stageAudit = false } = options;
  const stagedFiles = getStagedFiles();
  const splitResult = splitFiles(stagedFiles);
  const { codeFiles, traceFiles } = splitResult;

  if (codeFiles.length === 0) {
    console.log(chalk.green('✅ guard 通过：未检测到代码目录改动。'));
    return;
  }

  if (traceFiles.length > 0) {
    console.log(chalk.green('✅ guard 通过：检测到流程痕迹更新。'));
    return;
  }

  if (autoFix) {
    try {
      const outputPath = writeAuditDraft(stagedFiles, splitResult);
      if (stageAudit) {
        stageFile(outputPath);
      }
      console.log(chalk.yellow('⚠️ guard 自动补录：检测到代码改动但无流程痕迹。'));
      console.log(chalk.green(`✅ 已自动生成${stageAudit ? '并暂存' : ''}补录文件: ${path.relative(process.cwd(), outputPath)}`));
      return;
    } catch (error) {
      console.log(chalk.red(`❌ guard 自动补录失败: ${error.message}`));
      process.exitCode = 1;
      return;
    }
  }

  console.log(chalk.red('\n❌ guard 未通过：检测到代码改动，但未检测到流程痕迹更新。'));
  console.log(chalk.yellow('\n检测到的代码改动:'));
  codeFiles.forEach((file) => console.log(chalk.yellow(`  - ${file}`)));

  console.log(chalk.cyan('\n补救建议（v0）:'));
  console.log(chalk.cyan('  1) 运行: aodw-skill audit --write'));
  console.log(chalk.cyan(`  2) 或手工更新 ${CORE_DIR}/06-project/ 或 RT/ 或 maintainers/ 下的记录`));

  process.exitCode = 1;
}

export async function auditDocTrace(options = {}) {
  const stagedFiles = getStagedFiles();
  const splitResult = splitFiles(stagedFiles);
  const outputPath = path.join(process.cwd(), CORE_DIR, '06-project', 'audit-latest.md');

  if (options.write) {
    writeAuditDraft(stagedFiles, splitResult);
    console.log(chalk.green(`✅ 已写入审计草稿: ${path.relative(process.cwd(), outputPath)}`));
    return;
  }

  writeAuditDraft(stagedFiles, splitResult);
  const content = await fs.readFile(outputPath, 'utf8');
  await fs.remove(outputPath);
  console.log(content);
}

