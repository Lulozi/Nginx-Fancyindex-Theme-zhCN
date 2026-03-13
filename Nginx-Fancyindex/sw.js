// Nginx-Fancyindex-Theme 的 Service Worker（英文主题）
// 提供离线支持与更快的二次访问

const CACHE_NAME = 'nginx-fancyindex-en-v2';
const ASSET_QUERY = '?lang=en';
const STATIC_ASSETS = [
    `/.theme/styles.css${ASSET_QUERY}`,
    `/.theme/addNginxFancyIndexForm.js${ASSET_QUERY}`,
    `/.theme/showdown.min.js${ASSET_QUERY}`,
    `/.theme/purify.min.js${ASSET_QUERY}`
];

async function precacheAssets() {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(
        STATIC_ASSETS.map(async (asset) => {
            try {
                const request = new Request(asset, { cache: 'reload' });
                const response = await fetch(request);
                if (response && response.ok) {
                    await cache.put(asset, response);
                }
            } catch (error) {
                // 忽略缓存失败的资源
            }
        })
    );
}

// 安装事件 - 预缓存静态资源
self.addEventListener('install', (event) => {
    event.waitUntil(
        precacheAssets().then(() => self.skipWaiting())
    );
});

// 激活事件 - 清理旧缓存
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name.startsWith('nginx-fancyindex-') && name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        }).then(() => self.clients.claim())
    );
});

function isStaticAsset(url) {
    return STATIC_ASSETS.some((asset) => url.includes(asset));
}

// 请求事件 - 静态资源使用 stale-while-revalidate
self.addEventListener('fetch', (event) => {
    // 仅缓存 GET 请求
    if (event.request.method !== 'GET') {
        return;
    }

    // 跳过跨域请求
    if (!event.request.url.startsWith(self.location.origin)) {
        return;
    }

    if (isStaticAsset(event.request.url)) {
        event.respondWith(
            caches.open(CACHE_NAME).then((cache) => {
                return cache.match(event.request).then((cachedResponse) => {
                    const fetchPromise = fetch(new Request(event.request, { cache: 'reload' }))
                        .then((response) => {
                            if (!response || response.status !== 200 || response.type !== 'basic') {
                                return response;
                            }
                            cache.put(event.request, response.clone());
                            return response;
                        })
                        .catch(() => cachedResponse);

                    return cachedResponse || fetchPromise;
                });
            })
        );
        return;
    }

    event.respondWith(
        fetch(event.request).catch(() => caches.match(event.request))
    );
});
