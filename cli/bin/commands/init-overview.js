import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';
import chalk from 'chalk';
import yaml from 'js-yaml';
import inquirer from 'inquirer';

const CORE_DIR = process.env.AODW_CORE_DIR || '.aodw';
const OVERVIEW_FILE = `${CORE_DIR}/ai-overview.md`;
const MODULES_INDEX_FILE = `${CORE_DIR}/modules-index.yaml`;

// 检测技术栈
async function detectTechStack() {
  const cwd = process.cwd();
  const techStack = {
    frontend: [],
    backend: [],
    database: [],
    message_system: [],
    cache: [],
    deployment: [],
    other: [],
  };

  // 检测前端技术栈
  const packageJsonPath = path.join(cwd, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      // 检测框架
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      if (deps.react) techStack.frontend.push(`React ${deps.react}`);
      if (deps.vue) techStack.frontend.push(`Vue ${deps.vue}`);
      if (deps['@angular/core']) techStack.frontend.push(`Angular ${deps['@angular/core']}`);
      if (deps.next) techStack.frontend.push(`Next.js ${deps.next}`);
      if (deps.nuxt) techStack.frontend.push(`Nuxt.js ${deps.nuxt}`);
      
      // 检测构建工具
      if (deps.vite) techStack.frontend.push(`Vite ${deps.vite}`);
      if (deps.webpack) techStack.frontend.push(`Webpack ${deps.webpack}`);
      if (deps['@vitejs/plugin-react']) techStack.frontend.push('Vite (React)');
      if (deps['@vitejs/plugin-vue']) techStack.frontend.push('Vite (Vue)');
      
      // 检测语言
      if (deps.typescript) techStack.frontend.push(`TypeScript ${deps.typescript}`);
      // 检查 tsconfig.json 作为 TypeScript 的补充证据
      if (fs.existsSync(path.join(cwd, 'tsconfig.json')) && !techStack.frontend.some(f => f.includes('TypeScript'))) {
        techStack.frontend.push('TypeScript');
      }
      
      // 检测状态管理
      if (deps.redux) techStack.frontend.push(`Redux ${deps.redux}`);
      if (deps['@reduxjs/toolkit']) techStack.frontend.push('Redux Toolkit');
      if (deps.mobx) techStack.frontend.push(`MobX ${deps.mobx}`);
      if (deps.zustand) techStack.frontend.push(`Zustand ${deps.zustand}`);
      
      // 检测 UI 库
      if (deps['@mui/material']) techStack.frontend.push('Material-UI');
      if (deps['@ant-design/react']) techStack.frontend.push('Ant Design');
      if (deps['antd']) techStack.frontend.push('Ant Design');
    } catch (e) {
      // ignore
    }
  }

  // 检测后端技术栈
  const pyprojectPath = path.join(cwd, 'pyproject.toml');
  const requirementsPath = path.join(cwd, 'requirements.txt');
  const requirementsInPath = path.join(cwd, 'requirements.in');
  
  if (fs.existsSync(pyprojectPath)) {
    try {
      const content = fs.readFileSync(pyprojectPath, 'utf8');
      // 检测 FastAPI（支持多种格式）
      const fastapiPatterns = [
        /fastapi\s*=\s*["']?([^"'\s,]+)["']?/,
        /fastapi\s*==\s*["']?([^"'\s,]+)["']?/,
        /fastapi\s*>=\s*["']?([^"'\s,]+)["']?/,
        /"fastapi"\s*:\s*["']?([^"'\s,]+)["']?/,
      ];
      for (const pattern of fastapiPatterns) {
        const match = content.match(pattern);
        if (match && match[1]) {
          techStack.backend.push(`FastAPI ${match[1]}`);
          break;
        }
      }
      // 如果没有找到版本号，但找到了 fastapi 关键字
      if (content.includes('fastapi') && techStack.backend.length === 0) {
        techStack.backend.push('FastAPI');
      }
      
      // 检测 Python 版本
      const pythonPatterns = [
        /requires-python\s*=\s*["']?([^"'\s]+)["']?/,
        /python_requires\s*=\s*["']?([^"'\s]+)["']?/,
      ];
      for (const pattern of pythonPatterns) {
        const pythonMatch = content.match(pattern);
        if (pythonMatch && pythonMatch[1]) {
          techStack.backend.push(`Python ${pythonMatch[1]}`);
          break;
        }
      }
      
      // 检测 Django
      if (content.includes('django')) {
        const djangoMatch = content.match(/django\s*=\s*["']?([^"'\s,]+)["']?/);
        if (djangoMatch && djangoMatch[1]) {
          techStack.backend.push(`Django ${djangoMatch[1]}`);
        } else {
          techStack.backend.push('Django');
        }
      }
      
      // 检测 Flask
      if (content.includes('flask')) {
        const flaskMatch = content.match(/flask\s*=\s*["']?([^"'\s,]+)["']?/);
        if (flaskMatch && flaskMatch[1]) {
          techStack.backend.push(`Flask ${flaskMatch[1]}`);
        } else {
          techStack.backend.push('Flask');
        }
      }
    } catch (e) {
      // ignore
    }
  }
  
  // 从 requirements.in 或 requirements.txt 检测
  const requirementsFiles = [requirementsInPath, requirementsPath];
  for (const reqPath of requirementsFiles) {
    if (fs.existsSync(reqPath)) {
      try {
        const content = fs.readFileSync(reqPath, 'utf8');
        // 检测 FastAPI
        if (content.includes('fastapi') && !techStack.backend.some(b => b.includes('FastAPI'))) {
          const match = content.match(/fastapi[>=<]+([^\s\n]+)/);
          techStack.backend.push(`FastAPI ${match ? match[1] : ''}`);
        }
        // 检测数据库驱动
        if (content.includes('psycopg2') || content.includes('psycopg2-binary')) {
          techStack.database.push('PostgreSQL');
        }
        if (content.includes('mysql') || content.includes('pymysql')) {
          techStack.database.push('MySQL');
        }
        if (content.includes('redis') || content.includes('redis-py')) {
          techStack.cache.push('Redis');
        }
      } catch (e) {
        // ignore
      }
      break; // 只读取第一个存在的文件
    }
  }

  // 检测数据库和基础设施（从 docker-compose.yml）
  const dockerComposePath = path.join(cwd, 'docker-compose.yml');
  const dockerComposeYmlPath = path.join(cwd, 'docker-compose.yaml');
  const dockerFiles = [dockerComposePath, dockerComposeYmlPath];
  
  for (const dockerPath of dockerFiles) {
    if (fs.existsSync(dockerPath)) {
      try {
        const content = fs.readFileSync(dockerPath, 'utf8');
        // 检测数据库
        if (content.includes('postgres') || content.includes('postgresql')) {
          if (!techStack.database.includes('PostgreSQL')) {
            techStack.database.push('PostgreSQL');
          }
        }
        if (content.includes('mysql') && !content.includes('mariadb')) {
          if (!techStack.database.includes('MySQL')) {
            techStack.database.push('MySQL');
          }
        }
        if (content.includes('mariadb')) {
          if (!techStack.database.includes('MariaDB')) {
            techStack.database.push('MariaDB');
          }
        }
        if (content.includes('mongodb')) {
          if (!techStack.database.includes('MongoDB')) {
            techStack.database.push('MongoDB');
          }
        }
        
        // 检测缓存
        if (content.includes('redis')) {
          if (!techStack.cache.includes('Redis')) {
            techStack.cache.push('Redis');
          }
        }
        if (content.includes('memcached')) {
          if (!techStack.cache.includes('Memcached')) {
            techStack.cache.push('Memcached');
          }
        }
        
        // 检测消息队列
        if (content.includes('rabbitmq')) {
          if (!techStack.message_system.includes('RabbitMQ')) {
            techStack.message_system.push('RabbitMQ');
          }
        }
        if (content.includes('kafka')) {
          if (!techStack.message_system.includes('Kafka')) {
            techStack.message_system.push('Kafka');
          }
        }
        
        // 检测部署相关
        if (content.includes('nginx')) {
          if (!techStack.deployment.includes('Nginx')) {
            techStack.deployment.push('Nginx');
          }
        }
      } catch (e) {
        // ignore
      }
      break; // 只读取第一个存在的文件
    }
  }

  return techStack;
}

