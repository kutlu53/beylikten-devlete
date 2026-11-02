# Beylikten Devlete oyununu GitHub'a gonderir ve GitHub Pages'i acar.
# Calistirmak icin: dosyaya sag tiklayin -> "PowerShell ile calistir"
# ya da terminalde: powershell -ExecutionPolicy Bypass -File araclar\github-yayinla.ps1

$ErrorActionPreference = "Stop"
$depo = "kutlu53/beylikten-devlete"
$kok = Split-Path -Parent $PSScriptRoot
Set-Location $kok

Write-Host "1/3 Depo olusturuluyor ve kod gonderiliyor..."
$varMi = (gh repo view $depo 2>$null)
if ($LASTEXITCODE -eq 0) {
  Write-Host "    Depo zaten var, yalnizca push yapiliyor."
  if (-not (git remote | Select-String -Quiet "^origin$")) { git remote add origin "https://github.com/$depo.git" }
  git push -u origin main
} else {
  gh repo create $depo --public --source=. --remote=origin --push --description "Beylikten Devlete: 10. sinif Tarih 2. unite (Osmanli 1299-1453) icin tarayicida sunucusuz calisan egitsel oyun"
}

Write-Host "2/3 GitHub Pages aciliyor..."
gh api -X POST "repos/$depo/pages" -f "source[branch]=main" -f "source[path]=/" 2>$null
if ($LASTEXITCODE -ne 0) { Write-Host "    Pages zaten acik ya da birazdan acilacak." }

Write-Host "3/3 Tamam. Site 1-3 dakika icinde su adreste acilir:"
Write-Host "    https://kutlu53.github.io/beylikten-devlete/"
Start-Process "https://github.com/$depo"
Read-Host "Kapatmak icin Enter'a basin"
