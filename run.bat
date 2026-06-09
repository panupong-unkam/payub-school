@echo off
chcp 65001 > nul
title 🌐 เว็บไซต์ครูภาณุพงศ์ — Local Server
color 0A

echo.
echo  ╔══════════════════════════════════════════╗
echo  ║   🌐  เว็บไซต์โรงเรียนบ้านป่ายุบ         ║
echo  ║   Local Server — กำลังเริ่มต้น...        ║
echo  ╚══════════════════════════════════════════╝
echo.

:: ── ไปที่โฟลเดอร์นี้ก่อน ──
cd /d "%~dp0"

:: ── ลอง Python 3 ก่อน ──
python --version > nul 2>&1
if %errorlevel% == 0 (
    echo  ✅ พบ Python — เริ่มเซิร์ฟเวอร์ที่ http://localhost:3000
    echo  📌 กด Ctrl+C เพื่อหยุดเซิร์ฟเวอร์
    echo.
    start "" "http://localhost:3000"
    python -m http.server 3000
    goto :end
)

:: ── ลอง Python3 ──
python3 --version > nul 2>&1
if %errorlevel% == 0 (
    echo  ✅ พบ Python3 — เริ่มเซิร์ฟเวอร์ที่ http://localhost:3000
    echo  📌 กด Ctrl+C เพื่อหยุดเซิร์ฟเวอร์
    echo.
    start "" "http://localhost:3000"
    python3 -m http.server 3000
    goto :end
)

:: ── ลอง Node.js / npx serve ──
node --version > nul 2>&1
if %errorlevel% == 0 (
    echo  ✅ พบ Node.js — กำลังใช้ npx serve...
    echo  📌 กด Ctrl+C เพื่อหยุดเซิร์ฟเวอร์
    echo.
    npx serve -p 3000 .
    goto :end
)

:: ── ไม่พบทั้งคู่ — เปิดตรงๆ ──
echo  ⚠️  ไม่พบ Python หรือ Node.js
echo  📂 เปิดไฟล์ index.html โดยตรง...
echo  (ฟีเจอร์บางอย่างอาจใช้งานไม่ได้หากไม่มี server)
echo.
start "" "index.html"

:end
echo.
pause
