// ==UserScript==
// @license MIT
// @name         Helper App by jkee
// @namespace    http://tampermonkey.net/
// @version      16.0
// @description  офигенный стиль
// @author       Frosjkee
// @match        https://helper-app-reserve.com/*
// @match        https://*.helper-app-reserve.com/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';


    let currentFontSize = localStorage.getItem('jkee-font-size') || '13';
    let isCompactMode = localStorage.getItem('jkee-compact-mode') === 'true';
    let isWideMode = localStorage.getItem('jkee-wide-mode') === 'true';

    let currentShortcut = JSON.parse(localStorage.getItem('jkee-translate-shortcut')) || {
        ctrlKey: true,
        shiftKey: false,
        altKey: false,
        key: '2',
        button: null // для мыши: 0 - левая, 1 - средняя, 2 - правая
    };

    let isListeningForShortcut = false;
    let listenTimeout = null;

    let stylesApplied = false;
    let menuObserver = null;
    let timeObserver = null;
    let timeUpdateInterval = null;

    console.log(`✓ Helper App v16.0 запущен`);

    function findTranslateButton() {
        return document.querySelector('button[data-testid="form-globe-btn"]');
    }


    function matchesKeyboardShortcut(event) {
        if (currentShortcut.button !== null) return false;
        const modifiersMatch = event.ctrlKey === (currentShortcut.ctrlKey || false) &&
               event.shiftKey === (currentShortcut.shiftKey || false) &&
               event.altKey === (currentShortcut.altKey || false);
        if (!modifiersMatch) return false;

        if (currentShortcut.code) return event.code === currentShortcut.code;

        return event.key === currentShortcut.key;
    }

    // Функция для проверки сочетания с мышью
    function matchesMouseShortcut(event) {
        if (currentShortcut.button === null) return false;

        const ctrlMatch = event.ctrlKey === (currentShortcut.ctrlKey || false);
        const shiftMatch = event.shiftKey === (currentShortcut.shiftKey || false);
        const altMatch = event.altKey === (currentShortcut.altKey || false);

        let buttonMatch = false;
        if (currentShortcut.button === 0) buttonMatch = event.button === 0;
        else if (currentShortcut.button === 1) buttonMatch = event.button === 1;
        else if (currentShortcut.button === 2) buttonMatch = event.button === 2;

        return ctrlMatch && shiftMatch && altMatch && buttonMatch;
    }

    // Преобразование event.code
    function formatCode(code) {
        if (!code) return '?';
        if (code.startsWith('Digit')) return code.slice(5);       // Digit2 → 2
        if (code.startsWith('Key')) return code.slice(3);         // KeyA → A
        if (code.startsWith('Numpad')) {
            const num = code.slice(6);
            return isNaN(num) ? 'Num' + num : 'Num' + num;        // Numpad0 → Num0
        }
        const codeMap = {
            'Space': 'Пробел', 'Enter': 'Enter', 'NumpadEnter': 'NumEnter',
            'Tab': 'Tab', 'Backspace': 'Backspace', 'Delete': 'Del',
            'Insert': 'Ins', 'Home': 'Home', 'End': 'End',
            'PageUp': 'PgUp', 'PageDown': 'PgDn',
            'ArrowUp': '↑', 'ArrowDown': '↓', 'ArrowLeft': '←', 'ArrowRight': '→',
            'Escape': 'Esc', 'Minus': '-', 'Equal': '=',
            'BracketLeft': '[', 'BracketRight': ']', 'Backslash': '\\',
            'Semicolon': ';', 'Quote': "'", 'Backquote': '`',
            'Comma': ',', 'Period': '.', 'Slash': '/'
        };
        return codeMap[code] || code;
    }

    function formatShortcut(shortcut) {
        const parts = [];
        if (shortcut.ctrlKey) parts.push('Ctrl');
        if (shortcut.altKey) parts.push('Alt');
        if (shortcut.shiftKey) parts.push('Shift');

        if (shortcut.button !== null) {
            if (shortcut.button === 0) parts.push('ЛКМ');
            else if (shortcut.button === 1) parts.push('СКМ');
            else if (shortcut.button === 2) parts.push('ПКМ');
        } else if (shortcut.code) {
            parts.push(formatCode(shortcut.code));
        } else {
            const keyMap = {
                ' ': 'Пробел', 'Escape': 'Esc', 'Enter': 'Enter', 'Tab': 'Tab',
                'Backspace': 'Backspace', 'Delete': 'Del', 'Insert': 'Ins',
                'Home': 'Home', 'End': 'End', 'PageUp': 'PgUp', 'PageDown': 'PgDn',
                'ArrowUp': '↑', 'ArrowDown': '↓', 'ArrowLeft': '←', 'ArrowRight': '→'
            };
            const k = shortcut.key;
            if (keyMap[k]) parts.push(keyMap[k]);
            else if (k && k.startsWith('F') && k.length <= 3) parts.push(k);
            else if (k) parts.push(k.toUpperCase());
        }

        return parts.join('+');
    }

    function saveShortcut(shortcut) {
        currentShortcut = shortcut;
        localStorage.setItem('jkee-translate-shortcut', JSON.stringify(shortcut));
        showNotification(`✓ Горячая клавиша: ${formatShortcut(shortcut)}`, 'success');
        console.log(`✅ Новое сочетание: ${formatShortcut(shortcut)}`);
    }

    function setupHotkeyListener() {
        document.addEventListener('keydown', function(event) {
            if (isListeningForShortcut) return;

            if (matchesKeyboardShortcut(event)) {
                event.preventDefault();

                const btn = findTranslateButton();
                if (btn) {
                    btn.click();

                    btn.style.backgroundColor = 'rgba(74,158,255,0.3)';
                    btn.style.transition = 'background-color 0.2s';
                    setTimeout(() => btn.style.backgroundColor = '', 200);

                    if (!window._lastTranslateNotify || Date.now() - window._lastTranslateNotify > 1000) {
                        showNotification('✓ Перевод активирован', 'success');
                        window._lastTranslateNotify = Date.now();
                    }
                }
            }
        });
    }

    // Обработчик мыши
    function setupMouseListener() {
        document.addEventListener('mousedown', function(event) {
            if (isListeningForShortcut) return;

            const target = event.target;
            const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

            if (matchesMouseShortcut(event) && !isInput) {
                event.preventDefault();

                const btn = findTranslateButton();
                if (btn) {
                    btn.click();

                    btn.style.backgroundColor = 'rgba(74,158,255,0.3)';
                    setTimeout(() => btn.style.backgroundColor = '', 200);

                    if (!window._lastTranslateNotify || Date.now() - window._lastTranslateNotify > 1000) {
                        showNotification('✓ Перевод активирован (мышь)', 'success');
                        window._lastTranslateNotify = Date.now();
                    }
                }
            }
        }, true);
    }

    function applyStyles() {
        if (stylesApplied) return;

        const style = document.createElement('style');
        style.id = 'frosjkee-premium-styles';
        style.textContent = `
        /* Стииль  */
        * {
            box-sizing: border-box !important;
        }

        html, body {
            overflow-x: hidden !important;
            max-width: 100vw !important;
        }

        .chat-v3-wrapper,
        .flex.w-\\[642px\\].flex-col.h-full {
            contain: layout style !important;
        }

        [data-testid="task-v2-list-item"]:hover,
        [data-testid="dialog-chat"]:hover,
        [data-e2e="chat-manager-right-sidebar-dialogs-list-item"]:hover,
        [data-testid="create-new-accordion-item"]:hover,
        button[role="tab"]:hover,
        [data-testid="profile-ru-modal-trigger"]:hover,
        [data-testid="profile-tu-modal-trigger"]:hover {
            will-change: transform;
        }

        body.chat-v3 {
            background: linear-gradient(135deg, #0f1419 0%, #1a1f2e 50%, #0d1117 100%) !important;
        }

        main.main {
            background: transparent !important;
        }

        .h-\\[56px\\].px-6.flex.justify-between.border-b.border-solid.border-border-secondary.bg-bg-secondary {
            background: linear-gradient(180deg, #1f2937 0%, #1a2332 100%) !important;
            border-bottom: 1px solid rgba(74,158,255,0.2) !important;
            box-shadow: 0 4px 16px rgba(0,0,0,0.3) !important;
        }

        .h-\\[78px\\].w-full.flex.px-4.bg-bg-secondary.border-b.border-t.border-solid.border-border-secondary {
            background: linear-gradient(180deg, rgba(26,35,50,0.95) 0%, rgba(15,25,35,0.98) 100%) !important;
            border-bottom: 1px solid rgba(74,158,255,0.15) !important;
            border-top: 1px solid rgba(74,158,255,0.15) !important;
        }

        [data-testid="profile-ru-modal-trigger"],
        [data-testid="profile-tu-modal-trigger"] {
            background: linear-gradient(135deg, rgba(42,52,70,0.9) 0%, rgba(30,40,58,0.95) 100%) !important;
            border: 1px solid rgba(74,158,255,0.25) !important;
            border-radius: 12px !important;
            transition: transform 0.2s ease, box-shadow 0.2s ease !important;
            box-shadow: 0 4px 12px rgba(0,0,0,0.25) !important;
        }

        [data-testid="profile-ru-modal-trigger"]:hover,
        [data-testid="profile-tu-modal-trigger"]:hover {
            background: linear-gradient(135deg, rgba(52,72,100,0.95) 0%, rgba(40,60,88,1) 100%) !important;
            border-color: rgba(74,158,255,0.5) !important;
            transform: translateY(-2px) !important;
            box-shadow: 0 8px 24px rgba(74,158,255,0.15) !important;
        }

        .relative.flex-1.h-full.border-r.border-l.border-solid.border-border-secondary {
            background: linear-gradient(180deg, #141e2d 0%, #0d1721 100%) !important;
        }

        .flex.flex-col.h-full.justify-end.bg-bg-primary.border-b.border-t.border-solid.border-border-secondary {
            background: transparent !important;
            border: none !important;
        }

        .p-4.flex.flex-col.gap-\\[15px\\] {
            background: transparent !important;
        }

        .bg-bg-user-chat {
            background: linear-gradient(135deg, rgba(74,158,255,0.15) 0%, rgba(59,130,246,0.2) 100%) !important;
            border: 1px solid rgba(74,158,255,0.3) !important;
            border-radius: 12px 12px 4px 12px !important;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
        }

        .bg-bg-table-line {
            background: linear-gradient(135deg, rgba(42,52,70,0.7) 0%, rgba(30,40,58,0.8) 100%) !important;
            border: 1px solid rgba(74,158,255,0.15) !important;
            transition: background 0.2s ease, border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease !important;
        }

        .bg-bg-table-line:hover {
            background: linear-gradient(135deg, rgba(42,52,70,0.85) 0%, rgba(30,40,58,0.95) 100%) !important;
            border-color: rgba(74,158,255,0.3) !important;
            transform: translateX(-2px) !important;
            box-shadow: 0 4px 12px rgba(74,158,255,0.15) !important;
        }


.w-\\[320px\\].min-w-\\[320px\\].flex.flex-col.h-full.bg-bg-secondary.relative,
aside.w-\\[320px\\].min-w-\\[320px\\].flex.flex-col.h-full.bg-bg-secondary.relative {
    background: linear-gradient(180deg, #1a2332 0%, #0f1923 100%) !important;
    border-right: 1px solid rgba(74,158,255,0.1) !important;
    box-shadow: 4px 0 24px rgba(0,0,0,0.3) !important;
}


.h-\\[77px\\].min-h-\\[77px\\].text-xl.px-2.flex.items-center.gap-1 {
    background: linear-gradient(180deg, #1f2937 0%, #1a2332 100%) !important;
    border-bottom: 1px solid rgba(74,158,255,0.2) !important;
}

.flex.flex-col.justify-center.items-center.self-stretch.p-4.rounded-lg.bg-bg-card.max-w-\\[318px\\] {
    background: linear-gradient(135deg, rgba(42,52,70,0.8) 0%, rgba(30,40,58,0.9) 100%) !important;
    border: 1px solid rgba(74,158,255,0.15) !important;
    border-radius: 12px !important;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2) !important;
}

.h2.text-base.font-medium.text-text-secondary,
[role="status"] h2 {
    color: #ffffff !important;
    font-weight: 600 !important;
}

.w-10.h-10.min-h-10.rounded-full.bg-bg-secondary.flex.items-center.justify-center {
    background: linear-gradient(135deg, #4a9eff 0%, #3b82f6 100%) !important;
    box-shadow: 0 4px 12px rgba(74,158,255,0.3) !important;
}

.w-10.h-10.min-h-10.rounded-full.bg-bg-secondary svg {
    color: #ffffff !important;
}

[data-radix-scroll-area-viewport] {
    background: transparent !important;
}

button.w-\\[200px\\].bg-bg-menu-item {
    background: rgba(42,52,70,0.8) !important;
    border: 1px solid rgba(74,158,255,0.2) !important;
    color: rgba(255,255,255,0.9) !important;
    border-radius: 8px !important;
}

button.w-\\[200px\\].bg-bg-menu-item:hover {
    background: rgba(52,72,100,0.9) !important;
    border-color: rgba(74,158,255,0.4) !important;
}

.bg-bg-secondary:not(
    .flex.w-\\[642px\\].flex-col.h-full.flex-grow,
    .flex.flex-col.h-full.justify-end.bg-bg-primary,
    [data-testid="dialog-footer-block"]
) {
    background: linear-gradient(180deg, #1a2332 0%, #0f1923 100%) !important;
}

button[role="combobox"].bg-bg-menu-item,
button.group.flex.h-10.w-full.items-center.justify-between.rounded-md.border.border-bg-menu-item.bg-bg-menu-item,
button.inline-flex.items-center.gap-2.whitespace-nowrap.rounded-md.text-sm.font-medium.bg-bg-menu-item.w-full.justify-between {
    background: rgba(42,52,70,0.9) !important;
    border: 1px solid rgba(74,158,255,0.2) !important;
    border-radius: 6px !important;
    color: rgba(255,255,255,0.7) !important; /* text-text-secondary */
    transition: background 0.2s ease, border-color 0.2s ease, opacity 0.2s ease !important;
    height: 40px !important;
    padding: 8px 12px !important;
}

button[role="combobox"].bg-bg-menu-item:hover,
button.group.flex.h-10.w-full.items-center.justify-between.rounded-md.border.border-bg-menu-item.bg-bg-menu-item:hover,
button.inline-flex.items-center.gap-2.whitespace-nowrap.rounded-md.text-sm.font-medium.bg-bg-menu-item.w-full.justify-between:hover {
    opacity: 0.8 !important;
    background: rgba(52,72,100,0.95) !important;
    border-color: rgba(74,158,255,0.3) !important;
}

button[role="combobox"].bg-bg-menu-item[data-state="open"],
button.group.flex.h-10.w-full.items-center.justify-between.rounded-md.border.border-bg-menu-item.bg-bg-menu-item[data-state="open"],
button.inline-flex.items-center.gap-2.whitespace-nowrap.rounded-md.text-sm.font-medium.bg-bg-menu-item.w-full.justify-between[data-state="open"] {
    color: #ffffff !important; /* text-text-primary */
    border-color: rgba(74,158,255,0.4) !important;
    background: rgba(52,72,100,0.95) !important;
}

span.truncate,
span.overflow-hidden.text-ellipsis.text-text-secondary,
[role="combobox"] span[class*="truncate"],
[class*="bg-bg-menu-item"] span[class*="truncate"] {
    color: inherit !important;
    font-weight: 400 !important;
}


div[class*="flex-grow"][class*="bg-bg-tertiary"]:has(svg[viewBox="0 0 15 15"]) {
    background: linear-gradient(135deg, rgba(42,52,70,0.9) 0%, rgba(30,40,58,0.95) 100%) !important;
}

.flex.flex-col.overflow-hidden.h-full {
    background: linear-gradient(180deg, #141e2d 0%, #0d1721 100%) !important;
}

.flex.justify-between.items-center.px-4.py-3 {
    background: linear-gradient(180deg, #141e2d 0%, #0d1721 100%) !important;
}

.flex.flex-col.overflow-hidden.h-full,
[data-radix-scroll-area-viewport] > div {
    background: linear-gradient(180deg, #141e2d 0%, #0d1721 100%) !important;
}

.px-4 {
    background: transparent !important;
}

.inline-flex.items-center.justify-center.font-normal.select-none.shrink-0.bg-tertiary.border.border-solid.border-border-tertiary.w-5.h-5.mr-2.rounded-full.relative {
    background: rgba(74,158,255,0.15) !important;
    border: 1px solid rgba(74,158,255,0.3) !important;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2) !important;
}

.inline-flex.items-center.justify-center span svg,
.inline-flex.items-center.justify-center span div {
    color: #4a9eff !important;
}

img.h-full.w-full.object-cover.rounded-full {
    border: 1px solid rgba(74,158,255,0.4) !important;
}

div.flex:has(span.truncate.text-text-secondary) {
    background: transparent !important;
}

button[role="combobox"]:focus-visible,
button.bg-bg-menu-item:focus-visible {
    outline: 2px solid rgba(74,158,255,0.5) !important;
    outline-offset: 2px !important;
}


        .bg-bg-card {
            background: linear-gradient(135deg, rgba(42,52,70,0.9) 0%, rgba(30,40,58,0.95) 100%) !important;
            border: 1px solid rgba(74,158,255,0.2) !important;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
        }

        .flex.flex-col.h-full.px-2.py-3.bg-bg-secondary.border-r.border-solid.border-border-secondary {
            background: linear-gradient(180deg, #1a2332 0%, #0f1923 100%) !important;
            border-right: 1px solid rgba(74,158,255,0.1) !important;
            box-shadow: 4px 0 24px rgba(0,0,0,0.3) !important;
        }

        .flex.w-\\[642px\\].flex-col.h-full.flex-grow {
            background: linear-gradient(180deg, #141e2d 0%, #0d1721 100%) !important;
            border-left: 1px solid rgba(74,158,255,0.1) !important;
            border-right: 1px solid rgba(74,158,255,0.1) !important;
            border-radius: 0 !important;
        }

        .overflow-hidden.flex.flex-col.h-full.border-l.border-solid.border-border-secondary.bg-bg-secondary,
        .flex.flex-col.w-\\[320px\\].h-full:last-child {
            background: linear-gradient(180deg, #1a2332 0%, #0f1923 100%) !important;
            border-left: 1px solid rgba(74,158,255,0.1) !important;
            box-shadow: -4px 0 24px rgba(0,0,0,0.3) !important;
        }

        .bg-bg-tertiary.rounded-lg {
            background: linear-gradient(135deg, rgba(42,52,70,0.9) 0%, rgba(30,40,58,0.95) 100%) !important;
            border: 1px solid rgba(74,158,255,0.2) !important;
            border-radius: 12px 12px 12px 4px !important;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
        }

        .absolute.px-4.py-1.border.border-t-0.border-solid.border-border-secondary.z-20.bg-bg-secondary.rounded-b.justify-self-center {
            background: linear-gradient(135deg, rgba(42,52,70,0.95) 0%, rgba(30,40,58,0.98) 100%) !important;
            border: 1px solid rgba(74,158,255,0.25) !important;
            border-top: none !important;
            backdrop-filter: blur(10px) !important;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
        }

        .bg-border-secondary.relative.h-px,
        .bg-border-primary.relative.h-px {
            background: rgba(74,158,255,0.2) !important;
        }

        .column.w-\\[320px\\].h-full > div {
            background: linear-gradient(180deg, #1a2332 0%, #0f1923 100%) !important;
            border-right: 1px solid rgba(74,158,255,0.1) !important;
            box-shadow: 4px 0 24px rgba(0,0,0,0.3) !important;
        }

        .flex.flex-col.w-\\[320px\\].h-full button[role="tab"],
        [role="tablist"] button {
            background: linear-gradient(135deg, rgba(42,52,70,0.7) 0%, rgba(30,40,58,0.8) 100%) !important;
            border: 1px solid rgba(74,158,255,0.15) !important;
            color: rgba(255,255,255,0.6) !important;
            transition: transform 0.2s ease, box-shadow 0.2s ease !important;
            border-radius: 8px !important;
            box-shadow: 0 2px 6px rgba(0,0,0,0.2) !important;
        }

        button[role="checkbox"][data-testid*="selected-checkbox"] {
            background: rgba(30,40,58,0.9) !important;
            border: 1px solid rgba(74,158,255,0.25) !important;
            border-radius: 4px !important;
            transition: background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease !important;
        }

        button[role="checkbox"][data-testid*="selected-checkbox"]:hover {
            border-color: rgba(74,158,255,0.5) !important;
            background: rgba(35,45,65,0.95) !important;
        }

        button[role="checkbox"][data-testid*="selected-checkbox"][data-state="checked"],
        button[role="checkbox"][data-testid*="selected-checkbox"][aria-checked="true"] {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;
            border-color: rgba(16,185,129,0.6) !important;
            box-shadow: 0 0 12px rgba(16,185,129,0.4) !important;
        }

        button[role="checkbox"][data-testid*="selected-checkbox"][data-state="checked"] svg,
        button[role="checkbox"][data-testid*="selected-checkbox"][aria-checked="true"] svg {
            color: #ffffff !important;
            filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3)) !important;
        }

        a[data-testid="profiles-tu-list-item"].bg-bg-card {
            transition: background 0.2s ease, border-color 0.2s ease !important;
        }

        a[data-testid="profiles-tu-list-item"][aria-selected="true"],
        a[data-testid="profiles-tu-list-item"].selected {
            background: linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(5,150,105,0.2) 100%) !important;
            border-left: 3px solid #10b981 !important;
        }

        .py-5.px-4.flex.items-baseline.gap-3.justify-between {
            background: linear-gradient(180deg, #1a2332 0%, #0f1923 100%) !important;
            border-bottom: 1px solid rgba(74,158,255,0.15) !important;
        }

        .bg-bg-secondary.px-4.pb-0\\.5.pt-3.flex.justify-between {
            background: linear-gradient(180deg, #1a2332 0%, #0f1923 100%) !important;
            border-bottom: 1px solid rgba(74,158,255,0.15) !important;
        }

        .simple {
            background: linear-gradient(135deg, #0f1419 0%, #1a1f2e 50%, #0d1117 100%) !important;
            min-height: 100vh !important;
        }

        div[data-target="loader"] {
            background: transparent !important;
        }

        div[data-target="loader"] > div {
            color: #4a9eff !important;
            font-weight: 600 !important;
            text-shadow: 0 2px 8px rgba(74,158,255,0.3) !important;
        }

        .main-app-content {
            background: linear-gradient(135deg, #0f1419 0%, #1a1f2e 50%, #0d1117 100%) !important;
            min-height: 100vh !important;
            contain: layout style !important;
        }

        .flex.flex-col.w-\\[320px\\].h-full button[role="tab"][data-state="active"],
        [role="tablist"] button[data-state="active"],
        .flex.flex-col.w-\\[320px\\].h-full button[role="tab"][aria-selected="true"],
        [role="tablist"] button[aria-selected="true"] {
            background: linear-gradient(135deg, #4a9eff 0%, #3b82f6 100%) !important;
            border: 1px solid rgba(74,158,255,0.6) !important;
            color: #ffffff !important;
            box-shadow: 0 4px 12px rgba(74,158,255,0.4) !important;
            transform: translateY(-1px) !important;
        }

        .flex.flex-col.w-\\[320px\\].h-full button[role="tab"]:hover,
        [role="tablist"] button:hover {
            background: linear-gradient(135deg, rgba(52,72,100,0.85) 0%, rgba(40,60,88,0.9) 100%) !important;
            border-color: rgba(74,158,255,0.35) !important;
            color: rgba(255,255,255,0.9) !important;
            transform: translateY(-1px) !important;
            box-shadow: 0 3px 10px rgba(74,158,255,0.2) !important;
        }

        .flex.flex-col.w-\\[320px\\].h-full button[role="tab"][data-state="active"]:hover,
        [role="tablist"] button[data-state="active"]:hover {
            background: linear-gradient(135deg, #5aaeff 0%, #4b92ff 100%) !important;
            border-color: rgba(74,158,255,0.8) !important;
            box-shadow: 0 6px 16px rgba(74,158,255,0.5) !important;
        }

        [data-testid="task-v2-list-item"],
        [data-testid="dialog-chat"],
        [data-e2e="chat-manager-right-sidebar-dialogs-list-item"] {
            background: linear-gradient(135deg, rgba(42,52,70,0.9) 0%, rgba(30,40,58,0.95) 100%) !important;
            border: 1px solid rgba(74,158,255,0.25) !important;
            border-radius: 10px !important;
            transition: transform 0.2s ease, box-shadow 0.2s ease !important;
            box-shadow: 0 3px 8px rgba(0,0,0,0.2) !important;
        }

        [data-testid="task-v2-list-item"]:hover,
        [data-testid="dialog-chat"]:hover,
        [data-e2e="chat-manager-right-sidebar-dialogs-list-item"]:hover {
            background: linear-gradient(135deg, rgba(52,72,100,0.95) 0%, rgba(40,60,88,1) 100%) !important;
            border-color: rgba(74,158,255,0.5) !important;
            transform: translateY(-1px) scale(1.01) !important;
            box-shadow: 0 5px 15px rgba(74,158,255,0.15) !important;
        }

        img[src="/static/img/layout/ajax-loader-stripe.gif"],
        img[alt="loader"] {
            content: url("https://i.pinimg.com/originals/c0/30/03/c03003776e9cb3e20ba7bd3171700507.gif") !important;
            width: auto !important;
            height: auto !important;
            max-width: 200px !important;
            max-height: 200px !important;
        }

        div[style*="top: -125px"] {
            top: 20px !important;
        }

        [data-testid="dialog-footer-block"],
        .bg-bg-primary.px-4.py-5 {
            background: linear-gradient(180deg, rgba(26,35,50,0.95) 0%, rgba(15,25,35,0.98) 100%) !important;
            border-top: 1px solid rgba(74,158,255,0.15) !important;
            box-shadow: 0 -4px 24px rgba(0,0,0,0.3) !important;
        }

        [data-testid="dialog-footer-form-textarea"] {
            background: rgba(30,40,58,0.9) !important;
            border: 1px solid rgba(74,158,255,0.25) !important;
            color: #ffffff !important;
            border-radius: 10px !important;
            transition: border-color 0.2s ease !important;
            box-shadow: inset 0 2px 8px rgba(0,0,0,0.2) !important;
        }

        [data-testid="dialog-footer-form-textarea"]:focus {
            border-color: rgba(74,158,255,0.5) !important;
            box-shadow: 0 0 20px rgba(74,158,255,0.2), inset 0 2px 8px rgba(0,0,0,0.2) !important;
            background: rgba(35,45,65,0.95) !important;
        }

        [data-testid="create-new-accordion-item"] {
            background: linear-gradient(135deg, rgba(42,52,70,0.7) 0%, rgba(30,40,58,0.8) 100%) !important;
            border-radius: 10px !important;
            transition: background 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease !important;
            box-shadow: 0 3px 8px rgba(0,0,0,0.2) !important;
        }

        [data-testid="create-new-accordion-item"]:hover {
            background: linear-gradient(135deg, rgba(42,52,70,0.85) 0%, rgba(30,40,58,0.95) 100%) !important;
            transform: translateY(-1px) !important;
            box-shadow: 0 5px 15px rgba(74,158,255,0.15) !important;
        }

        [data-testid="create-new-accordion-item"][data-state="open"] {
            background: linear-gradient(135deg, rgba(74,158,255,0.15) 0%, rgba(59,130,246,0.2) 100%) !important;
            box-shadow: 0 6px 20px rgba(74,158,255,0.25) !important;
        }

        [data-testid="create-new-accordion-item"] span.border-border-tertiary,
        [data-testid="create-new-accordion-item"] img.border-border-tertiary,
        [data-testid*="create-new-accordion-trigger-item"] .border-border-tertiary,
        [data-testid="create-new-accordion-item"] .bg-tertiary {
            border: none !important;
            border-width: 0 !important;
        }

        [data-testid*="create-new-add-message-btn"] {
            background: linear-gradient(135deg, rgba(42,52,70,0.8) 0%, rgba(30,40,58,0.9) 100%) !important;
            border: 1px solid rgba(74,158,255,0.25) !important;
            color: rgba(255,255,255,0.8) !important;
            border-radius: 8px !important;
            transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease !important;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2) !important;
        }

        [data-testid*="create-new-add-message-btn"]:hover {
            background: linear-gradient(135deg, #4a9eff 0%, #3b82f6 100%) !important;
            border-color: rgba(74,158,255,0.5) !important;
            color: #ffffff !important;
            transform: translateY(-2px) !important;
            box-shadow: 0 4px 12px rgba(74,158,255,0.3) !important;
        }

        .px-4.d-flex.overflow-hidden {
            background: linear-gradient(180deg, #1a2332 0%, #0f1923 100%) !important;
        }


        input[placeholder*="Search by name"] {
            background: rgba(30,40,58,0.9) !important;
            border: 1px solid rgba(74,158,255,0.25) !important;
            color: #ffffff !important;
            border-radius: 8px !important;
        }

        input[placeholder*="Search by name"]:focus {
            border-color: rgba(74,158,255,0.5) !important;
            box-shadow: 0 0 20px rgba(74,158,255,0.2) !important;
        }

        [data-testid*="create-new-accordion-trigger-item"] {
            transition: color 0.2s ease !important;
        }

        [data-testid*="create-new-accordion-trigger-item"]:hover {
            color: #4a9eff !important;
        }

        [data-testid="create-new-accordion"] {
            gap: 8px !important;
        }

        [data-testid="navigate-to-chat-btn"] {
            background: linear-gradient(135deg, rgba(42,52,70,0.8) 0%, rgba(30,40,58,0.9) 100%) !important;
            border: 1px solid rgba(74,158,255,0.2) !important;
            border-radius: 8px !important;
            transition: transform 0.2s ease !important;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2) !important;
        }

        [data-testid="navigate-to-chat-btn"]:hover {
            background: linear-gradient(135deg, rgba(52,72,100,0.9) 0%, rgba(40,60,88,1) 100%) !important;
            border-color: rgba(74,158,255,0.4) !important;
            transform: translateY(-2px) !important;
            box-shadow: 0 4px 12px rgba(74,158,255,0.2) !important;
        }

        [data-testid="mail-footer-form-textarea"] {
            background: rgba(30,40,58,0.9) !important;
            border: 1px solid rgba(74,158,255,0.25) !important;
            color: #ffffff !important;
            border-radius: 10px !important;
            transition: border-color 0.2s ease !important;
            box-shadow: inset 0 2px 8px rgba(0,0,0,0.2) !important;
        }

        [data-testid="mail-footer-form-textarea"]:focus {
            border-color: rgba(74,158,255,0.5) !important;
            box-shadow: 0 0 20px rgba(74,158,255,0.2), inset 0 2px 8px rgba(0,0,0,0.2) !important;
            background: rgba(35,45,65,0.95) !important;
            outline: none !important;
        }

        [data-testid="mail-footer-form-textarea"]::placeholder {
            color: rgba(255,255,255,0.4) !important;
        }

        [data-testid="dialog-footer-form-send-btn"] {
            background: linear-gradient(135deg, #4a9eff 0%, #3b82f6 100%) !important;
            border: 1px solid rgba(74,158,255,0.5) !important;
            box-shadow: 0 4px 12px rgba(74,158,255,0.3) !important;
            transition: transform 0.2s ease, box-shadow 0.2s ease !important;
            border-radius: 10px !important;
        }

        [data-testid="dialog-footer-form-send-btn"]:hover:not(:disabled) {
            background: linear-gradient(135deg, #5aaeff 0%, #4b92ff 100%) !important;
            border-color: rgba(74,158,255,0.7) !important;
            transform: translateY(-2px) !important;
            box-shadow: 0 6px 20px rgba(74,158,255,0.4) !important;
        }

        [data-testid="navigate-to-email-chat-btn"],
        [data-testid="handle-vip-status-btn"],
        [data-testid="show-notes-btn"],
        [data-testid="handle-bookmark-btn"],
        [data-testid="handle-pin-btn"],
        [data-testid="handle-like-btn"],
        [data-testid="actions-trigger"],
        button[data-testid*="starred"] {
            background: linear-gradient(135deg, rgba(42,52,70,0.8) 0%, rgba(30,40,58,0.9) 100%) !important;
            border: 1px solid rgba(74,158,255,0.2) !important;
            border-radius: 8px !important;
            transition: transform 0.2s ease !important;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2) !important;
        }

        [data-testid="navigate-to-email-chat-btn"]:hover,
        [data-testid="handle-vip-status-btn"]:hover,
        [data-testid="show-notes-btn"]:hover,
        [data-testid="handle-bookmark-btn"]:hover,
        [data-testid="handle-pin-btn"]:hover,
        [data-testid="handle-like-btn"]:hover,
        [data-testid="actions-trigger"]:hover,
        button[data-testid*="starred"]:hover {
            background: linear-gradient(135deg, rgba(52,72,100,0.9) 0%, rgba(40,60,88,1) 100%) !important;
            border-color: rgba(74,158,255,0.4) !important;
            transform: translateY(-2px) !important;
            box-shadow: 0 4px 12px rgba(74,158,255,0.2) !important;
        }

        [data-testid="emoji-btn"],
        [data-testid="sticker-btn"],
        [data-testid="media-btn"],
        [data-testid="gift-btn"],
        [data-testid="post-btn"] {
            background: linear-gradient(135deg, rgba(42,52,70,0.8) 0%, rgba(30,40,58,0.9) 100%) !important;
            border: 1px solid rgba(74,158,255,0.2) !important;
            border-radius: 10px !important;
            transition: transform 0.2s ease !important;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2) !important;
        }

        [data-testid="emoji-btn"]:hover:not(:disabled),
        [data-testid="sticker-btn"]:hover:not(:disabled),
        [data-testid="media-btn"]:hover:not(:disabled),
        [data-testid="gift-btn"]:hover:not(:disabled),
        [data-testid="post-btn"]:hover:not(:disabled) {
            background: linear-gradient(135deg, rgba(52,72,100,0.9) 0%, rgba(40,60,88,1) 100%) !important;
            border-color: rgba(74,158,255,0.4) !important;
            transform: translateY(-2px) !important;
            box-shadow: 0 4px 12px rgba(74,158,255,0.2) !important;
        }

        input[placeholder="Search"],
        input.bg-bg-input,
        input[placeholder*="Search"] {
            background: rgba(30,40,58,0.9) !important;
            border: 1px solid rgba(74,158,255,0.25) !important;
            border-radius: 8px !important;
            color: #ffffff !important;
            transition: border-color 0.2s ease !important;
            box-shadow: inset 0 2px 8px rgba(0,0,0,0.2) !important;
        }

        input[placeholder="Search"]:focus,
        input.bg-bg-input:focus,
        input[placeholder*="Search"]:focus {
            border-color: rgba(74,158,255,0.5) !important;
            background: rgba(35,45,65,0.95) !important;
            box-shadow: 0 0 20px rgba(74,158,255,0.2), inset 0 2px 8px rgba(0,0,0,0.2) !important;
            outline: none !important;
        }

        .relative.flex.flex-col.px-4.py-3.gap-2.bg-bg-secondary.border-b.border-r.border-solid.border-border-secondary {
            background: linear-gradient(180deg, #1a2332 0%, #0f1923 100%) !important;
            border-right: 1px solid rgba(74,158,255,0.1) !important;
            border-bottom: 1px solid rgba(74,158,255,0.15) !important;
        }

        .w-\\[723px\\].flex.flex-wrap.justify-center.p-4 {
            background: linear-gradient(180deg, #141e2d 0%, #0d1721 100%) !important;
            border-radius: 8px !important;
        }

        .w-\\[207px\\].px-2.pr-1.flex.flex-col.justify-start.items-start.bg-bg-secondary.h-full {
            background: linear-gradient(180deg, #1a2332 0%, #0f1923 100%) !important;
        }

        .w-\\[207px\\].px-2.pr-1.flex.flex-col.justify-start.items-start.bg-bg-secondary.h-full [data-radix-scroll-area-viewport] {
            background: transparent !important;
        }

        .flex.justify-center.pb-3.gap-4 {
            background: linear-gradient(180deg, #141e2d 0%, #0d1721 100%) !important;
            padding-top: 12px !important;
            border-radius: 8px !important;
        }

        .w-\\[723px\\].flex.flex-wrap.justify-center.p-4:has(svg[data-testid="loader-search-profile"]) {
            background: linear-gradient(180deg, #141e2d 0%, #0d1721 100%) !important;
            min-height: 400px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
        }

        svg[data-testid="loader-search-profile"] {
            color: #4a9eff !important;
            filter: drop-shadow(0 0 8px rgba(74,158,255,0.5)) !important;
        }



.h-10.w-10.shrink-0.content-center.justify-items-center.self-center.bg-bg-tertiary.rounded-full {
    background: linear-gradient(135deg, rgba(42,52,70,0.9) 0%, rgba(30,40,58,0.95) 100%) !important;
    border: 1px solid rgba(74,158,255,0.2) !important;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2) !important;
}

.flex.flex-col.self-end.gap-1.max-w-\\[420px\\] {
    background: transparent !important;
}

.py-2.px-4.w-fit.max-w-\\[420px\\].break-all.bg-bg-user-chat.rounded-lg.text-base.self-end.leading-\\[1\\.2\\] {
    background: linear-gradient(135deg, rgba(74,158,255,0.15) 0%, rgba(59,130,246,0.2) 100%) !important;
    border: 1px solid rgba(74,158,255,0.3) !important;
    border-radius: 12px 12px 4px 12px !important;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
}

.py-2.px-4.w-fit.max-w-\\[420px\\].break-all.bg-bg-card.rounded-lg.text-base {
    background: linear-gradient(135deg, rgba(42,52,70,0.8) 0%, rgba(30,40,58,0.9) 100%) !important;
    border: 1px solid rgba(74,158,255,0.2) !important;
    border-radius: 12px 4px 12px 12px !important;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
}

.flex.flex-row.items-end.gap-2.max-w-\\[420px\\] {
    background: transparent !important;
}

.border-linear-gradient.rounded-lg.p-\\[1px\\].w-fit.bg-bg-user-chat.rounded-lg.text-base.self-end.leading-\\[1\\.2\\] {
    background: linear-gradient(135deg, rgba(74,158,255,0.15) 0%, rgba(59,130,246,0.2) 100%) !important;
    border: 1px solid rgba(74,158,255,0.4) !important;
    box-shadow: 0 4px 16px rgba(74,158,255,0.2) !important;
}

.flex.flex-col.gap-3.rounded-lg.p-4.relative.bg-bg-card.max-w-\\[420px\\] {
    background: linear-gradient(135deg, rgba(42,52,70,0.9) 0%, rgba(30,40,58,0.95) 100%) !important;
    border: 1px solid rgba(74,158,255,0.2) !important;
    border-radius: 12px !important;
    box-shadow: 0 4px 16px rgba(0,0,0,0.2) !important;
}

.flex.gap-1.items-center.text-sm.font-semibold.rounded.px-3.py-1.absolute.top-\\[-14px\\].bg-gradient-to-r.from-orange-400.to-orange-600 {
    background: linear-gradient(135deg, #f97316 0%, #ea580c 100%) !important;
    color: #ffffff !important;
    font-weight: 600 !important;
    box-shadow: 0 2px 8px rgba(249,115,22,0.3) !important;
    border: none !important;
}

.flex.self-center.text-xs.leading-\\[18px\\].font-medium.gap-2.absolute.bg-bg-card.rounded.py-1.px-\\[10px\\] {
    background: rgba(42,52,70,0.95) !important;
    border: 1px solid rgba(74,158,255,0.25) !important;
    backdrop-filter: blur(4px) !important;
    color: #ffffff !important;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2) !important;
}


.flex.gap-\\[5px\\].overflow-hidden {
    background: transparent !important;
    border-radius: 8px !important;
    overflow: hidden !important;
}

.flex.flex-col.gap-\\[5px\\].w-\\[184px\\].h-\\[234px\\].cursor-pointer {
    border-radius: 8px !important;
    overflow: hidden !important;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
}

.relative.overflow-hidden.rounded-lg.bg-no-repeat.bg-center.bg-cover.w-\\[184px\\].h-\\[234px\\] {
    border: 1px solid rgba(74,158,255,0.15) !important;
}

.flex.flex-col.gap-1.w-\\[155px\\] {
    background: transparent !important;
}


.relative.overflow-hidden.rounded-lg.bg-no-repeat.bg-center.bg-cover.cursor-pointer.h-\\[115px\\].blur-xs {
    filter: blur(4px) !important;
    border: 1px solid rgba(74,158,255,0.2) !important;
}

.absolute.h-\\[115px\\].w-\\[155px\\].bottom-0.bg-text-tertiary\\/80.rounded-lg.blur-xs.cursor-pointer {
    background: rgba(42,52,70,0.8) !important;
    backdrop-filter: blur(4px) !important;
}

.absolute.h-\\[115px\\].w-\\[155px\\].flex.bottom-0.justify-center.items-center.text-xl.leading-7.cursor-pointer {
    background: rgba(30,40,58,0.9) !important;
    color: #ffffff !important;
    font-weight: 600 !important;
    text-shadow: 0 2px 8px rgba(0,0,0,0.5) !important;
    border: 1px solid rgba(74,158,255,0.3) !important;
}


.text-sm.break-all.max-w-\\[350px\\] {
    color: rgba(255,255,255,0.9) !important;
    line-height: 1.5 !important;
}


.bg-border-secondary.relative.h-px.w-1\\/2.mt-3.mb-4,
.bg-border-secondary.relative.h-px.w-1\\/2.mb-10 {
    background: linear-gradient(90deg, transparent, rgba(74,158,255,0.3), transparent) !important;
}


.fixed.left-1\\/2.top-1\\/2.z-50.w-full.-translate-x-1\\/2.-translate-y-1\\/2.border.shadow-lg.duration-200 {
    background: linear-gradient(180deg, #1a2332 0%, #0f1923 100%) !important;
    border: 1px solid rgba(74,158,255,0.25) !important;
    box-shadow: 0 8px 32px rgba(0,0,0,0.5) !important;
}

.bg-bg-primary.px-10.py-\\[54px\\].d-flex.justify-between.h-full.gap-\\[40px\\].overflow-hidden {
    background: transparent !important;
}

.w-\\[540px\\].h-full.d-flex.flex-col {
    background: transparent !important;
}


#radix-vue-tabs-v-61-trigger-create,
#radix-vue-tabs-v-61-trigger-sent-posts {
    background: linear-gradient(135deg, rgba(42,52,70,0.7) 0%, rgba(30,40,58,0.8) 100%) !important;
    border: 1px solid rgba(74,158,255,0.15) !important;
    color: rgba(255,255,255,0.7) !important;
    border-radius: 8px !important;
    padding: 8px 16px !important;
}

#radix-vue-tabs-v-61-trigger-create[data-state="active"],
#radix-vue-tabs-v-61-trigger-sent-posts[data-state="active"] {
    background: linear-gradient(135deg, #4a9eff 0%, #3b82f6 100%) !important;
    color: #ffffff !important;
    box-shadow: 0 4px 12px rgba(74,158,255,0.3) !important;
}

.text-2xl.font-semibold.leading-8.py-4 {
    color: #ffffff !important;
    border-bottom: 1px solid rgba(74,158,255,0.2) !important;
}

.d-flex.flex-col.border.border-dashed.rounded.w-\\[96px\\].h-\\[96px\\].gap-2.justify-center.items-center {
    background: rgba(30,40,58,0.7) !important;
    border: 2px dashed rgba(74,158,255,0.3) !important;
    border-radius: 12px !important;
    transition: background 0.2s ease, border-color 0.2s ease !important;
}

.d-flex.flex-col.border.border-dashed.rounded.w-\\[96px\\].h-\\[96px\\].gap-2.justify-center.items-center:hover {
    background: rgba(42,52,70,0.9) !important;
    border-color: rgba(74,158,255,0.6) !important;
}

.text-xs.font-medium.leading-\\[18px\\].text-text-disabled {
    color: rgba(255,255,255,0.5) !important;
}

.w-\\[525px\\].h-full.bg-bg-tertiary.rounded-lg.px-8.py-6.d-flex.flex-col {
    background: linear-gradient(135deg, rgba(42,52,70,0.8) 0%, rgba(30,40,58,0.9) 100%) !important;
    border: 1px solid rgba(74,158,255,0.15) !important;
    box-shadow: -4px 0 24px rgba(0,0,0,0.3) !important;
}

.d-flex.justify-between.items-center {
    background: transparent !important;
}

.text-lg.font-semibold.leading-7 {
    color: #ffffff !important;
}

#radix-vue-tabs-v-64-trigger-full,
#radix-vue-tabs-v-64-trigger-limited {
    background: linear-gradient(135deg, rgba(42,52,70,0.7) 0%, rgba(30,40,58,0.8) 100%) !important;
    border: 1px solid rgba(74,158,255,0.15) !important;
    color: rgba(255,255,255,0.7) !important;
    border-radius: 6px !important;
    padding: 6px 12px !important;
}

#radix-vue-tabs-v-64-trigger-full[data-state="active"],
#radix-vue-tabs-v-64-trigger-limited[data-state="active"] {
    background: linear-gradient(135deg, #4a9eff 0%, #3b82f6 100%) !important;
    color: #ffffff !important;
}

.w-\\[420px\\].p-6.bg-bg-card.rounded-lg.border.border-solid.border-secondary.relative.justify-self-center {
    background: linear-gradient(135deg, rgba(42,52,70,0.9) 0%, rgba(30,40,58,0.95) 100%) !important;
    border: 1px solid rgba(74,158,255,0.2) !important;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4) !important;
}

.absolute.top-6.left-6 {
    background: transparent !important;
}

.flex.flex-column.items-center.text-center.mb-3 {
    background: transparent !important;
}

h4 {
    color: #ffffff !important;
    font-weight: 600 !important;
}

p {
    color: rgba(255,255,255,0.7) !important;
}

.flex.self-center.text-xs.leading-\\[18px\\].font-medium.gap-2.bg-bg-menu-item.rounded.py-1.px-\\[10px\\] {
    background: rgba(74,158,255,0.2) !important;
    border: 1px solid rgba(74,158,255,0.3) !important;
    color: #ffffff !important;
}

.text-sm.break-words.mt-4 {
    color: rgba(255,255,255,0.8) !important;
}

.flex.px-4.py-3 {
    background: rgba(30,40,58,0.5) !important;
    border-top: 1px solid rgba(74,158,255,0.15) !important;
    border-radius: 0 0 12px 12px !important;
}

.flex.justify-between.items-center {
    background: transparent !important;
}

.text-xs.text-text-disabled.mr-auto {
    color: rgba(255,255,255,0.4) !important;
}

.flex.items-center.gap-x-4 {
    background: transparent !important;
}

.text-xl.font-semibold.tracking-tight {
    color: #ffffff !important;
}

footer {
    background: linear-gradient(180deg, #1a2332 0%, #0f1923 100%) !important;
    border-top: 1px solid rgba(74,158,255,0.15) !important;
}

a {
    color: #4a9eff !important;
    transition: color 0.2s ease !important;
}

a:hover {
    color: #7bb8ff !important;
}

        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }

        .animate-spin {
            animation: spin 1s linear infinite !important;
        }

        [data-testid="starred-wrapper"] {
            background: linear-gradient(180deg, #1a2332 0%, #0f1923 100%) !important;
            border-left: 1px solid rgba(74,158,255,0.1) !important;
            box-shadow: -4px 0 24px rgba(0,0,0,0.3) !important;
        }

        .inline-flex.items-center.rounded.text-xs.leading-\\[18px\\].font-medium.cursor-pointer.text-text-primary.px-2\\.5.py-1.bg-bg-tertiary {
            background: linear-gradient(135deg, rgba(42,52,70,0.9) 0%, rgba(30,40,58,0.95) 100%) !important;
            border: 1px solid rgba(74,158,255,0.25) !important;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2) !important;
        }

        ::-webkit-scrollbar {
            width: 8px !important;
            height: 8px !important;
        }

        ::-webkit-scrollbar-track {
            background: rgba(15,25,35,0.5) !important;
            border-radius: 4px !important;
        }

        ::-webkit-scrollbar-thumb {
            background: rgba(74,158,255,0.5) !important;
            border-radius: 4px !important;
        }

        ::-webkit-scrollbar-thumb:hover {
            background: rgba(74,158,255,0.7) !important;
        }

        .relative.group.cursor-pointer.\\[\\&\\:hover\\>div\\:first-child\\]\\:opacity-50.\\[\\&\\:hover\\>button\\]\\:flex.cursor-pointer {
            border-radius: 8px !important;
            overflow: hidden !important;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
        }

        .relative.w-full.h-full.rounded-lg.bg-cover.bg-center.bg-no-repeat.overflow-hidden {
            border: 1px solid rgba(74,158,255,0.15) !important;
        }

        .absolute.z-10.top-1.right-1.w-5.h-5.rounded-full.justify-center.items-center.hidden.cursor-pointer {
            background: rgba(42,52,70,0.9) !important;
            border: 1px solid rgba(74,158,255,0.3) !important;
            display: flex !important;
        }

        .absolute.z-10.top-1.right-1.w-5.h-5.rounded-full.justify-center.items-center.hidden.cursor-pointer:hover {
            background: linear-gradient(135deg, #4a9eff 0%, #3b82f6 100%) !important;
        }

        #radix-vue-tabs-v-35-trigger-photo,
        #radix-vue-tabs-v-35-trigger-video,
        #radix-vue-tabs-v-35-trigger-audio {
            background: linear-gradient(135deg, rgba(42,52,70,0.7) 0%, rgba(30,40,58,0.8) 100%) !important;
            border: 1px solid rgba(74,158,255,0.15) !important;
            color: rgba(255,255,255,0.7) !important;
            border-radius: 8px !important;
            padding: 8px 16px !important;
        }

        #radix-vue-tabs-v-35-trigger-photo[data-state="active"],
        #radix-vue-tabs-v-35-trigger-video[data-state="active"],
        #radix-vue-tabs-v-35-trigger-audio[data-state="active"] {
            background: linear-gradient(135deg, #4a9eff 0%, #3b82f6 100%) !important;
            color: #ffffff !important;
            box-shadow: 0 4px 12px rgba(74,158,255,0.3) !important;
        }

        .fixed.inset-0.z-50.bg-black\\/80 {
            backdrop-filter: blur(4px) !important;
        }

        .fixed.left-1\\/2.top-1\\/2.-translate-x-1\\/2.-translate-y-1\\/2.gap-4.border.py-6.px-5.shadow-lg {
            background: linear-gradient(180deg, #1a2332 0%, #0f1923 100%) !important;
            border: 1px solid rgba(74,158,255,0.25) !important;
            box-shadow: 0 8px 32px rgba(0,0,0,0.5) !important;
        }

        .flex.flex-col.gap-y-1.5.text-center.sm\\:text-left {
            color: #ffffff !important;
        }

        .flex.items-center.gap-4.text-xl.font-semibold.tracking-tight {
            color: #ffffff !important;
            border-bottom: 1px solid rgba(74,158,255,0.2) !important;
            padding-bottom: 12px !important;
        }

        .absolute.right-4.rounded-sm.opacity-70.ring-offset-bg-primary {
            background: rgba(42,52,70,0.8) !important;
            border: 1px solid rgba(74,158,255,0.2) !important;
            color: #ffffff !important;
        }

        .absolute.right-4.rounded-sm.opacity-70.ring-offset-bg-primary:hover {
            background: rgba(74,158,255,0.3) !important;
        }

        .bg-bg-secondary.border-r.border-solid.border-border-secondary.flex.flex-col.w-\\[270px\\] {
            background: linear-gradient(180deg, #1a2332 0%, #0f1923 100%) !important;
            border-right: 1px solid rgba(74,158,255,0.1) !important;
            box-shadow: 4px 0 24px rgba(0,0,0,0.3) !important;
        }

        .inline-flex.items-center.justify-center.rounded.bg-bg-menu-item.p-\\[5px\\].w-full.gap-1 {
            background: linear-gradient(135deg, rgba(42,52,70,0.7) 0%, rgba(30,40,58,0.8) 100%) !important;
            border: 1px solid rgba(74,158,255,0.15) !important;
            color: rgba(255,255,255,0.8) !important;
            transition: background 0.2s ease, border-color 0.2s ease, transform 0.2s ease !important;
        }

        .inline-flex.items-center.justify-center.rounded.bg-bg-menu-item.p-\\[5px\\].w-full.gap-1:hover {
            background: linear-gradient(135deg, rgba(52,72,100,0.9) 0%, rgba(40,60,88,1) 100%) !important;
            border-color: rgba(74,158,255,0.3) !important;
            transform: translateY(-1px) !important;
        }

        .w-full.px-4.py-3.bg-bg-secondary {
            background: linear-gradient(180deg, #1a2332 0%, #0f1923 100%) !important;
            border-bottom: 1px solid rgba(74,158,255,0.15) !important;
        }

        .d-flex.gap-2.py-2.px-4.h-\\[44px\\].w-full.flex.cursor-pointer.text-text-primary.font-medium.items-center {
            background: linear-gradient(135deg, rgba(42,52,70,0.7) 0%, rgba(30,40,58,0.8) 100%) !important;
            border: 1px solid rgba(74,158,255,0.15) !important;
            border-radius: 6px !important;
            margin-bottom: 2px !important;
        }

        .d-flex.gap-2.py-2.px-4.h-\\[44px\\].w-full.flex.cursor-pointer.text-text-primary.font-medium.items-center:hover {
            background: linear-gradient(135deg, rgba(52,72,100,0.9) 0%, rgba(40,60,88,1) 100%) !important;
            border-color: rgba(74,158,255,0.3) !important;
            transform: translateX(2px) !important;
        }

        .py-2.px-4.h-\\[44px\\].w-full.flex.text-text-primary.font-medium.items-center.border-t.border-b.border-border-secondary {
            background: rgba(30,40,58,0.8) !important;
            border-color: rgba(74,158,255,0.15) !important;
        }

        .\\!grid.gap-2.grid-cols-7.2xl\\:grid-cols-9.3xl\\:grid-cols-12 {
            background: transparent !important;
            padding: 12px !important;
        }

        .relative.h-\\[112px\\].\\[\\&\\>div\\>div\\]\\:gap-0.5.\\[\\&_button\\]\\:text-xs.\\[\\&_button\\]\\:px-2 {
            background: rgba(42,52,70,0.5) !important;
            border-radius: 8px !important;
            border: 1px solid rgba(74,158,255,0.1) !important;
        }

        .w-full.h-full.rounded-lg.flex.items-center.justify-center.border.border-dashed.border-border-secondary {
            border-color: rgba(74,158,255,0.2) !important;
            background: rgba(30,40,58,0.5) !important;
        }

        .flex.flex-col.items-center.gap-2 {
            color: rgba(255,255,255,0.6) !important;
        }

        .text-text-secondary.text-xs.text-center.leading-normal {
            color: rgba(255,255,255,0.5) !important;
        }

        .inline-flex.items-center.justify-center.gap-2.whitespace-nowrap.rounded-md.font-medium.ring-offset-bg-primary {
            background: rgba(42,52,70,0.7) !important;
            border: 1px solid rgba(74,158,255,0.2) !important;
            color: #ffffff !important;
        }

        .inline-flex.items-center.justify-center.gap-2.whitespace-nowrap.rounded-md.font-medium.ring-offset-bg-primary:hover {
            background: rgba(52,72,100,0.9) !important;
            border-color: rgba(74,158,255,0.4) !important;
        }

        .flex-grow.h-2.bg-secondary\\/30.relative {
            background: rgba(42,52,70,0.5) !important;
            border-radius: 4px !important;
            overflow: hidden !important;
        }

        .h-full.bg-secondary.w-\\[var\\(--width\\)\\] {
            background: linear-gradient(90deg, #4a9eff 0%, #3b82f6 100%) !important;
            border-radius: 4px !important;
            box-shadow: 0 0 10px rgba(74,158,255,0.5) !important;
        }


        .font-medium.\\!text-\\[26px\\] {
            color: #ffffff !important;
            text-shadow: 0 2px 8px rgba(74,158,255,0.3) !important;
        }

        .border.border-solid.border-border-secondary.p-3.rounded-lg,
        .flex.flex-col.w-full.gap-2.border.border-solid.border-border-secondary.p-3.rounded-lg,
        .flex.flex-col.w-full.gap-4.border.border-solid.border-border-secondary.p-3.rounded-lg {
            background: linear-gradient(135deg, rgba(42,52,70,0.7) 0%, rgba(30,40,58,0.8) 100%) !important;
            border: 1px solid rgba(74,158,255,0.2) !important;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2) !important;
        }

        .text-sm.text-text-secondary.mb-1 {
            color: rgba(255,255,255,0.6) !important;
        }

        .px-4.py-2.bg-bg-card.rounded-lg.text-base {
            background: linear-gradient(135deg, rgba(42,52,70,0.8) 0%, rgba(30,40,58,0.9) 100%) !important;
            border: 1px solid rgba(74,158,255,0.2) !important;
            border-radius: 12px !important;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
        }

        .text-lg.font-semibold.leading-5.text-text-secondary.mt-1.flex.gap-2.items-center {
            color: rgba(255,255,255,0.8) !important;
        }

        .text-xl.font-semibold.leading-7.tracking-\\[-0\\.1px\\] {
            color: #ffffff !important;
            border-bottom: 1px solid rgba(74,158,255,0.2) !important;
            padding-bottom: 8px !important;
        }

        .bg-white-on-the-dark-bg.h-4.w-4.rounded-full.absolute.-translate-y-1.-translate-x-\\[1px\\].cursor-pointer {
            background: #4a9eff !important;
            box-shadow: 0 2px 8px rgba(74,158,255,0.5) !important;
            border: 1px solid rgba(255,255,255,0.3) !important;
        }

        .h-full.w-\\[945px\\].bg-bg-primary.d-flex.flex-col {
            background: linear-gradient(180deg, #141e2d 0%, #0d1721 100%) !important;
            border-left: 1px solid rgba(74,158,255,0.1) !important;
            border-right: 1px solid rgba(74,158,255,0.1) !important;
        }

        .text-text-primary.text-lg.p-4.border-b.border-solid.border-border-secondary.w-full.bg-bg-secondary {
            background: linear-gradient(180deg, #1a2332 0%, #0f1923 100%) !important;
            border-bottom: 1px solid rgba(74,158,255,0.15) !important;
            color: #ffffff !important;
        }

        .w-\\[226px\\].min-w-\\[226px\\].flex.flex-col.gap-2 {
            background: rgba(30,40,58,0.5) !important;
            border-radius: 8px !important;
            padding: 12px !important;
        }

        #reka-accordion-trigger-v-11,
        #reka-accordion-trigger-v-13,
        #reka-accordion-trigger-v-15 {
            background: linear-gradient(135deg, rgba(42,52,70,0.7) 0%, rgba(30,40,58,0.8) 100%) !important;
            border: 1px solid rgba(74,158,255,0.15) !important;
            border-radius: 8px !important;
            color: #ffffff !important;
            padding: 10px !important;
        }

        #reka-accordion-trigger-v-11:hover,
        #reka-accordion-trigger-v-13:hover,
        #reka-accordion-trigger-v-15:hover {
            background: linear-gradient(135deg, rgba(52,72,100,0.9) 0%, rgba(40,60,88,1) 100%) !important;
            border-color: rgba(74,158,255,0.3) !important;
        }

        #reka-collapsible-content-v-12,
        #reka-collapsible-content-v-14,
        #reka-collapsible-content-v-16 {
            background: rgba(30,40,58,0.5) !important;
            border-left: 2px solid rgba(74,158,255,0.3) !important;
            border-radius: 0 0 8px 8px !important;
            padding: 8px !important;
        }

        #radix-vue-tabs-v-4-trigger-new,
        #radix-vue-tabs-v-4-trigger-launch,
        #radix-vue-tabs-v-4-trigger-manage {
            background: linear-gradient(135deg, rgba(42,52,70,0.6) 0%, rgba(30,40,58,0.7) 100%) !important;
            border: 1px solid rgba(74,158,255,0.15) !important;
            color: rgba(255,255,255,0.7) !important;
            border-radius: 6px !important;
            padding: 8px 16px !important;
        }

        #radix-vue-tabs-v-4-trigger-new[data-state="active"],
        #radix-vue-tabs-v-4-trigger-launch[data-state="active"],
        #radix-vue-tabs-v-4-trigger-manage[data-state="active"] {
            background: linear-gradient(135deg, #4a9eff 0%, #3b82f6 100%) !important;
            color: #ffffff !important;
            box-shadow: 0 4px 12px rgba(74,158,255,0.3) !important;
        }

        .inline-flex.items-center.justify-center.rounded.bg-bg-menu-item.p-\\[5px\\].gap-1.w-\\[407px\\] {
            background: rgba(30,40,58,0.9) !important;
            border: 1px solid rgba(74,158,255,0.2) !important;
            color: #ffffff !important;
        }

        .text-sm.font-medium.leading-none.peer-disabled\\:cursor-not-allowed.peer-disabled\\:opacity-70 {
            color: rgba(255,255,255,0.8) !important;
        }

        .text-xs.font-medium.leading-\\[18px\\].text-text-secondary {
            color: rgba(255,255,255,0.6) !important;
        }

        .text-sm.font-semibold.leading-5.text-text-primary {
            color: #ffffff !important;
        }

        .peer.inline-flex.h-6.w-11.shrink-0.cursor-pointer.border-2.items-center.rounded-full.border-transparent {
            background: rgba(42,52,70,0.8) !important;
        }

        .peer.inline-flex.h-6.w-11.shrink-0.cursor-pointer.border-2.items-center.rounded-full.border-transparent[data-state="checked"] {
            background: linear-gradient(135deg, #4a9eff 0%, #3b82f6 100%) !important;
        }

        .pointer-events-none.block.h-5.w-5.rounded-full.data-\\[state\\=checked\\]\\:bg-bg-tertiary.data-\\[state\\=unchecked\\]\\:bg-bg-tertiary {
            background: #ffffff !important;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3) !important;
        }

        .border.border-solid.border-border-secondary.rounded-lg.px-4.py-5.\\[\\&\\[data-state\\=open\\]\\]\\:border-primary {
            background: rgba(30,40,58,0.5) !important;
            border: 1px solid rgba(74,158,255,0.15) !important;
        }

        .flex.gap-1.justify-between,
        .flex.p-4.gap-8.w-full.h-full,
        .flex.flex-col.gap-2,
        .w-full.flex.flex-col.gap-3,
        .flex.items-center.gap-6,
        .flex.gap-2.items-end,
        .flex.flex-col.w-full.bg-bg-primary.relative,
        .d-flex.gap-2.bg-bg-primary.pt-3.px-4,
        .relative.overflow-hidden.w-full.h-full.px-4.py-3 {
            background: transparent !important;
        }

        .h-\\[56px\\].flex-shrink-0.flex.items-center.text-text-primary.font-medium.gap-3.bg-bg-secondary.border-b.border-solid.border-border-secondary {
            background: linear-gradient(180deg, #1a2332 0%, #0f1923 100%) !important;
            border-bottom: 1px solid rgba(74,158,255,0.15) !important;
        }

        .absolute.px-4.py-1.border.border-solid.border-border-secondary.z-20.bg-bg-secondary.rounded.justify-self-center {
            background: linear-gradient(135deg, #1a2332 0%, #0f1923 100%) !important;
            border: 1px solid rgba(74,158,255,0.3) !important;
            box-shadow: 0 4px 16px rgba(0,0,0,0.4) !important;
        }

        .transition-opacity.duration-500.opacity-0 {
            transition: opacity 0.3s ease, transform 0.3s ease !important;
        }

        .transition-opacity.duration-500.opacity-0:hover,
        .transition-opacity.duration-500.opacity-0[data-state="open"] {
            opacity: 1 !important;
            transform: translateY(-2px) !important;
        }

        .w-5.h-5.border.rounded-sm.border-solid.flex.items-center.justify-center.border-new-limits.bg-new-limits\\/10 {
            background: rgba(30,40,58,0.9) !important;
            border-color: rgba(74,158,255,0.3) !important;
        }

        .w-5.h-5.border.rounded-sm.border-solid.flex.items-center.justify-center.border-new-limits.bg-new-limits\\/10[data-state="checked"] {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;
            border-color: #10b981 !important;
        }

        [role="menu"][data-radix-menu-content] {
            background: linear-gradient(135deg, rgba(42,52,70,0.95) 0%, rgba(30,40,58,0.98) 100%) !important;
            border: 1px solid rgba(74,158,255,0.3) !important;
            backdrop-filter: blur(10px) !important;
            box-shadow: 0 8px 32px rgba(0,0,0,0.4) !important;
            min-width: 260px !important;
            width: 260px !important;
        }

        [role="menu"] [role="menuitem"] {
            transition: background 0.2s ease, color 0.2s ease !important;
        }

        [role="menu"] [role="menuitem"]:hover {
            background: rgba(74,158,255,0.15) !important;
            color: #ffffff !important;
        }

        .jkee-font-size-btn {
            background: rgba(42,52,70,0.7) !important;
            border: 1px solid rgba(74,158,255,0.2) !important;
            color: rgba(255,255,255,0.7) !important;
            cursor: pointer !important;
            min-width: 40px !important;
            text-align: center !important;
        }

        .jkee-font-size-btn:hover {
            background: rgba(52,72,100,0.8) !important;
            border-color: rgba(74,158,255,0.4) !important;
            color: rgba(255,255,255,0.9) !important;
            transform: translateY(-1px) !important;
        }

        .jkee-font-size-btn.active {
            background: linear-gradient(135deg, #4a9eff 0%, #3b82f6 100%) !important;
            border-color: rgba(74,158,255,0.6) !important;
            color: #ffffff !important;
            box-shadow: 0 0 12px rgba(74,158,255,0.4) !important;
        }

        .jkee-shortcut-btn {
            background: rgba(42,52,70,0.7) !important;
            border: 1px solid rgba(74,158,255,0.2) !important;
            color: rgba(255,255,255,0.7) !important;
            cursor: pointer !important;
            transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease, transform 0.2s ease !important;
            min-width: 70px !important;
            text-align: center !important;
        }

        .jkee-shortcut-btn:hover {
            background: rgba(52,72,100,0.8) !important;
            border-color: rgba(74,158,255,0.4) !important;
            color: rgba(255,255,255,0.9) !important;
            transform: translateY(-1px) !important;
        }

        .jkee-shortcut-btn.active,
        .jkee-shortcut-btn.listening {
            background: linear-gradient(135deg, #4a9eff 0%, #3b82f6 100%) !important;
            border-color: rgba(74,158,255,0.6) !important;
            color: #ffffff !important;
            box-shadow: 0 0 12px rgba(74,158,255,0.4) !important;
        }

        .jkee-shortcut-btn.reset {
            background: rgba(220,38,38,0.3) !important;
            border-color: rgba(220,38,38,0.5) !important;
            color: #ff8a8a !important;
        }

        .jkee-shortcut-btn.reset:hover {
            background: rgba(220,38,38,0.5) !important;
            border-color: rgba(220,38,38,0.7) !important;
            color: #ffffff !important;
        }

        .jkee-shortcut-display {
            background: rgba(30,40,58,0.5) !important;
            border: 1px solid rgba(74,158,255,0.2) !important;
            border-radius: 6px !important;
            padding: 6px 8px !important;
            font-size: 13px !important;
            font-weight: 600 !important;
            color: #4a9eff !important;
            text-align: center !important;
            letter-spacing: 0.5px !important;
            margin: 4px 8px !important;
            height: 32px !important;
            overflow: hidden !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
        }

        .jkee-shortcut-info {
            font-size: 11px !important;
            color: rgba(255,255,255,0.5) !important;
            padding: 4px 8px !important;
            background: rgba(0,0,0,0.2) !important;
            border-radius: 4px !important;
            margin: 4px 8px 8px 8px !important;
            text-align: center !important;
            line-height: 1.4 !important;
            height: 40px !important;
            overflow: hidden !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
        }



        .w-\\[1248px\\].bg-bg-primary.d-flex.flex-col {
            background: linear-gradient(180deg, #141e2d 0%, #0d1721 100%) !important;
            border-left: 1px solid rgba(74,158,255,0.1) !important;
            border-right: 1px solid rgba(74,158,255,0.1) !important;
        }

        .w-full.h-\\[48px\\].pl-4.pt-3.flex.bg-bg-secondary.border-b.border-solid.border-border-secondary {
            background: linear-gradient(180deg, #1f2937 0%, #1a2332 100%) !important;
            border-bottom: 1px solid rgba(74,158,255,0.2) !important;
            box-shadow: 0 4px 16px rgba(0,0,0,0.3) !important;
        }

        .w-full.flex.flex-col.h-full.overflow-hidden.p-3.pb-\\[44px\\] {
            background: transparent !important;
        }

        .flex.justify-between.mb-1 {
            background: transparent !important;
        }

        .pt-2.h-full.w-full.flex.flex-col {
            background: transparent !important;
        }

        .relative.w-full.border.border-solid.border-border-secondary.rounded-lg.overflow-hidden:has([class*="table-cell-custom-management"]) {
            border: 1px solid rgba(74,158,255,0.2) !important;
            box-shadow: 0 4px 24px rgba(0,0,0,0.3) !important;
            border-radius: 10px !important;
        }

        thead[class*="bg-bg-tertiary"],
        [class*="sticky"][class*="bg-bg-tertiary"] {
            background: linear-gradient(180deg, #1f2937 0%, #1a2332 100%) !important;
        }

        th[class*="text-muted-foreground"],
        .h-12.px-3.py-4.text-left.align-middle.font-medium[class*="text-muted-foreground"] {
            background: linear-gradient(180deg, #1f2937 0%, #1a2332 100%) !important;
            color: rgba(255,255,255,0.7) !important;
            border-bottom: 1px solid rgba(74,158,255,0.25) !important;
            font-weight: 600 !important;
            letter-spacing: 0.3px !important;
        }

        tr[class*="hover:bg-muted"],
        tr.border-solid[class*="transition-colors"] {
            background: linear-gradient(135deg, rgba(26,35,50,0.85) 0%, rgba(18,28,42,0.9) 100%) !important;
            border-bottom: 1px solid rgba(74,158,255,0.1) !important;
            transition: background 0.2s ease, border-color 0.2s ease !important;
        }

        tr[class*="hover:bg-muted"]:hover,
        tr.border-solid[class*="transition-colors"]:hover {
            background: linear-gradient(135deg, rgba(52,72,100,0.85) 0%, rgba(40,60,88,0.95) 100%) !important;
            border-color: rgba(74,158,255,0.25) !important;
        }


        [class*="table-cell-custom-management"] {
            color: rgba(255,255,255,0.85) !important;
            border-bottom: 1px solid rgba(74,158,255,0.08) !important;
        }


        .flex.gap-1.items-center.h-\\[26px\\].px-2.rounded-md.border.border-solid.border-border-primary {
            background: rgba(74,158,255,0.12) !important;
            border: 1px solid rgba(74,158,255,0.3) !important;
            color: #4a9eff !important;
            border-radius: 6px !important;
            transition: background 0.2s ease, border-color 0.2s ease !important;
        }

        .flex.gap-1.items-center.h-\\[26px\\].px-2.rounded-md.border.border-solid.border-border-primary:hover {
            background: rgba(74,158,255,0.2) !important;
            border-color: rgba(74,158,255,0.5) !important;
        }

        .inline-block.max-w-\\[80px\\].overflow-hidden.truncate {
            color: inherit !important;
        }

        .group.flex.h-10.items-center.justify-between.rounded-md.border.px-3.py-2.text-sm {
            background: rgba(30,40,58,0.9) !important;
            border: 1px solid rgba(74,158,255,0.25) !important;
            color: #ffffff !important;
            transition: border-color 0.2s ease, box-shadow 0.2s ease !important;
        }

        .group.flex.h-10.items-center.justify-between.rounded-md.border.px-3.py-2.text-sm:hover,
        .group.flex.h-10.items-center.justify-between.rounded-md.border.px-3.py-2.text-sm[data-state="open"] {
            border-color: rgba(74,158,255,0.5) !important;
            box-shadow: 0 0 12px rgba(74,158,255,0.15) !important;
            background: rgba(35,45,65,0.95) !important;
        }

        /* Select с flex gap (кастомный select с иконкой) */
        .flex.gap-1.items-center.text-text-primary.h-10.w-full.rounded-md.border.border-border-primary {
            background: rgba(30,40,58,0.9) !important;
            border: 1px solid rgba(74,158,255,0.25) !important;
            color: #ffffff !important;
            transition: border-color 0.2s ease !important;
        }

        .flex.gap-1.items-center.text-text-primary.h-10.w-full.rounded-md.border.border-border-primary:focus-within {
            border-color: rgba(74,158,255,0.5) !important;
            box-shadow: 0 0 12px rgba(74,158,255,0.15) !important;
        }


        .fixed.left-1\\/2.top-1\\/2.z-50.w-\\[1200px\\].bg-bg-secondary.flex.flex-col.px-6.gap-0.py-5[role="dialog"] {
            background: linear-gradient(180deg, #1a2332 0%, #0f1923 100%) !important;
            border: 2px solid rgba(74,158,255,0.3) !important;
            border-radius: 16px !important;
            box-shadow: 0 20px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(74,158,255,0.2) inset !important;
        }


        .px-6.py-5.bg-bg-primary.h-full.overflow-hidden {
            background: linear-gradient(135deg, #1a2332, #0f1923) !important;
        }


        #radix-vue-dialog-content-v-10 > div.px-6.py-5.bg-bg-primary.h-full.overflow-hidden td.min-h-9.min-w-10.bg-bg-input.border.border-solid.rounded.flex.justify-center.items-center.text-sm.font-medium.leading-5.px-\[10px\] {
            background: linear-gradient(135deg, #2a3a4a, #1a2a38) !important;
            border-color: rgba(74,158,255,0.3) !important;
        }


        textarea[data-testid="bulk-regular-textarea"] {
            background: linear-gradient(135deg, #2d3e50, #1d2e3c) !important;
            border-color: rgba(74,158,255,0.4) !important;
            color: #ffffff !important;
        }

        textarea[data-testid="bulk-regular-textarea"]:focus {
            border-color: rgba(74,158,255,0.8) !important;
        }



        select {
            background: rgba(30,40,58,0.9) !important;
            border: 1px solid rgba(74,158,255,0.25) !important;
            color: #ffffff !important;
            border-radius: 6px !important;
            transition: border-color 0.2s ease !important;
        }

        select:focus {
            border-color: rgba(74,158,255,0.5) !important;
            outline: none !important;
            box-shadow: 0 0 12px rgba(74,158,255,0.15) !important;
        }

        option {
            background: #1a2332 !important;
            color: #ffffff !important;
        }


        .block.w-full.min-w-full {
            background: linear-gradient(135deg, rgba(42,52,70,0.8) 0%, rgba(30,40,58,0.9) 100%) !important;
            border: 1px solid rgba(74,158,255,0.15) !important;
            border-radius: 8px !important;
            color: #ffffff !important;
            transition: border-color 0.2s ease !important;
        }

        .block.w-full.min-w-full:hover {
            border-color: rgba(74,158,255,0.3) !important;
        }

[role="dialog"][class*="w-[1200px]"][class*="bg-bg-secondary"] {
    background: linear-gradient(180deg, #1a2332 0%, #0f1923 100%) !important;
    border: 1px solid rgba(74,158,255,0.2) !important;
}


[role="dialog"] .bg-bg-tertiary.rounded-lg {
    background: linear-gradient(135deg, rgba(42,52,70,0.8) 0%, rgba(30,40,58,0.9) 100%) !important;
    border: 1px solid rgba(74,158,255,0.15) !important;
}

[role="dialog"] .cm-half-card {
    background: linear-gradient(135deg, rgba(35,45,60,0.7) 0%, rgba(25,35,50,0.8) 100%) !important;
    border: 1px solid rgba(74,158,255,0.15) !important;
    border-radius: 10px !important;
    padding: 12px !important;
}

[role="dialog"] [role="tablist"] button {
    background: rgba(42,52,70,0.6) !important;
    border: 1px solid rgba(74,158,255,0.1) !important;
}

[role="dialog"] [role="tablist"] button[data-state="active"] {
    background: linear-gradient(135deg, #4a9eff 0%, #3b82f6) !important;
    color: white !important;
}

.flex.flex-col.justify-between.items-center.py-2.px-3.my-1.gap-1\\.5.self-stretch.rounded-lg.cursor-pointer.w-full.hover\\:bg-bg-card {
    background: linear-gradient(135deg, rgba(42,52,70,0.8) 0%, rgba(30,40,58,0.9) 100%) !important;
    border: 1px solid rgba(74,158,255,0.15) !important;
}

.flex.flex-row.justify-between.items-center.w-full.mb-2 {
    border-bottom: 1px solid rgba(74,158,255,0.1) !important;
}

.text-xs.font-normal {
    color: rgba(255,255,255,0.5) !important;
}

.flex.flex-row.justify-between.items-center.gap-1 {
    background: transparent !important;
}

.bg-primary.rounded-full.w-\\[22px\\].h-\\[18px\\].px-1.py-0\\.5.mr-1.flex.items-center.justify-center {
    background: linear-gradient(135deg, #4a9eff 0%, #3b82f6 100%) !important;
    box-shadow: 0 2px 8px rgba(74,158,255,0.3) !important;
}

.text-white-on-the-dark-bg {
    color: #ffffff !important;
}

.flex.flex-row.justify-between.items-center.w-full {
    background: transparent !important;
}

.flex.flex-row.justify-start.items-center.w-\\[136px\\] {
    background: transparent !important;
}

.inline-flex.items-center.justify-center.font-normal.text-text-tertiary.select-none.shrink-0.bg-tertiary.rounded-full.border.border-solid.border-border-tertiary.text-base.leading-7.w-8.h-8.mr-2.relative {
    background: linear-gradient(135deg, rgba(42,52,70,0.9) 0%, rgba(30,40,58,0.95) 100%) !important;
    border: 1px solid rgba(74,158,255,0.2) !important;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2) !important;
}

.h-full.w-full.object-cover.inline-flex.items-center.justify-center.font-normal.text-text-tertiary.select-none.shrink-0.bg-tertiary.rounded-full.border.border-solid.border-border-tertiary.h-10.w-10.text-base.leading-7.overflow-hidden {
    border: 1px solid rgba(74,158,255,0.3) !important;
}

.flex.flex-col.justify-start.items-start {
    background: transparent !important;
}


.cursor-pointer.flex.flex-col {
    background: transparent !important;
}

.text-base.text-text-primary.font-semibold.truncate.w-\\[96px\\] {
    color: #ffffff !important;
    font-weight: 600 !important;
}

.text-sm.text-text-secondary {
    color: rgba(255,255,255,0.6) !important;
}

.cm-clamp-secondary {
    color: rgba(255,255,255,0.8) !important;
    line-height: 1.5 !important;
}

.flex.gap-2.ml-auto {
    background: transparent !important;
}

.flex.gap-2 {
    background: transparent !important;
}

[data-testid="task-label-block-vip-icon"] {
    color: rgba(255,255,255,0.4) !important;
}

.w-5.h-5.rounded-full.flex.items-center.justify-center.bg-orange-mark\\/10 {
    background: rgba(245,158,11,0.15) !important;
    border: 1px solid rgba(245,158,11,0.2) !important;
}

.text-orange-mark {
    color: #f59e0b !important;
}

.w-5.h-5.rounded-full.flex.items-center.justify-center.bg-icon-color-tertiary\\/10 {
    background: rgba(74,158,255,0.15) !important;
    border: 1px solid rgba(74,158,255,0.2) !important;
}

.absolute.bottom-0.right-0.rounded-full.bg-green-500.h-2\\.5.w-2\\.5 {
    background: #10b981 !important;
    box-shadow: 0 0 8px #10b981 !important;
    border: 1px solid rgba(255,255,255,0.3) !important;
}


.pt-3.px-2.flex.justify-between {
    background: transparent !important;
    border-bottom: 1px solid rgba(74,158,255,0.15) !important;
    padding-bottom: 12px !important;
    margin-bottom: 8px !important;
}

.text-\\[20px\\].font-semibold {
    color: #ffffff !important;
    font-weight: 600 !important;
    text-shadow: 0 2px 4px rgba(0,0,0,0.3) !important;
}

.flex.self-end {
    background: transparent !important;
}

.peer.inline-flex.h-6.w-11.shrink-0.cursor-pointer.border-2.items-center.rounded-full.border-transparent {
    background: rgba(42,52,70,0.8) !important;
}

.peer.inline-flex.h-6.w-11.shrink-0.cursor-pointer.border-2.items-center.rounded-full.border-transparent[data-state="checked"] {
    background: linear-gradient(135deg, #4a9eff 0%, #3b82f6 100%) !important;
}

.pointer-events-none.block.h-5.w-5.rounded-full.data-\\[state\\=checked\\]\\:bg-bg-tertiary.data-\\[state\\=unchecked\\]\\:bg-primary {
    background: #ffffff !important;
    box-shadow: 0 2px 4px rgba(0,0,0,0.3) !important;
}

.w-\\[320px\\].h-full.overflow-hidden.\\!w-\\[22\\%\\] {
    background: linear-gradient(180deg, #1a2332 0%, #0f1923 100%) !important;
    border-right: 1px solid rgba(74,158,255,0.1) !important;
    box-shadow: 4px 0 24px rgba(0,0,0,0.3) !important;
}

.flex.items-center.justify-between.border-b.border-solid.border-border-secondary {
    background: linear-gradient(180deg, #1f2937 0%, #1a2332 100%) !important;
    border-bottom: 1px solid rgba(74,158,255,0.2) !important;
}

.text-xl.px-2.flex.items-center.gap-1.h-\\[77px\\].min-h-\\[77px\\] {
    color: #ffffff !important;
}

.inline-flex.items-center.justify-center.gap-2.whitespace-nowrap.font-medium.ring-offset-bg-primary {
    background: rgba(42,52,70,0.7) !important;
    border: 1px solid rgba(74,158,255,0.2) !important;
    color: rgba(255,255,255,0.8) !important;
}

.w-5.h-5.border.rounded-sm.border-solid.flex.items-center.justify-center.border-reply.bg-reply\\/10 {
    background: rgba(30,40,58,0.9) !important;
    border-color: rgba(74,158,255,0.3) !important;
}

.w-5.h-5.border.rounded-sm.border-solid.flex.items-center.justify-center.border-like-wink.bg-like-wink\\/10 {
    background: rgba(245,158,11,0.15) !important;
    border-color: rgba(245,158,11,0.3) !important;
}

.flex.items-center.gap-2.border.border-solid.rounded-sm.h-7.px-2.border-reply.bg-reply\\/10 {
    background: rgba(30,40,58,0.8) !important;
    border-color: rgba(74,158,255,0.25) !important;
    color: #ffffff !important;
}

.flex.items-center.gap-2.border.border-solid.rounded-sm.h-7.px-2.border-like-wink.bg-like-wink\\/10 {
    background: rgba(245,158,11,0.15) !important;
    border-color: rgba(245,158,11,0.3) !important;
    color: #f59e0b !important;
}

.\\!grid.grid-cols-2.gap-2 {
    background: transparent !important;
}

.overflow-hidden.text-ellipsis.text-text-secondary {
    color: rgba(255,255,255,0.6) !important;
}

.truncate.text-text-secondary {
    color: rgba(255,255,255,0.6) !important;
}

.flex.flex-row.items-center.justify-between.gap-2.mt-1 {
    background: transparent !important;
}

.flex.flex-col.justify-center.pt-\\[6px\\] {
    background: transparent !important;
}

#online-mode {
    background: transparent !important;
}

.font-medium.text-sm.text-text-secondary {
    color: rgba(255,255,255,0.7) !important;
}

.relative.w-full.max-w-sm.items-center {
    background: transparent !important;
}

.flex.text-text-primary.h-10.w-full.rounded-md.border.border-border-primary.px-3.text-sm.ring-offset-bg-primary {
    background: rgba(30,40,58,0.9) !important;
    border: 1px solid rgba(74,158,255,0.25) !important;
    color: #ffffff !important;
}


        .absolute.start-0.inset-y-0.flex.items-center.justify-center.px-2 {
            color: rgba(74,158,255,0.6) !important;
        }

        nav[aria-label],
        .flex.justify-center.gap-4 {
            background: transparent !important;
        }


        .flex.justify-center.gap-4 button,
        nav[aria-label] button,
        nav[aria-label] a {
            background: rgba(42,52,70,0.7) !important;
            border: 1px solid rgba(74,158,255,0.2) !important;
            color: rgba(255,255,255,0.8) !important;
            border-radius: 6px !important;
            transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease !important;
        }

        .flex.justify-center.gap-4 button:hover,
        nav[aria-label] button:hover,
        nav[aria-label] a:hover {
            background: rgba(52,72,100,0.9) !important;
            border-color: rgba(74,158,255,0.4) !important;
            color: #ffffff !important;
        }

        .flex.justify-center.gap-4 button[aria-current="page"],
        nav[aria-label] button[aria-current="page"],
        nav[aria-label] [aria-current="page"] {
            background: linear-gradient(135deg, #4a9eff 0%, #3b82f6 100%) !important;
            border-color: rgba(74,158,255,0.6) !important;
            color: #ffffff !important;
            box-shadow: 0 2px 8px rgba(74,158,255,0.3) !important;
        }

        /* Обёртка для select шириной 220px */
        .relative.w-\\[220px\\] {
            background: transparent !important;
        }
        `;

        document.head.appendChild(style);
        stylesApplied = true;
        console.log('✓ Стили применены (полная версия)');
    }

    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `helper-notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100px)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 400);
        }, 3000);
    }

    function setupCopyFeatures() {
        document.addEventListener('click', function(e) {
            const target = e.target;

            let idElement = null;
            if (target.classList?.contains('text-text-secondary') && target.textContent?.match(/^\d+$/)) {
                idElement = target;
            } else if (target.parentElement?.classList?.contains('text-text-secondary') && target.textContent?.match(/^\d+$/)) {
                idElement = target.parentElement;
            }

            if (idElement) {
                const userId = idElement.textContent.trim();
                navigator.clipboard.writeText(userId).then(() => {
                    showNotification(`✓ ID скопирован: ${userId}`, 'success');
                }).catch(() => {
                    showNotification('✗ Ошибка копирования', 'error');
                });
                e.preventDefault();
                e.stopPropagation();
                return;
            }

            let nameElement = null;
            if (target.classList?.contains('truncate')) {
                const parent = target.closest('[data-testid="profile-ru-modal-trigger"], [data-testid="profile-tu-modal-trigger"], [data-testid="profile-tu-operator-modal-trigger"]');
                if (parent) {
                    nameElement = target;
                }
            }

            if (nameElement) {
                const userName = nameElement.textContent.trim();
                navigator.clipboard.writeText(userName).then(() => {
                    showNotification(`✓ Имя скопировано: ${userName}`, 'success');
                }).catch(() => {
                    showNotification('✗ Ошибка копирования', 'error');
                });
                e.preventDefault();
                e.stopPropagation();
            }
        }, true);
    }

    function applyFontSize(size) {
        currentFontSize = size;
        localStorage.setItem('jkee-font-size', size);

        const fontStyle = document.getElementById('frosjkee-font-styles');
        if (fontStyle) {
            fontStyle.textContent = `
                .bg-bg-user-chat.text-base,
                .bg-bg-card.text-base {
                    font-size: ${size}px !important;
                }
            `;
        }
        showNotification(`✓ Размер шрифта: ${size}px`, 'success');
    }

    function setCompactStyle(enabled) {
        let compactStyle = document.getElementById('frosjkee-compact-styles');
        if (enabled) {
            if (!compactStyle) {
                compactStyle = document.createElement('style');
                compactStyle.id = 'frosjkee-compact-styles';
                compactStyle.textContent = `
                    .p-4.flex.flex-col.gap-\\[15px\\] {
                        gap: 4px !important;
                        padding-top: 8px !important;
                        padding-bottom: 8px !important;
                    }
                    .py-2.px-4.w-fit.max-w-\\[420px\\].break-all.bg-bg-user-chat.rounded-lg.text-base.self-end.leading-\\[1\\.2\\],
                    .py-2.px-4.w-fit.max-w-\\[420px\\].break-all.bg-bg-card.rounded-lg.text-base {
                        padding-top: 3px !important;
                        padding-bottom: 3px !important;
                    }
                `;
                document.head.appendChild(compactStyle);
            }
        } else {
            if (compactStyle) compactStyle.remove();
        }
    }

    function applyCompactMode(enabled, notify = true) {
        isCompactMode = enabled;
        localStorage.setItem('jkee-compact-mode', enabled);
        setCompactStyle(enabled);
        if (notify) showNotification(enabled ? '✓ Компактно: ВКЛ' : '✓ Компактно: ВЫКЛ', 'success');
    }

    function addCompactToggle(menu) {
        if (menu.querySelector('.jkee-compact-section')) return;

        const separator = document.createElement('div');
        separator.className = 'h-px bg-border-secondary my-1';

        const compactSection = document.createElement('div');
        compactSection.className = 'jkee-compact-section';

        const compactLabel = document.createElement('div');
        compactLabel.className = 'px-2 py-1.5 text-xs text-text-secondary font-semibold';
        compactLabel.textContent = 'Компактные сообщения';

        const toggleContainer = document.createElement('div');
        toggleContainer.className = 'flex gap-1 px-2 py-1.5';

        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'jkee-font-size-btn flex-1 px-2 py-1.5 text-xs font-medium rounded';
        toggleBtn.textContent = isCompactMode ? 'ВКЛ' : 'ВЫКЛ';
        if (isCompactMode) toggleBtn.classList.add('active');

        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            const newState = !isCompactMode;
            applyCompactMode(newState);
            toggleBtn.textContent = newState ? 'ВКЛ' : 'ВЫКЛ';
            toggleBtn.classList.toggle('active', newState);
        });

        toggleContainer.appendChild(toggleBtn);
        compactSection.appendChild(compactLabel);
        compactSection.appendChild(toggleContainer);
        menu.appendChild(separator);
        menu.appendChild(compactSection);
    }

    function setWideStyle(enabled) {
        let wideStyle = document.getElementById('frosjkee-wide-styles');
        if (enabled) {
            if (!wideStyle) {
                wideStyle = document.createElement('style');
                wideStyle.id = 'frosjkee-wide-styles';
                wideStyle.textContent = `
                    .py-2.px-4.w-fit.max-w-\\[420px\\].break-all.bg-bg-user-chat.rounded-lg.text-base.self-end.leading-\\[1\\.2\\],
                    .py-2.px-4.w-fit.max-w-\\[420px\\].break-all.bg-bg-card.rounded-lg.text-base,
                    .flex.flex-col.self-end.gap-1.max-w-\\[420px\\],
                    .flex.flex-row.items-end.gap-2.max-w-\\[420px\\],
                    .flex.flex-col.gap-3.rounded-lg.p-4.relative.bg-bg-card.max-w-\\[420px\\],
                    .text-sm.break-all.max-w-\\[350px\\] {
                        max-width: 90% !important;
                    }
                `;
                document.head.appendChild(wideStyle);
            }
        } else {
            if (wideStyle) wideStyle.remove();
        }
    }

    function applyWideMode(enabled, notify = true) {
        isWideMode = enabled;
        localStorage.setItem('jkee-wide-mode', enabled);
        setWideStyle(enabled);
        if (notify) showNotification(enabled ? '✓ Широкие: ВКЛ' : '✓ Широкие: ВЫКЛ', 'success');
    }

    function addWideToggle(menu) {
        if (menu.querySelector('.jkee-wide-section')) return;

        const separator = document.createElement('div');
        separator.className = 'h-px bg-border-secondary my-1';

        const wideSection = document.createElement('div');
        wideSection.className = 'jkee-wide-section';

        const wideLabel = document.createElement('div');
        wideLabel.className = 'px-2 py-1.5 text-xs text-text-secondary font-semibold';
        wideLabel.textContent = 'Широкие сообщения';

        const toggleContainer = document.createElement('div');
        toggleContainer.className = 'flex gap-1 px-2 py-1.5';

        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'jkee-font-size-btn flex-1 px-2 py-1.5 text-xs font-medium rounded';
        toggleBtn.textContent = isWideMode ? 'ВКЛ' : 'ВЫКЛ';
        if (isWideMode) toggleBtn.classList.add('active');

        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            const newState = !isWideMode;
            applyWideMode(newState);
            toggleBtn.textContent = newState ? 'ВКЛ' : 'ВЫКЛ';
            toggleBtn.classList.toggle('active', newState);
        });

        toggleContainer.appendChild(toggleBtn);
        wideSection.appendChild(wideLabel);
        wideSection.appendChild(toggleContainer);
        menu.appendChild(separator);
        menu.appendChild(wideSection);
    }

    function addFontSizeButtons(menu) {
        if (menu.querySelector('.jkee-font-size-section')) return;

        const separator = document.createElement('div');
        separator.className = 'h-px bg-border-secondary my-1';

        const fontSizeSection = document.createElement('div');
        fontSizeSection.className = 'jkee-font-size-section';

        const fontSizeLabel = document.createElement('div');
        fontSizeLabel.className = 'px-2 py-1.5 text-xs text-text-secondary font-semibold';
        fontSizeLabel.textContent = 'Размер шрифта';

        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'flex gap-1 px-2 py-1.5';

        const sizes = [
            { size: '12', label: 'S' },
            { size: '13', label: 'M' },
            { size: '14', label: 'L' },
            { size: '16', label: 'XL' }
        ];

        sizes.forEach(({ size, label }) => {
            const btn = document.createElement('button');
            btn.className = 'jkee-font-size-btn flex-1 px-2 py-1.5 text-xs font-medium rounded transition-all';
            btn.textContent = label;
            btn.dataset.size = size;

            if (size === currentFontSize) {
                btn.classList.add('active');
            }

            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                applyFontSize(size);

                buttonContainer.querySelectorAll('.jkee-font-size-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });

            buttonContainer.appendChild(btn);
        });

        fontSizeSection.appendChild(fontSizeLabel);
        fontSizeSection.appendChild(buttonContainer);
        menu.appendChild(separator);
        menu.appendChild(fontSizeSection);
    }

    function addHotkeySettings(menu) {
        if (menu.querySelector('.jkee-hotkey-section')) return;

        const separator = document.createElement('div');
        separator.className = 'h-px bg-border-secondary my-1';

        const hotkeySection = document.createElement('div');
        hotkeySection.className = 'jkee-hotkey-section';

        const hotkeyLabel = document.createElement('div');
        hotkeyLabel.className = 'px-2 py-1.5 text-xs text-text-secondary font-semibold';
        hotkeyLabel.textContent = 'Горячая клавиша перевода';

        const currentDisplay = document.createElement('div');
        currentDisplay.className = 'jkee-shortcut-display';
        currentDisplay.textContent = formatShortcut(currentShortcut);

        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'flex gap-1 px-2 py-1.5';


        const setBtn = document.createElement('button');
        setBtn.className = 'jkee-shortcut-btn flex-1 px-2 py-1.5 text-xs font-medium rounded transition-all';
        setBtn.textContent = 'Изменить';


        const resetBtn = document.createElement('button');
        resetBtn.className = 'jkee-shortcut-btn reset flex-1 px-2 py-1.5 text-xs font-medium rounded transition-all';
        resetBtn.textContent = 'Сброс';


        const infoText = document.createElement('div');
        infoText.className = 'jkee-shortcut-info';
        infoText.textContent = 'Нажми "Изменить" → нажми клавиши или клик мышкой с Ctrl/Alt/Shift';

        setBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();

            if (isListeningForShortcut) {
                isListeningForShortcut = false;
                setBtn.classList.remove('listening');
                setBtn.textContent = 'Изменить';
                infoText.textContent = 'Настройка отменена';
                setTimeout(() => {
                    infoText.textContent = 'Нажми "Изменить" → нажми клавиши или клик мышкой с Ctrl/Alt/Shift';
                }, 2000);
                return;
            }

            isListeningForShortcut = true;
            setBtn.classList.add('listening');
            setBtn.textContent = 'Отмена';
            infoText.textContent = '🎯 Нажми ЛЮБУЮ комбинацию с модификатором...';

            if (listenTimeout) clearTimeout(listenTimeout);

            const keyHandler = (event) => {
                if (!isListeningForShortcut) {
                    document.removeEventListener('keydown', keyHandler);
                    return;
                }

                event.preventDefault();
                event.stopPropagation();

    
                if (event.key === 'Control' || event.key === 'Alt' || event.key === 'Shift') return;

                const newShortcut = {
                    ctrlKey: event.ctrlKey,
                    altKey: event.altKey,
                    shiftKey: event.shiftKey,
                    key: event.key,   
                    code: event.code, // физическая клавиша — не зависит от раскладки
                    button: null
                };

                saveShortcut(newShortcut);
                currentDisplay.textContent = formatShortcut(newShortcut);

                isListeningForShortcut = false;
                setBtn.classList.remove('listening');
                setBtn.textContent = 'Изменить';
                infoText.textContent = '✓ Сочетание сохранено!';

                setTimeout(() => {
                    infoText.textContent = 'Нажми "Изменить" → нажми клавиши или клик мышкой с Ctrl/Alt/Shift';
                }, 3000);

                document.removeEventListener('keydown', keyHandler);
                document.removeEventListener('mousedown', mouseHandler);
            };

            const mouseHandler = (event) => {
                if (!isListeningForShortcut) {
                    document.removeEventListener('mousedown', mouseHandler);
                    return;
                }

                event.preventDefault();
                event.stopPropagation();

                if (!event.ctrlKey && !event.altKey && !event.shiftKey) {
                    infoText.textContent = '❌ Для мыши нужен модификатор (Ctrl/Alt/Shift)';
                    return;
                }

                const newShortcut = {
                    ctrlKey: event.ctrlKey,
                    altKey: event.altKey,
                    shiftKey: event.shiftKey,
                    key: null,
                    button: event.button
                };

                saveShortcut(newShortcut);
                currentDisplay.textContent = formatShortcut(newShortcut);

                isListeningForShortcut = false;
                setBtn.classList.remove('listening');
                setBtn.textContent = 'Изменить';
                infoText.textContent = '✓ Сочетание с мышкой сохранено!';

                setTimeout(() => {
                    infoText.textContent = 'Нажми "Изменить" → нажми клавиши или клик мышкой с Ctrl/Alt/Shift';
                }, 3000);

                document.removeEventListener('keydown', keyHandler);
                document.removeEventListener('mousedown', mouseHandler);
            };

            document.addEventListener('keydown', keyHandler);
            document.addEventListener('mousedown', mouseHandler, true);

            listenTimeout = setTimeout(() => {
                if (isListeningForShortcut) {
                    isListeningForShortcut = false;
                    setBtn.classList.remove('listening');
                    setBtn.textContent = 'Изменить';
                    infoText.textContent = '⏰ Время вышло. Попробуй снова';

                    document.removeEventListener('keydown', keyHandler);
                    document.removeEventListener('mousedown', mouseHandler);

                    setTimeout(() => {
                        infoText.textContent = 'Нажми "Изменить" → нажми клавиши или клик мышкой с Ctrl/Alt/Shift';
                    }, 3000);
                }
            }, 15000);
        });

        resetBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();

            const defaultShortcut = {
                ctrlKey: true,
                shiftKey: false,
                altKey: false,
                key: '2',
                button: null
            };

            saveShortcut(defaultShortcut);
            currentDisplay.textContent = formatShortcut(defaultShortcut);

            if (isListeningForShortcut) {
                isListeningForShortcut = false;
                setBtn.classList.remove('listening');
                setBtn.textContent = 'Изменить';

                if (listenTimeout) clearTimeout(listenTimeout);
            }

            infoText.textContent = '✓ Сброшено на Ctrl+2';
            setTimeout(() => {
                infoText.textContent = 'Нажми "Изменить" → нажми клавиши или клик мышкой с Ctrl/Alt/Shift';
            }, 3000);
        });

        buttonContainer.appendChild(setBtn);
        buttonContainer.appendChild(resetBtn);

        hotkeySection.appendChild(hotkeyLabel);
        hotkeySection.appendChild(currentDisplay);
        hotkeySection.appendChild(buttonContainer);
        hotkeySection.appendChild(infoText);

        menu.appendChild(separator);
        menu.appendChild(hotkeySection);
    }

    function watchForMenu() {
        if (menuObserver) menuObserver.disconnect();

        let menuCheckTimeout = null;

        menuObserver = new MutationObserver(() => {
            clearTimeout(menuCheckTimeout);
            menuCheckTimeout = setTimeout(() => {
                menuCheckTimeout = null;
                const menus = document.querySelectorAll('[role="menu"][data-state="open"]');
                menus.forEach(menu => {
                    if (!menu.querySelector('.jkee-font-size-section')) {
                        addFontSizeButtons(menu);
                    }

                    if (!menu.querySelector('.jkee-hotkey-section')) {
                        addHotkeySettings(menu);
                    }

                    if (!menu.querySelector('.jkee-compact-section')) {
                        addCompactToggle(menu);
                    }

                    if (!menu.querySelector('.jkee-wide-section')) {
                        addWideToggle(menu);
                    }
                });
            }, 150);
        });

        menuObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    const notificationStyle = document.createElement('style');
    notificationStyle.id = 'frosjkee-notification-styles';
    notificationStyle.textContent = `
        .helper-notification {
            position: fixed !important;
            top: 70px !important;
            right: 20px !important;
            padding: 16px 20px !important;
            border-radius: 12px !important;
            font-size: 14px !important;
            font-weight: 500 !important;
            z-index: 10000 !important;
            border: 1px solid rgba(255,255,255,0.2) !important;
            animation: slideInGlow 0.4s ease !important;
            pointer-events: none !important;
        }

        .helper-notification.success {
            background: linear-gradient(135deg, rgba(16,185,129,0.9) 0%, rgba(5,150,105,0.95) 100%) !important;
            box-shadow: 0 8px 32px rgba(16,185,129,0.4) !important;
            color: #ffffff !important;
        }

        .helper-notification.error {
            background: linear-gradient(135deg, rgba(220,38,38,0.9) 0%, rgba(185,28,28,0.95) 100%) !important;
            box-shadow: 0 8px 32px rgba(220,38,38,0.4) !important;
            color: #ffffff !important;
        }

        .helper-notification.info {
            background: linear-gradient(135deg, rgba(74,158,255,0.9) 0%, rgba(59,130,246,0.95) 100%) !important;
            box-shadow: 0 8px 32px rgba(74,158,255,0.4) !important;
            color: #ffffff !important;
        }

        @keyframes slideInGlow {
            from { opacity: 0; transform: translateX(100px); }
            to { opacity: 1; transform: translateX(0); }
        }
    `;
    document.head.appendChild(notificationStyle);

    const copyHighlightStyle = document.createElement('style');
    copyHighlightStyle.id = 'frosjkee-copy-highlight-styles';
    copyHighlightStyle.textContent = `
        .text-text-secondary {
            cursor: pointer !important;
            transition: color 0.2s ease !important;
            position: relative !important;
        }

        .text-text-secondary:hover {
            color: #4a9eff !important;
        }

        [data-testid="profile-ru-modal-trigger"] .truncate,
        [data-testid="profile-tu-modal-trigger"] .truncate,
        [data-testid="profile-tu-operator-modal-trigger"] .truncate {
            cursor: pointer !important;
            transition: color 0.2s ease !important;
            position: relative !important;
        }

        [data-testid="profile-ru-modal-trigger"] .truncate:hover,
        [data-testid="profile-tu-modal-trigger"] .truncate:hover,
        [data-testid="profile-tu-operator-modal-trigger"] .truncate:hover {
            color: #4a9eff !important;
        }
    `;
    document.head.appendChild(copyHighlightStyle);

    const fontStyle = document.createElement('style');
    fontStyle.id = 'frosjkee-font-styles';
    fontStyle.textContent = `
        .bg-bg-user-chat.text-base,
        .bg-bg-card.text-base {
            font-size: ${currentFontSize}px !important;
        }
    `;
    document.head.appendChild(fontStyle);

    function formatTimeAgo(dateTimeStr) {
        const now = new Date();
        let messageDate;

        const dateMatch = dateTimeStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
        if (dateMatch) {
            const [, day, month, year] = dateMatch;
            messageDate = new Date(year, month - 1, day);
            const diffDays = Math.floor((now - messageDate) / 86400000);
            if (diffDays === 0) return 'сегодня';
            if (diffDays === 1) return 'вчера';
            if (diffDays < 7) return diffDays + ' дн. назад';
            if (diffDays < 30) return Math.floor(diffDays / 7) + ' нед. назад';
            if (diffDays < 365) return Math.floor(diffDays / 30) + ' мес. назад';
            return Math.floor(diffDays / 365) + ' г. назад';
        }

        const timeMatch = dateTimeStr.match(/(\d{1,2}):(\d{2})/);
        if (!timeMatch) return null;

        const [, hours, minutes] = timeMatch;
        messageDate = new Date(now);
        messageDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

        if (messageDate > now) {
            messageDate.setDate(messageDate.getDate() - 1);
        }

        const diffMs = now - messageDate;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'только что';
        if (diffMins < 60) return diffMins + ' мин. назад';
        if (diffHours < 24) return diffHours + ' ч. назад';
        if (diffDays === 1) return 'вчера';
        if (diffDays < 7) return diffDays + ' дн. назад';
        return messageDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    }

    function processTimeElements() {
        let count = 0;

        const dateElements = document.querySelectorAll(
            'div.inline-flex.items-center.rounded.text-xs.leading-\\[18px\\].font-medium.cursor-pointer.text-text-primary.px-2\\.5.py-1.bg-bg-tertiary'
        );
        dateElements.forEach(el => {
            if (el.classList.contains('date-processed') || el.querySelector('.time-ago')) return;
            const text = el.textContent.trim();
            if (!text.match(/\d{2}\/\d{2}\/\d{4}/)) return;
            const ago = formatTimeAgo(text);
            if (!ago || ago === text) return;
            const span = document.createElement('span');
            span.className = 'time-ago';
            span.style.cssText = 'color:#4a9eff;font-size:11px;margin-left:8px;opacity:0.9;font-weight:normal;display:inline-block;background:rgba(74,158,255,0.1);padding:2px 6px;border-radius:10px;';
            span.textContent = ago;
            el.appendChild(document.createTextNode(' '));
            el.appendChild(span);
            el.classList.add('date-processed');
            count++;
        });

        const candidates = document.querySelectorAll('span:not(.time-processed):not(.date-processed):not(.time-ago)');

        candidates.forEach(el => {
            if (el.classList.contains('time-processed') || el.classList.contains('date-processed') || el.querySelector('.time-ago')) return;
            const text = el.textContent.trim();
            if (!text.match(/^\d{1,2}:\d{2}$/) && !text.includes('•') && !text.match(/\d{1,2}:\d{2}/)) return;
            const ago = formatTimeAgo(text);
            if (!ago) return;
            const span = document.createElement('span');
            span.className = 'time-ago';
            span.style.cssText = 'color:#4a9eff;font-size:11px;margin-left:6px;opacity:0.9;font-weight:normal;display:inline-block;';
            span.textContent = '(' + ago + ')';
            el.appendChild(span);
            el.classList.add('time-processed');
            count++;
        });

        if (count > 0) console.log('✓ Время: обработано ' + count + ' эл.');
    }

    function setupTimeDisplay() {
        processTimeElements();
        setTimeout(processTimeElements, 1000);
        setTimeout(processTimeElements, 3000);
        setTimeout(processTimeElements, 5000);

        timeUpdateInterval = setInterval(processTimeElements, 60000);

        let timeDebounce = null;
        timeObserver = new MutationObserver(() => {
            clearTimeout(timeDebounce);
            timeDebounce = setTimeout(processTimeElements, 500);
        });
        timeObserver.observe(document.body, { childList: true, subtree: true });
    }

    setCompactStyle(isCompactMode);
    setWideStyle(isWideMode);
    setupCopyFeatures();
    setupHotkeyListener();
    setupMouseListener();
    watchForMenu();
    applyStyles();
    setupTimeDisplay();

    console.log(`✓ Текущая комбинация: ${formatShortcut(currentShortcut)}`);
})()