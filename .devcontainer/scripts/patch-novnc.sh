#!/usr/bin/env bash
set -Eeuo pipefail

UI_JS="${UI_JS:-/usr/share/novnc/app/ui.js}"
if [ ! -f "$UI_JS" ]; then
  echo "[noVNC Patch] $UI_JS not found, skipping seamless clipboard patch."
  exit 0
fi

echo "[noVNC Patch] Applying seamless clipboard sync patch to $UI_JS..."
node --experimental-vm-modules -e '
const fs = require("fs");
const vm = require("vm");
const file = process.argv[1];
let code = fs.readFileSync(file, "utf8");

if (!code.includes("/* PATCHED_SEAMLESS_CLIPBOARD_RECEIVE */")) {
  code = code.replace(
    /clipboardReceive\(e\)\s*\{/,
    `clipboardReceive(e) { /* PATCHED_SEAMLESS_CLIPBOARD_RECEIVE */
        if (navigator.clipboard && navigator.clipboard.writeText && e.detail && e.detail.text) {
            navigator.clipboard.writeText(e.detail.text).catch(() => {});
        }`
  );
}

// Clean and safe replacement for addClipboardHandlers
const newClipboardHandlers = `addClipboardHandlers() { /* PATCHED_SEAMLESS_CLIPBOARD_SEND */
        window.addEventListener("paste", (e) => {
            if (e.target && (e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT")) return;
            const text = (e.clipboardData || window.clipboardData)?.getData("text");
            if (text && UI.rfb) {
                UI.rfb.clipboardPasteFrom(text);
            }
        });
        document.getElementById("noVNC_clipboard_button")
            .addEventListener(\x27click\x27, UI.toggleClipboardPanel);
        document.getElementById("noVNC_clipboard_text")
            .addEventListener(\x27change\x27, UI.clipboardSend);
        document.getElementById("noVNC_clipboard_clear_button")
            .addEventListener(\x27click\x27, UI.clipboardClear);
    },`;

code = code.replace(/addClipboardHandlers\(\)\s*\{[\s\S]*?addSettingChangeHandler/, newClipboardHandlers + "\n\n    addSettingChangeHandler");

// Verify syntax
try {
  new vm.SourceTextModule(code);
} catch (err) {
  console.error("[noVNC Patch] Syntax verification error:", err.message);
  process.exit(1);
}

fs.writeFileSync(file, code);
console.log("[noVNC Patch] Successfully verified and patched " + file);
' "$UI_JS"
