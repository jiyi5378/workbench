/**
 * Service Worker - PWA 离线缓存
 */
const CACHE_NAME = 'workbench-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/config.js',
  '/js/storage.js',
  '/js/sync.js',
  '/js/widgets/registry.js',
  '/js/widgets/widget-base.js',
  '/js/widgets/tasks.js',
  '/js/widgets/calendar.js',
  '/js/widgets/notes.js',
  '/js/widgets/finance.js',
  '/js/widgets/habits.js',
  '/js/widgets/birthdays.js',
  '/js/widgets/outfits.js',
  '/js/ui/components.js',
  '/js/ui/dashboard.js',
  '/js/ui/settings.js',
  '/js/app.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => 
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // 跳过 CloudBase API 请求
  if (e.request.url.includes('tcb') || e.request.url.includes('cloudbase')) {
    return;
  }
  
  e.respondWith(
    caches.match(e.request).then(cached => {
      return cached || fetch(e.request).then(response => {
        if (response.ok && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return response;
      });
    })
  );
});
