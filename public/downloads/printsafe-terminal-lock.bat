@echo off
setlocal EnableDelayedExpansion
title PrintSafe - Terminal Security Setup

echo ============================================================
echo      PrintSafe - Secure Print Terminal Setup (Windows)
echo ============================================================
echo.

:: 1. Verify Administrative Privileges
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] This script must be run as Administrator!
    echo.
    echo Please right-click this file and select:
    echo    "Run as administrator"
    echo.
    pause
    exit /b 1
)

echo [1/3] Applying security policies to Google Chrome...
reg add "HKLM\SOFTWARE\Policies\Google\Chrome" /v DisablePrintToPDF /t REG_DWORD /d 1 /f >nul 2>&1
reg add "HKLM\SOFTWARE\Policies\Google\Chrome\PrinterTypeDenyList" /v 1 /t REG_SZ /d "pdf" /f >nul 2>&1
echo       - Google Chrome: "Save as PDF" disabled.

echo [2/3] Applying security policies to Microsoft Edge...
reg add "HKLM\SOFTWARE\Policies\Microsoft\Edge" /v DisablePrintToPDF /t REG_DWORD /d 1 /f >nul 2>&1
reg add "HKLM\SOFTWARE\Policies\Microsoft\Edge\PrinterTypeDenyList" /v 1 /t REG_SZ /d "pdf" /f >nul 2>&1
echo       - Microsoft Edge: "Save as PDF" disabled.

echo [3/3] Applying security policies to Brave Browser...
reg add "HKLM\SOFTWARE\Policies\BraveSoftware\Brave" /v DisablePrintToPDF /t REG_DWORD /d 1 /f >nul 2>&1
reg add "HKLM\SOFTWARE\Policies\BraveSoftware\Brave\PrinterTypeDenyList" /v 1 /t REG_SZ /d "pdf" /f >nul 2>&1
echo       - Brave Browser: "Save as PDF" disabled.

:: Optional: Disable OS-level Microsoft Print to PDF driver
echo.
echo [Optional] Disabling OS-level "Microsoft Print to PDF" printer...
dism /online /disable-feature /featurename:Printing-PrintToPDFServices-Features /norestart >nul 2>&1
if %errorLevel% equ 0 (
    echo       - Windows "Microsoft Print to PDF" virtual printer disabled.
) else (
    echo       - Windows virtual printer check completed.
)

echo.
echo ============================================================
echo [SUCCESS] PrintSafe Terminal Security Policies Applied!
echo.
echo IMPORTANT: Please CLOSE and RESTART your browser (Chrome/Edge)
echo for the changes to take full effect.
echo ============================================================
echo.
pause
