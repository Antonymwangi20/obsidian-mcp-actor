export async function setupPlaywrightStealth(page) {
    await page.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    await page.addInitScript(() => { window.chrome = { runtime: {} }; });

    await page.addInitScript(() => {
        Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    });

    const width = 1920 + Math.random() * 100;
    const height = 1080 + Math.random() * 100;
    await page.setViewportSize({ width: Math.floor(width), height: Math.floor(height) });
}

export async function enhancedStealthMode(page) {
    await setupPlaywrightStealth(page);

    await page.addInitScript(() => {
        const getParameter = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function(parameter) {
            if (parameter === 37445) return 'Intel Inc.';
            if (parameter === 37446) return 'Intel Iris OpenGL Engine';
            return getParameter.call(this, parameter);
        };
    });

    await page.addInitScript(() => {
        const toDataURL = HTMLCanvasElement.prototype.toDataURL;
        HTMLCanvasElement.prototype.toDataURL = function() {
            const result = toDataURL.apply(this, arguments);
            return result.slice(0, -10) + Math.random().toString(36).slice(2, 12);
        };
    });

    await page.addInitScript(() => {
        Object.defineProperty(navigator, 'plugins', {
            get: () => [
                { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
                { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' }
            ]
        });
    });
}

export async function blockWebSockets(context) {
    await context.route('**/*', (route) => {
        const request = route.request();
        const resourceType = request.resourceType();
        const url = request.url();

        if (url.startsWith('ws://') || url.startsWith('wss://')) {
            console.log(`  🚫 Blocking WebSocket: ${url}`);
            route.abort();
            return;
        }
        if (resourceType === 'webrtc') {
            route.abort();
            return;
        }
        route.continue();
    });
}
