#!/bin/bash
# PrintSafe - Restore Standard Printing for macOS

if [ "$EUID" -ne 0 ]; then
  echo "[ERROR] Please run with sudo:"
  echo "  sudo bash printsafe-terminal-unlock.sh"
  exit 1
fi

echo "============================================================"
echo "     PrintSafe - Restore Standard Printing (macOS)"
echo "============================================================"

# Google Chrome
defaults delete /Library/Preferences/com.google.Chrome.plist DisablePrintToPDF 2>/dev/null
defaults delete /Library/Preferences/com.google.Chrome.plist PrinterTypeDenyList 2>/dev/null
echo "      - Google Chrome restored."

# Microsoft Edge
defaults delete /Library/Preferences/com.microsoft.Edge.plist DisablePrintToPDF 2>/dev/null
defaults delete /Library/Preferences/com.microsoft.Edge.plist PrinterTypeDenyList 2>/dev/null
echo "      - Microsoft Edge restored."

# Brave Browser
defaults delete /Library/Preferences/com.brave.Browser.plist DisablePrintToPDF 2>/dev/null
defaults delete /Library/Preferences/com.brave.Browser.plist PrinterTypeDenyList 2>/dev/null
echo "      - Brave Browser restored."

echo ""
echo "============================================================"
echo "[SUCCESS] Standard printing restored! Restart your browser."
echo "============================================================"
