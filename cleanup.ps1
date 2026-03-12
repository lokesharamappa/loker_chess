# Trading Journal Pro - Complete Cleanup Script
# Run this script to remove all traces of the Trading Journal app

Write-Host "Trading Journal Pro - Complete Cleanup" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green

# 1. Remove Python packages
Write-Host "Removing Python packages..." -ForegroundColor Blue
try {
    pip uninstall -y trading-journal pytest coverage ruff mypy pre-commit streamlit plotly pandas numpy kiteconnect dhanhq 2>$null
} catch {
    Write-Host "Some Python packages not found or already removed" -ForegroundColor Yellow
}

# 2. Remove SSH keys if generated
Write-Host "Removing SSH keys..." -ForegroundColor Blue
if (Test-Path "$env:USERPROFILE\.ssh\id_ed25519") {
    Remove-Item -Force "$env:USERPROFILE\.ssh\id_ed25519"
    Write-Host "SSH private key removed" -ForegroundColor Green
}
if (Test-Path "$env:USERPROFILE\.ssh\id_ed25519.pub") {
    Remove-Item -Force "$env:USERPROFILE\.ssh\id_ed25519.pub"
    Write-Host "SSH public key removed" -ForegroundColor Green
}

# 3. Clear Git credentials
Write-Host "Clearing Git credentials..." -ForegroundColor Blue
try {
    git config --global --unset credential.helper 2>$null
} catch {
    Write-Host "Git credential helper not found" -ForegroundColor Yellow
}

# 4. Remove any remaining trading-related files
Write-Host "Checking for remaining trading-related files..." -ForegroundColor Blue
$remainingFiles = Get-ChildItem -Path . -Name "*trading*" -Recurse -ErrorAction SilentlyContinue
if ($remainingFiles) {
    Write-Host "Found remaining files:" -ForegroundColor Yellow
    $remainingFiles
    $confirm = Read-Host "Remove these files? (y/n)"
    if ($confirm -eq 'y' -or $confirm -eq 'Y') {
        $remainingFiles | Remove-Item -Force -Recurse -ErrorAction SilentlyContinue
        Write-Host "Remaining files removed" -ForegroundColor Green
    }
} else {
    Write-Host "No remaining trading-related files found" -ForegroundColor Green
}

# 5. Check for Docker images
Write-Host "Checking for Docker images..." -ForegroundColor Blue
try {
    $dockerImages = docker images --format "table {{.Repository}}:{{.Tag}}" | findstr trading-journal
    if ($dockerImages) {
        Write-Host "Found Docker images:" -ForegroundColor Yellow
        $dockerImages
        $confirm = Read-Host "Remove these Docker images? (y/n)"
        if ($confirm -eq 'y' -or $confirm -eq 'Y') {
            docker rmi $(docker images --format "{{.Repository}}:{{.Tag}}" | findstr trading-journal) 2>$null
            Write-Host "Docker images removed" -ForegroundColor Green
        }
    } else {
        Write-Host "No trading-journal Docker images found" -ForegroundColor Green
    }
} catch {
    Write-Host "Docker not available or no images found" -ForegroundColor Yellow
}

# 6. Reset Git configuration (optional)
Write-Host "Git configuration:" -ForegroundColor Blue
$gitEmail = git config --global user.email
$gitName = git config --global user.name
Write-Host "Current Git email: $gitEmail" -ForegroundColor White
Write-Host "Current Git name: $gitName" -ForegroundColor White

if ($gitEmail -eq "r.lokesha@gmail.com") {
    $resetGit = Read-Host "Reset Git configuration? (y/n)"
    if ($resetGit -eq 'y' -or $resetGit -eq 'Y') {
        $newEmail = Read-Host "Enter your email"
        $newName = Read-Host "Enter your name"
        git config --global user.email $newEmail
        git config --global user.name $newName
        Write-Host "Git configuration reset" -ForegroundColor Green
    }
}

# 7. Cleanup verification
Write-Host "Cleanup verification:" -ForegroundColor Blue
Write-Host "Main directory removed: $(-not (Test-Path "trading_journal"))" -ForegroundColor Green
Write-Host "Python packages cleaned" -ForegroundColor Green
Write-Host "SSH keys removed" -ForegroundColor Green
Write-Host "Git credentials cleared" -ForegroundColor Green

Write-Host ""
Write-Host "Cleanup completed!" -ForegroundColor Green
Write-Host "Your system is now clean of Trading Journal Pro installations." -ForegroundColor Green
Write-Host ""
Write-Host "Note: Your code remains on GitHub if you want to access it again:" -ForegroundColor Yellow
Write-Host "https://github.com/lokesharamappa/trading-journal-pro" -ForegroundColor Cyan
Write-Host ""
Write-Host "To restore your original Git configuration:" -ForegroundColor Blue
Write-Host "git config --global user.email 'your.email@gmail.com'" -ForegroundColor Gray
Write-Host "git config --global user.name 'Your Name'" -ForegroundColor Gray
