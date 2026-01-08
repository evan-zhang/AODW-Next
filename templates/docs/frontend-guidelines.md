当“前端圣经”用的规范文档。
内容包括：
	•	用什么工具约束代码质量 & 目录结构
	•	适配你现有栈（React 19 + TS + Vite + Tailwind + Radix + Zustand）
	•	带目录结构、命名、代码风格 & AI 使用规则

前端开发规范（面向 AI & 人类开发者）

适用项目技术栈：
	•	框架：React 18/19 + TypeScript + Vite
	•	UI：Tailwind CSS + Radix UI + 自定义组件库
	•	状态：Zustand
	•	工具：ESLint + Prettier
	•	使用场景：人类开发 + AI 工具（Cursor、Claude Code 等）

⸻

1. 工具与质量控制

1.1 代码质量工具
	•	ESLint：统一代码风格 & 代码质量
	•	规则推荐：
	•	@typescript-eslint（TS 规则）
	•	eslint-plugin-react
	•	eslint-plugin-react-hooks
	•	eslint-plugin-import
	•	eslint-plugin-jsx-a11y
	•	eslint-plugin-tailwindcss（可选，用于 Tailwind 排序&校验）
	•	Prettier：负责代码格式化（缩进、引号、分号等）
	•	与 ESLint 配合使用：eslint-config-prettier 关闭 ESLint 中跟格式冲突的规则

1.2 目录 / 分层相关工具（可选但推荐）
	•	使用 TypeScript path alias + ESLint import 规则 管理模块边界：
	•	paths：
	•	@app/* → src/app/*
	•	@pages/* → src/pages/*
	•	@features/* → src/features/*
	•	@shared/* → src/shared/*
	•	配合 eslint-plugin-import 限制：
	•	pages 只能从 features / shared 引用
	•	features 不能直接引用其他 features 的内部实现（只能走公共入口）

说明：
目录结构本身没有“专门 lint 工具”，通常是通过
约定好的目录 + import 规则 + path alias 来间接约束。

1.3 文件大小 & 复杂度约束（ESLint）
建议在 ESLint 中统一限制（给 AI 也要强调）：
	•	单文件最大行数：
	•	页面级组件：≤ 300 行（推荐 ≤ 250 行）
	•	其他组件 / hooks / store：≤ 200 行
	•	单个函数最大行数：≤ 60 行
	•	复杂度控制：
	•	complexity ≤ 10

⸻

2. 目录结构规范

2.1 顶层结构
frontend/
  src/
    app/                 # 应用入口、路由、全局 Provider
    pages/               # 页面级（路由入口）
    features/            # 可复用业务模块（跨页面）
    shared/              # 跨业务通用：组件/工具/类型
    config/              # 配置、环境相关
    styles/              # 全局样式
    assets/              # 静态资源

2.2 详细结构说明
src/
  app/
    router/              # 路由定义
    providers/           # 全局 Provider（主题、QueryClient 等）
    layout/              # 顶层布局（如 AppShell）
  
  pages/
    ProjectEditorPage/
      index.tsx          # 页面入口（路由组件）
      Header.tsx
      Sidebar.tsx
      Canvas.tsx
      Inspector.tsx
      modals/
        NodeCreateModal.tsx
        NodeDeleteConfirmModal.tsx
      hooks/
        useProjectEditorData.ts
        useProjectSelection.ts
      store/
        projectEditor.store.ts

    ProjectListPage/
      index.tsx
      ...                # 结构类似，不展开

  features/
    project/
      components/        # 项目相关可复用组件
      hooks/             # 项目相关可复用 hooks
      store/             # 项目相关 store（全局/跨页面）
      api/               # 与项目相关的 API 封装

    user/
      components/
      hooks/
      store/
      api/

  shared/
    components/          # 通用组件：Button、Card、Table、Dialog 等
    hooks/               # 通用 hooks：useDebounce、useResizeObserver 等
    store/               # 通用全局状态
    utils/               # 工具函数：日期、格式化、日志
    types/               # 通用类型/接口声明（如 PaginatedResult 等)

  config/
    env.ts               # 环境变量读取封装
    apiClient.ts         # axios / fetch 封装

  styles/
    globals.css
    tailwind.css

规则：
	•	pages/：按路由拆目录，每个页面一个文件夹。
	•	features/：按业务域拆目录（project、user、auth…）。
	•	shared/：只能依赖 shared 自身，不依赖 pages 或 features。
	•	pages 可以依赖 features & shared；
features 可以依赖 shared，但尽量不要彼此深度耦合。

⸻

3. 命名规范

3.1 文件命名
	•	React 组件文件：帕斯卡命名（大驼峰）
	•	ProjectEditorPage/index.tsx
	•	Header.tsx, ProjectTable.tsx
	•	hooks 文件：useXxx.ts
	•	useProjectEditorData.ts
	•	useProjectSelection.ts
	•	Zustand store：
	•	xxx.store.ts（如 projectEditor.store.ts）
	•	类型声明：
	•	xxx.types.ts 或集中放在 shared/types 中
	•	工具函数：
	•	xxx.utils.ts 或放在 shared/utils 下

3.2 组件 & 变量命名
	•	组件：PascalCase
	•	变量 / 函数：camelCase
	•	常量：SCREAMING_SNAKE_CASE
	•	hooks：以 use 开头，返回 [state, actions] 或对象

⸻

4. TypeScript 规范
	•	启用严格模式："strict": true
	•	禁止滥用 any：
	•	使用 unknown + 类型收窄 或 合理定义接口
	•	API 层优先使用：
	•	DTO 类型（请求）
	•	Response 类型（响应）
	•	类型命名：
	•	接口 / 类型：Project, ProjectDetail, UserProfile
	•	不建议 IProject 这种前缀

⸻

5. React 编码规范

5.1 组件类型
	•	优先使用函数组件 + Hooks：
	•	不使用 class 组件
	•	每个文件聚焦一个主要组件：
	•	如果一个文件内存在多个复杂组件 → 拆文件

5.2 状态管理策略
	•	页面局部状态：useState / useReducer
	•	页面内复杂状态：页面专用 hooks/ + store/（Zustand）
	•	跨页面共享业务状态：放在 features/*/store
	•	全局通用状态：放在 shared/store

