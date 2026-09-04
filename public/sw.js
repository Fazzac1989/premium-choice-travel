/*
 * Premium Choice Staycations — service worker.
 *
 * Registered only on the brand's own domain (see components/brand-site/PwaSetup.tsx).
 * Pages are network-first so nothing is ever stale; the offline page and any
 * hotel page already visited open without a connection. Static chunks and
 * images are cache-first because their URLs never change content.
 */
const VERSION = 'pcs-2026-09-04a';
const STATIC = `static-${VERSION}`;
const PAGES = `pages-${VERSION}`;
const IMAGES = `images-${VERSION}`;
const DATA = `data-${VERSION}`;
const OFFLINE_URL = '/offline';
const IMAGE_LIMIT = 200;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(PAGES)
      .then((cache) => cache.add(new Request(OFFLINE_URL, { cache: 'reload' })))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.endsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function trim(cacheName, limit) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= limit) return;
  await Promise.all(keys.slice(0, keys.length - limit).map((k) => cache.delete(k)));
}

async function cacheFirst(request, cacheName, limit) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok && (res.type === 'basic' || res.type === 'cors')) {
    cache.put(request, res.clone());
    if (limit) trim(cacheName, limit);
  }
  return res;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  const refresh = fetch(request)
    .then((res) => {
      if (res.ok) cache.put(request, res.clone());
      return res;
    })
    .catch(() => undefined);
  return hit || (await refresh) || Response.error();
}

async function networkFirstPage(request) {
  const cache = await caches.open(PAGES);
  try {
    const res = await fetch(request);
    if (res.ok) cache.put(request, res.clone());
    return res;
  } catch {
    const hit = await cache.match(request);
    return hit || (await cache.match(OFFLINE_URL)) || Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstPage(request));
    return;
  }
  if (sameOrigin && url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request, STATIC));
    return;
  }
  if (
    (sameOrigin && (url.pathname.startsWith('/_next/image') || url.pathname.startsWith('/images/'))) ||
    url.hostname.endsWith('.supabase.co')
  ) {
    event.respondWith(cacheFirst(request, IMAGES, IMAGE_LIMIT));
    return;
  }
  if (sameOrigin && url.pathname.startsWith('/api/staycations/')) {
    event.respondWith(staleWhileRevalidate(request, DATA));
  }
});
