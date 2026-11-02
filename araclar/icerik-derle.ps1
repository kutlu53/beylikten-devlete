# content/*.json dosyalarindan tarayicinin dosya sisteminden (file://) acilabilmesi icin
# yedek .js kopyalarini uretir. JSON'u duzenledikten sonra bu betigi calistirin:
#   powershell -ExecutionPolicy Bypass -File araclar\icerik-derle.ps1
$kok = Split-Path -Parent $PSScriptRoot
Get-ChildItem (Join-Path $kok "content") -Filter *.json | ForEach-Object {
    $ad = $_.BaseName                      # bolum1
    # Turkce yerel ayarda "i" -> "I" sorununu onlemek icin kulturden bagimsiz buyuk harf ve buyuk/kucuk harfe duyarli regex kullanilir
    $anahtar = "ICERIK_" + [regex]::Replace($ad.ToUpperInvariant(), "[^A-Z0-9]", "_")   # ICERIK_BOLUM1, ICERIK_UNITE10_2
    $json = Get-Content $_.FullName -Raw -Encoding UTF8
    # Not: ConvertFrom-Json anahtarlari buyuk/kucuk harf duyarsiz okur; "T" ile "t" gibi anahtarlar uyari verir, bu bir hata degildir.
    try { $null = $json | ConvertFrom-Json } catch { if ("$_" -notmatch "duplicated keys") { Write-Error "$($_.Name) gecerli JSON degil: $_"; return } }
    $hedef = Join-Path $_.DirectoryName ($ad + ".js")
    $icerik = "/* OTOMATIK URETILDI: $($_.Name) dosyasini duzenleyin, sonra araclar/icerik-derle.ps1 calistirin. */`nwindow.$anahtar = " + $json.TrimEnd() + ";`n"
    [System.IO.File]::WriteAllText($hedef, $icerik, (New-Object System.Text.UTF8Encoding $false))
    Write-Host "Uretildi: $hedef"
}
