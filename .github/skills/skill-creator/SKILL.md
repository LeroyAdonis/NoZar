---
name: skill-creator
description: Guide for creating effective skills for the purple-glow-social-2.0 project. Use when users want to create a new skill (or update an existing skill) that extends Claude's capabilities with specialized workflows, domain knowledge, or tool integrations tailored to TypeScript, Next.js 16, React 19, and our South African social media automation platform.
---

# Skill Creator

This skill provides guidance for creating effective skills within the **purple-glow-social-2.0** project context.

## About Skills

Skills are modular, self-contained packages that extend Claude's capabilities by providing specialized knowledge, workflows, and tools. Think of them as "onboarding guides" for specific domains or tasks—they transform Claude from a general-purpose agent into a specialized agent equipped with procedural knowledge that no model can fully possess.

### What Skills Provide

1. **Specialized workflows** - Multi-step procedures for specific domains (e.g., OAuth integration, post scheduling)
2. **Tool integrations** - Instructions for working with specific APIs (LinkedIn, Twitter, Polar) or file formats
3. **Domain expertise** - Project-specific knowledge: schemas (Drizzle ORM), business logic, authentication flows
4. **Bundled resources** - Scripts, references, and assets for complex and repetitive tasks

## Core Principles

### Concise is Key

The context window is a public good. Skills share the context window with everything else Claude needs: system prompt, conversation history, other Skills' metadata, and the actual user request.

**Default assumption: Claude is already very smart.** Only add context Claude doesn't already have. Challenge each piece of information: "Does Claude really need this explanation?" and "Does this paragraph justify its token cost?"

Prefer concise examples over verbose explanations.

### Set Appropriate Degrees of Freedom

Match the level of specificity to the task's fragility and variability:

**High freedom (text-based instructions)**: Use when multiple approaches are valid, decisions depend on context, or heuristics guide the approach.

**Medium freedom (pseudocode or scripts with parameters)**: Use when a preferred pattern exists, some variation is acceptable, or configuration affects behavior.

**Low freedom (specific scripts, few parameters)**: Use when operations are fragile and error-prone, consistency is critical, or a specific sequence must be followed.

Think of Claude as exploring a path: a narrow bridge with cliffs needs specific guardrails (low freedom), while an open field allows many routes (high freedom).

### Anatomy of a Skill

Every skill consists of a required SKILL.md file and optional bundled resources:

```
skill-name/
├── SKILL.md (required)
│   ├── YAML frontmatter metadata (required)
│   │   ├── name: (required)
│   │   ├── description: (required)
│   │   └── compatibility: (optional, rarely needed)
│   └── Markdown instructions (required)
└── Bundled Resources (optional)
    ├── scripts/          - Executable code (TypeScript/PowerShell/Python)
    ├── references/       - Documentation intended to be loaded into context as needed
    └── assets/           - Files used in output (templates, icons, fonts, etc.)
```

#### SKILL.md (required)

Every SKILL.md consists of:

- **Frontmatter** (YAML): Contains `name` and `description` fields (required), plus optional fields like `license`, `metadata`, and `compatibility`. Only `name` and `description` are read by Claude to determine when the skill triggers, so be clear and comprehensive about what the skill is and when it should be used. The `compatibility` field is for noting environment requirements (Windows, Node.js version, system packages, etc.) but most skills don't need it.
- **Body** (Markdown): Instructions and guidance for using the skill. Only loaded AFTER the skill triggers (if at all).

#### Bundled Resources (optional)

##### Scripts (`scripts/`)

Executable code (TypeScript/PowerShell/Python) for tasks that require deterministic reliability or are repeatedly rewritten.

- **When to include**: When the same code is being rewritten repeatedly or deterministic reliability is needed
- **Example**: `scripts/migrate-schema.ts` for database migrations, `scripts/test-oauth.ps1` for OAuth flow testing
- **Benefits**: Token efficient, deterministic, may be executed without loading into context
- **Project context**: Prefer TypeScript for scripts when possible; use PowerShell for Windows-specific automation
- **Note**: Scripts may still need to be read by Claude for patching or environment-specific adjustments

##### References (`references/`)

Documentation and reference material intended to be loaded as needed into context to inform Claude's process and thinking.

- **When to include**: For documentation that Claude should reference while working
- **Examples**: `references/drizzle-schema.md` for database schema, `references/oauth-flows.md` for authentication patterns, `references/api-endpoints.md` for API specifications, `references/better-auth-config.md` for session management
- **Use cases**: Database schemas, API documentation, domain knowledge, company policies, detailed workflow guides
- **Benefits**: Keeps SKILL.md lean, loaded only when Claude determines it's needed
- **Best practice**: If files are large (>10k words), include grep search patterns in SKILL.md
- **Avoid duplication**: Information should live in either SKILL.md or references files, not both. Prefer references files for detailed information unless it's truly core to the skill—this keeps SKILL.md lean while making information discoverable without hogging the context window.

