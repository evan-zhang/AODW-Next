import fs from 'fs-extra';
import path from 'path';
import os from 'os';

export class BaseProcessor {
    constructor(sourcePath, targetPath) {
        this.sourcePath = sourcePath;
        this.targetPath = targetPath;
    }

    async process() {
        const content = await fs.readFile(this.sourcePath, 'utf8');
        const processed = this.transform(content);
        await fs.ensureDir(path.dirname(this.targetPath));
        await fs.writeFile(this.targetPath, processed, 'utf8');
    }

    transform(content) {
        return content;
    }

    // Helper to inject or replace frontmatter
    injectFrontmatter(content, key, value) {
        const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
        const match = content.match(frontmatterRegex);

        if (match) {
            let fm = match[1];
            if (!fm.includes(`${key}:`)) {
                fm += `\n${key}: ${value}`;
                return content.replace(frontmatterRegex, `---\n${fm}\n---`);
            }
            return content; // Key already exists, don't overwrite
        } else {
            return `---\n${key}: ${value}\n---\n\n${content}`;
        }
    }
}

export class AntigravityProcessor extends BaseProcessor {
    transform(content) {
        // Replace template placeholders
        let processed = content.replace(/\{\{REF_PREFIX\}\}/g, '');
        // Replace AODW_DIR placeholder (Next version - fixed to .aodw-next)
        processed = processed.replace(/\{\{AODW_DIR\}\}/g, '.aodw-next');
        
        // For Rules: Inject trigger: always_on (for kernel loader)
        if (this.targetPath.includes('.agent/rules') && /aodw(-next)?\.md$/.test(this.targetPath)) {
            processed = this.injectFrontmatter(processed, 'trigger', 'always_on');
        } else if (this.targetPath.includes('.agent/rules')) {
            // For other rules: Inject trigger: model_decision
            processed = this.injectFrontmatter(processed, 'trigger', 'model_decision');
        }
        return processed;
    }
}

export class CursorProcessor extends BaseProcessor {
    transform(content) {
        // Replace template placeholders: @ for Cursor
        let processed = content.replace(/\{\{REF_PREFIX\}\}/g, '@');
        // Replace AODW_DIR placeholder (Next version - fixed to .aodw-next)
        processed = processed.replace(/\{\{AODW_DIR\}\}/g, '.aodw-next');
        
        // For Rules (.mdc): Inject globs and alwaysApply
        if (this.targetPath.endsWith('.mdc')) {
            processed = this.injectFrontmatter(processed, 'globs', '*');
            processed = this.injectFrontmatter(processed, 'alwaysApply', 'true');
            processed = this.injectFrontmatter(processed, 'description', 'AI 编排开发工作流 (AODW) — Kernel Loader');
            processed = this.injectFrontmatter(processed, 'tags', 'aodw, kernel');
        }
        return processed;
    }
}

export class CopilotProcessor extends BaseProcessor {
    transform(content) {
        // For Prompts: Inject model and mode
        if (this.targetPath.endsWith('.prompt.md')) {
            let newContent = this.injectFrontmatter(content, 'model', 'gpt-4o');
            newContent = this.injectFrontmatter(newContent, 'mode', 'chat');
            return newContent;
        }
        return content;
    }
}

export class ClaudeProcessor extends BaseProcessor {
    transform(content) {
        // Replace template placeholders: empty for Claude
        let processed = content.replace(/\{\{REF_PREFIX\}\}/g, '');
        // Replace AODW_DIR placeholder (Next version - fixed to .aodw-next)
        processed = processed.replace(/\{\{AODW_DIR\}\}/g, '.aodw-next');
        // Claude uses standard markdown, no frontmatter needed
        return processed;
    }
}

export class GeminiProcessor extends BaseProcessor {
    transform(content) {
        // Replace template placeholders: empty for Gemini
        let processed = content.replace(/\{\{REF_PREFIX\}\}/g, '');
        // Replace AODW_DIR placeholder (Next version - fixed to .aodw-next)
        processed = processed.replace(/\{\{AODW_DIR\}\}/g, '.aodw-next');
        // Gemini uses standard markdown, no frontmatter needed
        return processed;
    }
}

export class GeneralProcessor extends BaseProcessor {
    transform(content) {
        // Replace template placeholders: empty for General
        let processed = content.replace(/\{\{REF_PREFIX\}\}/g, '');
        // Replace AODW_DIR placeholder (Next version - fixed to .aodw-next)
        processed = processed.replace(/\{\{AODW_DIR\}\}/g, '.aodw-next');
        // General uses standard markdown, no frontmatter needed
        return processed;
    }
}
