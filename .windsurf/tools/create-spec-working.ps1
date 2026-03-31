#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Create a new specification document from template.

.DESCRIPTION
    Creates a new specification document based on the specified type and title.
    Supports feature, api, bug, and refactor specification types.

.PARAMETER Type
    The type of specification (feature, api, bug, refactor).

.PARAMETER Title
    The title of the specification.

.PARAMETER Author
    The author name (optional, defaults to "Developer").

.PARAMETER List
    List all existing specifications.

.EXAMPLE
    .\create-spec-working.ps1 -Type feature -Title "User Authentication"
    .\create-spec-working.ps1 -Type api -Title "User API" -Author "John Doe"
    .\create-spec-working.ps1 -List
#>

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("feature", "api", "bug", "refactor")]
    [string]$Type,
    
    [Parameter(Mandatory=$false)]
    [string]$Title,
    
    [Parameter(Mandatory=$false)]
    [string]$Author = "Developer",
    
    [Parameter(Mandatory=$false)]
    [switch]$List
)

class SpecificationCreator {
    [string]$TemplatesDir
    [string]$ProjectRoot

    SpecificationCreator() {
        $this.ProjectRoot = $PSScriptRoot | Split-Path -Parent | Split-Path -Parent
        $this.TemplatesDir = Join-Path $this.ProjectRoot "specs\templates"
    }

    [void]Create([string]$type, [string]$title, [string]$author) {
        if (-not $type -or -not $title) {
            Write-Error "Error: Type and Title are required"
            exit 1
        }

        $templatePath = Join-Path $this.TemplatesDir "$type.md"
        
        if (-not (Test-Path $templatePath)) {
            Write-Error "Error: Template not found for type: $type"
            Write-Host "Available types: $($this.GetAvailableTypes() -join ', ')"
            exit 1
        }

        $specId = $this.GenerateSpecId($type)
        $today = Get-Date -Format "yyyy-MM-dd"
        
        $template = Get-Content $templatePath -Raw
        
        # Replace template variables
        $template = $template -replace '\[Feature Name\]', $title
        $template = $template -replace '\[API Name\]', $title
        $template = $template -replace '\[Bug Fix Title\]', $title
        $template = $template -replace '\[Author Name\]', $author
        $template = $template -replace 'SPEC-2026-03-30-001', $specId
        $template = $template -replace 'SPEC-API-2026-03-30-001', $specId
        $template = $template -replace 'SPEC-BUG-2026-03-30-001', $specId
        $template = $template -replace '2026-03-30', $today

        $specsDir = Join-Path $this.ProjectRoot "specs\$($type)s"
        if (-not (Test-Path $specsDir)) {
            New-Item -ItemType Directory -Path $specsDir -Force | Out-Null
        }

        $filename = "$specId-$($this.Slugify($title)).md"
        $filePath = Join-Path $specsDir $filename
        
        Set-Content $filePath $template -NoNewline
        
        Write-Host "Specification created: $filePath"
        Write-Host "ID: $specId"
        Write-Host "Author: $author"
        Write-Host "Created: $today"
    }

    [string]GenerateSpecId([string]$type) {
        $date = Get-Date -Format "yyyy-MM-dd"
        $random = Get-Random -Minimum 0 -Maximum 999 | ForEach-Object { $_.ToString("000") }
        
        $prefix = switch ($type) {
            "api" { "SPEC-API" }
            "bug" { "SPEC-BUG" }
            "refactor" { "SPEC-REF" }
            default { "SPEC" }
        }
        
        return "$prefix-$date-$random"
    }

    [string]Slugify([string]$text) {
        $slug = $text.ToLower() -replace '[^a-z0-9\s-]', '' -replace '\s+', '-' -replace '-+', '-'
        $cleanSlug = $slug -replace '^-|-$', ''
        return $cleanSlug
    }

    [string[]]GetAvailableTypes() {
        if (-not (Test-Path $this.TemplatesDir)) {
            return @()
        }
        
        return Get-ChildItem $this.TemplatesDir -Filter "*.md" | 
               Select-Object -ExpandProperty BaseName
    }

    [void]List() {
        $specsDir = Join-Path $this.ProjectRoot "specs"
        
        if (-not (Test-Path $specsDir)) {
            Write-Host "No specifications found."
            return
        }

        Write-Host "Available Specifications:"
        Write-Host ""

        $types = @("features", "apis", "bugs", "refactors")
        
        foreach ($type in $types) {
            $typeDir = Join-Path $specsDir $type
            if (Test-Path $typeDir) {
                $files = Get-ChildItem $typeDir -Filter "*.md"
                
                if ($files.Count -gt 0) {
                    $typeName = $type.Substring(0, 1).ToUpper() + $type.Substring(1, $type.Length - 2)
                    Write-Host "$typeName`:"
                    
                    foreach ($file in $files) {
                        $filePath = Join-Path $typeDir $file
                        $content = Get-Content $filePath -Raw
                        $titleMatch = [regex]::Match($content, 'title:\s*"([^"]+)"')
                        $title = if ($titleMatch.Success) { $titleMatch.Groups[1].Value } else { $file.Name }
                        Write-Host "   $($file.Name) - $title"
                    }
                    Write-Host ""
                }
            }
        }
    }
}

# Main execution
$creator = [SpecificationCreator]::new()

if ($List) {
    $creator.List()
} elseif ($Type -and $Title) {
    $creator.Create($Type, $Title, $Author)
} else {
    Write-Host "Usage: .\create-spec-working.ps1 [parameters]"
    Write-Host ""
    Write-Host "Parameters:"
    Write-Host "  -Type type       Specification type (feature, api, bug, refactor)"
    Write-Host "  -Title title     Specification title"
    Write-Host "  -Author author   Author name (optional, defaults to 'Developer')"
    Write-Host "  -List            List all specifications"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  .\create-spec-working.ps1 -Type feature -Title 'User Authentication'"
    Write-Host "  .\create-spec-working.ps1 -Type api -Title 'User API' -Author 'John Doe'"
    Write-Host "  .\create-spec-working.ps1 -List"
    exit 1
}
