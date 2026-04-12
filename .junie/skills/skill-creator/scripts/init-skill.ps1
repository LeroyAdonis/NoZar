#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Initialize a new skill with proper directory structure and template

.DESCRIPTION
    Creates a new skill directory with:
    - SKILL.md from template
    - Optional scripts/, references/, and assets/ directories
    - Opens SKILL.md in default editor

.PARAMETER SkillName
    Name of the skill (kebab-case, e.g., 'linkedin-oauth')

.PARAMETER IncludeScripts
    Create scripts/ directory for executable code

.PARAMETER IncludeReferences
    Create references/ directory for documentation

.PARAMETER IncludeAssets
    Create assets/ directory for templates/files

.EXAMPLE
    .\init-skill.ps1 -SkillName "my-new-skill"

.EXAMPLE
    .\init-skill.ps1 -SkillName "oauth-helper" -IncludeScripts -IncludeReferences
#>

param(
    [Parameter(Mandatory=$false)]
    [string]$SkillName,

    [switch]$IncludeScripts,
    [switch]$IncludeReferences,
    [switch]$IncludeAssets,
    [switch]$IncludeAll
)

# If IncludeAll is set, enable all optional directories
if ($IncludeAll) {
    $IncludeScripts = $true
    $IncludeReferences = $true
    $IncludeAssets = $true
}

# Get skill name if not provided
if (-not $SkillName) {
    Write-Host "=== Skill Creator ===" -ForegroundColor Cyan
    Write-Host ""
    $SkillName = Read-Host "Enter skill name (kebab-case, e.g., 'linkedin-oauth')"
    
    if ([string]::IsNullOrWhiteSpace($SkillName)) {
        Write-Host "Error: Skill name cannot be empty" -ForegroundColor Red
        exit 1
    }
}

# Validate skill name format (kebab-case)
if ($SkillName -notmatch '^[a-z0-9]+(-[a-z0-9]+)*$') {
    Write-Host "Warning: Skill name should be in kebab-case (lowercase, hyphens only)" -ForegroundColor Yellow
    $continue = Read-Host "Continue anyway? (y/N)"
    if ($continue -ne 'y' -and $continue -ne 'Y') {
        exit 0
    }
}

# Determine paths
$scriptRoot = $PSScriptRoot
$skillsRoot = Split-Path -Parent (Split-Path -Parent $scriptRoot)
$skillPath = Join-Path $skillsRoot $SkillName
$templatePath = Join-Path $scriptRoot "..\assets\skill-template\SKILL.md"

# Check if skill already exists
if (Test-Path $skillPath) {
    Write-Host "Error: Skill '$SkillName' already exists at:" -ForegroundColor Red
    Write-Host "  $skillPath" -ForegroundColor Red
    exit 1
}

# Verify template exists
if (-not (Test-Path $templatePath)) {
    Write-Host "Error: Template not found at:" -ForegroundColor Red
    Write-Host "  $templatePath" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Creating skill: $SkillName" -ForegroundColor Green
Write-Host "Location: $skillPath" -ForegroundColor Gray
Write-Host ""

# Create main skill directory
try {
    New-Item -ItemType Directory -Path $skillPath -Force | Out-Null
    Write-Host "[✓] Created skill directory" -ForegroundColor Green
} catch {
    Write-Host "[✗] Failed to create skill directory: $_" -ForegroundColor Red
    exit 1
}

# Copy template and replace placeholder
try {
    $templateContent = Get-Content $templatePath -Raw
    $skillContent = $templateContent -replace '<skill-name>', $SkillName
    
    # Convert kebab-case to Title Case for display name
    $titleName = ($SkillName -split '-' | ForEach-Object { 
        $_.Substring(0,1).ToUpper() + $_.Substring(1) 
    }) -join ' '
    $skillContent = $skillContent -replace '<Skill Name>', $titleName
    
    $skillMdPath = Join-Path $skillPath "SKILL.md"
    $skillContent | Out-File -FilePath $skillMdPath -Encoding UTF8 -NoNewline
    Write-Host "[✓] Created SKILL.md from template" -ForegroundColor Green
} catch {
    Write-Host "[✗] Failed to create SKILL.md: $_" -ForegroundColor Red
    Remove-Item -Path $skillPath -Recurse -Force
    exit 1
}

# Create optional directories
$dirsCreated = @()

if ($IncludeScripts) {
    $scriptsPath = Join-Path $skillPath "scripts"
    New-Item -ItemType Directory -Path $scriptsPath -Force | Out-Null
    $dirsCreated += "scripts/"
}

if ($IncludeReferences) {
    $referencesPath = Join-Path $skillPath "references"
    New-Item -ItemType Directory -Path $referencesPath -Force | Out-Null
    $dirsCreated += "references/"
}

if ($IncludeAssets) {
    $assetsPath = Join-Path $skillPath "assets"
    New-Item -ItemType Directory -Path $assetsPath -Force | Out-Null
    $dirsCreated += "assets/"
}

if ($dirsCreated.Count -gt 0) {
    Write-Host "[✓] Created directories: $($dirsCreated -join ', ')" -ForegroundColor Green
}

# Summary
Write-Host ""
Write-Host "=== Skill Created Successfully ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Edit SKILL.md and update the description in frontmatter" -ForegroundColor Gray
Write-Host "  2. Add your skill instructions in the body" -ForegroundColor Gray
Write-Host "  3. Create bundled resources as needed:" -ForegroundColor Gray

if ($IncludeScripts) {
    Write-Host "     - scripts/ for executable code (TypeScript/PowerShell)" -ForegroundColor Gray
}
if ($IncludeReferences) {
    Write-Host "     - references/ for documentation" -ForegroundColor Gray
}
if ($IncludeAssets) {
    Write-Host "     - assets/ for templates and files" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Opening SKILL.md in default editor..." -ForegroundColor Cyan

# Open in default editor
try {
    Start-Process $skillMdPath
    Write-Host "[✓] Editor launched" -ForegroundColor Green
} catch {
    Write-Host "[!] Could not open editor automatically" -ForegroundColor Yellow
    Write-Host "    Open manually: $skillMdPath" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Skill path: $skillPath" -ForegroundColor Cyan
