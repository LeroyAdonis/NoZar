# Skill Creator Quick Start

**TL;DR: Create skills fast with the init script, follow the template, keep it concise.**

## 1-Minute Setup

```powershell
# From project root
.\.agents\skills\skill-creator\scripts\init-skill.ps1 -SkillName "your-skill-name" -IncludeAll
```

This creates:
- `SKILL.md` with frontmatter and structure
- `scripts/`, `references/`, `assets/` directories

## Critical Frontmatter

```yaml
---
name: skill-name
description: What it does + when to use it. Be specific about triggers!
---
```

**The description is your trigger.** Include all "when to use" info here, not in body.

## Essential Structure

```markdown
# Skill Name
Brief intro (1-2 sentences)

## Quick Start
Minimal working example (code/commands)

## Core Workflows
Step-by-step procedures with examples

## Advanced Usage
Links to references/* files for details

## Project Context
purple-glow-social-2.0 specific notes (TypeScript strict, Next.js 16, etc.)
```

## Bundled Resources

- **`scripts/`** - Executable code (TypeScript preferred, PowerShell for Windows tasks)
- **`references/`** - Documentation loaded as needed (keeps SKILL.md lean)
- **`assets/`** - Templates/files used in output (not loaded to context)

## Key Principles

1. **Concise > Verbose** - Claude is smart, assume knowledge
2. **Examples > Explanations** - Show, don't tell
3. **Progressive disclosure** - Keep SKILL.md <500 lines, split into references
4. **No auxiliary docs** - No README, CHANGELOG, etc. Just SKILL.md + resources

## Project Conventions

Every skill for purple-glow-social-2.0 should reference:

- TypeScript strict mode
- Next.js 16 App Router (Server Components default)
- React 19 patterns (`useActionState`, `useFormStatus`)
- Drizzle ORM for database
- Better Auth for authentication
- `lib/logger.ts` for logging
- SAST timezone (UTC+2)

## Testing Your Skill

1. Use it on a real task in your project
2. Notice what's missing or unclear
3. Update SKILL.md or add references
4. Test scripts by actually running them
5. Iterate until smooth

## Common Patterns

**Pattern 1: High-level + references**
```markdown
## Token Refresh
Basic flow: [inline code]
Full guide: See [TOKEN-REFRESH.md](references/TOKEN-REFRESH.md)
```

**Pattern 2: Domain-specific**
```
skill/
├── SKILL.md (overview + navigation)
└── references/
    ├── domain-a.md
    └── domain-b.md
```

**Pattern 3: Conditional details**
```markdown
For basic use: [inline example]
For advanced patterns: See [ADVANCED.md](references/ADVANCED.md)
```

## What NOT to Include

❌ README.md
❌ INSTALLATION_GUIDE.md
❌ CHANGELOG.md
❌ QUICK_REFERENCE.md
❌ Any auxiliary documentation

✅ Only SKILL.md and resources needed for the task

## Quick Checklist

- [ ] Frontmatter has clear `description` with triggers
- [ ] SKILL.md has Quick Start with working example
- [ ] SKILL.md is <500 lines
- [ ] Scripts are tested and working
- [ ] References are linked from SKILL.md
- [ ] Project conventions are noted
- [ ] No auxiliary docs created

**Now go create!** Run the init script and start with a concrete example.
