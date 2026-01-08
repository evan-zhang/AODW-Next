# Cursor Commands Directory

This directory is for **your project-specific commands**.

## About This Directory

Cursor allows you to define custom commands in `.cursor/commands/` directory.
These commands can be invoked by the AI to help with project-specific tasks.

## AODW Commands

**AODW does not provide default commands here.**

AODW functionality is managed through the **rules system**:
- See `.cursor/rules/aodw.mdc` for the AODW Kernel Loader
- The rule file contains a command index table that references core AODW rules

## Adding Your Own Commands

You can create project-specific commands here, for example:
- Deployment workflows
- Testing procedures  
- Code generation scripts
- Database migration helpers

Each command should be a markdown file describing what the AI should do.

## Example Structure

```
.cursor/commands/
├── README.md (this file)
├── deploy.md (your deployment command)
└── test.md (your testing command)
```

Refer to Cursor documentation for command file format.
