// ===========================================================================
// OBS Blade Web — Progressive Web App (PWA) Manager & Fullscreen Controller
// Subfolder-safe (IIS subsite & root hosting) for Chromium/Android/Desktop
// ===========================================================================

(function () {
  'use strict';

  // 1. Service Worker Registration (relative ./ for IIS subfolder portability)
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('./sw.js', { scope: './' })
        .then((reg) => {
          console.log('[PWA] Service Worker registered successfully with scope:', reg.scope);
          if (reg && reg.update) {
            reg.update().catch(() => {});
          }
        })
        .catch((err) => {
          console.warn('[PWA] Service Worker registration failed:', err);
        });
    });
  }

  // 2. Install Prompt State & Helpers (Chromium / Android / Desktop)
  let deferredInstallPrompt = null;

  function isStandalone() {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      window.matchMedia('(display-mode: minimal-ui)').matches
    );
  }

  function updateInstallButtonState() {
    const installBtns = document.querySelectorAll('[data-pwa-install-btn]');
    const showInstall = !isStandalone() && Boolean(deferredInstallPrompt);

    installBtns.forEach((btn) => {
      if (showInstall) {
        btn.hidden = false;
        btn.style.display = '';
        btn.title = 'Install App on Device';
      } else {
        btn.hidden = true;
        btn.style.display = 'none';
      }
    });
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    updateInstallButtonState();
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    updateInstallButtonState();
    console.log('[PWA] App successfully installed');
  });

  function triggerPWAInstall() {
    if (!deferredInstallPrompt) return;

    // Close dropdown menu overlay if install was clicked from inside it
    const dropdownOverlay = document.getElementById('dropdown-menu-overlay');
    if (dropdownOverlay && dropdownOverlay.classList.contains('open')) {
      dropdownOverlay.classList.remove('open');
    }

    deferredInstallPrompt.prompt();
    deferredInstallPrompt.userChoice
      .then((choiceResult) => {
        if (choiceResult && choiceResult.outcome === 'accepted') {
          console.log('[PWA] User accepted installation prompt');
        }
        deferredInstallPrompt = null;
        updateInstallButtonState();
      })
      .catch(() => {
        deferredInstallPrompt = null;
        updateInstallButtonState();
      });
  }

  // 3. Fullscreen Controller (Supports both Browser and Installed PWA)
  function isFullscreen() {
    return !!(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement
    );
  }

  function toggleFullscreen() {
    if (!isFullscreen()) {
      const docEl = document.documentElement;
      if (docEl.requestFullscreen) {
        docEl.requestFullscreen().catch((err) => {
          console.warn('[PWA] Fullscreen error:', err.message);
        });
      } else if (docEl.webkitRequestFullscreen) {
        docEl.webkitRequestFullscreen();
      } else if (docEl.mozRequestFullScreen) {
        docEl.mozRequestFullScreen();
      } else if (docEl.msRequestFullscreen) {
        docEl.msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
  }

  function updateFullscreenButtons() {
    const fsBtns = document.querySelectorAll('[data-fullscreen-btn]');
    const active = isFullscreen();

    fsBtns.forEach((btn) => {
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      btn.classList.toggle('active-fullscreen', active);
      btn.title = active
        ? 'Exit Fullscreen Mode'
        : 'Enter Fullscreen Mode (Edge-to-Edge)';

      const enterIcon = btn.querySelector('[data-fs-icon-enter]');
      const exitIcon = btn.querySelector('[data-fs-icon-exit]');
      if (enterIcon) enterIcon.style.display = active ? 'none' : 'block';
      if (exitIcon) exitIcon.style.display = active ? 'block' : 'none';
    });
  }

  document.addEventListener('fullscreenchange', updateFullscreenButtons);
  document.addEventListener('webkitfullscreenchange', updateFullscreenButtons);

  // Listen for display-mode transitions
  ['standalone', 'fullscreen', 'minimal-ui'].forEach((mode) => {
    const mq = window.matchMedia(`(display-mode: ${mode})`);
    if (mq && mq.addEventListener) {
      mq.addEventListener('change', updateInstallButtonState);
    }
  });

  document.addEventListener('DOMContentLoaded', () => {
    updateInstallButtonState();
    updateFullscreenButtons();

    // Auto-enter immersive fullscreen on first tap/interaction if launched in installed PWA mode
    const autoFullscreenHandler = () => {
      if (isStandalone() && !isFullscreen()) {
        const docEl = document.documentElement;
        if (docEl.requestFullscreen) {
          docEl.requestFullscreen().catch(() => {});
        } else if (docEl.webkitRequestFullscreen) {
          docEl.webkitRequestFullscreen();
        }
      }
      document.removeEventListener('click', autoFullscreenHandler);
      document.removeEventListener('touchstart', autoFullscreenHandler);
    };

    document.addEventListener('click', autoFullscreenHandler, { once: true });
    document.addEventListener('touchstart', autoFullscreenHandler, { once: true });

    document.querySelectorAll('[data-pwa-install-btn]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        triggerPWAInstall();
      });
    });

    document.querySelectorAll('[data-fullscreen-btn]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        toggleFullscreen();
      });
    });
  });

  window.PWA = {
    triggerInstall: triggerPWAInstall,
    toggleFullscreen: toggleFullscreen,
    isFullscreen: isFullscreen,
    isStandalone: isStandalone
  };
})();
