// Self-destructing SW: clears all caches, reloads all open tabs, unregisters
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => caches.delete(k)));
    await self.clients.claim();
    const clients = await self.clients.matchAll({type: 'window'});
    await Promise.all(clients.map(c => {
      const url = new URL(c.url);
      if (!url.searchParams.has('swcleared')) {
        url.searchParams.set('swcleared', '1');
        return c.navigate(url.toString());
      }
    }));
    await self.registration.unregister();
  })());
});
