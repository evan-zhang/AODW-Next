#!/usr/bin/env node

/**
 * 从模板更新适配器文件 (AODW Next 版本)
 * 
 * 这个脚本用于从统一模板 `templates/.aodw-next/templates/aodw-kernel-loader-template.md`
 * 生成各个平台的适配器文件到 `templates/AODW_Adapters/` 目录
 * 
 * 使用方法：
 *   node cli/bin/update-adapters-from-template.js
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  AntigravityProcessor,
  CursorProcessor,
  ClaudeProcessor,
  GeminiProcessor,
  GeneralProcessor
} from './processors/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, '../..');

// 模板路径 (Next 版本)
const SOURCE_TEMPLATE = path.join(ROOT_DIR, 'templates/.aodw-next/templates/aodw-kernel-loader-template.md');

// 目标适配器路径
const TARGET_ADAPTERS = path.join(ROOT_DIR, 'templates/AODW_Adapters');

// 安装文件（使用 Processor）
async function installFile(source, target, processorClass) {
  const processor = new processorClass(source, target);
  await processor.process();
  console.log(`  ✓ Generated: ${path.relative(ROOT_DIR, target)}`);
}

async function updateAdapters() {
  console.log('🔄 Updating adapters from template (AODW Next)...\n');

  // 检查模板是否存在
  if (!fs.existsSync(SOURCE_TEMPLATE)) {
    console.error(`❌ Template not found: ${SOURCE_TEMPLATE}`);
    process.exit(1);
  }

  console.log(`📄 Source template: ${path.relative(ROOT_DIR, SOURCE_TEMPLATE)}\n`);

  // Antigravity
  console.log('📦 Updating Antigravity adapter...');
  const antigravityTarget = path.join(TARGET_ADAPTERS, 'antigravity/.agent/rules/aodw-next.md');
  await fs.ensureDir(path.dirname(antigravityTarget));
  await installFile(SOURCE_TEMPLATE, antigravityTarget, AntigravityProcessor);

  // Cursor
  console.log('\n📦 Updating Cursor adapter...');
  const cursorTarget = path.join(TARGET_ADAPTERS, 'cursor/.cursor/rules/aodw-next.mdc');
  await fs.ensureDir(path.dirname(cursorTarget));
  await installFile(SOURCE_TEMPLATE, cursorTarget, CursorProcessor);

  // Claude
  console.log('\n📦 Updating Claude adapter...');
  const claudeTarget = path.join(TARGET_ADAPTERS, 'claude/CLAUDE.md');
  await fs.ensureDir(path.dirname(claudeTarget));
  await installFile(SOURCE_TEMPLATE, claudeTarget, ClaudeProcessor);

  // Gemini
  console.log('\n📦 Updating Gemini adapter...');
  const geminiTarget = path.join(TARGET_ADAPTERS, 'gemini/.agent/rules/aodw-next.md');
  await fs.ensureDir(path.dirname(geminiTarget));
  await installFile(SOURCE_TEMPLATE, geminiTarget, GeminiProcessor);

  // General
  console.log('\n📦 Updating General adapter...');
  const generalTarget = path.join(TARGET_ADAPTERS, 'general/AGENTS.md');
  await fs.ensureDir(path.dirname(generalTarget));
  await installFile(SOURCE_TEMPLATE, generalTarget, GeneralProcessor);

  console.log('\n✅ All adapters updated successfully!');
  console.log('\n📝 Note: These files are fallback files for CLI installation.');
  console.log('   CLI will use the template directly if available.');
  console.log('   AODW Next version uses: .aodw-next/');
}

updateAdapters().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
