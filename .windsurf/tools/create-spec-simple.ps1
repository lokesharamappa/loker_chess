param(
    [Parameter(Mandatory=$false)]
    [string]$Type,
    
    [Parameter(Mandatory=$false)]
    [string]$Title,
    
    [Parameter(Mandatory=$false)]
    [string]$Author = "Developer",
    
    [Parameter(Mandatory=$false)]
    [switch]$List
)

$projectRoot = $PSScriptRoot | Split-Path -Parent | Split-Path -Parent
$templatesDir = Join-Path $projectRoot "specs\templates"

if ($List) {
    $specsDir = Join-Path $projectRoot "specs"
    Write-Host "Available Specifications:"
    
    if (Test-Path (Join-Path $specsDir "features")) {
        Write-Host "Features:"
        Get-ChildItem (Join-Path $specsDir "features") -Filter "*.md" | ForEach-Object {
            Write-Host "  $($_.Name)"
        }
    }
    
    if (Test-Path (Join-Path $specsDir "apis")) {
        Write-Host "APIs:"
        Get-ChildItem (Join-Path $specsDir "apis") -Filter "*.md" | ForEach-Object {
            Write-Host "  $($_.Name)"
        }
    }
    
    if (Test-Path (Join-Path $specsDir "bugs")) {
        Write-Host "Bugs:"
        Get-ChildItem (Join-Path $specsDir "bugs") -Filter "*.md" | ForEach-Object {
            Write-Host "  $($_.Name)"
        }
    }
    
    exit 0
}

if (-not $Type -or -not $Title) {
    Write-Host "Usage: .\create-spec-simple.ps1 -Type <type> -Title <title> [-Author <author>]"
    Write-Host "Types: feature, api, bug, refactor"
    Write-Host "Example: .\create-spec-simple.ps1 -Type feature -Title 'User Authentication'"
    exit 1
}

$templatePath = Join-Path $templatesDir "$Type.md"
if (-not (Test-Path $templatePath)) {
    Write-Host "Error: Template not found for type: $Type"
    exit 1
}

$today = Get-Date -Format "yyyy-MM-dd"
$random = Get-Random -Minimum 0 -Maximum 999 | ForEach-Object { $_.ToString("000") }
$prefix = switch ($Type) {
    "api" { "SPEC-API" }
    "bug" { "SPEC-BUG" }
    "refactor" { "SPEC-REF" }
    default { "SPEC" }
}
$specId = "$prefix-$today-$random"

$template = Get-Content $templatePath -Raw
$template = $template -replace '\[Feature Name\]', $Title
$template = $template -replace '\[API Name\]', $Title
$template = $template -replace '\[Bug Fix Title\]', $Title
$template = $template -replace '\[Author Name\]', $Author
$template = $template -replace 'SPEC-2026-03-30-001', $specId
$template = $template -replace 'SPEC-API-2026-03-30-001', $specId
$template = $template -replace 'SPEC-BUG-2026-03-30-001', $specId
$template = $template -replace '2026-03-30', $today

$specsDir = Join-Path $projectRoot "specs\$($Type)s"
if (-not (Test-Path $specsDir)) {
    New-Item -ItemType Directory -Path $specsDir -Force | Out-Null
}

$slug = $Title.ToLower() -replace '[^a-z0-9\s-]', '' -replace '\s+', '-' -replace '-+', '-'
$slug = $slug -replace '^-|-$', ''
$filename = "$specId-$slug.md"
$filePath = Join-Path $specsDir $filename

Set-Content $filePath $template -NoNewline

Write-Host "Specification created: $filePath"
Write-Host "ID: $specId"
Write-Host "Author: $Author"
Write-Host "Created: $today"
