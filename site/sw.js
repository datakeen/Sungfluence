/* The web app used to live at the root of this site, with an offline copy kept by a service worker here.
   It moved to try/, and the root is now the website. This worker replaces the old one once, for people who
   still have it: it deletes the old offline copy, removes itself and reloads open pages, so they show the
   website. The web app under try/ has its own worker and its own cache, which this one leaves alone.
   SPDX-License-Identifier: AGPL-3.0-or-later */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const tryPath = new URL('try/', self.registration.scope).pathname;
    for (const k of await caches.keys()) {
      if (!k.startsWith('sungfluence')) continue;
      const c = await caches.open(k);
      const reqs = await c.keys();
      if (reqs.some((r) => new URL(r.url).pathname.startsWith(tryPath))) continue; // the web app's own copy
      await caches.delete(k);
    }
    await self.registration.unregister();
    const pages = await self.clients.matchAll({ type: 'window' });
    for (const p of pages) { try { await p.navigate(p.url); } catch (err) { /* the page closed */ } }
  })());
});
