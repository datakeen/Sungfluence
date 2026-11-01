/* ===================== Part 4c: help ===================== */
/* The Help window shows the pages from docs/help, which the build bundles into HELP (src/help.js),
   so help works offline. Links to other help pages open here; other links open in the browser. */
const helpState = { page: 'index' };
function openHelp(page, anchor) {
  if (typeof HELP === 'undefined' || !HELP.order.length) { toast('Help is not included in this copy of SungFluence.'); return; }
  helpState.page = HELP.pages[page] ? page : helpState.page;
  openDialog('Help', (body, d) => {
    d.classList.add('help-dlg');
    const box = el('div', 'help-wrap');
    const nav = el('nav', 'help-nav'); nav.setAttribute('aria-label', 'Help topics');
    const search = el('input'); search.type = 'search'; search.placeholder = 'Search help'; search.setAttribute('aria-label', 'Search help');
    const list = el('div', 'help-list');
    const content = el('article', 'help-content'); content.tabIndex = -1;
    nav.append(search, list);
    box.append(nav, content);
    body.appendChild(box);
    const show = (id, anchorId) => {
      if (!HELP.pages[id]) return;
      helpState.page = id;
      content.innerHTML = HELP.pages[id].html;
      list.querySelectorAll('button').forEach((b) => b.setAttribute('aria-current', String(b.dataset.id === id)));
      const target = anchorId && content.querySelector('#' + CSS.escape(anchorId));
      if (target) target.scrollIntoView(); else content.scrollTop = 0;
    };
    const renderList = (q) => {
      list.replaceChildren();
      HELP.order.forEach((id) => {
        const P = HELP.pages[id];
        if (q && !P.text.includes(q) && !P.title.toLowerCase().includes(q)) return;
        const b = el('button', 'help-item', P.title); b.type = 'button'; b.dataset.id = id;
        b.setAttribute('aria-current', String(id === helpState.page));
        b.onclick = () => show(id);
        list.appendChild(b);
      });
      if (!list.children.length) list.appendChild(el('span', 'note', 'Nothing found.'));
    };
    search.oninput = () => {
      const q = search.value.trim().toLowerCase();
      renderList(q);
      // jump to the first page that has it
      const first = list.querySelector('button');
      if (q && first && first.dataset.id !== helpState.page && !HELP.pages[helpState.page].text.includes(q)) show(first.dataset.id);
    };
    content.addEventListener('click', (e) => {
      const a = e.target.closest('a');
      if (!a) return;
      const href = a.getAttribute('href') || '';
      if (href.startsWith('#help:')) { e.preventDefault(); const [pg, an] = href.slice(6).split('#'); show(pg || helpState.page, an); return; }
      if (href.startsWith('#')) { e.preventDefault(); const t = content.querySelector(href); if (t) t.scrollIntoView(); return; }
      a.target = '_blank'; a.rel = 'noopener';
    });
    renderList('');
    show(helpState.page, anchor);
  }, true);
}
/* A first visit gets one gentle pointer to the tutorial, never again after that */
function welcomeOnce() {
  if (prefs.welcomed) return;
  prefs.welcomed = true; savePrefs();
  toast('New to SungFluence? The getting started guide takes five minutes.', { label: 'Open it', fn: () => openHelp('getting-started') });
}