##### Assets (`assets/`)

Files not intended to be loaded into context, but rather used within the output Claude produces.

- **When to include**: When the skill needs files that will be used in the final output
- **Examples**: `assets/logo.svg` for brand assets, `assets/react-component-template/` for React 19 boilerplate, `assets/middleware-template.ts` for Next.js middleware patterns
- **Use cases**: Templates, images, icons, boilerplate code, fonts, sample documents that get copied or modified
- **Project context**: Include Next.js 16 App Router templates, React Server Component patterns, TypeScript strict mode examples
- **Benefits**: Separates output resources from documentation, enables Claude to use files without loading them into context

#### What to Not Include in a Skill

A skill should only contain essential files that directly support its functionality. Do NOT create extraneous documentation or auxiliary files, including:

- README.md
- INSTALLATION_GUIDE.md
- QUICK_REFERENCE.md
- CHANGELOG.md
- etc.

The skill should only contain the information needed for an AI agent to do the job at hand. It should not contain auxiliary context about the process that went into creating it, setup and testing procedures, user-facing documentation, etc. Creating additional documentation files just adds clutter and confusion.

### Progressive Disclosure Design Principle

Skills use a three-level loading system to manage context efficiently:

1. **Metadata (name + description)** - Always in context (~100 words)
2. **SKILL.md body** - When skill triggers (<5k words)
3. **Bundled resources** - As needed by Claude (Unlimited because scripts can be executed without reading into context window)

#### Progressive Disclosure Patterns

Keep SKILL.md body to the essentials and under 500 lines to minimize context bloat. Split content into separate files when approaching this limit. When splitting out content into other files, it is very important to reference them from SKILL.md and describe clearly when to read them, to ensure the reader of the skill knows they exist and when to use them.

**Key principle:** When a skill supports multiple variations, frameworks, or options, keep only the core workflow and selection guidance in SKILL.md. Move variant-specific details (patterns, examples, configuration) into separate reference files.

**Pattern 1: High-level guide with references**

```markdown
# LinkedIn OAuth Integration

## Quick start

Initialize OAuth flow with Better Auth:
[TypeScript code example]

## Advanced features

- **Token refresh**: See [TOKEN-REFRESH.md](references/TOKEN-REFRESH.md) for complete guide
- **API reference**: See [LINKEDIN-API.md](references/LINKEDIN-API.md) for all endpoints
- **Examples**: See [OAUTH-EXAMPLES.md](references/OAUTH-EXAMPLES.md) for common patterns
```

Claude loads TOKEN-REFRESH.md, LINKEDIN-API.md, or OAUTH-EXAMPLES.md only when needed.

**Pattern 2: Domain-specific organization**

For Skills with multiple domains, organize content by domain to avoid loading irrelevant context:

```
social-media-skill/
├── SKILL.md (overview and navigation)
└── references/
    ├── linkedin.md (LinkedIn API patterns)
    ├── twitter.md (Twitter/X API patterns)
    ├── instagram.md (Instagram Graph API)
    └── facebook.md (Facebook Pages API)
```

When a user asks about LinkedIn posting, Claude only reads linkedin.md.

Similarly, for skills supporting multiple frameworks or variants, organize by variant:

```
database-skill/
├── SKILL.md (workflow + ORM selection)
└── references/
    ├── drizzle.md (Drizzle ORM patterns)
    ├── prisma.md (Prisma patterns)
    └── raw-sql.md (Raw SQL patterns)
```

When using Drizzle ORM (our standard), Claude only reads drizzle.md.

**Pattern 3: Conditional details**

Show basic content, link to advanced content:

```markdown
# Next.js App Router Patterns

## Creating routes

Use Server Components by default. See [SERVER-COMPONENTS.md](references/SERVER-COMPONENTS.md).

## Client interactivity

For client-side state, use 'use client' directive.

**For form handling**: See [FORM-ACTIONS.md](references/FORM-ACTIONS.md)
**For advanced patterns**: See [RSC-PATTERNS.md](references/RSC-PATTERNS.md)
```

Claude reads FORM-ACTIONS.md or RSC-PATTERNS.md only when the user needs those features.

**Important guidelines:**

- **Avoid deeply nested references** - Keep references one level deep from SKILL.md. All reference files should link directly from SKILL.md.
- **Structure longer reference files** - For files longer than 100 lines, include a table of contents at the top so Claude can see the full scope when previewing.