// 分析目录结构
async function analyzeDirectoryStructure() {
  const cwd = process.cwd();
  const structure = [];
  const keyDirs = ['frontend', 'backend', 'apps', 'packages', 'src', 'lib', 'infra', 'docs', 'RT', CORE_DIR];
  
  for (const dir of keyDirs) {
    const dirPath = path.join(cwd, dir);
    if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
      // 尝试读取 README 或 package.json 来获取描述
      let description = '';
      const readmePath = path.join(dirPath, 'README.md');
      if (fs.existsSync(readmePath)) {
        const readme = fs.readFileSync(readmePath, 'utf8');
        const firstLine = readme.split('\n')[0];
        if (firstLine && !firstLine.startsWith('#')) {
          description = firstLine.trim();
        }
      }
      
      structure.push({
        path: `/${dir}`,
        description: description || getDefaultDescription(dir),
      });
    }
  }
  
  return structure;
}

// 获取目录默认描述
function getDefaultDescription(dir) {
  const descriptions = {
    frontend: '前端应用',
    backend: '后端 API',
    apps: '应用目录',
    packages: '共享代码包',
    src: '源代码',
    lib: '库文件',
    infra: '基础设施与部署脚本',
    docs: '文档',
    RT: '每个 Request Ticket 的本地知识库',
    [CORE_DIR]: 'AODW 配置与规则文件',
  };
  return descriptions[dir] || '';
}

