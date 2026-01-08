import fs from 'fs-extra';
import path from 'path';
import http from 'http';
import https from 'https';
import { URL } from 'url';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { getProjectConfig, getUserConfig } from '../utils/config.js';

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

function fetchIdFromServer(serverUrl, project) {
    return new Promise((resolve, reject) => {
        const url = new URL('/api/next-id', serverUrl);
        url.searchParams.set('project', project);

        const client = url.protocol === 'https:' ? https : http;

        const req = client.get(url.toString(), (res) => {
            if (res.statusCode !== 200) {
                reject(new Error(`Server returned status ${res.statusCode}`));
                return;
            }

            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve(json.id);
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', (e) => reject(e));
    });
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

function syncIdToServer(serverUrl, project, seq) {
    return new Promise((resolve, reject) => {
        const url = new URL('/api/sync-id', serverUrl);
        url.searchParams.set('project', project);
        url.searchParams.set('seq', seq.toString());

        const client = url.protocol === 'https:' ? https : http;

        const req = client.request(url.toString(), { method: 'POST' }, (res) => {
            if (res.statusCode === 200) {
                resolve(true);
            } else {
                reject(new Error(`Server returned status ${res.statusCode}`));
            }
        });

        req.on('error', (e) => reject(e));
        req.end();
    });
}


export async function createNewRT(options) {
    const userConfig = getUserConfig();

    // Determine Server URL: Flag > Config > Env Var
    const serverUrl = options.server || userConfig.server_url || process.env.AODW_ID_SERVER;

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

    let id;
    // Check if user has configured collaborative mode
    const isCollaborativeMode = userConfig.mode === 'collaborative';

    if (isCollaborativeMode) {
        // In collaborative mode, server URL is required
        if (!serverUrl || serverUrl.trim() === '') {
            console.error(chalk.red('Error: Collaborative mode requires a server URL.'));
            console.error(chalk.yellow('Please configure the server URL by running: aodw config'));
            console.error(chalk.yellow('Or set the AODW_ID_SERVER environment variable.'));
            process.exit(1);
        }

        try {
            console.log(chalk.blue(`Fetching ID from server (${serverUrl})...`));
            const serverId = await fetchIdFromServer(serverUrl, project);
            const serverSeq = parseInt(serverId.replace('RT-', ''), 10);

            // Get local max ID and compare
            const localMaxSeq = getLocalMaxSeq();

            if (serverSeq <= localMaxSeq) {
                // Server ID is outdated, use local max + 1
                const finalSeq = localMaxSeq + 1;
                id = `RT-${String(finalSeq).padStart(3, '0')}`;
                console.log(chalk.yellow(`⚠ Server ID (${serverId}) ≤ local max (RT-${String(localMaxSeq).padStart(3, '0')})`));
                console.log(chalk.green(`Using local ID: ${id}`));

                // Sync to server
                try {
                    await syncIdToServer(serverUrl, project, finalSeq);
                    console.log(chalk.blue(`✔ Synced ID to server: ${id}`));
                } catch (syncErr) {
                    console.warn(chalk.yellow(`⚠ Failed to sync ID to server: ${syncErr.message}`));
                    console.warn(chalk.yellow('  The server may not support sync-id API, but RT creation will continue.'));
                }
            } else {
                id = serverId;
                console.log(chalk.green(`Obtained ID: ${id}`));
            }
        } catch (e) {
            console.error(chalk.red(`Failed to fetch ID from server: ${e.message}`));
            const { useLocal } = await inquirer.prompt([{
                type: 'confirm',
                name: 'useLocal',
                message: 'Do you want to fall back to local ID generation? (Warning: Risk of collision)',
                default: false
            }]);
            if (!useLocal) process.exit(1);
            id = getLocalNextId();
        }
    } else {
        // Independent mode: always use local generation, ignore server_url
        // This ensures that when user chooses independent mode, no network request is made
        id = getLocalNextId();
        console.log(chalk.yellow(`Using local ID generation: ${id}`));
        if (serverUrl) {
            console.log(chalk.gray(`Note: server_url is configured but ignored in independent mode`));
        }
    }

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
