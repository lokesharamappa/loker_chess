#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Generate test cases from specification document.

.DESCRIPTION
    Generates test cases based on the specification document's requirements
    and acceptance criteria.

.PARAMETER Spec
    Path to the specification file to generate tests from.

.EXAMPLE
    .\generate-tests-fixed.ps1 -Spec "specs\features\SPEC-2026-03-30-001-user-authentication.md"
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$Spec
)

if (-not (Test-Path $Spec)) {
    Write-Error "Specification file not found: $Spec"
    exit 1
}

Write-Host "Generating tests for specification: $Spec"

$content = Get-Content $Spec -Raw

# Parse frontmatter
$frontmatterMatch = [regex]::Match($content, '^---\n([\s\S]*?)\n---')
if (-not $frontmatterMatch.Success) {
    Write-Error "Invalid specification format: missing frontmatter"
    exit 1
}

$frontmatterText = $frontmatterMatch.Groups[1].Value
$frontmatter = @{}
$lines = $frontmatterText -split "`n"

foreach ($line in $lines) {
    $match = [regex]::Match($line, '^(\w+):\s*(.+)$')
    if ($match.Success) {
        $key = $match.Groups[1].Value
        $value = $match.Groups[2].Value -replace '^["'']|["'']$'
        $frontmatter[$key] = $value
    }
}

$title = if ($frontmatter.ContainsKey('title')) { $frontmatter.title } else { 'Unknown' }
$specId = if ($frontmatter.ContainsKey('id')) { $frontmatter.id } else { 'SPEC-UNKNOWN' }
$type = if ($frontmatter.ContainsKey('type')) { $frontmatter.type } else { 'feature' }

# Extract test cases
$testCases = @()
$testCaseRegex = [regex]::Matches($content, '\*\*TC-(\d+):\*\* ([^\n]+)\n([\s\S]*?)(?=\*\*TC-\d+:|\*\*Performance|\*\*Rollback|###|\Z)')

foreach ($match in $testCaseRegex) {
    $number = $match.Groups[1].Value
    $description = $match.Groups[2].Value
    $details = $match.Groups[3].Value
    
    $givenMatch = [regex]::Match($details, '\*\*Given:\*\* ([^\n]+)')
    $whenMatch = [regex]::Match($details, '\*\*When:\*\* ([^\n]+)')
    $thenMatch = [regex]::Match($details, '\*\*Then:\*\* ([^\n]+)')
    
    $testCase = @{
        number = [int]$number
        description = $description
        given = if ($givenMatch.Success) { $givenMatch.Groups[1].Value } else { '' }
        when = if ($whenMatch.Success) { $whenMatch.Groups[1].Value } else { '' }
        then = if ($thenMatch.Success) { $thenMatch.Groups[1].Value } else { '' }
    }
    
    $testCases += $testCase
}

# Extract requirements
$requirements = @()
$reqRegex = [regex]::Matches($content, '\*\*(FR|NFR)-(\d+):\*\* ([^\n]+)')

foreach ($match in $reqRegex) {
    $reqType = $match.Groups[1].Value
    $number = $match.Groups[2].Value
    $description = $match.Groups[3].Value
    
    $requirement = @{
        type = $reqType
        number = [int]$number
        description = $description
    }
    
    $requirements += $requirement
}

# Generate test file
$testContent = $this.GenerateTestFile($title, $specId, $type, $testCases, $requirements)

# Determine test file path
$testsDir = Join-Path (Split-Path (Split-Path $Spec -Parent) -Parent) "tests"
if (-not (Test-Path $testsDir)) {
    New-Item -ItemType Directory -Path $testsDir -Force | Out-Null
}

$slug = $title.ToLower() -replace '[^a-z0-9\s-]', '' -replace '\s+', '-' -replace '-+', '-'
$slug = $slug -replace '^-|-$', ''
$filename = "test_$slug.ps1"
$testPath = Join-Path $testsDir $filename

Set-Content $testPath $testContent -NoNewline

Write-Host "Tests generated: $testPath"
Write-Host "Generated $($testCases.Count) test cases"

[string]GenerateTestFile([string]$title, [string]$specId, [string]$type, [array]$testCases, [array]$requirements) {
    $content = @"
# Test suite for $title
# Generated from specification: $specId
# Type: $type

Describe "$title" {
"@

    # Generate tests for functional requirements
    $funcReqs = $requirements | Where-Object { $_.type -eq 'FR' }
    foreach ($req in $funcReqs) {
        $content += @"

    It "should implement functional requirement FR-$($req.number): $($req.description)" {
        # TODO: Implement test for FR-$($req.number)
        # $($req.description)
        `$true | Should -Be `$true  # Placeholder
    }
"@
    }

    # Generate tests for test cases
    foreach ($testCase in $testCases) {
        $content += @"

    It "should $($testCase.description.ToLower())" {
        # Given: $($testCase.given)
        # When: $($testCase.when)
        # Then: $($testCase.then)
        
        # TODO: Implement test case TC-$($testCase.number)
        `$true | Should -Be `$true  # Placeholder
    }
"@
    }

    $content += @"

}
"@

    return $content
}
