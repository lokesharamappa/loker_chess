# Trading Journal Pro - Complete Cleanup Guide

## 🧹 What to Remove

### 1. Python Packages
```powershell
# Remove all Trading Journal related Python packages
pip uninstall -y trading-journal pytest coverage ruff mypy pre-commit streamlit plotly pandas numpy kiteconnect dhanhq

# Remove virtual environment if created
# Delete any venv/ or env/ folders in your project directory
```

### 2. Git Configuration (Optional)
```powershell
# Remove Git global configuration for Trading Journal
git config --global --unset user.email
git config --global --unset user.name

# Or reset to original values
git config --global user.email "your.original.email@gmail.com"
git config --global user.name "Your Original Name"
```

### 3. SSH Keys (Optional)
```powershell
# Remove SSH keys if generated for this project
Remove-Item -Force $env:USERPROFILE\.ssh\id_ed25519
Remove-Item -Force $env:USERPROFILE\.ssh\id_ed25519.pub
```

### 4. Git Credentials
```powershell
# Clear Git credentials manager
git config --global --unset credential.helper
# Or in Windows Credential Manager, remove GitHub credentials
```

### 5. Docker Images (If installed)
```powershell
# Remove Docker images if created
docker rmi trading-journal-pro/user-service
docker rmi trading-journal-pro/trading-service
docker rmi trading-journal-pro/portfolio-service
docker rmi trading-journal-pro/analytics-service
docker rmi trading-journal-pro/risk-service
docker rmi trading-journal-pro/frontend
docker rmi trading-journal-pro/api-gateway
```

### 6. Browser Data
- **GitHub**: Remove repository from your account
- **GitHub Settings**: Remove Personal Access Token
- **Browser**: Clear any saved passwords for GitHub

### 7. Local Files
```powershell
# The main trading_journal directory has already been removed
# Check for any remaining files:
Get-ChildItem -Path . -Name "*trading*" -Recurse
```

### 8. Environment Variables
```powershell
# Remove any environment variables set for Trading Journal
# Check: System Properties > Advanced > Environment Variables
```

### 9. Windows Services (If any)
```powershell
# Check for any services related to Trading Journal
Get-Service | Where-Object {$_.Name -like "*trading*"}
```

### 10. Registry Entries (Advanced)
```powershell
# Only if you installed any Windows software
# Open Registry Editor and search for "trading-journal"
reg delete "HKCU\Software\trading-journal" /f 2>$null
```

## 🗂️ Files Already Removed
✅ `C:\Users\Lokesha_Ramappa\CascadeProjects\windsurf-project\trading_journal\` - Main project directory

## 🧪 Verify Cleanup

### Check Python Packages
```powershell
pip list | findstr trading
```

### Check Git Configuration
```powershell
git config --global --list
```

### Check SSH Keys
```powershell
Get-ChildItem $env:USERPROFILE\.ssh\
```

### Check Docker Images
```powershell
docker images | findstr trading-journal
```

## 🔄 Restore Original State

### Git Configuration
```powershell
# Set back to your original configuration
git config --global user.email "your.email@gmail.com"
git config --global user.name "Your Name"
git config --global init.defaultBranch main
```

### Python Environment
```powershell
# Create fresh virtual environment if needed
python -m venv clean_env
.\clean_env\Scripts\Activate
pip install --upgrade pip
```

## 📋 Cleanup Checklist

- [x] Main project directory removed
- [ ] Python packages uninstalled
- [ ] Git configuration reset
- [ ] SSH keys removed (optional)
- [ ] GitHub repository deleted (optional)
- [ ] Docker images removed (if used)
- [ ] Browser data cleared
- [ ] Environment variables removed
- [ ] Registry entries cleaned (if any)

## 🎯 Complete Cleanup Command

Run this in PowerShell to clean most items:

```powershell
# Remove Python packages
pip uninstall -y trading-journal pytest coverage ruff mypy pre-commit streamlit plotly pandas numpy 2>$null

# Remove SSH keys
Remove-Item -Force $env:USERPROFILE\.ssh\id_ed25519 -ErrorAction SilentlyContinue
Remove-Item -Force $env:USERPROFILE\.ssh\id_ed25519.pub -ErrorAction SilentlyContinue

# Clear Git credentials
git config --global --unset credential.helper -ErrorAction SilentlyContinue

# Remove any remaining trading-related files
Get-ChildItem -Path . -Name "*trading*" -Recurse -ErrorAction SilentlyContinue | Remove-Item -Force -Recurse -ErrorAction SilentlyContinue

Write-Host "Cleanup completed!" -ForegroundColor Green
```

## 🚀 After Cleanup

Your system should now be clean of all Trading Journal Pro installations. Your original development environment is restored and ready for new projects.

**Note**: Your code remains safely on GitHub at https://github.com/lokesharamappa/trading-journal-pro if you ever want to access it again.