## Skill Creation Process

Skill creation involves these steps:

1. Understand the skill with concrete examples
2. Plan reusable skill contents (scripts, references, assets)
3. Initialize the skill (create directory structure)
4. Edit the skill (implement resources and write SKILL.md)
5. Package the skill (if distribution needed)
6. Iterate based on real usage

Follow these steps in order, skipping only if there is a clear reason why they are not applicable.

### Step 1: Understanding the Skill with Concrete Examples

Skip this step only when the skill's usage patterns are already clearly understood. It remains valuable even when working with an existing skill.

To create an effective skill, clearly understand concrete examples of how the skill will be used. This understanding can come from either direct user examples or generated examples that are validated with user feedback.

For example, when building a `linkedin-oauth` skill, relevant questions include:

- "What functionality should the linkedin-oauth skill support? Token refresh, profile fetching, anything else?"
- "Can you give some examples of how this skill would be used?"
- "I can imagine users asking for things like 'Set up LinkedIn authentication' or 'Debug OAuth token refresh'. Are there other ways you imagine this skill being used?"
- "What would a user say that should trigger this skill?"

To avoid overwhelming users, avoid asking too many questions in a single message. Start with the most important questions and follow up as needed for better effectiveness.

Conclude this step when there is a clear sense of the functionality the skill should support.

### Step 2: Planning the Reusable Skill Contents

To turn concrete examples into an effective skill, analyze each example by:

1. Considering how to execute on the example from scratch
2. Identifying what scripts, references, and assets would be helpful when executing these workflows repeatedly

**Example: Building a `database-migration` skill** to handle queries like "Help me add a new table":

1. Database migrations require re-discovering schema patterns each time
2. A `references/drizzle-schema.md` file documenting our schema patterns would be helpful
3. A `scripts/generate-migration.ts` script to automate migration file creation

**Example: Designing a `react-component-builder` skill** for queries like "Build me a dashboard card" or "Create a data table component":

1. Writing React components requires the same TypeScript strict mode boilerplate each time
2. An `assets/component-template/` containing boilerplate React 19 + TypeScript files would be helpful

**Example: Building a `better-auth-integration` skill** to handle queries like "Debug session persistence":

1. Working with Better Auth requires re-discovering configuration patterns and session schemas
2. A `references/better-auth-config.md` file documenting our authentication setup would be helpful
3. A `references/session-schema.md` documenting the session table structure

To establish the skill's contents, analyze each concrete example to create a list of the reusable resources to include: scripts, references, and assets.

### Step 3: Initializing the Skill

At this point, it is time to actually create the skill.

Skip this step only if the skill being developed already exists, and iteration or packaging is needed. In this case, continue to the next step.

**Quick method (recommended):** Use the initialization script:

```powershell
# From project root - create skill with all directories
.\.agents\skills\skill-creator\scripts\init-skill.ps1 -SkillName "your-skill-name" -IncludeAll

# Or create with specific directories
.\.agents\skills\skill-creator\scripts\init-skill.ps1 -SkillName "your-skill-name" -IncludeScripts -IncludeReferences

# Or run interactively (prompts for name)
.\.agents\skills\skill-creator\scripts\init-skill.ps1
```

The script creates the skill directory, copies the template with proper frontmatter, creates optional resource directories, and opens SKILL.md in your editor.

**Manual method (if script unavailable):** Create the directory structure manually:

```powershell
# Create skill directory
New-Item -ItemType Directory -Path ".agents/skills/<skill-name>" -Force

# Copy template
Copy-Item ".agents/skills/skill-creator/assets/skill-template/SKILL.md" ".agents/skills/<skill-name>/SKILL.md"

# Update placeholders in SKILL.md manually
# Replace <skill-name> with actual skill name in frontmatter
# Replace <Skill Name> with Title Case name in heading

# Create resource directories as needed
New-Item -ItemType Directory -Path ".agents/skills/<skill-name>/scripts" -Force
New-Item -ItemType Directory -Path ".agents/skills/<skill-name>/references" -Force
New-Item -ItemType Directory -Path ".agents/skills/<skill-name>/assets" -Force
```

After initialization, customize the generated SKILL.md and remove any unused directories.

### Step 4: Edit the Skill

When editing the (newly-generated or existing) skill, remember that the skill is being created for another instance of Claude to use. Include information that would be beneficial and non-obvious to Claude. Consider what procedural knowledge, domain-specific details, or reusable assets would help another Claude instance execute these tasks more effectively.

#### Project-Specific Conventions

When creating skills for **purple-glow-social-2.0**, follow these conventions:

- **TypeScript strict mode**: All code examples must pass strict type checking
- **Next.js 16 App Router**: Use Server Components by default, `'use client'` only when needed
- **React 19 patterns**: Use new hooks (`useActionState`, `useFormStatus`), avoid deprecated patterns
- **Drizzle ORM**: Database queries should use our Drizzle schema patterns
- **Better Auth**: Authentication flows should reference our Better Auth configuration
- **Error handling**: Use `lib/logger.ts` for consistent logging
- **South African context**: Consider timezone (SAST), language preferences (English + Afrikaans), local business practices

#### Start with Reusable Skill Contents

To begin implementation, start with the reusable resources identified above: `scripts/`, `references/`, and `assets/` files. Note that this step may require user input. For example, when implementing a `brand-guidelines` skill, the user may need to provide brand assets or templates to store in `assets/`, or documentation to store in `references/`.

Added scripts must be tested by actually running them to ensure there are no bugs and that the output matches what is expected. If there are many similar scripts, only a representative sample needs to be tested to ensure confidence that they all work while balancing time to completion.

Any example files and directories not needed for the skill should be deleted.

#### Update SKILL.md

**Writing Guidelines:** Always use imperative/infinitive form.

##### Frontmatter

Write the YAML frontmatter with `name` and `description`:

- `name`: The skill name (kebab-case, e.g., `linkedin-oauth`, `database-migration`)
- `description`: This is the primary triggering mechanism for your skill, and helps Claude understand when to use the skill.
  - Include both what the Skill does and specific triggers/contexts for when to use it.
  - Include all "when to use" information here - Not in the body. The body is only loaded after triggering, so "When to Use This Skill" sections in the body are not helpful to Claude.
  - **Example for a `drizzle-orm` skill**: "Database schema management and query patterns for Drizzle ORM in the purple-glow-social-2.0 project. Use when Claude needs to: (1) Create or modify database schemas, (2) Write type-safe queries, (3) Handle migrations, (4) Reference table relationships, or any other Drizzle ORM tasks. Project uses PostgreSQL with Neon serverless."

Optional `compatibility` field example:
- `compatibility: "Requires Node.js 20+, Windows environment, Git configured at C:\\Users\\F5267390\\AppData\\Local\\Programs\\Git\\cmd\\git.exe"`

Do not include any other fields in YAML frontmatter.

##### Body

Write instructions for using the skill and its bundled resources. Include project-specific patterns:

- Database: Drizzle ORM schema patterns, Neon serverless connection pooling
- Auth: Better Auth session management, OAuth flows (LinkedIn, Twitter)
- Frontend: Next.js 16 App Router, React 19 Server Components, TypeScript strict
- Deployment: Vercel configuration, environment variables
- South African context: SAST timezone handling, multi-language support considerations

### Step 5: Packaging a Skill

For **purple-glow-social-2.0**, skills are typically used in-place within `.agents/skills/` and don't require packaging for distribution. Skip this step unless:

- Sharing the skill externally
- Creating a distributable .skill file for other projects
- Archiving a skill for version control

If packaging is needed, create a zip archive:

```powershell
Compress-Archive -Path ".agents/skills/<skill-name>/*" -DestinationPath "./<skill-name>.skill"
```

### Step 6: Iterate

After testing the skill, users may request improvements. Often this happens right after using the skill, with fresh context of how the skill performed.

**Iteration workflow:**

1. Use the skill on real tasks (e.g., implementing OAuth, creating components)
2. Notice struggles or inefficiencies (missing TypeScript types, unclear patterns)
3. Identify how SKILL.md or bundled resources should be updated
4. Implement changes and test again with actual project tasks
5. Verify against project conventions (TypeScript strict, App Router patterns)

## Quick Reference

For rapid skill creation, see [quick-start.md](references/quick-start.md) - a condensed guide (50 lines) with essential patterns and checklist.

**Bundled resources:**

- **Template**: [assets/skill-template/SKILL.md](assets/skill-template/SKILL.md) - Copy-paste ready boilerplate with frontmatter and structure
- **Init script**: [scripts/init-skill.ps1](scripts/init-skill.ps1) - Automated skill creation with proper directory structure
- **Quick start**: [references/quick-start.md](references/quick-start.md) - TL;DR version of this guide

## Examples of Skills in This Project

Reference these existing skills for patterns:

- **next-best-practices**: Next.js 16 conventions, file structure, RSC boundaries
- **test-driven-development**: Testing patterns with Vitest, Playwright
- **systematic-debugging**: Error investigation workflow
- **brainstorming**: Requirements exploration before implementation

When creating new skills, follow similar structure and progressive disclosure patterns.
