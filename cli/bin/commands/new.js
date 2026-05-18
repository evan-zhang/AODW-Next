import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { getProjectConfig } from '../utils/config.js';

const CORE_DIR = process.env.AODW_CORE_DIR || '.aodw-next';

function getTemplatePath(name) {
    const local = path.join(process.cwd(), CORE_DIR, 'templates', name);
    if (fs.existsSync(local)) return local;
    const pkg = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../.aodw-next/templates', name);
    if (fs.existsSync(pkg)) return pkg;
    return null;
}

function loadTemplate(name, replacements = {}) {
    const templatePath = getTemplatePath(name);
    if (!templatePath) return null;
    let content = fs.readFileSync(templatePath, 'utf8');
    for (const [key, value] of Object.entries(replacements)) {
        content = content.split(key).join(value);
    }
    return content;
}

function getProjectName() {
    // 1. Try .aodw/project.yaml
    const projectConfig = getProjectConfig();
    if (projectConfig.project_name) return projectConfig.project_name;

    // 2. Try package.json
    try {
        const pkgPath = path.join(process.cwd(), 'package.json');
        if (fs.existsSync(pkgPath)) {
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
            if (pkg.name) return pkg.name;
        }
    } catch (e) {
        // ignore
    }
    return path.basename(process.cwd());
}

function getLocalMaxSeq() {
    const rtDir = path.join(process.cwd(), 'RT');
    if (!fs.existsSync(rtDir)) return 0;

    const dirs = fs.readdirSync(rtDir);
    let maxSeq = 0;

    for (const dir of dirs) {
        const match = dir.match(/^RT-(\d+)$/);
        if (match) {
            const seq = parseInt(match[1], 10);
            if (seq > maxSeq) maxSeq = seq;
        }
    }

    return maxSeq;
}

function getLocalNextId() {
    const maxSeq = getLocalMaxSeq();
    return `RT-${String(maxSeq + 1).padStart(3, '0')}`;
}

const EXECUTION_MODES = ['collaborative', 'autopilot'];

async function resolveExecutionMode(options) {
    if (options.executionMode) {
        const mode = String(options.executionMode).toLowerCase();
        if (!EXECUTION_MODES.includes(mode)) {
            console.error(chalk.red(`错误: execution_mode 必须是 ${EXECUTION_MODES.join(' 或 ')}`));
            process.exit(1);
        }
        console.log(chalk.cyan(`执行模式（命令行指定）: ${mode}`));
        return mode;
    }

    console.log(chalk.yellow('\n⚠️  创建 RT 前必须确认执行模式，未选择将无法继续。\n'));

    const { executionMode } = await inquirer.prompt([{
        type: 'list',
        name: 'executionMode',
        message: '请选择本 RT 的执行模式（必选）:',
        choices: [
            {
                name: '人工干预模式（协作）— Gate 3/4/5 需用户确认后再推进',
                value: 'collaborative',
            },
            {
                name: '全自动模式（Autopilot）— 机械验收 + 循环推进，仅熔断时请求人工',
                value: 'autopilot',
            },
        ],
    }]);

    return executionMode;
}

