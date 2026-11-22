@echo off
setlocal EnableDelayedExpansion
title PrintSafe - Terminal Security Revert

echo ============================================================
echo      PrintSafe - Restore Standard Printing (Windows)
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

echo [1/3] Restoring Google Chrome print options...
reg delete "HKLM\SOFTWARE\Policies\Google\Chrome" /v DisablePrintToPDF /f >nul 2>&1
reg delete "HKLM\SOFTWARE\Policies\Google\Chrome\PrinterTypeDenyList" /f >nul 2>&1
echo       - Google Chrome: Standard printing restored.

echo [2/3] Restoring Microsoft Edge print options...
reg delete "HKLM\SOFTWARE\Policies\Microsoft\Edge" /v DisablePrintToPDF /f >nul 2>&1
reg delete "HKLM\SOFTWARE\Policies\Microsoft\Edge\PrinterTypeDenyList" /f >nul 2>&1
echo       - Microsoft Edge: Standard printing restored.

echo [3/3] Restoring Brave Browser print options...
reg delete "HKLM\SOFTWARE\Policies\BraveSoftware\Brave" /v DisablePrintToPDF /f >nul 2>&1
reg delete "HKLM\SOFTWARE\Policies\BraveSoftware\Brave\PrinterTypeDenyList" /f >nul 2>&1
echo       - Brave Browser: Standard printing restored.

echo.
echo Re-enabling OS-level "Microsoft Print to PDF" printer...
dism /online /enable-feature /featurename:Printing-PrintToPDFServices-Features /norestart >nul 2>&1
echo       - Windows "Microsoft Print to PDF" re-enabled.

echo.
echo ============================================================
echo [SUCCESS] Standard Printing Settings Restored!
echo Please restart your browser.
echo ============================================================
echo.
pause
