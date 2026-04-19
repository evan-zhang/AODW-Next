# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AODW-Next is an AI-Orchestrated Development Workflow tool. It defines a document-driven, AI-led development paradigm that helps teams improve collaboration efficiency and code quality through unified workflows.

**Key concept**: Every requirement, feature, or bug is managed as an independent RT (Request Ticket) with associated documentation, following a structured workflow from specification to implementation.

## Common Commands

### Local Development
```bash
cd cli
npm link           # Symlink local version for testing
aodw-skill init     # Test with local version
```

### Publishing
```bash
cd cli
./publish.sh patch    # Bump patch version (0.7.14 -> 0.7.15)
./publish.sh minor    # Bump minor version (0.7.14 -> 0.8.0)
./publish.sh major    # Bump major version (0.7.14 -> 1.0.0)
```

The publish script:
1. Syncs template files from `templates/` to `cli/`
2. Bumps version in `package.json`
3. Publishes to npm
4. Creates git tag `v<version>`

### User-Facing Commands (in user projects)
```bash
npx aodw-skill init          # Install AODW-Next in a project
npx aodw-skill update        # Update AODW-Next
npx aodw-skill init-overview  # Initialize project overview (tech stack, architecture)
npx aodw-skill init-tools    # Initialize development tools (ESLint, Prettier, Ruff, etc.)
npx aodw-skill new           # Create a new Request Ticket
```

## Architecture

### Directory Structure

```
AODW-Next/
├── cli/                          # CLI tool source code
│   ├── bin/
│   │   ├── aodw.js              # Main entry point
│   │   ├── commands/             # Command implementations
│   │   │   ├── init-overview.js # Project overview initialization
│   │   │   ├── init-tools.js    # Tools initialization
│   │   │   ├── new.js           # Create RT
│   │   │   └── serve.js        # ID server for collaborative mode
│   │   ├── processors/          # File transformers for different AI tools
│   │   └── utils/              # Utility functions
│   ├── package.json
│   └── publish.sh               # Publish script
├── templates/                    # Source templates
│   ├── .aodw-next/             # Core AODW-Next rules (Runtime Kernel)
│   │   ├── 01-core/            # Core rules (constitution, interaction, knowledge)
│   │   ├── 02-workflow/        # Workflows (RT manager, spec profiles)
│   │   ├── 03-standards/       # Coding standards
│   │   ├── 04-auditors/        # Auditors (requirement, development, full)
│   │   ├── 05-tooling/         # Tool initialization rules
│   │   ├── 06-project/         # User-generated project files (templates/)
│   │   │   └── templates/      # Template files for user projects
│   │   │       ├── ai-overview.template.md
│   │   │       └── modules-index.template.yaml
│   │   ├── manifest.yaml        # Rules metadata for progressive disclosure
│   │   └── config.yaml         # Default configuration
│   └── AODW_Adapters/         # AI tool adapter templates
│       ├── cursor/              # Cursor IDE rules
│       ├── antigravity/         # Google Gemini adapter
│       ├── claude/              # Anthropic Claude adapter
│       ├── gemini/              # Gemini Web/API adapter
│       └── general/             # Generic adapters (OpenAI, etc.)
└── README.md
```

### Installation Flow

When user runs `aodw-skill init`:
1. CLI copies `templates/.aodw-next/` to user's `.aodw-next/` directory
2. Copies templates from `.aodw-next/templates/` to `.aodw-next/06-project/`
3. Installs selected AI tool adapters from `AODW_Adapters/`
4. Creates user config (`.aodw-next/config.yaml`)

### Update Flow (User Updates AODW-Next)

When user runs `aodw-skill update`:
1. CLI copies core rules with preservation logic
2. **Preserves user-generated files**: `ai-overview.md`, `modules-index.yaml`, `tools-status.yaml`
3. Template detection: Files still containing `（待补充）` placeholders can be overwritten

### Processor Pattern

File processors in `cli/bin/processors/` transform templates for different AI platforms:
- `BaseProcessor`: No transformation
- `CursorProcessor`: Adds Cursor-specific formatting
- `AntigravityProcessor`: Replaces `{AODW_DIR}` with `.aodw-next`, injects frontmatter
- `ClaudeProcessor`: Claude-specific transformations
- `GeminiProcessor`: Gemini-specific transformations

All processors extend `BaseProcessor` and implement `transform(content)`.

### Manifest System

`manifest.yaml` defines rule metadata for progressive disclosure:
- `summary_preferred`: Use summary files when available
- `load_when`: Tags indicating when to load each rule
- `priority`: critical, high, medium
- `size_kb`: File size for token optimization

### Configuration

- `CORE_DIRNAME`: Fixed to `.aodw-next` (no legacy support)
- `PACKAGE_NAME`: `aodw-skill`
- Default paths are resolved via environment variables `AODW_CORE_DIR` and `AODW_PACKAGE_NAME`

## Key Invariants

- **No legacy `.aodw` support**: This is a standalone Next version with `.aodw-next/` directory only
- **Template protection**: User-generated files in `06-project/` are preserved during updates
- **Safeguard in source repo**: Prevents running `aodw-skill init` within the AODW-Next source repository (would overwrite source files)
- **File `files` in package.json**: Must include `bin/`, `.aodw-next/`, `AODW_Adapters/`, and `docs/` for npm publishing

## Important Files

- `templates/.aodw-next/manifest.yaml`: Central registry of all rules
- `cli/bin/aodw.js`: Main CLI entry with command registration and init/update logic
- `cli/bin/commands/init-overview.js`: Auto-detects project tech stack and generates overview
- `cli/bin/commands/init-tools.js`: Initializes development tools based on detected stack
