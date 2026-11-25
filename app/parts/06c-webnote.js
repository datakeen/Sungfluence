/* ===================== Part 6c: the note on the web version ===================== */
/* In a browser, on the website (http or https), a small note at the end of the menu bar says the installed app works
   best and links to the download. Not in the desktop app, not when the page is opened from disk, and not in the
   single-file build. It shows during one visit; after that, or once it is closed, it stays away.
   It sits in the menu bar, so it never covers the canvas. Phones and narrow windows do not get it: the installers are
   for computers, and the menu bar needs all its room there. */
const DOWNLOAD_URL = 'https://sourceforge.net/projects/sungfluence/files/latest/download';
const WEBNOTE_KEY = 'sungfluence-webnote';
command('help.download', 'Download SungFluence for your computer', () => openURL(DOWNLOAD_URL));

/* true only for the web app served from a website: the multi-file build, over http or https, outside the desktop app */
function isWebBuild() {
  if (!/^https?:$/.test(location.protocol) || window.sungfluenceDesktop || window.claude) return false;
  return !!document.querySelector('script[src$="app.js"]');
}
function webNoteDue() {
  try {
    const v = localStorage.getItem(WEBNOTE_KEY);
    if (v === 'closed') return false;
    // seen on an earlier visit: only keep showing it in the same visit
    if (v === 'seen' && sessionStorage.getItem(WEBNOTE_KEY) !== 'on') return false;
    localStorage.setItem(WEBNOTE_KEY, 'seen'); sessionStorage.setItem(WEBNOTE_KEY, 'on');
  } catch (e) { /* storage blocked: show it for this page */ }
  return true;
}
function closeWebNote() {
  const n = $('webNote');
  try { localStorage.setItem(WEBNOTE_KEY, 'closed'); sessionStorage.removeItem(WEBNOTE_KEY); } catch (e) { /* storage blocked */ }
  if (!n) return;
  n.classList.remove('on');
  $('app').classList.remove('has-webnote');
  setTimeout(() => n.remove(), 260);
}
/* force: show it even where it would not show (for tests) */
const webNoteNarrow = () => !!(window.matchMedia && matchMedia('(max-width: 699px), (hover: none) and (pointer: coarse)').matches);
function webNote(force) {
  if ($('webNote') || (!force && (!isWebBuild() || webNoteNarrow() || !webNoteDue()))) return null;
  const bar = $('menubar');
  if (!bar || bar.hidden) return null;
  const n = el('div', 'webnote'); n.id = 'webNote'; n.setAttribute('role', 'note');
  n.innerHTML = '<span class="webnote-mark" aria-hidden="true">✦</span>' +
    '<span class="webnote-text"><span class="webnote-long">For the best experience, use the installed version of SungFluence.</span><span class="webnote-mid">The installed app works best.</span></span>';
  const a = el('a', null, 'Download'); a.href = DOWNLOAD_URL; a.target = '_blank'; a.rel = 'noopener';
  a.title = 'Download SungFluence for Windows, macOS or Linux (SourceForge)';
  const x = el('button', 'webnote-x'); x.type = 'button'; x.setAttribute('aria-label', 'Close this note'); x.title = 'Close';
  x.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  x.onclick = closeWebNote;
  n.append(a, x);
  document.body.appendChild(n);
  // the note lies over the right end of the menu bar; the bar keeps room for it so no menu hides under it
  const fit = () => {
    if (!n.isConnected) return;
    const r = bar.getBoundingClientRect();
    // stop above the bar's bottom line, so the line runs on under the note
    n.style.top = r.top + 'px'; n.style.height = (r.height - (parseFloat(getComputedStyle(bar).borderBottomWidth) || 0)) + 'px'; n.style.right = Math.max(0, document.documentElement.clientWidth - r.right) + 'px';
    // the longest wording that leaves the menus clear; on a narrow screen only the link and the close button
    const last = bar.lastElementChild, menusEnd = last ? last.getBoundingClientRect().right + bar.scrollLeft + 8 : r.left;
    for (const k of ['', 'mid', 'short']) {
      n.classList.toggle('mid', k === 'mid'); n.classList.toggle('short', k === 'short');
      if (n.getBoundingClientRect().left + 22 >= menusEnd) break;
    }
    $('app').style.setProperty('--webnote-w', Math.ceil(n.getBoundingClientRect().width) + 'px');
  };
  $('app').classList.add('has-webnote');
  fit();
  window.addEventListener('resize', fit);
  requestAnimationFrame(() => requestAnimationFrame(() => n.classList.add('on')));
  return n;
}
setTimeout(() => webNote(), 600);
if (window.__sungfluence) Object.assign(window.__sungfluence, { webNote, closeWebNote, isWebBuild });