// 识别模块
async function detectModules() {
  const cwd = process.cwd();
  const modules = [];
  const seenModules = new Set(); // 避免重复
  
  // 常见的模块目录（按优先级排序）
  const moduleDirs = [
    'backend/app',
    'backend/src',
    'app',
    'apps',
    'src',
    'frontend/src',
    'frontend/app',
  ];
  
  for (const baseDir of moduleDirs) {
    const basePath = path.join(cwd, baseDir);
    if (!fs.existsSync(basePath)) continue;
    
    try {
      const entries = fs.readdirSync(basePath, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        
        // 跳过隐藏目录和常见非模块目录
        if (entry.name.startsWith('.') || 
            ['__pycache__', 'node_modules', '.git', 'dist', 'build'].includes(entry.name)) {
          continue;
        }
        
        const modulePath = path.join(basePath, entry.name);
        
        // 检查是否是模块（有 __init__.py、index.ts、index.js，或者是符合命名规范的目录）
        const hasInit = fs.existsSync(path.join(modulePath, '__init__.py')) ||
                       fs.existsSync(path.join(modulePath, 'index.ts')) ||
                       fs.existsSync(path.join(modulePath, 'index.js')) ||
                       fs.existsSync(path.join(modulePath, 'index.tsx'));
        
        // Python 模块：有 __init__.py 或符合命名规范
        // TypeScript/JavaScript 模块：有 index 文件或符合命名规范
        const isPythonModule = fs.existsSync(path.join(modulePath, '__init__.py'));
        const isTSModule = fs.existsSync(path.join(modulePath, 'index.ts')) || 
                          fs.existsSync(path.join(modulePath, 'index.tsx'));
        const isJSModule = fs.existsSync(path.join(modulePath, 'index.js'));
        const isValidName = entry.name.match(/^[a-z][a-z0-9_]*$/); // 小写字母开头，可包含数字和下划线
        
        if (hasInit || (isValidName && (isPythonModule || isTSModule || isJSModule))) {
          // 避免重复添加
          if (seenModules.has(entry.name)) continue;
          seenModules.add(entry.name);
          
          // 检查是否有 README
          const readmePath = path.join(modulePath, 'README.md');
          const moduleDocPath = path.join(cwd, 'docs/modules', `${entry.name}.md`);
          
          // 尝试从 README 获取描述
          let description = '';
          if (fs.existsSync(readmePath)) {
            try {
              const readmeContent = fs.readFileSync(readmePath, 'utf8');
              // 提取第一段非标题的描述
              const lines = readmeContent.split('\n');
              for (const line of lines) {
                if (line.trim() && !line.startsWith('#') && line.length > 10) {
                  description = line.trim();
                  break;
                }
              }
            } catch (e) {
              // ignore
            }
          }
          
          modules.push({
            name: entry.name,
            root: path.relative(cwd, modulePath),
            path: fs.existsSync(moduleDocPath) ? `docs/modules/${entry.name}.md` : null,
            description: description || '',
            detected: true,
          });
        }
      }
    } catch (e) {
      // ignore
    }
  }
  
  return modules;
}

