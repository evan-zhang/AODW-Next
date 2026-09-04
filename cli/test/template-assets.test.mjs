#!/usr/bin/env node
// =============================================================================
// template-assets.test.mjs — 入包资产体检
// =============================================================================
// 它回答一个问题：**用户 npm i 装到手的那份 `.aodw-next/`，该有的东西在不在。**
//
// 为什么需要它：模板是 `publish.sh` 用 `cp -r templates/.aodw-next ./.aodw-next`
// 整目录同步进来的，再由 package.json 的 `files` 白名单决定入包。这条链上任何
// 一环断了（新目录漏进白名单、同步步骤被跳过、文件被误删），用户拿到的是一份
// 静默残缺的规则树——没有报错，只是某个能力"不存在"。这类缺失只能用清单来兜。
//
// 设计约束（改动前先读）：
//   1. **零依赖、纯 Node**：跑在 `npm test`，此时 devDependencies 未必装过。
//   2. **不要用 `node:test`**：它在 Node 16.0 还不存在，而 package.json 声明
//      `engines.node >= 16.0.0`。这里自带一个十几行的断言器，够用。
//   3. **跨平台**：一律走 `node:path`/`node:fs`，不 spawn shell、不假设 `/`。
//      bash/python 那两套用例另有入口（npm run test:gates / test:skills），
//      它们依赖 bash，不进 `npm test` 这条必经之路。
//
// 模板根的解析顺序：
//   cli/.aodw-next        —— publish.sh 同步后的**真实入包内容**（优先，最贴近现实）
//   ../templates/.aodw-next —— 源仓库里的规范模板（开发态回退）
// 两者都没有 = 硬失败，不静默跳过：静默跳过的体检等于没有体检。
//
// 退出码：0 全过 / 1 有失败
// =============================================================================

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const CLI_DIR = join(HERE, '..');
const REPO_ROOT = join(CLI_DIR, '..');

// ── 极简断言器 ────────────────────────────────────────────────────────────────
let pass = 0;
const failures = [];

function check(name, fn) {
  try {
    const problem = fn();
    if (problem) {
      failures.push(`${name}\n      ${String(problem).split('\n').join('\n      ')}`);
      console.log(`  not ok  ${name}`);
    } else {
      pass += 1;
      console.log(`  ok      ${name}`);
    }
  } catch (err) {
    failures.push(`${name}\n      ${err && err.message ? err.message : err}`);
    console.log(`  not ok  ${name}`);
  }
}

// ── 定位模板根 ────────────────────────────────────────────────────────────────
const CANDIDATES = [
  { label: 'cli/.aodw-next（publish.sh 同步产物）', path: join(CLI_DIR, '.aodw-next') },
  { label: 'templates/.aodw-next（源模板）', path: join(REPO_ROOT, 'templates', '.aodw-next') },
];

const found = CANDIDATES.find((c) => existsSync(c.path));
if (!found) {
  console.error('模板根不存在，检查的位置：');
  for (const c of CANDIDATES) console.error(`  - ${c.path}`);
  console.error('若在源仓库里跑，说明 templates/.aodw-next 丢了；若在 cli/ 里跑，先执行 publish.sh 的同步步骤。');
  process.exit(1);
}

const CORE = found.path;
console.log(`模板根：${found.label}`);
console.log(`        ${relative(REPO_ROOT, CORE) || CORE}\n`);

// ── 1. 必备文件清单 ──────────────────────────────────────────────────────────
// 只列**缺了就有能力静默消失**的东西，不做全目录快照——那种清单每次改模板都要
// 跟着改，很快就没人维护了。
const REQUIRED_FILES = [
  // 内核入口
  'SKILL.md',
  'README.md',
  'manifest.yaml',
  'config.yaml',
  'project.yaml',
  // 核心规则（含本次新增的判据纪律）
  '01-core/aodw-constitution.md',
  '01-core/test-discipline.md',
  // 门禁引擎与外置判据
  'tools/rt-guard.sh',
  'tools/fixtures/run-fixtures.sh',
  'manifests/rt-gates.yaml',
  // 分发助手
  'tools/install-skills.sh',
  // 自带 skill：整套跟着 .aodw-next 走，少一个文件就是半残
  'skills/handover-pack/SKILL.md',
  'skills/handover-pack/scripts/validate.py',
  'skills/handover-pack/scripts/next-number.sh',
  'skills/handover-pack/scripts/check-closure.sh',
  'skills/handover-pack/scripts/_common.sh',
  'skills/handover-pack/references/format-contract.md',
  'skills/handover-pack/templates/handover-template.md',
];

