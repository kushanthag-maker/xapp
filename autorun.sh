#!/data/data/com.termux/files/usr/bin/bash

echo "[+] Auto-run script එක ආරම්භ වුණා..."

# 1. ස්වයංක්‍රීයව අලුත් Directory (Folder) එකක් සහ File එකක් සෑදීම
TARGET_DIR="$HOME/auto_folder"
TARGET_FILE="$TARGET_DIR/auto_script.sh"

if [ ! -d "$TARGET_DIR" ]; then
    mkdir -p "$TARGET_DIR"
    echo "[+] '$TARGET_DIR' කියන Folder එක හැදුවා."
fi

# 2. අලුත් File එක ඇතුළට Code එකක් Auto ලිවීම
cat << 'EOF' > "$TARGET_FILE"
#!/data/data/com.termux/files/usr/bin/bash
echo "========================================="
echo "[!] අවධානය: මේ Script එක Auto Run වුණේ!"
echo "========================================="
EOF

chmod +x "$TARGET_FILE"
echo "[+] Auto-script එක සාර්ථකව සකස් කළා."

# 3. Termux Open වන හැම වෙලාවකම මේක Auto Run වෙන්න සැලැස්වීම (.bashrc එකට එකතු කිරීම)
BASHRC="$HOME/.bashrc"

# දැනටමත් එකතු කරලා නැත්නම් විතරක් එකතු කරන්න
if ! grep -q "$TARGET_FILE" "$BASHRC" 2>/dev/null; then
    echo "$TARGET_FILE" >> "$BASHRC"
    echo "[+] Termux Startup (.bashrc) එකට එකතු කළා."
else
    echo "[*] දැනටමත් Startup එකට එකතු කරලා තියෙන්නේ."
fi

echo "[+] සියල්ල සූදානම්! දැන් Termux එක Close කරලා ආපහු Open කරන්න."