// 读取现有 ai-overview.md
async function readExistingOverview() {
  const filePath = path.join(process.cwd(), OVERVIEW_FILE);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  
  // 解析 markdown，提取各个部分
  const sections = {
    techStack: extractSection(content, '## 1. 技术栈'),
    architecture: extractSection(content, '## 2. 整体架构概览'),
    directoryStructure: extractSection(content, '## 3. 目录结构'),
    modules: extractSection(content, '## 4. 核心业务模块'),
    invariants: extractSection(content, '## 5. 系统级 Invariants'),
    moduleMapping: extractSection(content, '## 6. 模块 README 映射表'),
    history: extractSection(content, '## 7. 历史关键变更'),
  };
  
  return {
    content,
    sections,
    hasUserContent: content.includes('<!-- USER-ADDED') || !content.includes('<!-- AUTO-DETECTED'),
  };
}

// 提取 markdown 章节
function extractSection(content, header) {
  const headerIndex = content.indexOf(header);
  if (headerIndex === -1) return null;
  
  const nextHeaderIndex = content.indexOf('\n## ', headerIndex + header.length);
  const sectionEnd = nextHeaderIndex === -1 ? content.length : nextHeaderIndex;
  
  return content.substring(headerIndex, sectionEnd).trim();
}

// 智能合并
async function mergeOverview(existing, detected) {
  const merged = {
    techStack: mergeTechStack(existing?.sections?.techStack, detected.techStack),
    directoryStructure: mergeDirectoryStructure(existing?.sections?.directoryStructure, detected.directoryStructure),
    modules: mergeModules(existing?.sections?.modules, detected.modules),
  };
  
  return merged;
}

// 合并技术栈
function mergeTechStack(existingSection, detected) {
  // 如果存在用户内容，保留
  if (existingSection && existingSection.includes('<!-- USER-ADDED')) {
    return existingSection; // 保留用户内容
  }
  
  // 生成新的技术栈部分
  const lines = ['## 1. 技术栈', ''];
  
  lines.push('<!-- AUTO-DETECTED: 以下内容由 aodw init-overview 自动检测 -->');
  if (detected.frontend.length > 0) {
    lines.push(`- 前端：${detected.frontend.join('、')}`);
  } else {
    lines.push('- 前端：');
  }
  if (detected.backend.length > 0) {
    lines.push(`- 后端：${detected.backend.join('、')}`);
  } else {
    lines.push('- 后端：');
  }
  if (detected.database.length > 0) {
    lines.push(`- 数据库：${detected.database.join('、')}`);
  } else {
    lines.push('- 数据库：');
  }
  if (detected.message_system.length > 0) {
    lines.push(`- 消息系统：${detected.message_system.join('、')}`);
  } else {
    lines.push('- 消息系统：');
  }
  if (detected.cache.length > 0) {
    lines.push(`- 缓存：${detected.cache.join('、')}`);
  } else {
    lines.push('- 缓存：');
  }
  if (detected.deployment.length > 0) {
    lines.push(`- 运维 / 部署：${detected.deployment.join('、')}`);
  } else {
    lines.push('- 运维 / 部署：');
  }
  if (detected.other.length > 0) {
    lines.push(`- 其他：${detected.other.join('、')}`);
  } else {
    lines.push('- 其他：');
  }
  lines.push('<!-- END AUTO-DETECTED -->');
  lines.push('');
  lines.push('（由 AI 或人工在首次接入 AODW 时填写，后续在架构变动时更新）');
  
  return lines.join('\n');
}

