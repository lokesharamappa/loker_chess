#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Validate specification format and completeness.

.DESCRIPTION
    Validates that a specification document follows the required format
    and contains all necessary sections and fields.

.PARAMETER Spec
    Path to the specification file to validate.

.EXAMPLE
    .\validate-spec.ps1 -Spec "specs\features\SPEC-2026-03-30-001-user-authentication.md"
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$Spec
)

class SpecificationValidator {
    [string[]]$Errors = @()
    [string[]]$Warnings = @()

    [bool]Validate([string]$specPath) {
        Write-Host "Validating specification: $specPath"
        
        if (-not (Test-Path $specPath)) {
            $this.Errors += "Specification file not found: $specPath"
            return $this.Report()
        }

        $content = Get-Content $specPath -Raw
        
        # Parse frontmatter
        $frontmatterMatch = [regex]::Match($content, '^---\n([\s\S]*?)\n---')
        if (-not $frontmatterMatch.Success) {
            $this.Errors += "Missing frontmatter section"
            return $this.Report()
        }

        try {
            $frontmatter = $this.ParseFrontmatter($frontmatterMatch.Groups[1].Value)
            $this.ValidateFrontmatter($frontmatter)
            
            $body = $content.Substring($frontmatterMatch.Length)
            $type = if ($frontmatter.ContainsKey('type')) { $frontmatter.type } else { 'feature' }
            $this.ValidateBody($body, $type)
            
        } catch {
            $this.Errors += "Invalid frontmatter format: $($_.Exception.Message)"
            return $this.Report()
        }

        return $this.Report()
    }

    [hashtable]ParseFrontmatter([string]$frontmatterText) {
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
        
        return $frontmatter
    }

    [void]ValidateFrontmatter([hashtable]$frontmatter) {
        $requiredFields = @('title', 'id', 'author', 'status', 'created', 'updated')
        
        foreach ($field in $requiredFields) {
            if (-not $frontmatter.ContainsKey($field)) {
                $this.Errors += "Missing required frontmatter field: $field"
            }
        }

        # Validate ID format
        if ($frontmatter.ContainsKey('id') -and $frontmatter.id -notmatch '^SPEC-\d{4}-\d{2}-\d{2}-\d{3}$') {
            $this.Errors += "Invalid ID format. Expected: SPEC-YYYY-MM-DD-NNN"
        }

        # Validate status
        $validStatuses = @('Draft', 'Review', 'Approved', 'Implemented', 'Deprecated')
        if ($frontmatter.ContainsKey('status') -and $frontmatter.status -notin $validStatuses) {
            $this.Errors += "Invalid status. Must be one of: $($validStatuses -join ', ')"
        }

        # Validate date format
        if ($frontmatter.ContainsKey('created') -and $frontmatter.created -notmatch '^\d{4}-\d{2}-\d{2}$') {
            $this.Errors += "Invalid created date format. Expected: YYYY-MM-DD"
        }
    }

    [void]ValidateBody([string]$body, [string]$type) {
        $requiredSections = $this.GetRequiredSections($type)
        
        foreach ($section in $requiredSections) {
            if ($body -notmatch [regex]::Escape("## $section")) {
                $this.Errors += "Missing required section: ## $section"
            }
        }

        # Validate acceptance criteria
        if ($body -match "## Acceptance Criteria") {
            $this.ValidateAcceptanceCriteria($body)
        }

        # Validate requirements
        if ($body -match "## Requirements") {
            $this.ValidateRequirements($body)
        }
    }

    [string[]]GetRequiredSections([string]$type) {
        $commonSections = @('Overview', 'Requirements', 'Acceptance Criteria')
        
        $result = switch ($type) {
            'feature' { 
                $commonSections + @('Design', 'Implementation Plan')
            }
            'api' { 
                @('Overview', 'Endpoints', 'Data Models', 'Security', 'Testing')
            }
            'bug' { 
                @('Overview', 'Root Cause Analysis', 'Fix Strategy', 'Verification')
            }
            default { 
                $commonSections
            }
        }
        
        return $result
    }

    [void]ValidateAcceptanceCriteria([string]$body) {
        $acceptanceMatch = [regex]::Match($body, '## Acceptance Criteria([\s\S]*?)(?=## |\Z)')
        if (-not $acceptanceMatch.Success) { return }

        $content = $acceptanceMatch.Groups[1].Value
        
        # Check for Definition of Done
        if ($content -notmatch "### Definition of Done") {
            $this.Warnings += "Acceptance Criteria should include 'Definition of Done'"
        }

        # Check for Test Cases
        if ($content -notmatch "### Test Cases") {
            $this.Warnings += "Acceptance Criteria should include 'Test Cases'"
        }

        # Validate test case format
        $testCases = [regex]::Matches($content, '\*\*TC-\d+:\*\*')
        if ($testCases.Count -eq 0) {
            $this.Warnings += "Test cases should follow format: **TC-NNN:** Description"
        }
    }

    [void]ValidateRequirements([string]$body) {
        $requirementsMatch = [regex]::Match($body, '## Requirements([\s\S]*?)(?=## |\Z)')
        if (-not $requirementsMatch.Success) { return }

        $content = $requirementsMatch.Groups[1].Value
        
        # Check for functional requirements
        if ($content -notmatch "### Functional Requirements") {
            $this.Warnings += "Requirements should include 'Functional Requirements'"
        }

        # Validate requirement format
        $funcReqs = [regex]::Matches($content, '\*\*FR-\d+:\*\*')
        if ($funcReqs.Count -eq 0) {
            $this.Warnings += "Functional requirements should follow format: **FR-NNN:** Description"
        }
    }

    [bool]Report() {
        Write-Host "`n=== Specification Validation Report ==="
        
        if ($this.Errors.Count -eq 0 -and $this.Warnings.Count -eq 0) {
            Write-Host "✅ Specification is valid!" -ForegroundColor Green
            return $true
        }

        if ($this.Errors.Count -gt 0) {
            Write-Host "`n❌ Errors:" -ForegroundColor Red
            foreach ($errorMessage in $this.Errors) {
                Write-Host "   - $errorMessage" -ForegroundColor Red
            }
        }

        if ($this.Warnings.Count -gt 0) {
            Write-Host "`n⚠️  Warnings:" -ForegroundColor Yellow
            foreach ($warning in $this.Warnings) {
                Write-Host "   - $warning" -ForegroundColor Yellow
            }
        }

        return $this.Errors.Count -eq 0
    }
}

# Main execution
$validator = [SpecificationValidator]::new()
$isValid = $validator.Validate($Spec)

exit $(if ($isValid) { 0 } else { 1 })
