import fs from 'fs-extra';
import path from 'path';
import yaml from 'js-yaml';

function getCoreDir() {
    return process.env.AODW_CORE_DIR || '.aodw';
}

function getProjectConfigFile() {
    return path.join(getCoreDir(), 'project.yaml');
}

function getUserConfigFile() {
    return path.join(getCoreDir(), 'config.yaml');
}

export function getProjectConfig() {
    const filepath = path.join(process.cwd(), getProjectConfigFile());
    if (fs.existsSync(filepath)) {
        try {
            return yaml.load(fs.readFileSync(filepath, 'utf8')) || {};
        } catch (e) {
            return {};
        }
    }
    return {};
}

export function getUserConfig() {
    const filepath = path.join(process.cwd(), getUserConfigFile());
    if (fs.existsSync(filepath)) {
        try {
            return yaml.load(fs.readFileSync(filepath, 'utf8')) || {};
        } catch (e) {
            return {};
        }
    }
    return {};
}

export async function saveProjectConfig(config) {
    const filepath = path.join(process.cwd(), getProjectConfigFile());
    await fs.ensureDir(path.dirname(filepath));
    // Read existing to preserve other fields if any
    const existing = getProjectConfig();
    const newConfig = { ...existing, ...config };
    await fs.writeFile(filepath, yaml.dump(newConfig), 'utf8');
}

export async function saveUserConfig(config) {
    const filepath = path.join(process.cwd(), getUserConfigFile());
    await fs.ensureDir(path.dirname(filepath));
    const existing = getUserConfig();
    const newConfig = { ...existing, ...config };
    await fs.writeFile(filepath, yaml.dump(newConfig), 'utf8');
}