console.log('必备文件：');
for (const rel of REQUIRED_FILES) {
  check(rel, () => {
    const abs = join(CORE, ...rel.split('/'));
    if (!existsSync(abs)) return '文件不存在';
    if (statSync(abs).size === 0) return '文件为空（0 字节）';
    return null;
  });
}

// ── 2. manifest 登记 ─────────────────────────────────────────────────────────
// 文件在树上但没登记进 manifest = AI 侧发现不了 = 等于没有。
console.log('\nmanifest 登记：');
const manifestText = readFileSync(join(CORE, 'manifest.yaml'), 'utf8');

check('manifest 登记了 test-discipline 规则', () =>
  /^\s*-\s*id:\s*test-discipline\s*$/m.test(manifestText)
    ? null
    : 'manifest.yaml 里找不到 `- id: test-discipline`',
);

check('manifest 指向 01-core/test-discipline.md', () =>
  manifestText.includes('01-core/test-discipline.md')
    ? null
    : 'manifest.yaml 里找不到 test-discipline.md 的 path',
);

check('manifest 有 skills: 段并登记 handover-pack', () => {
  if (!/^skills:\s*$/m.test(manifestText)) return 'manifest.yaml 缺少顶层 `skills:` 段';
  if (!/^\s*-\s*id:\s*handover-pack\s*$/m.test(manifestText)) return '`skills:` 段里没有 handover-pack';
  return null;
});

check('manifest 声明的 skill 路径真实存在', () => {
  const missing = [];
  for (const m of manifestText.matchAll(/^\s+(?:path|validator):\s*(skills\/\S+)\s*$/gm)) {
    const abs = join(CORE, ...m[1].split('/'));
    if (!existsSync(abs)) missing.push(m[1]);
  }
  return missing.length ? `manifest 指向了不存在的文件：${missing.join(', ')}` : null;
});

// ── 3. 打包白名单 ────────────────────────────────────────────────────────────
console.log('\n打包配置：');
const pkg = JSON.parse(readFileSync(join(CLI_DIR, 'package.json'), 'utf8'));

check('package.json files 白名单含 .aodw-next/', () =>
  (pkg.files || []).some((f) => f.replace(/\/$/, '') === '.aodw-next')
    ? null
    : `files = ${JSON.stringify(pkg.files)}，整棵规则树都不会入包`,
);

check('package.json 未声明 test 占位脚本', () => {
  const t = (pkg.scripts && pkg.scripts.test) || '';
  return /no test specified/.test(t) ? '`npm test` 仍是必然失败的占位脚本' : null;
});

check('engines.node 未收紧到 16 以上', () => {
  const e = (pkg.engines && pkg.engines.node) || '';
  const m = e.match(/>=\s*(\d+)/);
  if (!m) return `engines.node = "${e}"，解析不出下限`;
  return Number(m[1]) <= 16 ? null : `engines.node = "${e}"，比既有的 >=16 更严，属破坏性变更`;
});

// ── 4. 泄漏扫描 ──────────────────────────────────────────────────────────────
// 模板是要拷进**别人**仓库的。带上开发机绝对路径、具体项目名、具体 RT/DI 编号，
// 对拿到它的人全是噪音，还会让人误以为那是必须存在的东西。
//
// 这里刻意**不维护"上游项目名黑名单"**：黑名单要求把某个具体项目名写死在测试里，
// 既治不了下一个新名字，本身又是一处泄漏。改为查"形态"——声明位上是否出现了实例值。
console.log('\n泄漏扫描（模板树内不得出现开发机路径 / 具体实例值）：');

