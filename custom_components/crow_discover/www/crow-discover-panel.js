/* Crow Discover panel — finds Home Assistant projects on GitHub and hands them to the Marketplace.
 * Same look as Crow Food: computer (full sidebar, ≥1000px), iPad (icon sidebar, ≥700px) and phone.
 * Edit this file, then run  node build.js  (copies it into custom_components/crow_discover/www). */
(() => {
const VERSION = '0.0.2';

const _s = (d, w = 2) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const I = {
  all: _s('<rect x="4" y="4" width="7" height="7" rx="1.6"/><rect x="13" y="4" width="7" height="7" rx="1.6"/><rect x="4" y="13" width="7" height="7" rx="1.6"/><rect x="13" y="13" width="7" height="7" rx="1.6"/>'),
  integration: _s('<path d="M10 4a2 2 0 1 1 4 0v2h4v4h-2a2 2 0 1 0 0 4h2v4h-4v-2a2 2 0 1 0-4 0v2H6v-4h2a2 2 0 1 0 0-4H6V6h4z"/>'),
  card: _s('<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 10h18"/>'),
  theme: _s('<path d="M12 3a9 9 0 0 0 0 18c1 0 1.5-.8 1.5-1.5 0-.9-.8-1.3-.8-2.2 0-.8.7-1.5 1.5-1.5H16a5 5 0 0 0 5-5c0-4.3-4-7.8-9-7.8z"/><circle cx="7.5" cy="11" r="1.2"/><circle cx="11" cy="7.5" r="1.2"/><circle cx="15.5" cy="8.5" r="1.2"/>'),
  blueprint: _s('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/>'),
  market: _s('<path d="M5 8h14l-1.2 12H6.2z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>'),
  compatible: _s('<circle cx="12" cy="12" r="9"/><path d="M8 12.3l2.7 2.7L16 9.5"/>'),
  none: _s('<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17h.01"/>'),
  refresh: _s('<path d="M20 12a8 8 0 1 1-2.34-5.66"/><path d="M20 4v5h-5"/>', 2.2),
  updown: _s('<path d="M8 9l4-4 4 4M8 15l4 4 4-4"/>', 2.2),
  search: _s('<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>', 2.3),
  x: _s('<path d="M6 6l12 12M18 6L6 18"/>', 2.4),
  back: _s('<path d="M15 19l-7-7 7-7"/>', 2.4),
  chevR: _s('<path d="M9 6l6 6-6 6"/>', 2.4),
  chevD: _s('<path d="M6 9l6 6 6-6"/>', 2.4),
  check: _s('<path d="M5 12.5l4.5 4.5L19 7"/>', 2.6),
  ext: _s('<path d="M14 4h6v6"/><path d="M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>'),
  info: _s('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>', 2.2),
  sliders: _s('<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>'),
  tag: _s('<path d="M3 12.6V4.5A1.5 1.5 0 014.5 3h8.1a1.5 1.5 0 011.06.44l6.9 6.9a1.5 1.5 0 010 2.12l-8.1 8.1a1.5 1.5 0 01-2.12 0l-6.9-6.9A1.5 1.5 0 013 12.6z"/><circle cx="8" cy="8" r="1.6"/>'),
  text: _s('<path d="M5 6h14M5 10h14M5 14h10M5 18h7"/>'),
  code: _s('<path d="M8 8l-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14"/>'),
  clock: _s('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  fork: _s('<circle cx="6" cy="5" r="2"/><circle cx="18" cy="5" r="2"/><circle cx="12" cy="19" r="2"/><path d="M6 7v2a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3V7M12 12v5"/>'),
  lock: _s('<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 018 0v2.5"/>'),
  link: _s('<path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1"/><path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1"/>'),
  sidebar: _s('<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M9 4v16"/>'),
  menu: _s('<path d="M4 7h16M4 12h16M4 17h16"/>', 2.2),
  issue: _s('<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/>', 2.2),
  star: _s('<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.9z"/>', 2),
  starFill: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.9z"/></svg>',
  trash: _s('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
  copy: _s('<rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8"/>'),
  people: _s('<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5"/><circle cx="17" cy="9" r="2.6"/><path d="M15.6 14.2c2.4.1 4.3 1.7 4.9 4.8"/>'),
  person: _s('<circle cx="12" cy="8" r="3.6"/><path d="M5 20c.8-3.7 3.6-5.8 7-5.8s6.2 2.1 7 5.8"/>'),
  eyeOff: _s('<path d="M3 3l18 18"/><path d="M10.6 6.1A9.8 9.8 0 0 1 12 6c5 0 8.5 4.3 9.5 6-.5.8-1.5 2.2-2.9 3.5M6.6 7.6C4.6 8.9 3.2 10.8 2.5 12c1 1.7 4.5 6 9.5 6 1.6 0 3-.4 4.3-1.1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>'),
  eye: _s('<path d="M2.5 12C3.5 10.3 7 6 12 6s8.5 4.3 9.5 6c-1 1.7-4.5 6-9.5 6s-8.5-4.3-9.5-6z"/><circle cx="12" cy="12" r="3"/>'),
  update: _s('<circle cx="12" cy="12" r="9"/><path d="M12 7.5v8M8.5 12.5L12 16l3.5-3.5"/>'),
  more: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>',
};

const TYPES = {
  integration: { label: 'Integration', plural: 'Integrations', color: '#007AFF', cat: 'integration' },
  card: { label: 'Card', plural: 'Cards', color: '#34C759', cat: 'plugin' },
  theme: { label: 'Theme', plural: 'Themes', color: '#FF9F0A', cat: 'theme' },
  blueprint: { label: 'Blueprint', plural: 'Blueprints', color: '#AF52DE' },
};
const STATUS = {
  market: { label: 'In Marketplace', color: 'var(--st-m)', dot: '#32ADE6' },
  compatible: { label: 'Marketplace-compatible', color: 'var(--st-c)', dot: '#34C759' },
  blueprint: { label: 'Blueprint', color: 'var(--st-b)', dot: '#AF52DE' },
  none: { label: 'Not installable', color: 'var(--st-n)', dot: '#FF9F0A' },
  unchecked: { label: 'Tap to check', color: 'var(--cm-text2)', dot: '#8E8E93' },
  checking: { label: 'Checking…', color: 'var(--cm-text2)', dot: '#8E8E93' },
  gone: { label: 'Not found on GitHub', color: 'var(--cm-text2)', dot: '#8E8E93' },
};
const STATUS_FILTERS = ['market', 'compatible', 'none'];
const NAV = [
  { h: 'Saved', items: [
    { id: 'fav', label: 'Favourites', icon: 'starFill', color: '#FFB800' },
    { id: 'following', label: 'Following', icon: 'people', color: '#5856D6' },
    { id: 'hidden', label: 'Hidden', icon: 'eyeOff', color: '#8E8E93' },
  ] },
  { h: 'Browse', items: [
    { id: 'market', label: 'In Marketplace', icon: 'market', color: '#32ADE6' },
    { id: 'all', label: 'All projects', icon: 'all', color: '#8E8E93' },
    { id: 'integration', label: 'Integrations', icon: 'integration', color: '#007AFF' },
    { id: 'card', label: 'Cards', icon: 'card', color: '#34C759' },
    { id: 'theme', label: 'Themes', icon: 'theme', color: '#FF9F0A' },
    { id: 'blueprint', label: 'Blueprints', icon: 'blueprint', color: '#AF52DE' },
  ] },
];
const SORTS = [['updated', 'Recently Updated'], ['stars', 'Most Stars'], ['best', 'Best Match']];
const LOCAL = ['fav', 'hidden'];  // pages whose search box filters what's listed, and whose sort is done here
const SPECIAL = ['fav', 'hidden', 'author', 'following'];  // pages with their own heading, without GitHub's counts
const FAV_SORTS = [['added', 'Date Added'], ['updated', 'Recently Updated'], ['stars', 'Most Stars'], ['name', 'Name']];
const PRIMARY = {  // the main action for a status: swipe button, hold menu and sheet
  compatible: { act: 'add', label: 'Add', long: 'Add to Marketplace', icon: 'market', color: 'var(--cm-accent)' },
  market: { act: 'open-mp', label: 'Open', long: 'Open in Marketplace', icon: 'market', color: '#32ADE6' },
  blueprint: { act: 'import', label: 'Import', long: 'Import Blueprint', icon: 'blueprint', color: '#AF52DE' },
};
const UPDATE = { act: 'open-mp', label: 'Update', long: 'Update in Marketplace', icon: 'update', color: 'var(--cm-accent)' };
const PAGE = 100;

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = (n) => Number(n || 0).toLocaleString();
const repoName = (full) => full.split('/')[1] || full;

function ago(iso) {
  if (!iso) return '';
  const d = (Date.now() - new Date(iso).getTime()) / 86400000;
  if (d < 1) return 'Today';
  if (d < 2) return 'Yesterday';
  if (d < 14) return `${Math.floor(d)} days ago`;
  if (d < 60) return `${Math.floor(d / 7)} weeks ago`;
  if (d < 365) { const m = Math.floor(d / 30.4); return m <= 1 ? '1 month ago' : `${m} months ago`; }
  const y = Math.floor(d / 365);
  return y === 1 ? '1 year ago' : `${y} years ago`;
}
function activity(r) {
  if (r.archived) return 'Archived';
  const d = (Date.now() - new Date(r.pushed_at).getTime()) / 86400000;
  if (r.old) return `Not updated in ${Math.max(2, Math.floor(d / 365))} years`;
  if (d > 180) return `Quiet for ${Math.floor(d / 30.4)} months`;
  return 'Active';
}
function clock(iso) {
  if (!iso) return '';
  const t = new Date(iso);
  const day = Math.floor((Date.now() - t.getTime()) / 86400000);
  const hm = t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return day < 1 && new Date().getDate() === t.getDate() ? `today at ${hm}` : day < 2 ? `yesterday at ${hm}` : t.toLocaleDateString();
}

function reasonText(r) {
  switch (r.reason) {
    case 'archived': return 'The author has archived this repo, so it won’t get fixes. Crow Discover won’t hand archived repos to the Marketplace.';
    case 'card_name': return `The Marketplace looks for a file called ${r.expected || repoName(r.full_name) + '.js'} in the root or dist folder, or in a release, and this repo doesn’t have one (its card is ${r.path}). The author can rename the file or name it in a hacs.json.`;
    case 'integration_first_dir': return 'The Marketplace installs the first folder in custom_components, and that folder has no manifest.json.';
    case 'integration_no_manifest': return 'There’s a custom_components folder, but no manifest.json inside it.';
    case 'theme_folder': return 'The Marketplace looks for theme files in a themes folder, and these are in the root. A hacs.json with "content_in_root": true fixes that.';
    default: return 'The Marketplace can’t find anything in this repo that it knows how to install.';
  }
}
function issueBody(r) {
  const why = {
    card_name: `Home Assistant's Marketplace looks for the card's file by the repository's name (\`${r.expected || repoName(r.full_name) + '.js'}\`) in the root or \`dist\` folder, or as a release asset. Renaming the file, or adding a \`hacs.json\` with \`"filename": "${(r.path || '').replace(/^dist\//, '').replace(/^release asset /, '')}"\`, would let people install it from the Marketplace.`,
    integration_first_dir: 'The Marketplace installs the first folder in `custom_components`, and that folder has no `manifest.json`.',
    integration_no_manifest: 'The Marketplace needs `custom_components/<domain>/manifest.json`.',
    theme_folder: 'The Marketplace looks for themes in a `themes` folder. Moving the YAML there, or adding a `hacs.json` with `"content_in_root": true`, would let people install it from the Marketplace.',
  }[r.reason] || '';
  return `Hi! I found this project with Crow Discover and would like to install it from Home Assistant's Marketplace (Settings → Marketplace), so it gets updates there.\n\n${why}\n\nThanks for making it!`;
}

const CSS = `
:host{display:block;position:relative;height:var(--cd-h,100vh);overflow:hidden;--cd-top:var(--cd-safe-top,env(safe-area-inset-top));background:var(--primary-background-color,#000);
  --cm-accent:#007AFF;--cm-red:#FF3B30;--cm-green:#34C759;--cm-orange:#FF9F0A;
  --cm-font:-apple-system,BlinkMacSystemFont,"SF Pro Text","SF Pro Display","Helvetica Neue","Segoe UI",Roboto,sans-serif}
:host([data-mode="dark"]){--cm-bg:#000000;--cm-bg2:#1c1c1e;--cm-bg3:#2c2c2e;--cm-group:#1c1c1e;--cm-text:#ffffff;--cm-text2:rgba(235,235,245,0.6);--cm-text3:rgba(235,235,245,0.3);--cm-sep:rgba(84,84,88,0.6);--cm-fill:rgba(118,118,128,0.24);--cm-fill2:rgba(118,118,128,0.16);--cm-glass:rgba(56,56,60,0.58);--cm-glass-strong:rgba(30,30,32,0.97);--cm-glass-edge:rgba(255,255,255,0.10);--cm-glass-shine:rgba(255,255,255,0.12);--cm-glass-solid:#2c2c2e;--cm-sheet-solid:#1c1c1e;--cm-sheetedge:rgba(255,255,255,0.10);--cm-field:#2c2c2e;--cm-shadow:0 10px 34px rgba(0,0,0,0.5);--st-m:#64D2FF;--st-c:#30D158;--st-b:#BF5AF2;--st-n:#FF9F0A;--cm-link:#409CFF;color-scheme:dark}
:host([data-mode="light"]){--cm-bg:#ffffff;--cm-bg2:#f2f2f7;--cm-bg3:#e5e5ea;--cm-group:#f2f2f7;--cm-text:#000000;--cm-text2:rgba(60,60,67,0.6);--cm-text3:rgba(60,60,67,0.3);--cm-sep:rgba(60,60,67,0.2);--cm-fill:rgba(118,118,128,0.12);--cm-fill2:rgba(116,116,128,0.08);--cm-glass:rgba(255,255,255,0.56);--cm-glass-strong:rgba(246,246,248,0.97);--cm-glass-edge:rgba(255,255,255,0.75);--cm-glass-shine:rgba(255,255,255,0.7);--cm-glass-solid:#ffffff;--cm-sheet-solid:#f2f2f7;--cm-sheetedge:rgba(255,255,255,0.75);--cm-field:#ffffff;--cm-shadow:0 10px 34px rgba(0,0,0,0.14);--st-m:#0071A4;--st-c:#248A3D;--st-b:#8944AB;--st-n:#C93400;--cm-link:#007AFF;color-scheme:light}
*,*::before,*::after{box-sizing:border-box}
[hidden]{display:none!important}
button{font:inherit;color:inherit;background:none;border:none;padding:0;cursor:pointer;-webkit-tap-highlight-color:transparent}
input{font:inherit;color:inherit}
svg{display:block}
a{color:var(--cm-link)}
.card{position:absolute;inset:0;overflow:hidden;background:var(--cm-bg);color:var(--cm-text);font-family:var(--cm-font);-webkit-font-smoothing:antialiased;letter-spacing:-0.01em}
:host([data-style="glass"]) .card{background:color-mix(in srgb,var(--cm-bg) 82%,transparent)}
/* sidebar */
.side{display:none}
:host([data-wide]) .side{display:flex;flex-direction:column;position:absolute;left:0;top:0;bottom:0;width:250px;z-index:20;overflow:hidden;background:color-mix(in srgb,var(--cm-bg2) 70%,transparent);border-right:0.5px solid var(--cm-sep);padding-top:var(--cd-top)}
:host([data-wide="slim"]) .side{width:76px;transition:width .26s cubic-bezier(.2,.9,.25,1),box-shadow .26s}
:host([data-wide="slim"][data-sdopen]) .side{width:250px;background:var(--cm-sheet-solid);box-shadow:0 0 44px rgba(0,0,0,0.45)}
.sd-scrim{display:none}
:host([data-wide="slim"][data-sdopen]) .sd-scrim{display:block;position:absolute;inset:0;z-index:19;background:rgba(0,0,0,0.45);animation:cm-fade .2s}
.sd-hd{display:flex;align-items:center;gap:12px;padding:16px 18px 6px;min-height:66px;flex-shrink:0}
.sd-hd b{font-size:22px;font-weight:700;letter-spacing:-0.01em;white-space:nowrap}
.sd-burger{display:none;width:44px;height:44px;border-radius:14px;background:var(--cm-fill);align-items:center;justify-content:center;flex-shrink:0}
.sd-burger svg{width:22px;height:22px}
:host([data-wide="slim"]) .sd-burger{display:flex}
.sd-list{flex:1;overflow-y:auto;overflow-x:hidden;padding:4px 10px 18px;scrollbar-width:none;overscroll-behavior:contain}
.sd-list::-webkit-scrollbar{display:none}
.sd-h{font-size:13px;font-weight:600;color:var(--cm-text2);padding:16px 12px 6px;white-space:nowrap}
.sd-i{width:100%;display:flex;align-items:center;gap:12px;padding:8px 12px;border-radius:12px;text-align:left;font-size:16px;min-height:46px;position:relative;color:var(--cm-text)}
@media (hover:hover){.sd-i:hover{background:var(--cm-fill2)}}
.sd-i:active{opacity:.7}
.sd-i.on,.sd-i.on:hover{background:color-mix(in srgb,var(--cm-accent) 20%,var(--cm-fill));font-weight:600}
.sd-ic{width:30px;height:30px;border-radius:9px;color:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.sd-ic svg{width:18px;height:18px}
.sd-n{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sd-c:empty{display:none!important}
.sd-c{font-size:14px;font-weight:500;color:var(--cm-text2);font-variant-numeric:tabular-nums}
.sd-foot{padding:10px 22px 18px;font-size:13px;color:var(--cm-text2);line-height:1.4;flex-shrink:0}
.sd-foot .link{font-size:13px}
.prog{height:4px;border-radius:2px;background:var(--cm-fill);overflow:hidden;margin-top:8px;position:relative}
.prog span{position:absolute;top:0;bottom:0;width:40%;background:var(--cm-accent);border-radius:2px;animation:cm-prog 1.4s ease-in-out infinite}
.prog.fixed span{left:0;animation:none;transition:width .4s ease}
@keyframes cm-prog{from{left:-40%}to{left:100%}}
:host([data-wide="slim"]:not([data-sdopen])) .sd-hd{padding:14px 0 6px;justify-content:center}
:host([data-wide="slim"]:not([data-sdopen])) :is(.sd-hd b,.sd-n,.sd-foot){display:none}
:host([data-wide="slim"]:not([data-sdopen])) .sd-list{padding:4px 9px 18px}
:host([data-wide="slim"]:not([data-sdopen])) .sd-i{justify-content:center;padding:6px 0;min-height:54px}
:host([data-wide="slim"]:not([data-sdopen])) .sd-ic{width:44px;height:44px;border-radius:13px}
:host([data-wide="slim"]:not([data-sdopen])) .sd-ic svg{width:22px;height:22px}
:host([data-wide="slim"]:not([data-sdopen])) .sd-h{font-size:0;padding:0;height:.5px;background:var(--cm-sep);margin:9px 12px}
:host([data-wide="slim"]:not([data-sdopen])) .sd-c{position:absolute;top:1px;right:0;min-width:21px;height:21px;border-radius:11px;padding:0 5px;background:var(--cm-bg3);color:var(--cm-text);font-size:11px;font-weight:700;line-height:21px;text-align:center;box-shadow:0 0 0 2px var(--cm-bg2)}
/* main */
.main{position:absolute;top:0;bottom:0;right:0;left:0}
:host([data-wide="full"]) .main{left:250px}
:host([data-wide="slim"]) .main{left:76px}
.scroll{position:absolute;inset:0;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;scrollbar-width:none}
.scroll::-webkit-scrollbar{display:none}
.content{max-width:1400px;margin:0 auto;padding:calc(18px + var(--cd-top)) 26px 110px}
:host(:not([data-wide])) .content{padding:calc(70px + var(--cd-top)) 16px 110px}
:host([data-narrow][data-wide]) .content{padding-top:calc(70px + var(--cd-top))}
.top{position:absolute;top:0;left:0;right:0;z-index:6;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:calc(16px + var(--cd-top)) 26px 0;pointer-events:none;min-height:60px}
:host(:not([data-wide])) .top{padding:calc(12px + var(--cd-top)) 14px 0}
.top>*{pointer-events:auto}
.tl,.tr{display:flex;align-items:center;gap:8px}
.tr{margin-left:auto}
.g{background:var(--cm-glass);backdrop-filter:blur(20px) saturate(180%);-webkit-backdrop-filter:blur(20px) saturate(180%);border:0.5px solid var(--cm-glass-edge);box-shadow:inset 0 1px 0 var(--cm-glass-shine),0 4px 18px rgba(0,0,0,0.16);color:var(--cm-text)}
:host([data-style="classic"]) .g{background:var(--cm-glass-solid);backdrop-filter:none;-webkit-backdrop-filter:none;border-color:var(--cm-sep);box-shadow:0 2px 8px rgba(0,0,0,0.12)}
.cb{width:48px;height:48px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:transform .15s ease}
.cb svg{width:21px;height:21px}
.cb:active{transform:scale(.92)}
.cb.spin svg{animation:cm-spin .9s linear infinite}
@keyframes cm-spin{to{transform:rotate(360deg)}}
@keyframes cm-fade{from{opacity:0}}
.edge{position:absolute;left:0;right:0;z-index:4;pointer-events:none;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
.edge.t{top:0;height:96px;-webkit-mask-image:linear-gradient(#000 55%,transparent);mask-image:linear-gradient(#000 55%,transparent);background:linear-gradient(color-mix(in srgb,var(--cm-bg) 88%,transparent) 45%,transparent)}
.edge.b{bottom:0;height:104px;-webkit-mask-image:linear-gradient(transparent,#000 45%);mask-image:linear-gradient(transparent,#000 45%);background:linear-gradient(transparent,color-mix(in srgb,var(--cm-bg) 88%,transparent) 55%)}
:host([data-wide]:not([data-narrow])) .edge.t{display:none}
.today{margin:6px 120px 18px 2px}
.today b{display:block;font-size:30px;font-weight:700;letter-spacing:-0.01em}
.today small{display:block;font-size:16px;color:var(--cm-text2);margin-top:5px}
.today.bare{margin-bottom:22px}
:host(:not([data-wide])) .today{margin:4px 2px 14px}
:host(:not([data-wide])) .today b{font-size:22px}
:host(:not([data-wide])) .today small{font-size:14px;margin-top:3px}
:host(:not([data-wide])) .today.bare{margin-bottom:22px}
.link{color:var(--cm-link);font-weight:600}
.panel{background:var(--cm-group);border-radius:22px;padding:18px 20px 16px;margin-bottom:26px}
:host(:not([data-wide])) .panel{background:none;border-radius:0;padding:2px 4px 0}
.sl{font-size:15px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
:host(:not([data-wide])) .sl{white-space:normal;line-height:1.2}
.sv{font-size:30px;font-weight:700;letter-spacing:-0.02em;margin-top:2px;font-variant-numeric:tabular-nums}
.sv.ok{color:var(--cm-green)} .sv.bad{color:var(--cm-orange)}
.sec{margin-bottom:26px}
.sec-h{display:flex;align-items:center;justify-content:space-between;padding:0 20px 10px}
.sec-h b{font-size:22px;font-weight:700;color:var(--cm-text2)}
.group{border-radius:26px;overflow:hidden;background:var(--cm-group)}
.orow{position:relative;display:flex;align-items:center;gap:14px;padding:0 20px;min-height:76px;width:100%;text-align:left;color:var(--cm-text)}
.orow.sm{min-height:60px}
.orow+.orow::before{content:'';position:absolute;top:0;left:82px;right:20px;height:.5px;background:var(--cm-sep)}
.orow.sm+.orow.sm::before{left:64px}
.orow:active{opacity:.7}
@media (hover:hover){.orow:hover{background:var(--cm-fill2)}}
.oc{width:48px;height:48px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;flex-shrink:0}
.oc svg{width:24px;height:24px}
.oi{width:30px;height:30px;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff;flex-shrink:0}
.oi svg{width:18px;height:18px}
.otx{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.otx b{font-size:18px;font-weight:400;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.otx small{font-size:14px;color:var(--cm-text2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.otx i{font-style:normal;font-size:13px;font-weight:600}
.ometa{font-size:15px;color:var(--cm-text2);white-space:nowrap;font-variant-numeric:tabular-nums}
.ost{font-size:15px;font-weight:600;white-space:nowrap;width:190px;text-align:right}
.ocount{font-size:18px;color:var(--cm-text2);font-variant-numeric:tabular-nums}
.chev{width:16px;height:16px;color:var(--cm-text3);flex-shrink:0}
.wideonly{display:none} :host([data-wide]) .wideonly{display:block}
:host([data-wide]) .phoneonly{display:none}
.empty{text-align:center;color:var(--cm-text2);padding:60px 30px;font-size:15px;line-height:1.45}
.empty b{display:block;color:var(--cm-text);font-size:20px;margin-bottom:6px}
.spinner{width:22px;height:22px;border-radius:50%;border:2.5px solid var(--cm-fill);border-top-color:var(--cm-text2);animation:cm-spin .8s linear infinite;margin:0 auto}
.loading{padding:40px 0}
.loading small{display:block;margin-top:12px;text-align:center;font-size:14px;color:var(--cm-text2)}
.busy-line{display:flex;align-items:center;justify-content:center;gap:10px;padding:14px 20px;font-size:15px;color:var(--cm-text2);border-bottom:.5px solid var(--cm-sep)}
.busy-line .spinner{width:16px;height:16px;margin:0;border-width:2px}
.group.stale .orow{opacity:.55;transition:opacity .2s}
.more{display:block;width:100%;padding:16px;font-size:16px;font-weight:600;color:var(--cm-link);text-align:center}
.hidden-line{position:relative;display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:4px 8px;padding:16px 20px;font-size:15px;color:var(--cm-text2);text-align:center}
.orow+.hidden-line::before,.more+.hidden-line::before{content:'';position:absolute;top:0;left:20px;right:20px;height:.5px;background:var(--cm-sep)}
.hidden-line svg{width:17px;height:17px}
.stalebar{display:flex;align-items:center;gap:12px;padding:12px 16px;margin:0 0 26px;border-radius:22px;background:color-mix(in srgb,var(--cm-orange) 16%,var(--cm-group));width:100%;text-align:left;color:var(--cm-text)}
.stalebar.blue{background:color-mix(in srgb,var(--cm-accent) 16%,var(--cm-group))}
.stalebar .sbi{width:34px;height:34px;border-radius:50%;background:var(--cm-orange);color:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.stalebar.blue .sbi{background:var(--cm-accent)}
.stalebar .sbi svg{width:20px;height:20px}
.sbt{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}
.sbt b{font-size:15px;font-weight:600}
.sbt small{font-size:13px;color:var(--cm-text2);line-height:1.3}
.sbr{color:var(--st-n);font-weight:600;font-size:16px;white-space:nowrap}
.stalebar.blue .sbr{color:var(--cm-link)}
/* bottom */
.bottom{position:absolute;left:0;right:0;bottom:0;z-index:6;display:flex;align-items:center;gap:10px;padding:0 26px calc(16px + env(safe-area-inset-bottom));pointer-events:none}
:host(:not([data-wide])) .bottom{padding:0 14px calc(14px + env(safe-area-inset-bottom))}
.bottom>*{pointer-events:auto}
.searchbar{flex:1;height:48px;border-radius:24px;display:flex;align-items:center;gap:8px;padding:0 8px 0 16px;min-width:0;max-width:900px}
.searchbar>svg{width:19px;height:19px;color:var(--cm-text2);flex-shrink:0}
.searchbar input{flex:1;min-width:0;border:none;outline:none;background:transparent;font-size:17px;height:100%;color:var(--cm-text)}
.searchbar input::placeholder{color:var(--cm-text2)}
.searchbar input::-webkit-search-cancel-button{display:none}
.sb-clear{width:30px;height:30px;display:flex;align-items:center;justify-content:center;border-radius:50%;color:var(--cm-text2)}
.sb-clear svg{width:16px;height:16px}
.searchbar input:placeholder-shown + .sb-clear{display:none}
.vh{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
/* sheets */
.xs-wrap{position:absolute;inset:0;z-index:35;display:flex;align-items:flex-end;background:rgba(0,0,0,0.3);animation:cm-fade .2s}
:host([data-style="glass"]) .xs-wrap{background:rgba(0,0,0,0.24)}
:host([data-wide]) .xs-wrap{align-items:center;justify-content:center;padding:24px}
.xsheet{width:100%;height:calc(100% - 14px - var(--cd-top));border-radius:34px 34px 0 0;display:flex;flex-direction:column;background:var(--cm-sheet-solid);border-top:.5px solid var(--cm-sheetedge);box-shadow:0 -10px 40px rgba(0,0,0,0.25);color:var(--cm-text);font-family:var(--cm-font);animation:cm-up .34s cubic-bezier(.2,.9,.25,1)}
@keyframes cm-up{from{transform:translateY(100%)}}
.xs-wrap.still,.xs-wrap.still .xsheet{animation:none!important}
@keyframes cm-pop{from{transform:translateY(26px) scale(.97);opacity:0}}
:host([data-style="glass"]) .xsheet{background:linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0) 240px),color-mix(in srgb,var(--cm-sheet-solid) 95%,transparent);backdrop-filter:blur(26px) saturate(2.1) brightness(.92);-webkit-backdrop-filter:blur(26px) saturate(2.1) brightness(.92);border:1px solid rgba(255,255,255,0.18);border-bottom:none;box-shadow:0 -20px 60px rgba(0,0,0,0.45),inset 0 1px 0 rgba(255,255,255,0.30)}
:host([data-style="glass"][data-mode="light"]) .xsheet{background:linear-gradient(180deg,rgba(255,255,255,0.45),rgba(255,255,255,0) 240px),color-mix(in srgb,var(--cm-sheet-solid) 95%,transparent);border-color:rgba(255,255,255,0.75);box-shadow:0 -20px 60px rgba(0,0,0,0.18),inset 0 1px 0 rgba(255,255,255,0.95)}
:host([data-wide]) .xsheet{position:relative;overflow:hidden;width:min(640px,100%);height:min(100%,860px);border-radius:28px;border:.5px solid var(--cm-sheetedge);box-shadow:0 24px 70px rgba(0,0,0,0.42);animation:cm-pop .28s cubic-bezier(.2,.9,.25,1)}
:host([data-wide][data-style="glass"]) .xsheet{border:1px solid rgba(255,255,255,0.18)}
.xhd{display:flex;align-items:center;justify-content:space-between;padding:14px 14px 8px;min-height:64px;position:relative;flex-shrink:0}
.xhd h3{position:absolute;left:50%;transform:translateX(-50%);margin:0;font-size:18px;font-weight:600;white-space:nowrap;max-width:55%;overflow:hidden;text-overflow:ellipsis}
.xbody{overflow-y:auto;padding:4px 16px calc(30px + env(safe-area-inset-bottom));flex:1;scrollbar-width:none}
.xbody::-webkit-scrollbar{display:none}
.hero{display:flex;flex-direction:column;align-items:center;text-align:center;gap:4px;padding:6px 0 18px}
.hero .oc{width:84px;height:84px;margin-bottom:8px}
.hero .oc svg{width:40px;height:40px}
.hero b{font-size:24px;font-weight:700;letter-spacing:-0.01em;word-break:break-word}
.hero small{font-size:15px;color:var(--cm-text2)}
.hero i{font-style:normal;font-size:15px;font-weight:600;margin-top:2px}
.btns{display:flex;gap:10px;margin-bottom:10px;flex-wrap:wrap}
.pill{flex:1;min-width:150px;height:50px;padding:0 18px;border-radius:25px;font-size:17px;font-weight:600;display:inline-flex;align-items:center;justify-content:center;gap:6px;white-space:nowrap;transition:transform .15s ease}
.pill:active{transform:scale(.96)}
.pill svg{width:16px;height:16px}
.pill.accent{color:#fff;background:var(--cm-accent);box-shadow:0 4px 14px color-mix(in srgb,var(--cm-accent) 40%,transparent)}
.pill.fill{background:var(--cm-fill);color:var(--cm-text)}
.note{font-size:14px;color:var(--cm-text2);text-align:center;margin:4px 12px 22px;line-height:1.4}
.fh{font-size:13px;font-weight:600;color:var(--cm-text2);text-transform:uppercase;letter-spacing:.02em;padding:0 20px 8px}
.fg{border-radius:26px;background:var(--cm-field);margin-bottom:22px;overflow:hidden}
.fr{position:relative;display:flex;align-items:center;gap:12px;padding:0 20px;min-height:58px;font-size:17px}
.fr+.fr::before{content:'';position:absolute;top:0;left:20px;right:20px;height:.5px;background:var(--cm-sep)}
.fr .fv{flex:1;min-width:0;text-align:right;color:var(--cm-text2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.fr .fv.wrap{white-space:normal;line-height:1.3}
.fr .mono{font-family:"SF Mono",ui-monospace,Menlo,monospace;font-size:14px}
.fr .ck{width:22px;height:22px;flex-shrink:0}
.fr .ck.ok{color:var(--cm-green)} .fr .ck.bad{color:var(--cm-orange)} .fr .ck.wait{color:var(--cm-text3)}
.fr.tall{align-items:flex-start;padding:14px 20px;min-height:0;gap:14px}
.fr .tx{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}
.fr .tx b{font-size:17px;font-weight:600}
.fr .tx small{font-size:14px;color:var(--cm-text2);line-height:1.4}
.fr .oi{margin-top:1px}
.readme{padding:16px 20px;font-size:16px;line-height:1.45;white-space:pre-line;word-break:break-word}
.intro{font-size:16px;line-height:1.45;color:var(--cm-text2);margin:4px 8px 22px;text-align:center}
.foot{font-size:13px;color:var(--cm-text2);text-align:center;line-height:1.4;padding:0 16px}
/* menus */
.menu-wrap{position:absolute;inset:0;z-index:50}
.menu{position:absolute;min-width:290px;max-width:calc(100% - 28px);border-radius:26px;padding:6px 0;overflow:hidden;background:color-mix(in srgb,var(--cm-glass-strong) 80%,transparent);backdrop-filter:blur(34px) saturate(1.8);-webkit-backdrop-filter:blur(34px) saturate(1.8);border:.5px solid var(--cm-glass-edge);box-shadow:var(--cm-shadow),inset 0 1px 0 var(--cm-glass-shine);color:var(--cm-text);font-family:var(--cm-font);animation:cm-menu .24s cubic-bezier(.2,.9,.3,1.2) both}
:host([data-style="classic"]) .menu{background:var(--cm-glass-solid);backdrop-filter:none;-webkit-backdrop-filter:none}
.menu.tr-o{transform-origin:top right} .menu.br-o{transform-origin:bottom right}
@keyframes cm-menu{from{opacity:0;transform:scale(.85)}}
.menu button{width:100%;display:flex;align-items:center;gap:14px;padding:12px 20px;font-size:18px;text-align:left;color:var(--cm-text)}
.menu button:active{background:var(--cm-fill)}
@media (hover:hover){.menu button:hover{background:var(--cm-fill2)}}
.menu .ml{width:24px;height:24px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.menu .ml svg{width:23px;height:23px}
.menu .mv{margin-left:auto;color:var(--cm-text2);font-size:16px;padding-left:10px;white-space:nowrap}
.menu .mcur{font-weight:600} .menu .mcur .ml{color:var(--cm-accent)}
.menu .msep{height:.5px;background:var(--cm-sep);margin:6px 20px}
.menu .mh{font-size:13px;color:var(--cm-text2);padding:8px 20px 4px}
.toast{position:absolute;left:50%;bottom:calc(84px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:70;padding:12px 18px;border-radius:22px;font-size:15px;max-width:min(520px,calc(100% - 28px));text-align:center;animation:cm-fade .2s;font-family:var(--cm-font)}

/* settings: laid out like the Crow Food editor (a list of pages, each with its own settings) */
.ed-list{border-radius:26px;overflow:hidden;background:var(--cm-field);margin-bottom:22px}
.ed-row{display:flex;align-items:center;gap:14px;width:100%;padding:0 20px;min-height:66px;text-align:left;color:var(--cm-text);position:relative}
.ed-row+.ed-row::before{content:'';position:absolute;top:0;left:64px;right:20px;height:.5px;background:var(--cm-sep)}
@media (hover:hover){.ed-row:hover{background:var(--cm-fill2)}}
.ed-row:active{opacity:.7}
.ed-tile{width:30px;height:30px;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff;flex-shrink:0}
.ed-tile svg{width:18px;height:18px}
.ed-row-t{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.ed-row-t b{font-size:17px;font-weight:600}
.ed-row-t small{font-size:13px;color:var(--cm-text2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ed-row-v{font-size:15px;color:var(--cm-text2);white-space:nowrap}
.set-row{padding:14px 20px;display:flex;flex-direction:column;gap:8px;position:relative}
.set-row+.set-row::before,.toggle-item+.set-row::before,.set-row+.toggle-item::before{content:'';position:absolute;top:0;left:20px;right:20px;height:.5px;background:var(--cm-sep)}
.set-l{font-size:17px;font-weight:500}
.set-d{font-size:13px;color:var(--cm-text2);line-height:1.45}
.set-in{width:100%;height:44px;padding:0 14px;border-radius:12px;border:0;outline:none;background:var(--cm-fill);color:var(--cm-text);font:inherit;font-size:16px}
.set-in:focus{box-shadow:0 0 0 2px color-mix(in srgb,var(--cm-accent) 55%,transparent)}
.set-btns{display:flex;gap:10px;flex-wrap:wrap}
.set-btns .pill{height:44px;font-size:16px;min-width:120px}
.toggle-item{display:flex;align-items:flex-start;gap:12px;padding:14px 20px;position:relative}
.toggle-item>div{flex:1}
.toggle-switch{position:relative;width:51px;height:31px;flex-shrink:0;margin-top:2px}
.toggle-switch input{opacity:0;width:0;height:0;position:absolute}
.toggle-track{position:absolute;inset:0;border-radius:31px;background:rgba(120,120,128,0.32);cursor:pointer;transition:background .25s ease}
.toggle-track::after{content:'';position:absolute;width:27px;height:27px;border-radius:50%;background:#fff;top:2px;left:2px;box-shadow:0 2px 6px rgba(0,0,0,0.3);transition:transform .25s ease}
.toggle-switch input:checked+.toggle-track{background:#34C759}
.toggle-switch input:checked+.toggle-track::after{transform:translateX(20px)}
.segmented{display:flex;background:rgba(118,118,128,0.2);border-radius:9px;padding:2px;gap:2px}
.segmented input{display:none}
.segmented label{flex:1;text-align:center;padding:8px 4px;font-size:14px;font-weight:500;border-radius:7px;cursor:pointer;color:var(--cm-text);transition:all .2s ease;white-space:nowrap}
.segmented input:checked+label{background:#007AFF;color:#fff;box-shadow:0 1px 4px rgba(0,0,0,0.3)}
.set-note{margin:0 0 22px;padding:12px 16px;border-radius:18px;font-size:14px;line-height:1.45;background:color-mix(in srgb,var(--cm-orange) 14%,var(--cm-field));color:var(--cm-text)}
.set-note .link{margin-left:4px}
.steps{margin:0;padding:14px 20px 14px 40px;font-size:15px;line-height:1.5}
.steps li+li{margin-top:6px}
.ed-coffee{display:flex;flex-direction:column;align-items:center;gap:12px;margin-top:8px;padding:18px 0 6px}
.ed-coffee p{margin:0;font-size:13px;color:var(--cm-text2);text-align:center;line-height:1.4}
.ed-coffee a{display:inline-flex;align-items:center;gap:8px;padding:10px 18px;border-radius:999px;background:#FFDD00;color:#000;text-decoration:none;font-size:15px;font-weight:600}

/* the README, laid out like GitHub's */
.md-box{position:relative;border-radius:26px;background:var(--cm-field);margin-bottom:22px;overflow:hidden}
.md{padding:18px 20px 20px;font-size:16px;line-height:1.55;color:var(--cm-text);word-wrap:break-word;overflow-wrap:anywhere}
.md-box.short .md{max-height:620px;overflow:hidden}
.md-box.short::after{content:'';position:absolute;left:0;right:0;bottom:52px;height:110px;pointer-events:none;background:linear-gradient(transparent,var(--cm-field))}
.md-more{display:block;width:100%;padding:14px;font-size:16px;font-weight:600;color:var(--cm-link);text-align:center;border-top:.5px solid var(--cm-sep)}
.md>:first-child{margin-top:0}.md>:last-child{margin-bottom:0}
.md h1,.md h2,.md h3,.md h4,.md h5,.md h6{margin:22px 0 10px;font-weight:700;line-height:1.25}
.md h1{font-size:26px;padding-bottom:8px;border-bottom:.5px solid var(--cm-sep)}
.md h2{font-size:21px;padding-bottom:6px;border-bottom:.5px solid var(--cm-sep)}
.md h3{font-size:18px}.md h4,.md h5,.md h6{font-size:16px}
.md p,.md ul,.md ol,.md blockquote,.md pre,.md table,.md details,.md dl{margin:0 0 14px}
.md ul,.md ol{padding-left:24px}.md li+li{margin-top:4px}
.md a{color:var(--cm-link);text-decoration:none}.md a:hover{text-decoration:underline}
.md img{max-width:100%;height:auto;border-radius:6px;vertical-align:middle}
.md p img[height],.md a>img{border-radius:3px}
.md code,.md kbd{font-family:"SF Mono",ui-monospace,Menlo,monospace;font-size:14px;background:var(--cm-fill);border-radius:6px;padding:2px 6px}
.md pre{background:var(--cm-fill2);border-radius:14px;padding:12px 14px;overflow-x:auto;line-height:1.45}
.md pre code{background:none;padding:0;font-size:13px;white-space:pre}
.md blockquote{margin-left:0;padding:2px 0 2px 14px;border-left:4px solid var(--cm-sep);color:var(--cm-text2)}
.md hr{border:0;height:.5px;background:var(--cm-sep);margin:20px 0}
.md table{display:block;max-width:100%;overflow-x:auto;border-collapse:collapse}
.md th,.md td{border:.5px solid var(--cm-sep);padding:8px 12px;vertical-align:top}
.md th{font-weight:600;background:var(--cm-fill2)}
.md td[align=center],.md th[align=center],.md p[align=center],.md div[align=center],.md h1[align=center],.md h2[align=center],.md h3[align=center]{text-align:center}
.md td[align=right],.md th[align=right],.md p[align=right]{text-align:right}
.md details{border-radius:12px;background:var(--cm-fill2);padding:8px 12px}
.md summary{cursor:pointer;font-weight:600}
.md del{color:var(--cm-text2)}

/* rows that slide, as in Crow Food: right for Favourite, left for the main action; press and hold for the menu */
.orow.sw{display:block;padding:0;touch-action:pan-y;-webkit-user-select:none;user-select:none}
.orow.sw:active{opacity:1}
.orow.sw>.row-inner{display:flex;align-items:center;gap:14px;padding:0 20px;min-height:76px;width:100%;text-align:left;color:var(--cm-text);position:relative;z-index:1;transition:transform .25s ease;background:transparent}
.orow.sw.sw-on>.row-inner{transition:none}
.orow.sw.swiped>.row-inner{background:var(--cm-group);border-radius:26px}
@media (hover:hover){.orow.sw:hover{background:var(--cm-fill2)}}
.orow.sw+.orow::before,.orow+.orow.sw::before{z-index:2}
.sw-act{position:absolute;top:0;bottom:0;display:flex;align-items:center;gap:12px;z-index:0;visibility:hidden;padding:0 14px}
.sw-act.trail{right:0}.sw-act.lead{left:0}
.sw-show .sw-act{visibility:visible}
.sw-act button{width:58px;display:flex;flex-direction:column;align-items:center;gap:5px;flex-shrink:0;transform:scale(.6);opacity:0;transition:transform .2s ease,opacity .2s ease}
.sw-show .sw-act button{transform:none;opacity:1}
.sw-act .swc{width:58px;height:58px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff}
.sw-act .swc svg{width:25px;height:25px}
.sw-act .swl{display:none}
.sw-full .sw-act.lead button{transform:scale(1.12)}
.b-fav .swc{background:#FFB800}.b-unfav .swc{background:#8E8E93}.b-github .swc{background:#636366}.b-remove .swc{background:var(--cm-red)}
.favmark{display:inline-flex;vertical-align:-2px;margin-left:6px;color:#FFB800}
.favmark svg{width:15px;height:15px}
.newrel{font-style:normal;font-size:12px;font-weight:700;color:#FFB800;margin-left:8px;letter-spacing:.01em}
.ss{font-size:12px;color:var(--cm-text2);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.note-in{width:100%;min-height:84px;padding:12px 14px;border:0;border-radius:18px;background:var(--cm-fill);color:var(--cm-text);font:inherit;font-size:16px;resize:vertical;outline:none}
.note-in:focus{box-shadow:0 0 0 2px color-mix(in srgb,var(--cm-accent) 55%,transparent)}
.hero .newrel{font-size:15px;margin:4px 0 0}
.xhd .xr{display:flex;gap:8px}
.cb.on{color:#FFB800}
.b-hide .swc{background:#8E8E93}.b-unhide .swc{background:#34C759}
.author{display:flex;align-items:center;gap:16px;flex-wrap:wrap}
.av{width:64px;height:64px;border-radius:50%;object-fit:cover;background:var(--cm-fill);flex-shrink:0}
.av.ph{display:flex;align-items:center;justify-content:center;color:var(--cm-text2)}
.av.ph svg{width:30px;height:30px}
.author .atx{flex:1;min-width:180px}
.author .atx b{display:block;font-size:20px;font-weight:700}
.author .atx small{display:block;font-size:14px;color:var(--cm-text2);margin-top:2px}
.author .atx p{margin:6px 0 0;font-size:15px;line-height:1.4}
.author .abtn{display:flex;gap:10px;width:100%}
:host([data-wide]) .author .abtn{width:auto}
.author .pill{min-width:120px;height:44px;font-size:16px}
.chips{display:flex;gap:10px;overflow-x:auto;padding:2px 0 4px;scrollbar-width:none}
.chips::-webkit-scrollbar{display:none}
.chip{display:inline-flex;align-items:center;gap:8px;padding:6px 14px 6px 6px;border-radius:22px;background:var(--cm-group);color:var(--cm-text);font-size:15px;font-weight:600;white-space:nowrap;flex-shrink:0}
.chip .av{width:30px;height:30px}
.chip .av.ph svg{width:16px;height:16px}
.chip:active{opacity:.6}
.fr.act{width:100%;color:var(--cm-text);text-align:left}
.fr.act:active{opacity:.6}
.fr.act .oi{width:30px;height:30px}
.fr.act .chev{width:14px;height:14px;color:var(--cm-text3);margin-left:auto}
.fr.act.red{color:var(--cm-red)}
.rel-meta{display:flex;justify-content:space-between;gap:10px;padding:12px 20px;font-size:14px;color:var(--cm-text2);border-bottom:.5px solid var(--cm-sep)}
.md-box.rel.short .md{max-height:320px}
.btns .pill{white-space:normal;line-height:1.15;text-align:center}
.inst{font-style:normal;font-size:15px;font-weight:600}
`;

class CrowDiscoverPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.s = { favs: {}, hidden: new Set(), follows: [], mp: new Map(), author: null, authorInfo: null, prevFilter: 'all', favSort: 'added', filter: 'all', q: '', sort: 'updated', showOld: false, rows: [], cursors: null, hasMore: false, counts: {}, hiddenOld: {},
      loading: true, more: false, error: null, checked: true, menu: null, how: false, sel: null, detail: null, detect: null, sdopen: false,
      link: null, linkBusy: false, code: null, codeBusy: false };
    this.info = null;
    this._built = false;
  }

  set hass(hass) {
    const first = !this._hass;
    this._hass = hass;
    const dark = hass.themes?.darkMode ?? window.matchMedia('(prefers-color-scheme: dark)').matches;
    this.setAttribute('data-mode', dark ? 'dark' : 'light');
    if (first) this._start();
  }
  get hass() { return this._hass; }
  set narrow(v) { this._narrow = !!v; this.toggleAttribute('data-narrow', this._narrow); if (this.$) this._renderTopButtons(); }
  get narrow() { return this._narrow; }
  set panel(p) { this._panel = p; }
  set route(r) { this._route = r; }

  connectedCallback() {
    if (!this._built) this._build();
    this._ro = new ResizeObserver(() => this._layout());
    this._ro.observe(this);
    this._onResize = () => this._layout();
    window.addEventListener('resize', this._onResize);
    // iPhone: opening the keyboard for the search box moves the whole page up, and the app doesn't always
    // move it back. Put it back once the keyboard has gone, and measure again.
    this._onScroll = () => { if (!this._typing) this._settle(); };
    window.addEventListener('scroll', this._onScroll, { passive: true });
    window.visualViewport?.addEventListener('resize', this._onResize);
    window.addEventListener('orientationchange', this._onResize);
    this._layout();
    requestAnimationFrame(() => this._layout());
    if (this._hass && this._wasDisconnected) { this._wasDisconnected = false; this._query(true); }
  }
  disconnectedCallback() {
    this._ro?.disconnect();
    window.removeEventListener('resize', this._onResize);
    window.removeEventListener('scroll', this._onScroll);
    window.visualViewport?.removeEventListener('resize', this._onResize);
    window.removeEventListener('orientationchange', this._onResize);
    this._wasDisconnected = true;
  }

  _settle() {
    clearTimeout(this._settleT);
    this._settleT = setTimeout(() => {
      const se = document.scrollingElement || document.documentElement;
      if (se && se.scrollTop) se.scrollTop = 0;
      if (window.scrollY) window.scrollTo(0, 0);
      this._layout();
    }, 60);
  }

  _layout() {
    // fit the page Home Assistant leaves us: the app (or a browser bar) can start it below the top of the
    // screen, and then 100vh would push the search bar off the bottom
    const top = Math.max(0, this.getBoundingClientRect().top);
    this.style.setProperty('--cd-h', `${Math.max(320, window.innerHeight - top)}px`);
    if (top > 0) this.style.setProperty('--cd-safe-top', '0px'); else this.style.removeProperty('--cd-safe-top');
    const w = this.clientWidth;
    const mode = !w ? '' : w >= 1000 ? 'full' : w >= 700 ? 'slim' : '';
    if (mode) this.setAttribute('data-wide', mode); else this.removeAttribute('data-wide');
    if (mode !== 'slim') this._side(false);
    if (mode !== this._mode) { this._mode = mode; if (this._built) this._renderMain(); }
  }

  _ws(msg) { return this._hass.callWS(msg); }

  async _start() {
    if (!this._built) this._build();
    try {
      this.info = await this._ws({ type: 'crow_discover/info' });
    } catch (e) {
      this.info = null;
      this._renderAll();
      return;
    }
    this.setAttribute('data-style', this.info.style === 'classic' ? 'classic' : 'glass');
    await this._loadMarketplace();
    await Promise.all([this._loadFavs(), this._loadPrefs()]);
    this._query(true);
  }

  // what the Marketplace has, and what's installed from it (with updates waiting)
  async _loadMarketplace() {
    if (!this.info?.marketplace) return;
    try {
      const list = (await this._ws({ type: 'marketplace/repositories/list' })) || [];
      const mp = new Map();
      for (const r of list) {
        if (!r?.full_name) continue;
        const iv = r.installed_version || '', av = r.available_version || '';
        mp.set(r.full_name.toLowerCase(), {
          installed: !!r.installed, iv, av,
          update: !!r.installed && (r.pending_upgrade === true || r.status === 'pending-upgrade' || (!!iv && !!av && iv !== av)),
          restart: r.status === 'pending-restart',
        });
      }
      this.s.mp = mp;
      await this._ws({ type: 'crow_discover/marketplace_known', names: list.map((r) => r.full_name).filter(Boolean) });
    } catch (e) { /* the Marketplace isn't ready: the In Marketplace labels wait until it is */ }
  }

  _inst(name) { const m = this.s.mp.get(String(name).toLowerCase()); return m && m.installed ? m : null; }
  _stOf(r) {
    const m = this._inst(r.full_name);
    if (m) return m.update ? { label: 'Update available', color: 'var(--cm-accent)' } : m.restart ? { label: 'Restart needed', color: 'var(--st-n)' } : { label: 'Installed', color: 'var(--st-c)' };
    return STATUS[r.status] || STATUS.none;
  }
  _primary(r) { const m = this._inst(r.full_name); return m && m.update ? UPDATE : PRIMARY[r.status]; }

  async _loadPrefs(p) {
    try { p = p || (await this._ws({ type: 'crow_discover/prefs' })); } catch (e) { p = null; }
    if (p) { this.s.hidden = new Set((p.hidden || []).map((n) => n.toLowerCase())); this.s.follows = p.follows || []; }
    this._renderSide();
  }
  _isHidden(name) { return this.s.hidden.has(String(name).toLowerCase()); }
  _following(login) { return this.s.follows.some((f) => f.login.toLowerCase() === String(login).toLowerCase()); }

  async _loadFavs() {
    try { this.s.favs = (await this._ws({ type: 'crow_discover/fav/summary' })) || {}; } catch (e) { this.s.favs = {}; }
    this._renderSide();
  }

  _errText(code) {
    return {
      needs_token: 'Searching code needs a GitHub token. Add one in Settings → GitHub.',
      no_token: 'No GitHub token has been added.',
      permission: 'Your GitHub token needs the Starring permission (Settings → GitHub explains how).',
      download: 'Couldn’t reach GitHub. Check the internet connection.',
      rate_limit: 'GitHub asked to slow down. Try again in a minute.',
      token: 'GitHub didn’t accept the token. Check it in Settings → GitHub.',
      github: 'GitHub couldn’t answer that search. Try different words.',
      slow: 'GitHub took too long to answer. Try again in a moment.',
    }[code] || 'Something went wrong.';
  }

  // the loaded projects that match the filter (In Marketplace sorts what's loaded)
  _visible() {
    const s = this.s;
    let rows = this._shown();
    if (STATUS_FILTERS.includes(s.filter)) rows = rows.filter((r) => r.status === s.filter);
    if (LOCAL.includes(s.filter) && s.q) {
      const q = s.q.toLowerCase();
      rows = rows.filter((r) => `${r.full_name} ${r.description || ''} ${r.fav?.note || ''}`.toLowerCase().includes(q));
    }
    return rows;
  }

  // the loaded projects, less the ones you've hidden (except on the Hidden page)
  _shown() { return this.s.filter === 'hidden' ? this.s.rows : this.s.rows.filter((r) => !this._isHidden(r.full_name)); }

  // One page of projects. Each page is checked before it's shown, so the list settles once and then stays still:
  // nothing appears as Checking…, drops out, or moves. keep: leave the current list up until the new one is ready.
  async _query(reset, fresh = false, chain = 0, keep = false) {
    const s = this.s;
    if (s.filter === 'fav') { if (reset) this._loadFavPage(fresh); return; }
    if (s.filter === 'hidden') { if (reset) this._loadHiddenPage(); return; }
    if (s.filter === 'following' && !s.follows.length) {
      this._gen = (this._gen || 0) + 1;
      s.loading = false; s.rows = []; s.hasMore = false; s.error = null; s.busy = false; this._renderMain(); return;
    }
    if (reset) {
      this._gen = (this._gen || 0) + 1;
      s.error = null; s.more = false; s.ptext = '';
      if (keep && s.rows.length) { s.busy = true; s.ptext = 'Searching…'; }
      else { s.busy = false; s.loading = true; s.rows = []; s.cursors = null; s.hasMore = false; }
      this._renderMain(true);
      if (!SPECIAL.includes(s.filter)) this._counts(fresh);
    } else {
      if (s.more || !s.hasMore || s.busy) return;
      s.more = true; s.ptext = ''; this._renderMain(true);
    }
    const gen = this._gen;
    let res;
    try {
      const msg = { type: 'crow_discover/query', filter: s.filter, q: s.q, show_old: s.showOld, sort: s.sort,
        cursors: reset ? null : s.cursors, fresh };
      if (s.filter === 'author') msg.author = s.author;
      res = await this._ws(msg);
    } catch (e) {
      if (gen !== this._gen) return;
      const code = e?.code || 'download';
      if (reset && s.busy) this._toast(`Couldn’t search: ${this._errText(code)}`);
      else if (reset) { s.error = code; s.hasMore = false; }
      else this._toast(this._errText(code));
      s.loading = false; s.more = false; s.busy = false; s.ptext = '';
      this._renderSide(); this._renderMain(true);
      return;
    }
    if (gen !== this._gen) return;
    const base = reset ? [] : s.rows;
    const have = new Set(base.map((r) => r.full_name.toLowerCase()));
    let page = res.rows.filter((r) => !have.has(r.full_name.toLowerCase()));
    let failed = null;
    if (page.some((r) => r.status === 'checking')) {
      const out = await this._checkRows(page, gen);
      if (gen !== this._gen) return;
      page = out.rows; failed = out.failed;
    }
    s.rows = base.concat(this._sortPage(page));  // a new page goes below: rows already on screen don't move
    s.cursors = res.cursors; s.hasMore = res.more; s.checked = res.checked;
    s.loading = false; s.more = false; s.busy = false; s.ptext = '';
    this._renderSide();
    this._renderMain(!reset);
    if (failed) this._toast(`Some projects couldn’t be checked yet: ${this._errText(failed)} Tap one to check it.`);
    // a status filter only keeps some of each page, so fetch a few more pages to fill the screen
    if (!failed && s.hasMore && STATUS_FILTERS.includes(s.filter) && this._visible().length < 15 && chain < 4) this._query(false, false, chain + 1);
  }

  _sortPage(rows) {
    const s = this.s;
    const out = rows.slice();
    if (s.sort === 'stars') out.sort((a, b) => b.stars - a.stars);
    else if (s.sort === 'updated') out.sort((a, b) => (b.pushed_at || '').localeCompare(a.pushed_at || ''));
    return out;
  }

  // read the files of a page of projects, a few at a time, before they're shown
  async _checkRows(rows, gen) {
    const s = this.s;
    const todo = rows.filter((r) => r.status === 'checking').map((r) => r.full_name);
    const total = todo.length;
    let done = 0, failed = null;
    const byName = new Map(), drop = new Set(), notChecked = new Set();
    const chunks = [];
    for (let i = 0; i < todo.length; i += 10) chunks.push(todo.slice(i, i + 10));
    const progress = () => { s.ptext = `Checking ${nf(total)} ${total === 1 ? 'project' : 'projects'}… ${nf(done)} done`; this._renderQuiet(); };
    progress();
    const worker = async () => {
      while (chunks.length) {
        const names = chunks.shift();
        try {
          const res = await this._ws({ type: 'crow_discover/check', names });
          if (gen !== this._gen) return;
          res.rows.forEach((r) => byName.set(r.full_name.toLowerCase(), r));
          res.drop.forEach((n) => drop.add(n.toLowerCase()));
        } catch (e) {
          if (gen !== this._gen) return;
          failed = e?.code || 'download';
          names.forEach((n) => notChecked.add(n.toLowerCase()));
        }
        done += names.length;
        progress();
      }
    };
    await Promise.all([worker(), worker()]);
    const typeFilter = ['integration', 'card', 'theme', 'blueprint'].includes(s.filter) ? s.filter : null;
    const out = rows.flatMap((r) => {
      const k = r.full_name.toLowerCase();
      if (drop.has(k)) return [];
      if (notChecked.has(k)) return [{ ...r, status: 'unchecked' }];
      const n = byName.get(k);
      if (!n) return [r];
      if (typeFilter && n.type !== typeFilter) return [];
      return [n];
    });
    return { rows: out, failed };
  }

  async _loadFavPage(fresh) {
    const s = this.s;
    this._gen = (this._gen || 0) + 1;
    const gen = this._gen;
    s.loading = true; s.rows = []; s.cursors = null; s.hasMore = false; s.error = null;
    this._renderMain();
    try {
      const res = await this._ws({ type: 'crow_discover/fav/list', fresh });
      if (gen !== this._gen) return;
      s.rows = this._sortFav(res.rows || []);
      if (res.error) this._toast(`Couldn’t check them all on GitHub: ${this._errText(res.error)}`);
    } catch (e) {
      if (gen !== this._gen) return;
      s.error = e?.code || 'download';
    }
    s.loading = false;
    await this._loadFavs();
    this._renderMain();
  }

  _sortFav(rows) {
    const by = this.s.favSort;
    const out = rows.slice();
    if (by === 'added') out.sort((a, b) => (b.fav?.added || 0) - (a.fav?.added || 0));
    else if (by === 'stars') out.sort((a, b) => b.stars - a.stars);
    else if (by === 'name') out.sort((a, b) => repoName(a.full_name).localeCompare(repoName(b.full_name)));
    else out.sort((a, b) => (b.pushed_at || '').localeCompare(a.pushed_at || ''));
    return out;
  }

  async _loadHiddenPage() {
    const s = this.s;
    this._gen = (this._gen || 0) + 1;
    const gen = this._gen;
    s.loading = true; s.rows = []; s.cursors = null; s.hasMore = false; s.error = null;
    this._renderMain();
    try {
      const res = await this._ws({ type: 'crow_discover/hidden/list' });
      if (gen !== this._gen) return;
      s.rows = res.rows || [];
    } catch (e) {
      if (gen !== this._gen) return;
      s.error = e?.code || 'download';
    }
    s.loading = false;
    this._renderMain();
  }

  // an author's page: who they are, then their Home Assistant projects
  async _openAuthor(login) {
    const s = this.s;
    if (!login) return;
    if (s.filter !== 'author') s.prevFilter = s.filter;
    s.sel = null; s.detail = null; s.menu = null;
    s.filter = 'author'; s.author = login; s.authorInfo = null;
    this.$.input.value = ''; s.q = ''; s.link = null; s.code = null;
    this._renderLayer(); this._renderSide(); this.$.scroll.scrollTop = 0;
    this._query(true);
    let a;
    try { a = await this._ws({ type: 'crow_discover/author', login }); } catch (e) { a = { error: e?.code || 'download' }; }
    if (s.filter !== 'author' || s.author !== login) return;
    s.authorInfo = a; this._renderMain(true);
  }

  async _toggleFollow() {
    const s = this.s, a = s.authorInfo && !s.authorInfo.error ? s.authorInfo : { login: s.author };
    const was = this._following(a.login);
    try {
      const p = await this._ws({ type: 'crow_discover/follow', login: a.login, follow: !was, name: a.name || '', avatar: a.avatar || '' });
      await this._loadPrefs(p);
      this._renderMain(true);
      this._toast(was ? `Stopped following ${a.login}.` : `Following ${a.login}. Their new projects show in Following.`);
    } catch (e) { this._toast(this._errText(e?.code)); }
  }

  async _setHidden(name, hidden) {
    const s = this.s;
    try {
      const p = await this._ws({ type: 'crow_discover/hide', full_name: name, hidden });
      await this._loadPrefs(p);
      if (s.filter === 'hidden' && !hidden) s.rows = s.rows.filter((r) => r.full_name.toLowerCase() !== name.toLowerCase());
      this._renderMain(true); this._renderLayer();
      this._toast(hidden ? `Hid ${repoName(name)}. It’s in Hidden if you want it back.` : `${repoName(name)} shows again.`);
    } catch (e) { this._toast(this._errText(e?.code)); }
  }

  async _counts(fresh) {
    const s = this.s;
    const seq = (this._cseq = (this._cseq || 0) + 1);
    try {
      const res = await this._ws({ type: 'crow_discover/counts', q: s.q, show_old: s.showOld });
      if (seq !== this._cseq) return;
      s.counts = res.counts || {}; s.hiddenOld = res.hidden_old || {};
    } catch (e) {
      if (seq !== this._cseq) return;
      s.counts = {}; s.hiddenOld = {};
    }
    this._renderQuiet();
  }

  // ── building ─────────────────────────────────────
  _build() {
    this._built = true;
    this.shadowRoot.innerHTML = `<style>${CSS}</style>
      <div class="card">
        <nav class="side" aria-label="Crow Discover"></nav>
        <div class="sd-scrim" data-act="side-close"></div>
        <div class="main">
          <div class="scroll"><div class="content"></div></div>
          <div class="edge t"></div>
          <div class="top"><div class="tl"></div><div class="tr"></div></div>
          <div class="edge b"></div>
          <div class="bottom">
            <label class="searchbar g">${I.search}<span class="vh">Search GitHub projects</span>
              <input type="search" placeholder="Search, or paste a GitHub link" autocomplete="off" spellcheck="false">
              <button class="sb-clear" data-act="clear" aria-label="Clear">${I.x}</button></label>
            <button class="cb g" data-act="sort" aria-label="Sort">${I.updown}</button>
          </div>
        </div>
        <div class="layer"></div>
      </div>`;
    const root = this.shadowRoot;
    this.$ = { side: root.querySelector('.side'), content: root.querySelector('.content'), scroll: root.querySelector('.scroll'),
      tl: root.querySelector('.tl'), tr: root.querySelector('.tr'), input: root.querySelector('input'), layer: root.querySelector('.layer') };
    root.addEventListener('click', (e) => this._click(e));
    this.$.input.addEventListener('input', () => this._typed());
    this.$.input.addEventListener('focus', () => { this._typing = true; });
    this.$.input.addEventListener('blur', () => { this._typing = false; this._settle(); setTimeout(() => this._settle(), 400); });
    this.$.input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { this.$.input.value = ''; this._typed(true); }
      else if (e.key === 'Enter') { e.preventDefault(); this.$.input.blur(); this._typed(true); }
    });
    this.$.scroll.addEventListener('scroll', () => {
      const el = this.$.scroll;
      if (!this.s.more && !this.s.loading && !this.s.busy && this.s.hasMore && el.scrollTop + el.clientHeight > el.scrollHeight - 600) this._query(false);
    }, { passive: true });
    root.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this._closeTop();
      else if (e.key === 'Enter' && e.target.dataset?.set) e.target.blur();
      else if (e.key === 'Enter' && e.target.id === 'set-token') this._saveToken();
    });
    root.addEventListener('change', (e) => this._changed(e));
    this._wireSwipes();
    this._renderAll();
  }

  // ── rows that slide (as in Crow Food) ─────────────
  // swipe right: Favourite (all the way to do it straight off); swipe left: the main action and GitHub;
  // press and hold: the menu; tap: the details.
  _wireSwipes() {
    const content = this.$.content;
    const LEAD = 86, BTN = 70;
    let st = null;
    const widths = (row) => ({ lead: row.dataset.lead === '1' ? LEAD : 0, trail: Number(row.dataset.trail || 0) * BTN + 16 });
    const move = (row, x) => {
      row._x = x;
      const inner = row.querySelector('.row-inner');
      if (inner) inner.style.transform = x ? `translateX(${x}px)` : '';
      row.classList.toggle('swiped', x !== 0);
      row.classList.toggle('sw-show', x !== 0);
      row.classList.toggle('sw-full', x > LEAD * 1.9);
    };
    this._closeSwipe = (row) => {
      if (!row) return;
      row.classList.remove('sw-on');
      move(row, 0);
      if (this._openRow === row) this._openRow = null;
      this._flushQuiet();
    };
    content.addEventListener('pointerdown', (e) => {
      const row = e.target.closest('.orow.sw');
      if (!row || e.target.closest('.sw-act') || (e.pointerType === 'mouse' && e.button !== 0)) return;
      if (this._openRow && this._openRow !== row) this._closeSwipe(this._openRow);
      this._gesture = true;
      st = { row, id: e.pointerId, x0: e.clientX, y0: e.clientY, base: row._x || 0, mode: null };
      st.hold = setTimeout(() => {
        if (!st || st.mode) return;
        st.mode = 'hold';
        navigator.vibrate?.(10);
        const rect = row.getBoundingClientRect();
        this.s.menu = { type: 'row', name: row.dataset.name, x: st.x0, y: rect.bottom, top: rect.top };
        this._renderLayer();
      }, 480);
    });
    window.addEventListener('pointermove', (e) => {
      if (!st || e.pointerId !== st.id) return;
      const dx = e.clientX - st.x0, dy = e.clientY - st.y0;
      if (!st.mode) {
        if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.2) {
          st.mode = 'swipe'; clearTimeout(st.hold);
          st.row.classList.add('sw-on');
          try { st.row.setPointerCapture(e.pointerId); } catch (err) { /* fine without */ }
        } else if (Math.abs(dy) > 10) { st.mode = 'scroll'; clearTimeout(st.hold); }
      }
      if (st.mode !== 'swipe') return;
      const w = widths(st.row);
      let x = st.base + dx;
      x = Math.min(x, w.lead ? LEAD * 2.4 : 0);
      x = Math.max(x, -w.trail - 24);
      move(st.row, x);
    }, { passive: true });
    const end = (e) => {
      if (!st || (e && e.pointerId !== st.id)) return;
      clearTimeout(st.hold);
      const { row, mode } = st;
      st = null;
      this._gesture = false;
      if (mode === 'hold') { this._quietClick = Date.now(); this._flushQuiet(); return; }
      if (mode !== 'swipe') { this._flushQuiet(); return; }
      this._quietClick = Date.now();
      row.classList.remove('sw-on');
      const w = widths(row), x = row._x || 0;
      if (w.lead && x > LEAD * 1.9) { this._closeSwipe(row); this._rowAction('fav', row.dataset.name); return; }
      if (w.lead && x > LEAD * 0.5) { move(row, LEAD); this._openRow = row; return; }
      if (x < -w.trail * 0.4) { move(row, -w.trail); this._openRow = row; return; }
      this._closeSwipe(row);
    };
    // redraws from background checks wait while a row is being swiped, or is open
    this._renderQuiet = () => {
      if (this._gesture || this._openRow || this.s.menu) { this._deferred = true; return; }
      this._renderSide(); this._renderMain(true);
    };
    this._flushQuiet = () => {
      if (!this._deferred || this._gesture || this._openRow || this.s.menu) return;
      this._deferred = false; this._renderSide(); this._renderMain(true);
    };
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    this.$.scroll.addEventListener('scroll', () => { if (this._openRow) this._closeSwipe(this._openRow); }, { passive: true });
  }

  async _rowAction(kind, name) {
    const s = this.s;
    if (this._openRow) this._closeSwipe(this._openRow);
    if (s.menu) { s.menu = null; this._renderLayer(); this._flushQuiet(); }
    const r = s.rows.find((x) => x.full_name === name) || (s.code?.rows || []).find((x) => x.full_name === name) || s.link?.row || { full_name: name };
    const [owner, repository] = name.split('/');
    switch (kind) {
      case 'fav': await this._toggleFav(name); break;
      case 'hide': await this._setHidden(name, true); break;
      case 'unhide': await this._setHidden(name, false); break;
      case 'author': this._openAuthor(name.split('/')[0]); break;
      case 'github': window.open(`https://github.com/${name}`, '_blank', 'noopener'); break;
      case 'add':
      case 'open-mp': {
        const cat = (TYPES[r.type] || {}).cat;
        this._navigate(`/marketplace/repository?owner=${encodeURIComponent(owner)}&repository=${encodeURIComponent(repository)}${cat ? `&category=${cat}` : ''}`);
        break;
      }
      case 'import': {
        try {
          const d = await this._ws({ type: 'crow_discover/repo', full_name: name });
          this.s.detail = d; this._importBlueprint();
        } catch (e) { this._toast(this._errText(e?.code)); }
        break;
      }
      case 'copy':
        try { await navigator.clipboard.writeText(`https://github.com/${name}`); this._toast('Link copied.'); }
        catch (e) { this._toast(`github.com/${name}`); }
        break;
      default: break;
    }
  }

  async _toggleFav(name) {
    const s = this.s, was = this._isFav(name);
    try {
      const res = await this._ws({ type: was ? 'crow_discover/fav/remove' : 'crow_discover/fav/add', full_name: name });
      await this._loadFavs();
      if (s.filter === 'fav' && was) s.rows = s.rows.filter((r) => r.full_name !== name);
      this._renderMain(true); this._renderLayer();
      let msg = was ? `Removed ${repoName(name)} from Favourites.` : `Added ${repoName(name)} to Favourites.`;
      if (res.starred === 'ok') msg += was ? ' Unstarred on GitHub.' : ' Starred on GitHub.';
      else if (res.starred === 'permission') msg += ` Couldn’t ${was ? 'unstar' : 'star'} it on GitHub: the token needs the Starring permission.`;
      this._toast(msg);
    } catch (e) { this._toast(this._errText(e?.code)); }
  }

  _renderAll() { this._renderSide(); this._renderTopButtons(); this._renderMain(); this._renderLayer(); }

  // types: GitHub's own estimate; statuses: how many of the loaded projects
  _navCount(id) {
    const s = this.s;
    if (id === 'fav') return Object.keys(s.favs).length;
    if (id === 'hidden') return s.hidden.size;
    if (id === 'following') return s.follows.length;
    if (STATUS_FILTERS.includes(id)) return null;
    return null;  // types: no numbers beside them (GitHub's estimates are on each page instead)
  }

  _countText(id) {
    const n = this._navCount(id);
    if (n == null) return '';
    return STATUS_FILTERS.includes(id) || SPECIAL.includes(id) ? nf(n) : `~${n >= 10000 ? `${Math.round(n / 1000)}k` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : nf(n)}`;
  }

  _renderSide() {
    if (!this.$) return;
    const s = this.s, info = this.info || {};
    const foot = info.signed_in ? 'Searching GitHub live with your token.'
      : 'Searching GitHub live without a token, so searches are limited and projects are checked when opened. <button class="link" data-act="set-page" data-id="github">Add a Token</button>';
    this.$.side.innerHTML = `<div class="sd-hd"><button class="sd-burger" data-act="side" aria-label="Show sidebar">${I.sidebar}</button><b>Discover</b></div>
      <div class="sd-list">${NAV.map((sec) => `<div class="sd-h">${sec.h}</div>${sec.items.map((it) => `
        <button class="sd-i${s.filter === it.id ? ' on' : ''}" data-act="filter" data-id="${it.id}" aria-label="${esc(it.label)}" title="${esc(it.label)}">
          <span class="sd-ic" style="background:${it.color}">${I[it.icon]}</span><span class="sd-n">${esc(it.label)}</span><span class="sd-c">${this._countText(it.id)}</span></button>`).join('')}`).join('')}</div>
      <div class="sd-foot">${foot}</div>`;
  }

  _renderTopButtons() {
    if (!this.$) return;
    const s = this.s, busy = s.loading;
    const phone = !this.hasAttribute('data-wide');
    this.$.tl.innerHTML = `${this._narrow ? `<button class="cb g" data-act="ha-menu" aria-label="Home Assistant menu">${I.menu}</button>` : ''}${phone && (s.filter !== 'all' || s.allList) ? `<button class="cb g" data-act="back" aria-label="Back">${I.back}</button>` : ''}`;
    this.$.tr.innerHTML = `<button class="cb g${busy ? ' spin' : ''}" data-act="refresh" aria-label="Refresh now">${I.refresh}</button>
      <button class="cb g" data-act="menu" aria-label="More options">${I.more}</button>`;
  }

  _isFav(name) { return !!this.s.favs[name.toLowerCase()]; }

  _swButton(cls, act, name, icon, label, bg) {
    return `<button class="${cls}" data-act="sw" data-sw="${act}" data-name="${esc(name)}" aria-label="${esc(label)}" title="${esc(label)}"><span class="swc"${bg ? ` style="background:${bg}"` : ''}>${icon}</span><span class="swl">${esc(label)}</span></button>`;
  }

  _row(r) {
    const t = TYPES[r.type] || TYPES.integration, st = this._stOf(r);
    const name = r.full_name, fav = this._isFav(name), favInfo = this.s.favs[name.toLowerCase()] || r.fav || {};
    const who = r.fork_of ? `${esc(name.split('/')[0])} · fork of ${esc(r.fork_of)}` : esc(name.split('/')[0]);
    const page = this.s.filter;
    const meta = r.pushed_at ? `★ ${nf(r.stars)} · ${esc(ago(r.pushed_at))}` : '';
    const onFavPage = page === 'fav', onHidden = page === 'hidden';
    const second = onFavPage && favInfo.note ? esc(favInfo.note) : `${who}${r.description ? ` · ${esc(r.description)}` : ''}`;
    const primary = onHidden ? null : this._primary(r);
    const lead = onFavPage ? '' : `<div class="sw-act lead">${fav ? this._swButton('b-unfav', 'fav', name, I.star, 'Unfavourite') : this._swButton('b-fav', 'fav', name, I.starFill, 'Favourite')}</div>`;
    const btns = [];
    if (primary) btns.push(this._swButton('b-main', primary.act, name, I[primary.icon], primary.label, primary.color));
    if (onFavPage) btns.push(this._swButton('b-remove', 'fav', name, I.trash, 'Remove'));
    else if (onHidden) btns.push(this._swButton('b-unhide', 'unhide', name, I.eye, 'Show'), this._swButton('b-github', 'github', name, I.ext, 'GitHub'));
    else btns.push(this._swButton('b-github', 'github', name, I.ext, 'GitHub'), this._swButton('b-hide', 'hide', name, I.eyeOff, 'Hide'));
    const trail = `<div class="sw-act trail">${btns.join('')}</div>`;
    return `<div class="orow sw" data-name="${esc(name)}" data-lead="${lead ? 1 : 0}" data-trail="${btns.length}">${lead}${trail}
      <button class="row-inner" data-act="open" data-name="${esc(name)}">
      <span class="oc" style="background:${t.color}">${I[r.type] || I.integration}</span>
      <span class="otx"><b>${esc(repoName(name))}${fav ? `<span class="favmark" aria-label="Favourite">${I.starFill}</span>` : ''}${favInfo.new_release ? '<span class="newrel">New release</span>' : ''}</b>
        <small class="wideonly">${second}</small>
        <small class="phoneonly">${onFavPage && favInfo.note ? second : `${who}${meta ? ` · ${meta}` : ''}`}</small>
        <i class="phoneonly" style="color:${st.color}">${st.label}</i></span>
      <span class="ometa wideonly">${meta}</span>
      <span class="ost wideonly" style="color:${st.color}">${st.label}</span>
      ${I.chevR.replace('<svg', '<svg class="chev"')}</button></div>`;
  }

  _renderMain(keepScroll) {
    if (!this.$) return;
    const s = this.s, info = this.info, wide = this.hasAttribute('data-wide');
    const top = this.$.scroll.scrollTop;
    if (!info) {
      this.$.content.innerHTML = `<div class="today"><b>Discover</b></div><div class="group"><div class="empty"><b>Crow Discover isn’t running</b>Check Settings → Devices &amp; services → Crow Discover, then reload this page.</div></div>`;
      return;
    }
    const cur = NAV.flatMap((x) => x.items).find((x) => x.id === s.filter) || NAV[0].items[0];
    const ai = s.filter === 'author' && s.authorInfo && !s.authorInfo.error ? s.authorInfo : null;
    const phoneHome = !wide && s.filter === 'all' && !s.q && !s.allList;
    const headline = s.filter === 'all' ? (!wide && s.allList && !s.q ? 'All projects' : 'Discover') : s.filter === 'author' ? (ai?.name || s.author) : cur.label;
    const years = Math.round((info.old_days || 730) / 365);
    const countKey = STATUS_FILTERS.includes(s.filter) || s.q ? 'all' : s.filter;
    const about = s.counts[countKey];
    const sub = '';  // no line under the heading: How Discover Finds Projects is in the ⋯ menu
    const banners = [];
    if (!info.signed_in) {
      banners.push(`<button class="stalebar blue" data-act="set-page" data-id="github"><span class="sbi">${I.lock}</span><span class="sbt"><b>Add a GitHub token for checked results</b><small>Without one, GitHub allows about 10 searches a minute and each project is checked when you open it.</small></span><span class="sbr">Add</span></button>`);
    }
    if (!info.marketplace) {
      banners.push(`<div class="stalebar blue"><span class="sbi">${I.market}</span><span class="sbt"><b>The Marketplace isn’t set up</b><small>Adding projects needs Home Assistant’s Marketplace (Settings → Marketplace). Until then, Discover opens projects on GitHub.</small></span></div>`);
    }
    const vis = this._visible();
    let list;
    if (s.loading && !s.rows.length) list = `<div class="group"><div class="loading"><div class="spinner"></div>${s.ptext ? `<small>${esc(s.ptext)}</small>` : ''}</div></div>`;
    else if (s.error && !s.rows.length) list = `<div class="group"><div class="empty"><b>GitHub didn’t answer</b>${esc(this._errText(s.error))}<br><br><button class="link" data-act="refresh">Try Again</button></div></div>`;
    else {
      const hidden = SPECIAL.includes(s.filter) ? 0 : s.hiddenOld[countKey] || 0;
      const own = s.filter === 'author' || s.filter === 'following';
      const oldLine = ['fav', 'hidden'].includes(s.filter) ? ''
        : own && !s.showOld ? `<div class="hidden-line">${I.clock}<span>Projects not updated in over ${years} years are hidden</span><button class="link" data-act="old">Show</button></div>`
        : s.showOld ? `<div class="hidden-line">${I.clock}<span>Showing older projects too</span><button class="link" data-act="old">Hide</button></div>`
        : hidden > 0 ? `<div class="hidden-line">${I.clock}<span>About ${nf(hidden)} older ${hidden === 1 ? 'project' : 'projects'} hidden (not updated in over ${years} years)</span><button class="link" data-act="old">Show</button></div>` : '';
      const blank = (title, text) => `<div class="empty"><b>${title}</b>${text}</div>`;
      const empty = vis.length ? ''
        : s.filter === 'fav' && !s.q ? blank('No favourites yet', 'Swipe right on a project to favourite it, or tap the star in its details.')
        : s.filter === 'hidden' && !s.q ? blank('Nothing hidden', 'Swipe left on a project and tap Hide to leave it out of Discover. It comes back here.')
        : s.filter === 'following' && !s.follows.length ? blank('Not following anyone yet', 'Open a project, tap More from its author, then Follow. Their newest Home Assistant projects show here.')
        : s.filter === 'author' && !s.hasMore && !s.q ? blank('No Home Assistant projects found', `${esc(s.author)}’s repos don’t mention Home Assistant${s.showOld ? '' : `, or none were updated in the last ${years} years`}.`)
        : !vis.length && s.filter === 'fav' ? blank('No favourites match', 'Try other words.')
        : !vis.length ? `<div class="empty"><b>Nothing found${s.hasMore ? ' yet' : ''}</b>${STATUS_FILTERS.includes(s.filter) && s.hasMore ? 'None of the projects loaded so far. Show More looks further.' : s.q ? 'Try other words, search code, or paste the project’s GitHub link.' : 'Nothing here.'}</div>` : '';
      const more = s.hasMore && !s.busy ? `<button class="more" data-act="more">${s.more ? esc(s.ptext || 'Loading…') : 'Show More'}</button>` : '';
      const code = s.q && info.signed_in && !s.busy && !SPECIAL.includes(s.filter) ? `<button class="more" data-act="code">${s.codeBusy ? 'Searching code…' : 'Search Code Too'}</button>` : '';
      const busy = s.busy ? `<div class="busy-line"><div class="spinner"></div><span>${esc(s.ptext || 'Searching…')}</span></div>` : '';
      list = `<div class="group${s.busy ? ' stale' : ''}">${busy}${s.busy ? '' : empty}${vis.map((r) => this._row(r)).join('')}${more}${code}${oldLine}</div>`;
    }
    const codeSec = s.code ? (s.code.error ? `<div class="sec"><div class="sec-h"><b>In code</b></div><div class="group"><div class="empty">${esc(this._errText(s.code.error))}</div></div></div>`
      : `<div class="sec"><div class="sec-h"><b>In code</b></div><div class="group">${s.code.rows.length ? s.code.rows.filter((r) => !this._isHidden(r.full_name)).map((r) => this._row(r)).join('') : '<div class="empty">No other projects found in code.</div>'}</div></div>`) : '';
    const phoneNav = wide ? '' : NAV.map((sec) => `<div class="sec"><div class="sec-h"><b>${sec.h}</b></div><div class="group">${sec.items.map((it) => `
      <button class="orow sm" data-act="filter" data-id="${it.id}"><span class="oi" style="background:${it.color}">${I[it.icon]}</span><span class="otx"><b>${esc(it.label)}</b></span><span class="ocount">${this._countText(it.id)}</span>${I.chevR.replace('<svg', '<svg class="chev"')}</button>`).join('')}</div></div>`).join('');
    const sortLabel = s.filter === 'fav' ? 'Your favourites' : s.filter === 'hidden' ? 'Hidden projects'
      : s.filter === 'author' && !s.q ? 'Home Assistant projects' : (SORTS.find((x) => x[0] === s.sort) || SORTS[0])[1];
    const avatar = (url, cls = 'av') => /^https:\/\/avatars\.githubusercontent\.com\//.test(url || '') ? `<img class="${cls}" src="${esc(url)}" alt="" referrerpolicy="no-referrer" loading="lazy">` : `<span class="${cls} ph">${I.person}</span>`;
    const authorPanel = s.filter !== 'author' ? '' : `<div class="panel author">${avatar(ai?.avatar)}<div class="atx"><b>@${esc(s.author)}</b><small>${ai?.org ? 'Organisation on GitHub' : 'On GitHub'}</small>${ai?.bio ? `<p>${esc(ai.bio)}</p>` : ''}${s.authorInfo?.error ? `<p>${esc(this._errText(s.authorInfo.error))}</p>` : ''}</div>
      <div class="abtn"><button class="pill ${this._following(s.author) ? 'fill' : 'accent'}" data-act="follow">${this._following(s.author) ? `${I.check}Following` : 'Follow'}</button><button class="pill fill" data-act="author-gh">GitHub${I.ext}</button></div></div>`;
    const chips = s.filter === 'following' && s.follows.length ? `<div class="sec"><div class="sec-h"><b>Authors you follow</b></div><div class="chips">${s.follows.map((f) => `<button class="chip" data-act="author-open" data-login="${esc(f.login)}">${avatar(f.avatar)}${esc(f.login)}</button>`).join('')}</div></div>` : '';
    const sortBtn = this.shadowRoot.querySelector('.bottom [data-act="sort"]');
    if (sortBtn) sortBtn.style.display = s.filter === 'hidden' || phoneHome ? 'none' : '';
    this.$.content.innerHTML = `
      <div class="today${sub ? '' : ' bare'}"><b>${esc(headline)}</b>${sub ? `<small>${sub}</small>` : ''}</div>
      ${banners.join('')}
      ${authorPanel}
      ${chips}
      ${this._linkSection()}
      ${phoneHome ? phoneNav : `<div class="sec"><div class="sec-h"><b>${s.q ? 'Results' : esc(sortLabel)}</b></div>${list}</div>
      ${codeSec}`}`;
    if (keepScroll) this.$.scroll.scrollTop = top;
    this._renderTopButtons();
  }

  _linkSection() {
    const s = this.s;
    if (!s.linkBusy && !s.link) return '';
    if (s.linkBusy) return `<div class="sec"><div class="sec-h"><b>From your link</b></div><div class="group"><div class="loading"><div class="spinner"></div></div></div></div>`;
    const l = s.link;
    if (l.row) return `<div class="sec"><div class="sec-h"><b>From your link</b></div><div class="group">${this._row(l.row)}</div></div>`;
    const msg = {
      not_ha: `${esc(l.full_name)} doesn’t look like a Home Assistant integration, card, theme or blueprint.`,
      not_found: `Couldn’t find ${esc(l.full_name)} on GitHub. It may be private or renamed.`,
      rate_limit: 'GitHub’s limit for checking without a token has been reached. Try again in an hour, or add a token in Settings.',
      token: 'GitHub didn’t accept the token. Check it in Settings.',
      download: 'Couldn’t reach GitHub.',
    }[l.error];
    return msg ? `<div class="sec"><div class="sec-h"><b>From your link</b></div><div class="group"><div class="empty">${msg}</div></div></div>` : '';
  }

  // ── sheets and menus ─────────────────────────────
  _renderLayer() {
    if (!this.$) return;
    const s = this.s;
    let html = '';
    if (s.sel) html += this._detailSheet();
    if (s.how) html += this._howSheet();
    if (s.setOpen) html += this._settingsSheet();
    if (s.menu) html += this._menu();
    // redrawing a sheet that's already open keeps its place (the Marketplace check arrives after the README)
    const key = `${s.sel || ''}|${s.how}|${s.setOpen}|${s.setPage || ''}`;
    const was = this.$.layer.querySelector('.xbody')?.scrollTop || 0;
    if (key === this._layerKey && this.$.layer.querySelector('.xs-wrap')) html = html.replace(/class="xs-wrap"/g, 'class="xs-wrap still"');
    this.$.layer.innerHTML = html;
    if (key === this._layerKey && was) { const b = this.$.layer.querySelector('.xbody'); if (b) b.scrollTop = was; }
    this._layerKey = key;
    if (!s.menu && this._flushQuiet) this._flushQuiet();
    requestAnimationFrame(() => this.$.layer.querySelectorAll('.md-box.short').forEach((box) => {
      const md = box.querySelector('.md');
      if (md && md.scrollHeight <= md.clientHeight + 4 && !md.querySelector('img')) { box.classList.remove('short'); box.querySelector('.md-more')?.remove(); }
    }));
  }

  _menu() {
    const s = this.s, info = this.info || {};
    const wide = this.hasAttribute('data-wide');
    if (s.menu && s.menu.type === 'row') {
      const m = s.menu, r = s.rows.find((x) => x.full_name === m.name) || (s.code?.rows || []).find((x) => x.full_name === m.name) || s.link?.row || { full_name: m.name };
      const fav = this._isFav(m.name), primary = this._primary(r), hid = this._isHidden(m.name), owner = m.name.split('/')[0];
      const card = this.shadowRoot.querySelector('.card').getBoundingClientRect();
      const below = m.y - card.top + 8, room = card.bottom - m.y;
      const pos = room > 260 ? `top:${Math.round(below)}px` : `bottom:${Math.round(card.bottom - m.top + 8)}px`;
      const side = wide ? `left:${Math.round(Math.min(Math.max(m.x - card.left - 140, 14), card.width - 310))}px` : 'left:14px;right:14px';
      return `<div class="menu-wrap" data-act="menu-close"><div class="menu ${room > 260 ? 'tr-o' : 'br-o'}" role="menu" style="${pos};${side}">
        <div class="mh">${esc(repoName(m.name))}</div>
        <button role="menuitem" data-act="sw" data-sw="fav" data-name="${esc(m.name)}"><span class="ml" style="color:#FFB800">${fav ? I.star : I.starFill}</span>${fav ? 'Remove from Favourites' : 'Add to Favourites'}</button>
        ${primary && info.marketplace !== false ? `<button role="menuitem" data-act="sw" data-sw="${primary.act}" data-name="${esc(m.name)}"><span class="ml">${I[primary.icon]}</span>${primary.long}</button>` : ''}
        <button role="menuitem" data-act="sw" data-sw="github" data-name="${esc(m.name)}"><span class="ml">${I.ext}</span>Open on GitHub</button>
        <button role="menuitem" data-act="sw" data-sw="copy" data-name="${esc(m.name)}"><span class="ml">${I.copy}</span>Copy Link</button>
        ${s.filter === 'author' && s.author?.toLowerCase() === owner.toLowerCase() ? '' : `<button role="menuitem" data-act="sw" data-sw="author" data-name="${esc(m.name)}"><span class="ml">${I.person}</span>More from ${esc(owner)}</button>`}
        <div class="msep"></div>
        <button role="menuitem" data-act="sw" data-sw="${hid ? 'unhide' : 'hide'}" data-name="${esc(m.name)}"><span class="ml">${hid ? I.eye : I.eyeOff}</span>${hid ? 'Show This Project Again' : 'Hide This Project'}</button>
      </div></div>`;
    }
    if (s.menu === 'sort') {
      const pos = wide ? 'right:26px;bottom:76px' : 'right:14px;bottom:74px';
      return `<div class="menu-wrap" data-act="menu-close"><div class="menu br-o" role="menu" style="${pos}">
        <div class="mh">Sort by</div>
        ${(s.filter === 'fav' ? FAV_SORTS : SORTS).map(([id, label]) => { const on = (s.filter === 'fav' ? s.favSort : s.sort) === id; return `<button role="menuitemradio" aria-checked="${on}" class="${on ? 'mcur' : ''}" data-act="sort-by" data-id="${id}"><span class="ml">${on ? I.check : ''}</span>${label}</button>`; }).join('')}
      </div></div>`;
    }
    const pos = wide ? 'right:26px;top:calc(72px + var(--cd-top))' : 'right:14px;top:calc(66px + var(--cd-top))';
    return `<div class="menu-wrap" data-act="menu-close"><div class="menu tr-o" role="menu" style="${pos}">
      <button role="menuitem" data-act="how"><span class="ml">${I.info}</span>How Discover Finds Projects</button>
      <button role="menuitem" data-act="refresh"><span class="ml">${I.refresh}</span>Refresh</button>
      <div class="msep"></div>
      <button role="menuitem" data-act="settings"><span class="ml">${I.sliders}</span>Settings<span class="mv">${info.signed_in ? 'Token added' : ''}</span></button>
    </div></div>`;
  }

  _howSheet() {
    const days = this.info?.old_days || 730, years = Math.round(days / 365);
    const row = (icon, color, title, text) => `<div class="fr tall"><span class="oi" style="background:${color}">${I[icon]}</span><span class="tx"><b>${title}</b><small>${text}</small></span></div>`;
    return `<div class="xs-wrap" data-act="how-close"><div class="xsheet" role="dialog" aria-label="How Discover finds projects" data-stop>
      <div class="xhd"><button class="cb g" data-act="how-close" aria-label="Close">${I.x}</button><h3>How Discover Finds Projects</h3><span style="width:48px"></span></div>
      <div class="xbody">
        <p class="intro">Discover asks GitHub as you look, so there’s no list to download and no scans. Each page is a quick search for about 40 projects, whose files are checked before the page is shown, so the list settles once and then stays still. A search starts when you stop typing, or straight away when you press Return.</p>
        <div class="fh">Where it looks</div>
        <div class="fg">
          ${row('tag', '#007AFF', 'Topics', 'Repos tagged home-assistant, hacs, lovelace-custom-card, home-assistant-custom-component and similar, for the type you’re looking at.')}
          ${row('text', '#34C759', 'Names, descriptions and READMEs', 'Repos that mention Home Assistant along with card, integration, theme or blueprint, so ones without tags are found too. What you type in the search bar is searched the same way.')}
          ${row('code', '#AF52DE', 'Code', 'After a search, Search Code Too looks for files only Home Assistant projects have, like a manifest in custom_components. It needs a GitHub token, and GitHub allows only about 10 a minute.')}
          ${row('market', '#32ADE6', 'Your Marketplace', 'Labels the projects your Marketplace already has, and the ones you’ve installed from it, with Update available when the Marketplace has a newer version.')}
        </div>
        <div class="fh">Then it checks the files</div>
        <div class="fg"><div class="readme">With a GitHub token, every project’s files are checked before it’s listed, using the same rules the Marketplace uses: what it is, and whether the Marketplace can install it. Ones it can’t install are labelled Not installable, and their details say why. Repos that aren’t Home Assistant projects (config backups, say) are left out. Without a token, a project is checked when you open it.</div></div>
        <div class="fh">Numbers</div>
        <div class="fg"><div class="readme">The number under each heading is GitHub’s own estimate of how many repos match, before the check. Show More looks further, and adds the next projects below the ones already showing.</div></div>
        <div class="fh">Favourites and saved results</div>
        <div class="fg"><div class="readme">Swipe right on a project (or tap the star in its details, or press and hold it) to add it to your Favourites, which only you see. Each one is checked on GitHub again when you open Favourites, can have a note, and shows a New release label when it has a newer release than when you added (or last opened) it. Search pages, counts, READMEs and release notes are kept for the time set in Settings → General (a day to start), so going back is instant; Refresh always asks GitHub again.</div></div>
        <div class="fh">Authors, Following and Hidden</div>
        <div class="fg">
          ${row('person', '#007AFF', 'Authors', 'More from in a project’s details (or press and hold a row) shows everything that author has for Home Assistant: repos that mention it in their name, description or README, or are tagged with it.')}
          ${row('people', '#5856D6', 'Following', 'Follow an author on their page, and Following lists the newest projects from everyone you follow. It’s yours only and nothing is followed on GitHub.')}
          ${row('eyeOff', '#8E8E93', 'Hidden', 'Swipe left and tap Hide (or press and hold) to leave a project out of every list. Hidden keeps them, and Show brings one back. Yours only.')}
        </div>
        <div class="fh">What’s left out</div>
        <div class="fg">
          ${row('clock', '#FF9F0A', `Not updated in over ${years} years`, 'Hidden, because they often break on current Home Assistant releases. The list says about how many were hidden, and Show brings them back.')}
          ${row('fork', '#8E8E93', 'Forks', 'Copies of another repo aren’t searched. Paste a fork’s link to check it.')}
          ${row('lock', '#8E8E93', 'Private repos', 'GitHub doesn’t show them to anyone but their owner.')}
        </div>
        <p class="foot">Missing a project? Paste its GitHub link into the search bar.</p>
      </div></div></div>`;
  }

  _detailSheet() {
    const s = this.s, d = s.detail, name = s.sel;
    const fav = this._isFav(name), favInfo = s.favs[name.toLowerCase()] || {};
    const head = `<div class="xhd"><button class="cb g" data-act="close" aria-label="Close">${I.x}</button><h3></h3><div class="xr"><button class="cb g${fav ? ' on' : ''}" data-act="fav-sheet" aria-label="${fav ? 'Remove from Favourites' : 'Add to Favourites'}" aria-pressed="${fav}">${fav ? I.starFill : I.star}</button><button class="cb g" data-act="github" aria-label="Open on GitHub">${I.ext}</button></div></div>`;
    if (!d) return `<div class="xs-wrap" data-act="close"><div class="xsheet" role="dialog" aria-label="${esc(name)}" data-stop>${head}<div class="xbody"><div class="loading"><div class="spinner"></div></div></div></div></div>`;
    if (d.error) return `<div class="xs-wrap" data-act="close"><div class="xsheet" role="dialog" data-stop>${head}<div class="xbody"><div class="empty">${esc(d.error)}</div></div></div></div>`;
    const t = TYPES[d.type] || TYPES.integration, st = STATUS[d.status] || STATUS.none;
    const mk = !!this.info?.marketplace, inst = this._inst(d.full_name), hid = this._isHidden(d.full_name), owner = d.full_name.split('/')[0];
    let primary, primaryAct, note;
    if (d.status === 'blueprint') { primary = 'Import Blueprint'; primaryAct = 'import'; note = 'Opens Home Assistant’s blueprint importer with this repo’s blueprint.'; }
    else if (d.status === 'market') {
      primary = mk ? (inst?.update ? 'Update in Marketplace' : 'Open in Marketplace') : 'View on GitHub'; primaryAct = mk ? 'marketplace' : 'github';
      note = inst?.update ? `You have ${inst.iv || 'an older version'} installed, and the Marketplace has ${inst.av || 'a newer one'}. It updates there.`
        : inst?.restart ? 'Installed from the Marketplace. Restart Home Assistant to finish.'
        : inst ? `Installed from the Marketplace${inst.iv ? ` (${inst.iv})` : ''}, which keeps it updated.` : 'Already in the Marketplace, so it opens there.';
    }
    else if (d.status === 'compatible') {
      primary = mk ? (d.old ? 'Add to Marketplace Anyway' : 'Add to Marketplace') : 'View on GitHub'; primaryAct = mk ? 'marketplace' : 'github';
      note = mk ? 'Adds it to the Marketplace as a custom repository. The Marketplace then handles installing, updates and removal.' : 'Set up the Marketplace to add it from here.';
    } else { primary = 'View on GitHub'; primaryAct = 'github'; note = reasonText(d); }
    if (d.old && d.status !== 'none') note = `Not updated in over ${Math.round((this.info?.old_days || 730) / 365)} years, so it may not work with current Home Assistant. ${note}`;
    if (d.builtin && d.status !== 'none') note += ` It uses the same name (${d.domain}) as an integration built into Home Assistant and would replace it; the Marketplace will ask you to confirm.`;
    const secondary = d.status === 'none' && !d.archived ? ['issue', 'Ask the Author', I.issue] : ['github', 'GitHub', I.ext];
    const facts = [
      d.fork_of ? ['Fork of', d.fork_of] : null,
      ['Stars', nf(d.stars)],
      ['Updated', `${ago(d.pushed_at)}`],
      ['Release', d.release || 'None'],
      inst ? ['Installed', inst.iv || 'Yes'] : null,
      inst?.update && inst.av ? ['Available', inst.av] : null,
      ['Licence', d.licence || '—'],
      d.type !== 'blueprint' ? ['Needs Home Assistant', d.ha || '—'] : null,
      ['Activity', activity(d)],
      ['Found by', d.found_by || '—'],
    ].filter(Boolean);
    const layoutOk = d.compatible || d.reason === 'archived';
    const checks = d.type === 'blueprint'
      ? [['Blueprint file found', true]]
      : [['Laid out the way the Marketplace installs', layoutOk]];
    checks.push([`Updated in the last ${Math.round((this.info?.old_days || 730) / 365)} years`, !d.old], ['Not archived', !d.archived]);
    if (d.type === 'integration') checks.push(['Doesn’t replace a built-in integration', !d.builtin]);
    const detectRow = `<div class="detect-slot">${this._detectRow(d)}</div>`;
    return this._sheetBody(d, head, t, st, primary, primaryAct, note, secondary, facts, checks, detectRow, inst, hid, owner, fav, favInfo);
  }

  _detectRow(d) {
    const s = this.s;
    let detectRow = '';
    if (this.info?.marketplace && d.status === 'compatible') {
      const dt = s.detect;
      if (dt === 'busy') detectRow = `<div class="fr"><span style="flex:1">Marketplace is checking it…</span><span class="ck wait"><div class="spinner" style="width:18px;height:18px;margin:0"></div></span></div>`;
      else if (dt && dt.ok !== undefined) detectRow = `<div class="fr"><span style="flex:1">${dt.ok ? 'Marketplace confirms it can install it' : 'Marketplace couldn’t find anything to install'}</span><span class="ck ${dt.ok ? 'ok' : 'bad'}" role="img" aria-label="${dt.ok ? 'Passed' : 'Failed'}">${dt.ok ? I.check : I.x}</span></div>`;
    }
    return detectRow;
  }

  // fill in the Marketplace's own check where the sheet is already showing
  _patchDetect() {
    const slot = this.$.layer.querySelector('.detect-slot');
    if (slot && this.s.detail) slot.innerHTML = this._detectRow(this.s.detail); else this._renderLayer();
  }

  _sheetBody(d, head, t, st, primary, primaryAct, note, secondary, facts, checks, detectRow, inst, hid, owner, fav, favInfo) {
    const s = this.s;
    return `<div class="xs-wrap" data-act="close"><div class="xsheet" role="dialog" aria-label="${esc(d.full_name)}" data-stop>${head}
      <div class="xbody">
        <div class="hero"><span class="oc" style="background:${t.color}">${I[d.type] || I.integration}</span><b>${esc(repoName(d.full_name))}</b><small>${esc(d.full_name)} · ${t.label}</small><i style="color:${st.color}">${st.label}</i>${inst ? `<i class="inst" style="color:${this._stOf(d).color}">${inst.update ? `Update available${inst.iv && inst.av ? ` · ${esc(inst.iv)} → ${esc(inst.av)}` : ''}` : inst.restart ? 'Installed · restart needed' : `Installed${inst.iv ? ` · ${esc(inst.iv)}` : ''}`}</i>` : ''}${hid ? '<i class="inst" style="color:var(--cm-text2)">Hidden</i>' : ''}${s.openNew ? `<i class="newrel">New release${d.release ? ` · ${esc(d.release)}` : ''}</i>` : ''}</div>
        <div class="btns"><button class="pill accent" data-act="${primaryAct}">${primary}</button><button class="pill fill" data-act="${secondary[0]}">${secondary[1]}${secondary[2]}</button></div>
        <p class="note">${esc(note)}</p>
        ${fav ? `<div class="fh">Your note</div><div class="fg" style="padding:12px"><textarea class="note-in" data-note="${esc(name)}" placeholder="Add a note (only you see it)" aria-label="Your note">${esc(favInfo.note || '')}</textarea></div>` : ''}
        ${this._releaseSection(d)}
        ${d.readme_html ? `<div class="fh">README</div><div class="md-box${s.mdFull ? '' : ' short'}"><div class="md">${d.readme_html}</div>${s.mdFull ? '' : '<button class="md-more" data-act="md-full">Show Full README</button>'}</div>`
          : d.description || d.readme ? `<div class="fg"><div class="readme">${esc(d.readme || d.description)}</div></div>` : ''}
        <div class="fh">Details</div>
        <div class="fg">${facts.map(([k, v]) => `<div class="fr"><span>${k}</span><span class="fv">${esc(v)}</span></div>`).join('')}
          <div class="fr"><span>Detected as</span><span class="fv mono">${esc(d.path)}</span></div></div>
        <div class="fg"><button class="fr act" data-act="author-open" data-login="${esc(owner)}"><span class="oi" style="background:#007AFF">${I.person}</span><span>More from ${esc(owner)}</span>${I.chevR.replace('<svg', '<svg class="chev"')}</button>
          <button class="fr act" data-act="hide-sheet"><span class="oi" style="background:${hid ? '#34C759' : '#8E8E93'}">${hid ? I.eye : I.eyeOff}</span><span>${hid ? 'Show This Project Again' : 'Hide This Project'}</span></button></div>
        <div class="fh">Marketplace check</div>
        <div class="fg">${checks.map(([label, ok]) => `<div class="fr"><span style="flex:1">${label}</span><span class="ck ${ok ? 'ok' : 'bad'}" role="img" aria-label="${ok ? 'Passed' : 'Failed'}">${ok ? I.check : I.x}</span></div>`).join('')}${detectRow}</div>
        <p class="foot">Community project from GitHub. Not reviewed by Home Assistant or Crow Discover — check the code before installing.</p>
      </div></div></div>`;
  }

  _releaseSection(d) {
    const rn = d.release_notes, s = this.s;
    if (!rn || (!rn.html && !rn.tag)) return '';
    const title = rn.name && rn.name !== rn.tag ? `${rn.tag} · ${rn.name}` : rn.tag;
    const url = /^https:\/\/github\.com\//.test(rn.url || '') ? rn.url : `https://github.com/${d.full_name}/releases`;
    const meta = `<div class="rel-meta"><span>${rn.published ? `Released ${esc(ago(rn.published).toLowerCase())}` : ''}</span><a class="link" href="${esc(url)}" target="_blank" rel="noopener">All releases</a></div>`;
    return `<div class="fh">What’s new in ${esc(title)}</div>
      <div class="md-box rel${s.relFull || !rn.html ? '' : ' short'}">${meta}${rn.html ? `<div class="md">${rn.html}</div>` : '<div class="md"><p>No notes with this release.</p></div>'}${s.relFull || !rn.html ? '' : '<button class="md-more" data-act="rel-full">Show All Notes</button>'}</div>`;
  }

  // ── settings ─────────────────────────────────────
  async _openSettings(page) {
    const s = this.s;
    s.menu = null; s.setOpen = true; s.setPage = page || null;
    this._renderLayer();
    try { s.settings = await this._ws({ type: 'crow_discover/settings/get' }); } catch (e) { s.settings = null; }
    this._renderLayer();
    if (page === 'github') this._loadGitHub();
    if (page === 'general') this._loadCacheInfo();
  }

  async _loadCacheInfo() {
    try { this.s.cacheInfo = await this._ws({ type: 'crow_discover/cache/info' }); } catch (e) { this.s.cacheInfo = null; }
    if (this.s.setOpen && this.s.setPage === 'general') this._renderLayer();
  }

  async _clearCache() {
    try { this.s.cacheInfo = await this._ws({ type: 'crow_discover/cache/clear' }); this._toast('Saved results cleared.'); }
    catch (e) { this._toast('Couldn’t clear them.'); }
    this._renderLayer();
  }

  async _importStars() {
    const s = this.s;
    s.importBusy = true; this._renderLayer();
    try {
      const res = await this._ws({ type: 'crow_discover/fav/import_stars' });
      if (res.error) this._toast(this._errText(res.error));
      else this._toast(res.added ? `Added ${nf(res.added)} of your ${nf(res.looked_at)} stars to Favourites.` : `None of your ${nf(res.looked_at)} stars are Home Assistant projects that aren’t already in Favourites.`);
      await this._loadFavs();
      if (s.filter === 'fav') this._loadFavPage(false); else this._renderMain(true);
    } catch (e) { this._toast(this._errText(e?.code)); }
    s.importBusy = false; this._renderLayer();
  }

  async _loadGitHub() {
    this.s.gh = 'busy'; this._renderLayer();
    try { this.s.gh = await this._ws({ type: 'crow_discover/github_status' }); } catch (e) { this.s.gh = { ok: false, error: 'download' }; }
    if (this.s.setOpen && this.s.setPage === 'github') this._renderLayer();
  }

  async _save(changes) {
    try {
      this.s.settings = await this._ws({ type: 'crow_discover/settings/set', settings: changes });
      if ('style' in changes) { this.info.style = changes.style; this.setAttribute('data-style', changes.style === 'classic' ? 'classic' : 'glass'); }
      try { this.info = { ...this.info, ...(await this._ws({ type: 'crow_discover/info' })) }; } catch (e) { /* the next update brings it */ }
      if ('github_token' in changes) { this.s.gh = null; if (changes.github_token) this._loadGitHub(); }
      this._renderLayer(); this._renderMain(); this._renderSide();
      return true;
    } catch (e) {
      this._toast(e?.code === 'token' || e?.code === 'download' ? (e.code === 'token' ? 'GitHub didn’t accept that token.' : 'Couldn’t reach GitHub to check the token.') : (e?.message || 'Couldn’t save that.'));
      this._renderLayer();
      return false;
    }
  }

  async _saveToken() {
    const input = this.shadowRoot.querySelector('#set-token');
    const token = (input?.value || '').trim();
    if (!token) { this._toast('Paste a token first.'); return; }
    this.s.tokenBusy = true; this._renderLayer();
    const ok = await this._save({ github_token: token });
    this.s.tokenBusy = false;
    if (ok) this._toast('Token saved.');
    this._renderLayer();
  }

  _changed(e) {
    const el = e.target;
    if (el.dataset?.note) {
      const name = el.dataset.note, note = el.value;
      this._ws({ type: 'crow_discover/fav/note', full_name: name, note }).then(() => this._loadFavs()).then(() => {
        const r = this.s.rows.find((x) => x.full_name === name);
        if (r?.fav) r.fav.note = note.trim();
        this._renderMain(true);
      }).catch(() => this._toast('Couldn’t save the note.'));
      return;
    }
    const key = el.dataset?.set;
    if (!key) return;
    let v = el.type === 'checkbox' ? el.checked : el.value;
    if (key === 'sidebar_title') v = String(v).trim();
    if (key === 'cache_hours') v = Number(v);
    if (this.s.settings && this.s.settings[key] === v) return;
    this._save({ [key]: v });
  }

  _settingsSheet() {
    const s = this.s, st = s.settings, info = this.info || {};
    const page = s.setPage;
    const PAGES = {
      general: { title: 'General', color: '#8E8E93', icon: 'sliders', sum: 'Style, sidebar name' },
      github: { title: 'GitHub', color: '#24292F', icon: 'lock', sum: 'Token' },
    };
    const head = `<div class="xhd">${page ? `<button class="cb g" data-act="set-home" aria-label="Back to Settings">${I.back}</button>` : `<button class="cb g" data-act="set-close" aria-label="Close">${I.x}</button>`}<h3>${page ? PAGES[page].title : 'Settings'}</h3>${page ? `<button class="cb g" data-act="set-close" aria-label="Close">${I.x}</button>` : '<span style="width:48px"></span>'}</div>`;
    const wrap = (body) => `<div class="xs-wrap" data-act="set-close"><div class="xsheet" role="dialog" aria-label="Settings" data-stop>${head}<div class="xbody">${body}</div></div></div>`;
    if (!st) return wrap(`<div class="loading"><div class="spinner"></div></div>`);
    const seg = (key, opts) => `<div class="segmented" role="radiogroup">${opts.map(([v, t]) => `<input type="radio" name="seg-${key}" id="seg-${key}-${v}" value="${v}" data-set="${key}"${String(st[key]) === String(v) ? ' checked' : ''}><label for="seg-${key}-${v}">${t}</label>`).join('')}</div>`;
    const toggle = (key, label, desc) => `<div class="toggle-item"><div><div class="set-l">${label}</div><div class="set-d">${desc}</div></div><label class="toggle-switch"><input type="checkbox" data-set="${key}"${st[key] ? ' checked' : ''} aria-label="${esc(label)}"><span class="toggle-track"></span></label></div>`;

    if (!page) {
      const val = { general: st.style === 'classic' ? 'Classic' : 'Glass', github: st.token_set ? 'Added' : 'Not added' };
      return wrap(`
        <div class="ed-list">${Object.entries(PAGES).map(([id, p]) => `<button class="ed-row" data-act="set-page" data-id="${id}"><span class="ed-tile" style="background:${p.color}">${I[p.icon]}</span><span class="ed-row-t"><b>${p.title}</b><small>${p.sum}</small></span><span class="ed-row-v">${esc(val[id])}</span>${I.chevR.replace('<svg', '<svg class="chev"')}</button>`).join('')}</div>
        <div class="ed-coffee"><p>If you enjoy Crow Discover, you can support its development.</p>
          <a href="https://buymeacoffee.com/jamesmcginnis" target="_blank" rel="noopener">Buy Me a Coffee</a></div>`);
    }
    if (page === 'general') {
      return wrap(`
        <div class="fh">Appearance</div>
        <div class="fg"><div class="set-row"><span class="set-l">Style</span>${seg('style', [['glass', 'Glass'], ['classic', 'Classic']])}<span class="set-d">Glass is see-through, like Crow Food’s glass style. Classic is solid.</span></div></div>
        <div class="fh">Sidebar</div>
        <div class="fg"><div class="set-row"><label class="set-l" for="set-title">Name in the sidebar</label><input class="set-in" id="set-title" data-set="sidebar_title" value="${esc(st.sidebar_title)}" maxlength="40" autocomplete="off"><span class="set-d">What this page is called in Home Assistant’s sidebar.</span></div></div>
        <div class="fh">Saved results</div>
        <div class="fg"><div class="set-row"><span class="set-l">Keep results for</span>${seg('cache_hours', [[1, '1 Hour'], [24, '1 Day'], [168, '1 Week']])}<span class="set-d">Search pages, counts, READMEs and release notes are kept this long, so going back is instant. Each project’s check is kept until the project changes on GitHub. Refresh always asks GitHub again.</span></div>
          <div class="fr"><span>Kept now</span><span class="fv wrap">${s.cacheInfo ? `${(s.cacheInfo.bytes / 1024).toFixed(s.cacheInfo.bytes < 102400 ? 1 : 0)} KB · ${nf(s.cacheInfo.projects)} projects · ${nf(s.cacheInfo.readmes)} READMEs` : '…'}</span></div>
          <div class="set-row"><div class="set-btns"><button class="pill fill" data-act="cache-clear">Clear Saved Results</button></div></div></div>`);
    }
    if (page === 'github') {
      const gh = s.gh;
      let status = 'Checking…';
      if (!st.token_set) status = 'No token added';
      else if (gh && gh !== 'busy') status = gh.ok ? `Valid · ${nf(gh.remaining)} of ${nf(gh.limit)} left this hour` : this._errText(gh.error);
      return wrap(`
        <div class="fg">
          <div class="fr"><span>Token</span><span class="fv">${st.token_set ? `Added ${esc(st.token_hint || '')}` : 'Not added'}</span></div>
          <div class="fr"><span>GitHub</span><span class="fv" style="white-space:normal;text-align:right">${esc(status)}</span></div>
        </div>
        ${st.token_set ? `<div class="fh">Stars</div>
        <div class="fg">
          <div class="toggle-item"><div><div class="set-l">Star on GitHub Too</div><div class="set-d">Favouriting a project also stars it on your GitHub account, and removing it from Favourites removes the star.</div></div><label class="toggle-switch"><input type="checkbox" data-set="star_on_github"${st.star_on_github ? ' checked' : ''} aria-label="Star on GitHub too"><span class="toggle-track"></span></label></div>
          <div class="fr"><span>Starring permission</span><span class="fv">${gh && gh !== 'busy' && gh.ok ? (gh.can_star ? 'Found' : 'Missing (see below)') : '…'}</span></div>
          <div class="set-row"><div class="set-btns"><button class="pill fill" data-act="import-stars"${s.importBusy ? ' disabled style="opacity:.5"' : ''}>${s.importBusy ? 'Importing…' : 'Import My GitHub Stars'}</button></div><span class="set-d">Adds the Home Assistant projects you’ve starred on GitHub to your Favourites. Others are left out.</span></div>
        </div>` : ''}
        <div class="fh">${st.token_set ? 'Replace the token' : 'Add a token'}</div>
        <div class="fg"><div class="set-row"><input class="set-in" id="set-token" type="password" placeholder="github_pat_…" autocomplete="off" spellcheck="false">
          <div class="set-btns"><button class="pill accent" data-act="set-token-save"${s.tokenBusy ? ' disabled style="opacity:.5"' : ''}>${s.tokenBusy ? 'Checking…' : 'Save Token'}</button>${st.token_set ? '<button class="pill fill" data-act="set-token-remove">Remove</button>' : ''}</div>
          <span class="set-d">Lets Discover check every project as it lists them, search code, and search far more often: without one, GitHub allows about 10 searches a minute and 60 checks an hour. It’s saved on this server and only sent to GitHub.</span></div></div>
        <div class="fh">Making a token</div>
        <div class="fg"><ol class="steps">
          <li>Open <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">github.com → Settings → Developer settings → Fine-grained tokens</a>.</li>
          <li>Give it a name (Crow Discover) and an expiry date.</li>
          <li>Under <b>Repository access</b>, choose <b>Public repositories (read-only)</b>. Nothing else is needed for browsing.</li>
          <li>For starring and importing your stars: under <b>Account permissions</b>, set <b>Starring</b> to <b>Read and write</b>.</li>
          <li>Tap <b>Generate token</b>, copy it, and paste it above.</li></ol></div>`);
    }
    return wrap('');
  }

  // ── actions ──────────────────────────────────────
  _click(e) {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    if (this._quietClick && Date.now() - this._quietClick < 400 && el.dataset.act === 'open') return;  // the end of a swipe or hold
    if (this._openRow && el.dataset.act === 'open') { this._closeSwipe(this._openRow); return; }
    // taps inside a sheet don't reach the backdrop behind it
    const stop = e.target.closest('[data-stop]');
    if (stop && !stop.contains(el)) return;
    if (stop && el.classList.contains('xs-wrap')) return;
    const act = el.dataset.act;
    if ((act === 'menu-close') && e.target.closest('.menu')) return;
    switch (act) {
      case 'filter': this.s.filter = el.dataset.id; this.s.allList = el.dataset.id === 'all'; this._side(false); this._renderSide(); this.$.scroll.scrollTop = 0; this._query(true); break;
      case 'open': this._open(el.dataset.name); break;
      case 'close': this.s.sel = null; this.s.detail = null; this._renderLayer(); break;
      case 'how': this.s.menu = null; this.s.how = true; this._renderLayer(); break;
      case 'how-close': this.s.how = false; this._renderLayer(); break;
      case 'menu': this.s.menu = this.s.menu === 'main' ? null : 'main'; this._renderLayer(); break;
      case 'sort': this.s.menu = this.s.menu === 'sort' ? null : 'sort'; this._renderLayer(); break;
      case 'menu-close': this.s.menu = null; this._renderLayer(); this._flushQuiet(); break;
      case 'sort-by':
        this.s.menu = null; this._renderLayer();
        if (this.s.filter === 'fav') { this.s.favSort = el.dataset.id; this.s.rows = this._sortFav(this.s.rows); this._renderMain(); }
        else { this.s.sort = el.dataset.id; this._query(true, false, 0, true); this.$.scroll.scrollTop = 0; }
        break;
      case 'refresh': this.s.menu = null; this._renderLayer(); this._refresh(); break;
      case 'code': this._codeSearch(); break;
      case 'sw': this._rowAction(el.dataset.sw, el.dataset.name); break;
      case 'cache-clear': this._clearCache(); break;
      case 'import-stars': this._importStars(); break;
      case 'fav-sheet': this._toggleFav(this.s.sel); break;
      case 'hide-sheet': this._setHidden(this.s.sel, !this._isHidden(this.s.sel)); break;
      case 'rel-full': this.s.relFull = true; this._renderLayer(); break;
      case 'author-open': this._openAuthor(el.dataset.login); break;
      case 'follow': this._toggleFollow(); break;
      case 'author-gh': window.open(`https://github.com/${encodeURIComponent(this.s.author)}`, '_blank', 'noopener'); break;
      case 'back':
        if (this.s.filter === 'all') { this.s.allList = false; this.$.scroll.scrollTop = 0; this._renderMain(); this._renderTopButtons(); break; }
        this.s.filter = this.s.filter === 'author' ? (this.s.prevFilter || 'all') : 'all';
        if (this.s.filter !== 'all') this.s.allList = false; this.$.scroll.scrollTop = 0; this._renderSide(); this._query(true); break;
      case 'md-full': this.s.mdFull = true; this._renderLayer(); break;
      case 'settings': this._openSettings(null); break;
      case 'set-page': this._openSettings(el.dataset.id); break;
      case 'set-home': this.s.setPage = null; this._renderLayer(); break;
      case 'set-close': this.s.setOpen = false; this._renderLayer(); break;
      case 'set-token-save': this._saveToken(); break;
      case 'set-token-remove': this._save({ github_token: '' }); break;
      case 'old': this.s.showOld = !this.s.showOld; this._query(true); break;
      case 'more': this._query(false); break;
      case 'clear': this.$.input.value = ''; this._typed(true); this.$.input.focus(); break;
      case 'side': this._side(!this.hasAttribute('data-sdopen')); break;
      case 'side-close': this._side(false); break;
      case 'ha-menu': this.dispatchEvent(new CustomEvent('hass-toggle-menu', { bubbles: true, composed: true })); break;
      case 'github': window.open(`https://github.com/${this.s.sel}`, '_blank', 'noopener'); break;
      case 'issue': this._issue(); break;
      case 'marketplace': this._toMarketplace(); break;
      case 'import': this._importBlueprint(); break;
      default: break;
    }
  }

  _closeTop() {
    const s = this.s;
    if (s.menu) s.menu = null; else if (s.setOpen && s.setPage) s.setPage = null; else if (s.setOpen) s.setOpen = false; else if (s.sel) { s.sel = null; s.detail = null; } else if (s.how) s.how = false; else if (this.hasAttribute('data-sdopen')) { this._side(false); return; } else return;
    this._renderLayer();
  }

  _side(open) {
    if (open) this.setAttribute('data-sdopen', ''); else this.removeAttribute('data-sdopen');
  }

  _typed(now = false) {
    clearTimeout(this._tq);
    const run = () => {
      const q = this.$.input.value.trim();
      const isLink = /github\.com\/[^/\s]+\/[^/\s]+/i.test(q) || /^[\w.-]+\/[\w.-]+$/.test(q);
      const nq = isLink ? '' : q;
      if (nq === this.s.q && !isLink && !this.s.link && !now) return;  // nothing new to search for
      this.s.q = nq;
      this.s.link = null; this.s.code = null;
      if (isLink) this._lookup(q);
      this._query(true, false, 0, true);
      this.$.scroll.scrollTop = 0;
    };
    if (now) run(); else this._tq = setTimeout(run, 700);
  }

  async _lookup(text) {
    this.s.linkBusy = true; this._renderMain();
    let res;
    try { res = await this._ws({ type: 'crow_discover/lookup', text }); } catch (e) { res = { error: 'download' }; }
    this.s.linkBusy = false;
    if (this.$.input.value.trim() !== text) return;
    this.s.link = res && (res.row || res.error) ? res : null;
    this._renderMain();
  }

  async _refresh() {
    this._query(true, true, 0, true);
    await this._loadMarketplace();
    this._renderMain(true); this._renderSide();
  }

  async _codeSearch() {
    const s = this.s;
    if (s.codeBusy || !s.q) return;
    s.codeBusy = true; this._renderMain(true);
    const q = s.q;
    try {
      const res = await this._ws({ type: 'crow_discover/code_search', q });
      if (s.q !== q) return;
      const have = new Set(s.rows.map((r) => r.full_name.toLowerCase()));
      s.code = res.error ? res : { rows: (res.rows || []).filter((r) => !have.has(r.full_name.toLowerCase())) };
    } catch (e) {
      if (s.q !== q) return;
      s.code = { error: e?.code || 'download' };
    }
    s.codeBusy = false; this._renderMain(true);
  }

  async _open(full) {
    const s = this.s;
    s.sel = full; s.detail = null; s.detect = null; s.mdFull = false; s.relFull = false;
    s.openNew = !!s.favs[full.toLowerCase()]?.new_release;
    this._renderLayer();
    let d;
    try { d = await this._ws({ type: 'crow_discover/repo', full_name: full }); } catch (e) { d = { error: this._errText(e?.code) }; }
    if (s.sel !== full) return;
    if (d.error === 'not_ha') d = { error: `${repoName(full)} doesn’t look like a Home Assistant integration, card, theme or blueprint.` };
    else if (d.error === 'not_found') d = { error: 'Couldn’t find it on GitHub. It may be private, renamed or deleted.' };
    s.detail = d; this._renderLayer();
    if (!d.error && s.openNew) {
      this._ws({ type: 'crow_discover/fav/seen', full_name: full }).then(() => this._loadFavs()).then(() => this._renderMain(true)).catch(() => {});
    }
    if (!d.error) {
      const i = s.rows.findIndex((r) => r.full_name.toLowerCase() === full.toLowerCase());
      if (i >= 0 && s.rows[i].status !== d.status) {
        s.rows[i] = { ...s.rows[i], type: d.type, status: d.status, fork_of: d.fork_of };
        this._renderMain(true); this._renderSide();
      }
    }
    if (!d.error && d.status === 'compatible' && this.info?.marketplace) {
      s.detect = 'busy'; this._patchDetect();
      try {
        const r = await this._ws({ type: 'marketplace/repositories/detect', repository: full });
        const want = (TYPES[d.type] || {}).cat;
        s.detect = { ok: (r?.categories || []).includes(want) };
      } catch (e) { s.detect = null; } // needs the Marketplace's GitHub sign-in and first-run notice: skip quietly
      if (s.sel === full) this._patchDetect();
    }
  }

  _navigate(path) {
    history.pushState(null, '', path);
    window.dispatchEvent(new CustomEvent('location-changed', { detail: { replace: false } }));
  }

  _toMarketplace() {
    const d = this.s.detail;
    if (!d) return;
    const [owner, repository] = d.full_name.split('/');
    const cat = (TYPES[d.type] || {}).cat;
    this._navigate(`/marketplace/repository?owner=${encodeURIComponent(owner)}&repository=${encodeURIComponent(repository)}${cat ? `&category=${cat}` : ''}`);
  }

  _importBlueprint() {
    const d = this.s.detail;
    if (!d?.blueprint) { window.open(`https://github.com/${d.full_name}`, '_blank', 'noopener'); return; }
    const url = `https://github.com/${d.full_name}/blob/HEAD/${d.blueprint.split('/').map(encodeURIComponent).join('/')}`;
    this._navigate(`/config/blueprint/dashboard/import?blueprint_url=${encodeURIComponent(url)}`);
  }

  _issue() {
    const d = this.s.detail;
    if (!d) return;
    const title = 'Support for installing from the Home Assistant Marketplace';
    window.open(`https://github.com/${d.full_name}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(issueBody(d))}`, '_blank', 'noopener');
  }

  _toast(text) {
    const old = this.shadowRoot.querySelector('.toast');
    old?.remove();
    const el = document.createElement('div');
    el.className = 'toast g';
    el.textContent = text;
    this.shadowRoot.querySelector('.card').appendChild(el);
    setTimeout(() => el.remove(), 4200);
  }
}

if (!customElements.get('crow-discover-panel')) customElements.define('crow-discover-panel', CrowDiscoverPanel);
console.info(`%c CROW DISCOVER %c ${VERSION} `, 'background:#007AFF;color:#fff;border-radius:4px 0 0 4px;padding:2px 6px', 'background:#1c1c1e;color:#fff;border-radius:0 4px 4px 0;padding:2px 6px');
})();
