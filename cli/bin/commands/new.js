import fs from 'fs-extra';
import path from 'path';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { getProjectConfig } from '../utils/config.js';

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

    // Create decision.md
    const decisionContent = `# Decision: ${id}

## Profile Selection
- [ ] Spec-Lite (Recommended for most tasks)
- [ ] Spec-Full (For complex/risky tasks)

## Rationale
(AI will fill this)
`;
    fs.writeFileSync(path.join(rtPath, 'decision.md'), decisionContent);

    console.log(chalk.green(`\n✔ Created RT ${id} at ./RT/${id}`));
    console.log(chalk.white(`Next step: Open ./RT/${id}/intake.md and start the intake process.`));
}
