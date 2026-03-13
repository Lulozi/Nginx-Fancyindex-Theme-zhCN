// Nginx-Fancyindex-Theme 的 Service Worker（中文主题）
// 提供离线支持与更快的二次访问

const CACHE_NAME = 'nginx-fancyindex-zh-v1';
const ASSET_QUERY = '?lang=zh';
const STATIC_ASSETS = [
    `/.theme/styles.css${ASSET_QUERY}`,
    `/.theme/addNginxFancyIndexForm.js${ASSET_QUERY}`,
    `/.theme/showdown.min.js${ASSET_QUERY}`,
    `/.theme/purify.min.js${ASSET_QUERY}`
];

// 安装事件 - 预缓存静态资源
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        }).then(() => self.skipWaiting())
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

// 请求事件 - 优先缓存，回退网络
self.addEventListener('fetch', (event) => {
    // 仅缓存 GET 请求
    if (event.request.method !== 'GET') {
        return;
    }

    // 跳过跨域请求
    if (!event.request.url.startsWith(self.location.origin)) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }

            return fetch(event.request).then((response) => {
                // 非成功响应不缓存
                if (!response || response.status !== 200 || response.type !== 'basic') {
                    return response;
                }

                const responseToCache = response.clone();

                // 仅缓存主题静态资源
                if (STATIC_ASSETS.some(asset => event.request.url.includes(asset))) {
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                }

                return response;
            });
        })
    );
});