// 合并目录结构
function mergeDirectoryStructure(existingSection, detected) {
  if (existingSection && existingSection.includes('<!-- USER-ADDED')) {
    return existingSection;
  }
  
  const lines = [
    '## 3. 目录结构（只列关键部分）',
    '',
  ];
  
  if (detected && detected.length > 0) {
    lines.push('<!-- AUTO-DETECTED: 以下内容由 aodw init-overview 自动检测 -->');
    detected.forEach(dir => {
      lines.push(`- ${dir.path} - ${dir.description}`);
    });
    lines.push('<!-- END AUTO-DETECTED -->');
  } else {
    lines.push('请根据实际项目补充，例如：');
    lines.push('');
    lines.push('- `/apps/web` - 前端应用');
    lines.push('- `/apps/api` - 后端 API');
    lines.push('- `/packages/shared` - 共享代码（类型、工具等）');
    lines.push('- `/infra` - 基础设施与部署脚本');
    lines.push('- `/RT` - 每个 Request Ticket 的本地知识库');
    lines.push(`- \`/${CORE_DIR}\` - AODW 配置与规则文件`);
  }
  
  lines.push('');
  lines.push('AI 在修改目录结构时，需要在此更新说明。');
  
  return lines.join('\n');
}

// 合并模块
function mergeModules(existingSection, detected) {
  // 模块部分比较复杂，暂时保留现有内容或生成基础结构
  if (existingSection && existingSection.includes('<!-- USER-ADDED')) {
    return existingSection;
  }
  
  const lines = [
    '## 4. 核心业务模块',
    '',
    '为每个重要业务模块列出简要说明（AI 可从模块 README 中提取信息汇总到这里）。',
    '',
  ];
  
  if (detected && detected.length > 0) {
    lines.push('<!-- AUTO-DETECTED: 以下内容由 aodw init-overview 自动检测 -->');
    detected.forEach((module, index) => {
      lines.push(`### 4.${index + 1} ${module.name} 模块（${module.name} Module）`);
      lines.push('');
      lines.push(`- **职责**：${module.description || '（待补充）'}`);
      lines.push(`- **关键路径**：\`${module.root}\``);
      if (module.path) {
        lines.push(`- **模块文档**：\`${module.path}\``);
      }
      lines.push('- **依赖关系**：（待补充）');
      lines.push('- **关键约束**：（待补充）');
      lines.push('');
    });
    lines.push('<!-- END AUTO-DETECTED -->');
  } else {
    lines.push('示例模板：');
    lines.push('');
    lines.push('### 4.1 用户模块（User Module）');
    lines.push('');
    lines.push('- **职责**：认证、授权、用户资料管理等');
    lines.push('- **关键路径**：');
    lines.push('  - Web UI：`apps/web/src/features/user/...`');
    lines.push('  - API：`apps/api/src/users/...`');
    lines.push('- **依赖关系**：');
    lines.push('  - 调用：订单模块、通知模块等');
    lines.push('  - 被调用：认证中间件等');
    lines.push('- **关键约束**：');
    lines.push('  - 不得在 controller 中直接访问数据库，必须通过 service / repository 层；');
    lines.push('  - 密码与敏感字段必须加密或脱敏。');
    lines.push('');
    lines.push('### 4.2 订单模块（Order Module）');
    lines.push('');
    lines.push('（同样结构）');
  }
  
  return lines.join('\n');
}

// 生成架构概览部分
function generateArchitectureSection(existingSection) {
  if (existingSection && existingSection.includes('<!-- USER-ADDED')) {
    return existingSection;
  }
  
  return `## 2. 整体架构概览

可以使用文字或 ASCII 图描述系统架构，例如：

\`\`\`text
[ Web / Mobile Client ]
         |
      [ API ]
         |
 [ Services / Domain ]
         |
      [ DB / MQ ]
\`\`\`

AI 应在理解架构后，将关键组件简要记录在此处。
`;
}

