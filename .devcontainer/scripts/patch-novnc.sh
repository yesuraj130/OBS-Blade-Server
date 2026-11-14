#!/usr/bin/env bash
set -Eeuo pipefail

UI_JS="${UI_JS:-/usr/share/novnc/app/ui.js}"
if [ ! -f "$UI_JS" ]; then
  echo "[noVNC Patch] $UI_JS not found, skipping seamless clipboard patch."
  exit 0
fi

echo "[noVNC Patch] Applying seamless clipboard sync patch to $UI_JS..."
node -e '
const fs = require("fs");
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

if (!code.includes("/* PATCHED_SEAMLESS_CLIPBOARD_SEND */")) {
  code = code.replace(
    /addClipboardHandlers\(\)\s*\{/,
    `addClipboardHandlers() { /* PATCHED_SEAMLESS_CLIPBOARD_SEND */
        window.addEventListener("focus", () => {
            if (navigator.clipboard && navigator.clipboard.readText) {
                navigator.clipboard.readText().then((text) => {
                    if (text && UI.rfb) {
                        UI.rfb.clipboardPasteFrom(text);
                    }
                }).catch(() => {});
            }
        });
        window.addEventListener("paste", (e) => {
            if (e.target && (e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT")) return;
            const text = (e.clipboardData || window.clipboardData)?.getData("text");
            if (text && UI.rfb) {
                UI.rfb.clipboardPasteFrom(text);
            }
        });`
  );
}

fs.writeFileSync(file, code);
console.log("[noVNC Patch] Successfully patched " + file);
' "$UI_JS"
