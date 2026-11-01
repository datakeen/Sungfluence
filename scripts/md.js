// A small Markdown to HTML converter for the help pages: headings, paragraphs, lists, tables,
// quotes, code, links, images, bold and italics. Only for our own trusted docs, so it is kept simple.
// SPDX-License-Identifier: AGPL-3.0-or-later
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function inline(s, link) {
  const codes = [];
  s = s.replace(/`([^`]+)`/g, (m, c) => { codes.push(c); return '\u0000' + (codes.length - 1) + '\u0000'; });
  s = esc(s);
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (m, alt, src) => '<img src="' + link(src, true) + '" alt="' + alt + '" loading="lazy">');
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, t, href) => '<a href="' + link(href, false) + '">' + t + '</a>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/(^|[^*\w])\*([^*\s][^*]*)\*/g, '$1<i>$2</i>');
  return s.replace(/\u0000(\d+)\u0000/g, (m, i) => '<code>' + esc(codes[+i]) + '</code>');
}

/* link(href, isImage) lets the caller rewrite links, for example help pages to in-app pages */
function md(src, link) {
  link = link || ((h) => h);
  const lines = src.replace(/\r/g, '').split('\n');
  const out = [];
  let i = 0;
  const para = [];
  const flush = () => { if (para.length) { out.push('<p>' + inline(para.join(' '), link) + '</p>'); para.length = 0; } };
  while (i < lines.length) {
    const l = lines[i];
    if (/^```/.test(l)) {
      flush();
      const code = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) code.push(lines[i++]);
      i++;
      out.push('<pre><code>' + esc(code.join('\n')) + '</code></pre>');
      continue;
    }
    const h = l.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      flush();
      const n = h[1].length, text = h[2].trim();
      const id = text.toLowerCase().replace(/<[^>]+>/g, '').replace(/[^a-z0-9؀-ۿ]+/g, '-').replace(/^-|-$/g, '');
      out.push('<h' + n + ' id="' + id + '">' + inline(text, link) + '</h' + n + '>');
      i++; continue;
    }
    if (/^\s*$/.test(l)) { flush(); i++; continue; }
    if (/^---+\s*$/.test(l)) { flush(); out.push('<hr>'); i++; continue; }
    if (/^\|/.test(l)) {
      flush();
      const rows = [];
      while (i < lines.length && /^\|/.test(lines[i])) rows.push(lines[i++]);
      const cells = (r) => r.replace(/^\|/, '').replace(/\|\s*$/, '').split(/(?<!\\)\|/).map((c) => inline(c.trim().replace(/\\\|/g, '|'), link));
      const head = cells(rows[0]);
      const body = rows.slice(2).map(cells);
      out.push('<table><thead><tr>' + head.map((c) => '<th>' + c + '</th>').join('') + '</tr></thead><tbody>' +
        body.map((r) => '<tr>' + r.map((c) => '<td>' + c + '</td>').join('') + '</tr>').join('') + '</tbody></table>');
      continue;
    }
    if (/^>\s?/.test(l)) {
      flush();
      const q = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) q.push(lines[i++].replace(/^>\s?/, ''));
      out.push('<blockquote>' + md(q.join('\n'), link) + '</blockquote>');
      continue;
    }
    const li = l.match(/^(\s*)([-*]|\d+\.)\s+(.*)$/);
    if (li) {
      flush();
      const ordered = /\d/.test(li[2]);
      const items = [];
      while (i < lines.length) {
        const m = lines[i].match(/^(\s*)([-*]|\d+\.)\s+(.*)$/);
        if (m && m[1].length < 2) { items.push(m[3]); i++; continue; }
        // indented lines continue the last item
        if (items.length && /^\s{2,}\S/.test(lines[i])) { items[items.length - 1] += ' ' + lines[i].trim(); i++; continue; }
        break;
      }
      out.push((ordered ? '<ol>' : '<ul>') + items.map((t) => '<li>' + inline(t, link) + '</li>').join('') + (ordered ? '</ol>' : '</ul>'));
      continue;
    }
    para.push(l.trim());
    i++;
  }
  flush();
  return out.join('\n');
}
module.exports = { md };
