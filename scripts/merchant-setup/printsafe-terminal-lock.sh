#!/bin/bash
# PrintSafe - Terminal Security Setup for macOS
# Disables "Save as PDF" destination in Chrome, Edge, and Brave.

if [ "$EUID" -ne 0 ]; then
  echo "[ERROR] Please run with sudo:"
  echo "  sudo bash printsafe-terminal-lock.sh"
  exit 1
fi

echo "============================================================"
echo "     PrintSafe - Secure Print Terminal Setup (macOS)"
echo "============================================================"

# Google Chrome
echo "[1/3] Applying policy to Google Chrome..."
defaults write /Library/Preferences/com.google.Chrome.plist DisablePrintToPDF -bool true
defaults write /Library/Preferences/com.google.Chrome.plist PrinterTypeDenyList -array "pdf"
echo "      - Google Chrome: Save as PDF disabled."

# Microsoft Edge
echo "[2/3] Applying policy to Microsoft Edge..."
defaults write /Library/Preferences/com.microsoft.Edge.plist DisablePrintToPDF -bool true
defaults write /Library/Preferences/com.microsoft.Edge.plist PrinterTypeDenyList -array "pdf"
echo "      - Microsoft Edge: Save as PDF disabled."

# Brave Browser
echo "[3/3] Applying policy to Brave Browser..."
defaults write /Library/Preferences/com.brave.Browser.plist DisablePrintToPDF -bool true
defaults write /Library/Preferences/com.brave.Browser.plist PrinterTypeDenyList -array "pdf"
echo "      - Brave Browser: Save as PDF disabled."

echo ""
echo "============================================================"
echo "[SUCCESS] Policy applied! Restart your browser."
echo "============================================================"