原则：能局部就不全局，能 hook 就不 store。

5.3 副作用 & 数据请求
	•	所有数据请求封装在：
	•	features/*/api
	•	或页面专用 hooks：pages/*/hooks
	•	不在组件中直接调用 fetch/axios
→ 统一用 apiClient / 封装方法。

⸻

6. Tailwind & Radix 使用规范

6.1 Tailwind
	•	使用 className 写原子类，尽量保持每个组件的 className 长度可读；
	•	复杂样式组合抽离到：
	•	cn() 帮助函数结合条件类
	•	或封装为组件，例如 <PrimaryButton />
	•	不在逻辑代码里到处写硬编码颜色，优先用设计系统中的 token（在 Tailwind config 中定义）。

6.2 Radix UI
	•	Radix 组件作为“基础交互组件”，在 shared/components 中封装：
	•	例如 Dialog、Popover、DropdownMenu 封装为：
	•	SharedDialog.tsx
	•	DropdownMenu.tsx
	•	页面或业务组件不直接大量拼 Radix 基础元素，而是复用封装后的组件。

⸻

7. AI（Cursor / Claude 等）使用规则

本节是专门给 AI 的“硬约束”，建议原封不动写进系统提示。

7.1 基本要求
AI 在本项目中写前端代码时必须遵守：
	1.	目录与分层：
	•	新页面 → 必须放到 src/pages/<PageName>/ 下；
	•	可复用业务逻辑 → 放到对应 src/features/<domain>/ 下；
	•	通用组件 / hooks / 工具 → 放到 src/shared/ 下；
	•	不允许把所有代码都写在一个目录或一个文件里。
	2.	文件大小：
	•	页面入口组件（index.tsx）≤ 300 行；
	•	普通组件 / hooks / store 文件 ≤ 200 行；
	•	单个函数 ≤ 60 行；
	•	如果一个功能实现会超过限制：
	•	必须先设计拆分方案（组件 / hooks / store 列表）
	•	再按文件逐步实现，而不是一次性生成巨型文件。
	3.	实现流程：
	•	第一步：先给出【目录与文件拆分方案】，解释每个文件的职责；
	•	第二步：按“每次一个文件”的方式生成代码；
	•	第三步：在已有大文件重构时，优先拆分成多个小文件，而不是继续追加代码。
	4.	代码风格：
	•	使用函数组件 + Hooks；
	•	使用 TypeScript，类型尽量完整；
	•	遁守 ESLint / Prettier 风格（缩进、分号、引号不需要显式指定，但生成的代码要保证能通过常规规则）。

7.2 典型 AI Prompt 模板（示例）
用于新页面开发：

技术栈：React + TS + Vite + Tailwind + Radix + Zustand。
目录结构与命名请严格遵守本项目的前端规范。
目标：实现【XXX 页面】。

步骤 1：先只输出该页面对应的目录和文件拆分方案，目标是：
	•	页面入口：src/pages/<PageName>/index.tsx
	•	拆分独立的子组件、hooks、store，确保：
	•	页面入口文件行数 ≤ 300 行；
	•	其他文件 ≤ 200 行；
	•	单个函数 ≤ 60 行。

步骤 2：在我确认拆分方案后，再逐个文件实现，每次只输出一个文件的完整代码。

⸻

8. 测试 & 可维护性（可选扩展）

如果后面增加测试，可以约定：
	•	所有关键组件 / hooks 都有对应测试文件：
	•	ComponentName.test.tsx
	•	useHookName.test.ts
	•	测试文件放在同级目录或 __tests__ 子目录中。