// 生成模块映射表部分
function generateModuleMappingSection(modules) {
  let mappingText = '（待补充）';
  
  if (modules && modules.length > 0) {
    const mappings = modules
      .filter(m => m.root)
      .map(m => `${m.root}/**      → ${m.path || 'docs/modules/' + m.name + '.md'}`)
      .join('\n');
    
    if (mappings) {
      mappingText = mappings;
    }
  } else {
    mappingText = 'apps/api/src/users/**      → docs/modules/users.md\napps/api/src/orders/**     → docs/modules/orders.md\napps/web/src/features/**   → docs/modules/web-features.md';
  }
  
  return `## 6. 模块 README 映射表

为 AI 提供"代码目录 → 模块文档"的索引示例：

\`\`\`text
${mappingText}
\`\`\`

AI 在创建新模块或重构模块结构时，应同步维护此映射关系。
`;
}

// 生成 ai-overview.md
async function generateOverviewFile(merged, existing, modules) {
  // 生成架构概览部分
  const architectureSection = generateArchitectureSection(existing?.sections?.architecture);
  
  // 生成模块映射表部分
  const moduleMappingSection = generateModuleMappingSection(modules);
  
  // 确保 merged 的各个部分都有默认值
  const techStackSection = merged.techStack || '## 1. 技术栈\n\n- 前端：\n- 后端：\n- 数据库：\n- 消息系统：\n- 缓存：\n- 运维 / 部署：\n- 其他：\n\n（由 AI 或人工在首次接入 AODW 时填写，后续在架构变动时更新）';
  
  const directoryStructureSection = merged.directoryStructure || `## 3. 目录结构（只列关键部分）\n\n请根据实际项目补充，例如：\n\n- \`/apps/web\` - 前端应用\n- \`/apps/api\` - 后端 API\n- \`/packages/shared\` - 共享代码（类型、工具等）\n- \`/infra\` - 基础设施与部署脚本\n- \`/RT\` - 每个 Request Ticket 的本地知识库\n- \`/${CORE_DIR}\` - AODW 配置与规则文件\n\nAI 在修改目录结构时，需要在此更新说明。`;
  
  const modulesSection = merged.modules || '## 4. 核心业务模块\n\n为每个重要业务模块列出简要说明（AI 可从模块 README 中提取信息汇总到这里）。\n\n示例模板：\n\n### 4.1 用户模块（User Module）\n\n- **职责**：认证、授权、用户资料管理等\n- **关键路径**：\n  - Web UI：`apps/web/src/features/user/...`\n  - API：`apps/api/src/users/...`\n- **依赖关系**：\n  - 调用：订单模块、通知模块等\n  - 被调用：认证中间件等\n- **关键约束**：\n  - 不得在 controller 中直接访问数据库，必须通过 service / repository 层；\n  - 密码与敏感字段必须加密或脱敏。\n\n### 4.2 订单模块（Order Module）\n\n（同样结构）';
  
  const template = `# AI System Overview  
（本文件列出 AI 理解本系统所需的全局信息）

> 说明：本文件是骨架模板，AI 可以在后续 RT 中逐步补全。  
> 修改架构或模块职责时，AI 必须同步更新本文件。

---

${techStackSection}

---

${architectureSection}

---

${directoryStructureSection}

---

${modulesSection}

---

## 5. 系统级 Invariants（不可破坏原则）

AI 在修改任何代码前必须确认不会违反以下约束：

- 不得绕过 service 层直接访问 DB；
- 不得无故更改对外 API 返回格式（除非走 Spec-Full 流程）；
- 不得在热路径引入明显的性能退化；
- 不得引入明显的安全风险（如绕过认证、明文敏感信息）。

根据系统演进，这些 Invariants 可以在 RT 中进行讨论与更新。

---

${moduleMappingSection}

---

## 7. 历史关键变更（可选）

可记录一些对架构或业务影响较大的里程碑，例如：

- 2025-01：引入新订单系统；
- 2025-03：从单体拆分为微服务；
- 2025-05：迁移认证机制到 OAuth2。

这些信息便于 AI 理解系统随时间的演进。
`;

  const filePath = path.join(process.cwd(), OVERVIEW_FILE);
  await fs.ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, template, 'utf8');
}

