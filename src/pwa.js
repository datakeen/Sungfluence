/* Makes the web version installable and usable offline. Skipped inside the desktop app.
   When a newer version has been published, the page says so and offers to reload (see 'sungfluence-update' in 06-io.js). */
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
  window.addEventListener('load', () => {
    const hadOne = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.register('sw.js').then((reg) => {
      // look for a newer version now, and again every hour while the page is open
      reg.update().catch(() => {});
      setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
    }).catch(() => {});
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      // the first install takes control quietly; a later one means a new version is ready
      if (hadOne) window.dispatchEvent(new Event('sungfluence-update'));
    });
  });
}
