/* Service Worker — 离线缓存 */
const CACHE_NAME = 'daily-planner-v1';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/base/reset.css',
  './css/base/variables.css',
  './css/base/typography.css',
  './css/base/layout.css',
  './css/base/animations.css',
  './css/themes/light.css',
  './css/themes/dark.css',
  './css/themes/macaron.css',
  './css/components/button.css',
  './css/components/card.css',
  './css/components/modal.css',
  './css/components/form.css',
  './css/components/task.css',
  './css/components/calendar.css',
  './css/components/mascot.css',
  './css/components/toast.css',
  './css/components/empty-state.css',
  './css/components/badge.css',
  './css/responsive/mobile.css',
  './css/responsive/tablet.css',
  './css/responsive/desktop.css',
  './css/print.css'
];

// 安装：缓存静态资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

// 激活：清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
      );
    })
  );
  self.clients.claim();
});

// 请求拦截：缓存优先
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request).then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      }).catch(() => cached);

      return cached || fetchPromise;
    })
  );
});