export async function createNewRT(options) {
    // Determine Project Name: Flag > Config/Package/Dir
    const project = options.project || getProjectName();

    let title = options.title;

    if (!title) {
        const answers = await inquirer.prompt([{
            type: 'input',
            name: 'title',
            message: 'Enter the title for this Request Ticket (RT):',
            validate: input => input.trim().length > 0 ? true : 'Title is required'
        }]);
        title = answers.title;
    }

    const executionMode = await resolveExecutionMode(options);

    // 固定独立模式：始终本地生成 RT-ID
    const id = getLocalNextId();
    console.log(chalk.yellow(`Using local ID generation: ${id}`));

    // Create Directory
    const rtPath = path.join(process.cwd(), 'RT', id);
    if (fs.existsSync(rtPath)) {
        console.error(chalk.red(`Error: Directory ${rtPath} already exists!`));
        process.exit(1);
    }
    fs.ensureDirSync(rtPath);

    // Create meta.yaml
    const now = new Date().toISOString();
    const metaContent = `id: ${id}
title: "${title}"
type: Feature  # Default, update after intake
profile: Spec-Lite  # Default, update after decision
execution_mode: ${executionMode}  # 用户创建时已确认: collaborative | autopilot
status: created
created_at: "${now}"
updated_at: "${now}"
owner: "${process.env.USER || 'unknown'}"
modules: []
`;
    fs.writeFileSync(path.join(rtPath, 'meta.yaml'), metaContent);

    // Create intake.md
    const intakeContent = `# Intake: ${title}

## 1. 原始需求
> ${title}

## 2. 澄清问题
(AI 将在此处添加澄清问题)

## 3. 风险与影响
- 类型: Feature
- 风险: Low
`;
    fs.writeFileSync(path.join(rtPath, 'intake.md'), intakeContent);

    const modeLabel = executionMode === 'autopilot' ? '全自动（Autopilot）' : '人工干预（协作）';

    // Create decision.md
    const decisionContent = `# Decision: ${id}

## Execution Mode（用户已确认，创建时必选）
- [x] ${executionMode} — ${modeLabel}
- 确认时间: ${now}
- 说明: 创建 RT 时由用户明确选择；未经确认不得修改 execution_mode

## Profile Selection
- [ ] Spec-Lite (Recommended for most tasks)
- [ ] Spec-Full (For complex/risky tasks)

## Rationale
(AI will fill this)
`;
    fs.writeFileSync(path.join(rtPath, 'decision.md'), decisionContent);

    const replacements = {
        'RT-XXX': id,
        '<任务标题>': title,
        '<ISO8601>': now,
        'feature/RT-XXX': `feature/${id}`,
        '{RT_ID}': id,
    };

    let rtLite = loadTemplate('rt-lite.template.md', replacements);
    if (rtLite) {
        rtLite = rtLite.replace('execution_mode: collaborative', `execution_mode: ${executionMode}`);
        fs.writeFileSync(path.join(rtPath, 'rt-lite.md'), rtLite);
    }

    if (executionMode === 'autopilot') {
        const rtPlan = loadTemplate('rt-plan.template.md', replacements);
        if (rtPlan) fs.writeFileSync(path.join(rtPath, 'rt-plan.md'), rtPlan);

        let stateJson = loadTemplate('rt-state.template.json', replacements);
        if (stateJson) {
            stateJson = stateJson.replace('"execution_mode": "autopilot"', `"execution_mode": "${executionMode}"`);
            fs.writeFileSync(path.join(rtPath, 'state.json'), stateJson);
        }

        const loopPrompt = loadTemplate('rt-loop-prompt.template.md', {
            ...replacements,
            '{ITERATION}': '1',
            '{MAX_ITERATIONS}': '20',
            '{GOAL_SUMMARY}': title,
            '{CHECKLIST_ITEMS}': '见 rt-lite.md §7',
            '{STATE_JSON}': stateJson || '{}',
        });
        if (loopPrompt) fs.writeFileSync(path.join(rtPath, 'loop-prompt.md'), loopPrompt);

        const executionLog = loadTemplate('execution-log.template.md', replacements);
        if (executionLog) {
            const logWithTime = executionLog.replace('**time**: \n', `**time**: ${now}\n`);
            fs.writeFileSync(path.join(rtPath, 'execution-log.md'), logWithTime);
        }

        const preflight = loadTemplate('rt-autopilot-preflight.template.md', replacements);
        if (preflight) fs.writeFileSync(path.join(rtPath, 'autopilot-preflight.md'), preflight);
    }

    console.log(chalk.green(`\n✔ Created RT ${id} at ./RT/${id}`));
    console.log(chalk.white(`执行模式: ${executionMode}（${modeLabel}）`));
    console.log(chalk.white('Next step: Open ./RT/' + id + '/intake.md and complete intake/decision.'));
    if (executionMode === 'autopilot') {
        console.log(chalk.cyan('Autopilot: 定稿 rt-lite §7 → Goal 自检 → preflight → 见 .aodw-next/02-workflow/autopilot-protocol.md'));
    } else {
        console.log(chalk.cyan('协作模式: 按 spec-lite-profile.md，Gate 3/4/5 需用户确认'));
    }
}
