param(
    [Parameter(Mandatory=$true)]
    [string]$Spec
)

if (-not (Test-Path $Spec)) {
    Write-Host "Error: Specification file not found: $Spec"
    exit 1
}

Write-Host "Validating specification: $Spec"

$content = Get-Content $Spec -Raw
$frontmatterMatch = [regex]::Match($content, '^---\n([\s\S]*?)\n---')

if (-not $frontmatterMatch.Success) {
    Write-Host "Error: Missing frontmatter section"
    exit 1
}

$errors = @()
$warnings = @()

# Parse frontmatter
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

# Validate required fields
$requiredFields = @('title', 'id', 'author', 'status', 'created', 'updated')
foreach ($field in $requiredFields) {
    if (-not $frontmatter.ContainsKey($field)) {
        $errors += "Missing required frontmatter field: $field"
    }
}

# Validate ID format
if ($frontmatter.ContainsKey('id') -and $frontmatter.id -notmatch '^SPEC-\d{4}-\d{2}-\d{2}-\d{3}$') {
    $errors += "Invalid ID format. Expected: SPEC-YYYY-MM-DD-NNN"
}

# Validate status
$validStatuses = @('Draft', 'Review', 'Approved', 'Implemented', 'Deprecated')
if ($frontmatter.ContainsKey('status') -and $frontmatter.status -notin $validStatuses) {
    $errors += "Invalid status. Must be one of: $($validStatuses -join ', ')"
}

# Validate date format
if ($frontmatter.ContainsKey('created') -and $frontmatter.created -notmatch '^\d{4}-\d{2}-\d{2}$') {
    $errors += "Invalid created date format. Expected: YYYY-MM-DD"
}

# Validate body sections
$body = $content.Substring($frontmatterMatch.Length)
$type = if ($frontmatter.ContainsKey('type')) { $frontmatter.type } else { 'feature' }

$requiredSections = switch ($type) {
    'feature' { @('Overview', 'Requirements', 'Design', 'Implementation Plan', 'Acceptance Criteria') }
    'api' { @('Overview', 'Endpoints', 'Data Models', 'Security', 'Testing') }
    'bug' { @('Overview', 'Root Cause Analysis', 'Fix Strategy', 'Verification') }
    default { @('Overview', 'Requirements', 'Acceptance Criteria') }
}

foreach ($section in $requiredSections) {
    if ($body -notmatch [regex]::Escape("## $section")) {
        $errors += "Missing required section: ## $section"
    }
}

# Check acceptance criteria
if ($body -match "## Acceptance Criteria") {
    $acceptanceMatch = [regex]::Match($body, '## Acceptance Criteria([\s\S]*?)(?=## |\Z)')
    if ($acceptanceMatch.Success) {
        $acceptanceContent = $acceptanceMatch.Groups[1].Value
        
        if ($acceptanceContent -notmatch "### Definition of Done") {
            $warnings += "Acceptance Criteria should include 'Definition of Done'"
        }
        
        if ($acceptanceContent -notmatch "### Test Cases") {
            $warnings += "Acceptance Criteria should include 'Test Cases'"
        }
        
        $testCases = [regex]::Matches($acceptanceContent, '\*\*TC-\d+:\*\*')
        if ($testCases.Count -eq 0) {
            $warnings += "Test cases should follow format: **TC-NNN:** Description"
        }
    }
}

# Check requirements
if ($body -match "## Requirements") {
    $requirementsMatch = [regex]::Match($body, '## Requirements([\s\S]*?)(?=## |\Z)')
    if ($requirementsMatch.Success) {
        $requirementsContent = $requirementsMatch.Groups[1].Value
        
        if ($requirementsContent -notmatch "### Functional Requirements") {
            $warnings += "Requirements should include 'Functional Requirements'"
        }
        
        $funcReqs = [regex]::Matches($requirementsContent, '\*\*FR-\d+:\*\*')
        if ($funcReqs.Count -eq 0) {
            $warnings += "Functional requirements should follow format: **FR-NNN:** Description"
        }
    }
}

# Report results
Write-Host "`n=== Specification Validation Report ==="

if ($errors.Count -eq 0 -and $warnings.Count -eq 0) {
    Write-Host "✅ Specification is valid!" -ForegroundColor Green
    exit 0
}

if ($errors.Count -gt 0) {
    Write-Host "`n❌ Errors:" -ForegroundColor Red
    foreach ($error in $errors) {
        Write-Host "   - $error" -ForegroundColor Red
    }
}

if ($warnings.Count -gt 0) {
    Write-Host "`n⚠️  Warnings:" -ForegroundColor Yellow
    foreach ($warning in $warnings) {
        Write-Host "   - $warning" -ForegroundColor Yellow
    }
}

exit $(if ($errors.Count -eq 0) { 0 } else { 1 })
