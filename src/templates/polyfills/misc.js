export const jsxDevProxy = `
// Shim for react/jsx-dev-runtime to work in production Vite builds
import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';

export const Fragment = _Fragment;
export const jsx = _jsx;
export const jsxs = _jsxs;

// Proxy jsxDEV to jsx (ignores the extra dev-only arguments)
export const jsxDEV = (type, props, key, isStaticChildren, source, self) => {
  return _jsx(type, props, key);
};
`;

export const websimPackageJs = `
// Bridge for "import websim from 'websim'"
const w = window.websim || {};
export default w;
// Export common methods if destructured
export const getProject = w.getProject;
export const getCurrentUser = w.getCurrentUser;
export const upload = w.upload;
export const collection = w.collection;
`;

export const avatarPolyfill = `
// [WebSim] Avatar Hot-Swap Polyfill
// Detects placeholders and fetches real avatar via Bridge/Proxy
(function() {
    const processed = new WeakSet();

    const swapAvatar = async (img) => {
        if (processed.has(img)) return;
        processed.add(img);

        const username = img.dataset.websimAvatar;
        if (!username) return;

        // console.log('[Avatar] Swapping for:', username);

        try {
            // 1. Force a real network fetch to ensure the proxy is hit
            // This bypasses potential img src caching/stalling in webviews
            const res = await fetch('/api/proxy/avatar/' + username);
            if (!res.ok) throw new Error('Proxy error');
            
            // 2. Create a local blob URL
            const blob = await res.blob();
            const objectUrl = URL.createObjectURL(blob);
            
            // 3. Swap the src
            img.onload = () => {
                img.style.display = ''; // Unhide if hidden
                img.removeAttribute('data-websim-avatar');
            };
            img.src = objectUrl;
            
        } catch (e) {
            console.warn('[Avatar] Failed to swap:', username, e);
            // Fallback to static if proxy fails
            img.src = 'https://www.redditstatic.com/avatars/avatar_default_02_FF4500.png';
            img.style.display = '';
        }
    };

    const run = () => {
        document.querySelectorAll('img[data-websim-avatar]').forEach(swapAvatar);
    };

    // Run immediately and observe
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', run);
    } else {
        run();
    }

    const observer = new MutationObserver((mutations) => {
        let needsRun = false;
        for (const m of mutations) {
            if (m.addedNodes.length) {
                // Quick check for optimization
                for (const n of m.addedNodes) {
                    if (n.nodeType === 1 && (n.matches?.('img[data-websim-avatar]') || n.querySelector?.('img[data-websim-avatar]'))) {
                        needsRun = true; 
                        break;
                    }
                }
            } else if (m.type === 'attributes' && m.attributeName === 'data-websim-avatar') {
                needsRun = true;
            }
        }
        if (needsRun) run();
    });

    observer.observe(document.body, { 
        childList: true, 
        subtree: true, 
        attributes: true, 
        attributeFilter: ['data-websim-avatar'] 
    });
})();
`;