const TEXT_EXT = new Set(['.md', '.yaml', '.yml', '.sh', '.py', '.json', '.txt']);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === '__pycache__' || name === '.git' || name === 'node_modules') continue;
    const abs = join(dir, name);
    const st = statSync(abs);
    if (st.isDirectory()) walk(abs, out);
    else if (TEXT_EXT.has(name.slice(name.lastIndexOf('.')))) out.push(abs);
  }
  return out;
}

const TEXT_FILES = walk(CORE);

// 每条 leak 规则给出 why，失败信息里直接带上，省得下一个人去猜为什么不许。
const LEAK_RULES = [
  { re: /\/Users\/[A-Za-z0-9._-]+\//, why: '开发机 home 绝对路径' },
  { re: /\/home\/[A-Za-z0-9._-]+\//, why: '开发机 home 绝对路径' },
  // project_name 是"这份模板属于哪个项目"的声明位。模板不属于任何项目，必须留空，
  // 由 CLI 按 project.yaml → package.json → 目录名的顺序回填（见 commands/new.js
  // 的 getProjectName）。写了值 = 每个装它的人都白捡一个别人的项目名。
  // 只管未注释的声明行；注释里的示例是格式说明，放行。
  {
    re: /^\s*project_name:\s*(?!$|""|''|\s*#)\S/,
    why: 'project_name 写了具体项目名（模板须留空，由 CLI 回填）',
  },
  // managed_from 的契约值是 RT-XXX 这种格式占位；出现具体编号就是实例值漏了进来。
  // 连注释一起查：该块整体是"格式说明，不是实例值"。
  {
    re: /^\s*#?\s*managed_from:\s*RT-\d/,
    why: 'managed_from 写了具体 RT 编号（须保持 RT-XXX 格式占位）',
  },
];

check(`扫描 ${TEXT_FILES.length} 个文本文件`, () => {
  const hits = [];
  for (const abs of TEXT_FILES) {
    const lines = readFileSync(abs, 'utf8').split('\n');
    lines.forEach((line, i) => {
      for (const rule of LEAK_RULES) {
        if (rule.re.test(line)) {
          hits.push(`${relative(CORE, abs).split(sep).join('/')}:${i + 1} —— ${rule.why}`);
        }
      }
    });
  }
  return hits.length ? `发现 ${hits.length} 处：\n${hits.slice(0, 20).join('\n')}` : null;
});

// ── 5. 可执行脚本的自描述能力 ────────────────────────────────────────────────
// 只做静态检查：不 spawn bash（Windows 上没有），行为验证交给 test:skills。
console.log('\n脚本形态：');
for (const rel of ['tools/install-skills.sh', 'tools/rt-guard.sh', 'skills/handover-pack/scripts/next-number.sh', 'skills/handover-pack/scripts/check-closure.sh']) {
  check(`${rel} 带 shebang`, () => {
    const head = readFileSync(join(CORE, ...rel.split('/')), 'utf8').slice(0, 64);
    return head.startsWith('#!') ? null : '首行不是 shebang，直接执行会用错解释器';
  });
}

check('install-skills.sh 提供 --dry-run 与 --uninstall', () => {
  const src = readFileSync(join(CORE, 'tools', 'install-skills.sh'), 'utf8');
  const missing = ['--dry-run', '--uninstall', '--check', '--target'].filter((f) => !src.includes(f));
  return missing.length ? `缺少开关：${missing.join(', ')}` : null;
});

check('validate.py 是 python3 脚本且可被解析出退出码约定', () => {
  const src = readFileSync(join(CORE, 'skills', 'handover-pack', 'scripts', 'validate.py'), 'utf8');
  if (!src.startsWith('#!')) return '首行不是 shebang';
  if (!/sys\.exit\(/.test(src)) return '没有显式 sys.exit，调用方拿不到判定结果';
  return null;
});

// ── 汇总 ─────────────────────────────────────────────────────────────────────
console.log(`\n== 汇总: PASS=${pass} FAIL=${failures.length} ==`);
if (failures.length) {
  console.log('\n失败项：');
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
process.exit(0);
