# ==============================================================
# Script: แปลงแผนการสอน HTML -> DOCX (Microsoft Word)
# ใช้ Word COM Object — ต้องมี Microsoft Word ติดตั้ง
# ผู้เขียน: ครูภาณุพงศ์ อุ่นคำ
# ==============================================================

# ---- Settings ----
$folder = $PSScriptRoot
$outputDir = Join-Path $folder "docx"
$wdFormatXMLDocument = 16   # .docx format

# สร้างโฟลเดอร์ output
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir | Out-Null
    Write-Host "Created output folder: $outputDir" -ForegroundColor Green
}

# ---- เปิด Word ----
Write-Host "`n=== กำลังเปิด Microsoft Word... ===" -ForegroundColor Cyan
try {
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $word.DisplayAlerts = 0  # wdAlertsNone
    Write-Host "เปิด Word สำเร็จ (Version $($word.Version))" -ForegroundColor Green
} catch {
    Write-Host "ERROR: ไม่สามารถเปิด Word ได้: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# ---- หาไฟล์ HTML ทั้งหมด (plan01.html - plan20.html) ----
$htmlFiles = Get-ChildItem -Path $folder -Filter "plan*.html" | Sort-Object Name
Write-Host "`nพบไฟล์ HTML: $($htmlFiles.Count) ไฟล์" -ForegroundColor Yellow

# ---- แปลงทีละไฟล์ ----
$success = 0
$failed = @()

foreach ($htmlFile in $htmlFiles) {
    $outputFile = Join-Path $outputDir ($htmlFile.BaseName + ".docx")
    Write-Host "`n[$($success + 1)/$($htmlFiles.Count)] กำลังแปลง: $($htmlFile.Name)" -ForegroundColor Cyan

    try {
        # เปิด HTML ใน Word
        $doc = $word.Documents.Open(
            $htmlFile.FullName,    # FileName
            $false,                 # ConfirmConversions
            $true,                  # ReadOnly
            $false,                 # AddToRecentFiles
            "",                     # PasswordDocument
            "",                     # PasswordTemplate
            $false                  # Revert
        )

        # บันทึกเป็น .docx
        $doc.SaveAs2(
            $outputFile,            # FileName
            $wdFormatXMLDocument,   # FileFormat (16 = .docx)
            $false,                 # LockComments
            "",                     # Password
            $false,                 # AddToRecentFiles
            "",                     # WritePassword
            $false                  # ReadOnlyRecommended
        )

        $doc.Close($false)
        Write-Host "  -> บันทึกที่: docx\$($htmlFile.BaseName).docx" -ForegroundColor Green
        $success++
    } catch {
        Write-Host "  -> ERROR: $($_.Exception.Message)" -ForegroundColor Red
        $failed += $htmlFile.Name
    }
}

# ---- ปิด Word ----
Write-Host "`n=== ปิด Word ===" -ForegroundColor Cyan
$word.Quit()
[System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
[System.GC]::Collect()
[System.GC]::WaitForPendingFinalizers()

# ---- สรุปผล ----
Write-Host "`n========================================" -ForegroundColor Yellow
Write-Host "  สรุปผลการแปลง" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "สำเร็จ: $success ไฟล์" -ForegroundColor Green
Write-Host "ล้มเหลว: $($failed.Count) ไฟล์" -ForegroundColor $(if ($failed.Count -eq 0) {'Green'} else {'Red'})
if ($failed.Count -gt 0) {
    Write-Host "  ไฟล์ที่ล้มเหลว:" -ForegroundColor Red
    $failed | ForEach-Object { Write-Host "    - $_" -ForegroundColor Red }
}
Write-Host "`nไฟล์ DOCX อยู่ที่: $outputDir" -ForegroundColor Cyan
Write-Host ""