// 生成 modules-index.yaml
async function generateModulesIndex(modules) {
  const index = {
    version: 1,
    last_updated: new Date().toISOString(),
    last_updated_by: 'cli',
    modules: modules && modules.length > 0 ? modules.map(m => ({
      name: m.name,
      path: m.path || null,
      root: m.root,
      description: m.description || `${m.name} 模块（自动检测）`,
      source: 'detected',
      detected_at: new Date().toISOString(),
    })) : [],
  };
  
  const filePath = path.join(process.cwd(), MODULES_INDEX_FILE);
  await fs.ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, yaml.dump(index), 'utf8');
}

// 主函数
export async function initOverview(options = {}) {
  const { update = true, force = false, scanOnly = false, interactive = true } = options;
  
  console.log(chalk.blue('🔍 正在检测项目信息...\n'));
  
  // Step 1: 检测项目信息
  const techStack = await detectTechStack();
  const directoryStructure = await analyzeDirectoryStructure();
  const modules = await detectModules();
  
  // 显示检测结果摘要
  console.log(chalk.green('✔ 技术栈检测完成'));
  const techStackSummary = [];
  if (techStack.frontend.length > 0) techStackSummary.push(`前端: ${techStack.frontend.join(', ')}`);
  if (techStack.backend.length > 0) techStackSummary.push(`后端: ${techStack.backend.join(', ')}`);
  if (techStack.database.length > 0) techStackSummary.push(`数据库: ${techStack.database.join(', ')}`);
  if (techStackSummary.length > 0) {
    console.log(chalk.gray(`   检测到: ${techStackSummary.join(' | ')}`));
  } else {
    console.log(chalk.yellow('   未检测到技术栈信息'));
  }
  
  console.log(chalk.green('✔ 目录结构分析完成'));
  if (directoryStructure.length > 0) {
    console.log(chalk.gray(`   检测到 ${directoryStructure.length} 个关键目录`));
  } else {
    console.log(chalk.yellow('   未检测到关键目录'));
  }
  
  console.log(chalk.green('✔ 模块识别完成'));
  if (modules.length > 0) {
    console.log(chalk.gray(`   检测到 ${modules.length} 个模块: ${modules.map(m => m.name).join(', ')}`));
  } else {
    console.log(chalk.yellow('   未检测到模块'));
  }
  console.log('');
  
  if (scanOnly) {
    console.log(chalk.blue('📊 检测结果详情：\n'));
    console.log('技术栈：', JSON.stringify(techStack, null, 2));
    console.log('目录结构：', JSON.stringify(directoryStructure, null, 2));
    console.log('模块：', JSON.stringify(modules, null, 2));
    console.log(chalk.gray('\n💡 运行 "aodw init-overview --update" 来应用这些更改'));
    return;
  }
  
  // Step 2: 读取现有文件
  const existing = await readExistingOverview();
  const isFirstTime = !existing;
  
  if (isFirstTime) {
    console.log(chalk.blue('📝 首次初始化，生成初始文件...\n'));
  } else {
    console.log(chalk.blue('📝 检测到已有文件，进入更新模式...\n'));
    
    if (interactive && !force) {
      // 显示检测到的变化
      console.log(chalk.yellow('📊 检测到的变化：'));
      // TODO: 显示具体变化
      console.log(chalk.gray('  （变化详情）\n'));
      
      const { confirm } = await inquirer.prompt([{
        type: 'confirm',
        name: 'confirm',
        message: '是否更新文件？',
        default: true,
      }]);
      
      if (!confirm) {
        console.log(chalk.gray('已取消更新'));
        return;
      }
    }
  }
  
  // Step 3: 智能合并
  const merged = await mergeOverview(existing, {
    techStack,
    directoryStructure,
    modules,
  });
  
  // Step 4: 生成文件
  await generateOverviewFile(merged, existing, modules);
  await generateModulesIndex(modules);
  
  console.log(chalk.green(`✔ 已生成 ${OVERVIEW_FILE}`));
  console.log(chalk.green(`✔ 已生成 ${MODULES_INDEX_FILE}\n`));
  
  if (isFirstTime) {
    console.log(chalk.blue('💡 提示：运行 "初始化项目概览" 命令可以让 AI 帮助完善架构描述和模块职责'));
  } else {
    console.log(chalk.blue('💡 提示：如需完善架构描述，可运行 "初始化项目概览" 命令'));
  }
}


