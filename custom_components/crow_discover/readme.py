"""A project's README as GitHub shows it: GitHub turns the Markdown into HTML, and this keeps
only safe, plain formatting (headings, lists, tables, code, links and pictures) before the
panel shows it. Scripts, styles, forms, frames and event handlers never get through.
"""

from __future__ import annotations

import asyncio
from html import escape
from html.parser import HTMLParser
import posixpath
import re
from urllib.parse import quote, urlsplit

import aiohttp

from .const import GITHUB_API, USER_AGENT

MAX_BYTES = 600_000
VERSION = 2  # bump when cleaning changes, so READMEs kept from before are fetched again

ALLOWED = {
    "a": {"href", "title"},
    "img": {"src", "alt", "title", "width", "height", "align"},
    "picture": set(),
    "source": {"srcset", "media"},
    "p": {"align"}, "div": {"align"}, "span": set(), "br": set(), "hr": set(),
    "h1": {"align"}, "h2": {"align"}, "h3": {"align"}, "h4": {"align"}, "h5": {"align"}, "h6": {"align"},
    "strong": set(), "b": set(), "em": set(), "i": set(), "del": set(), "s": set(), "ins": set(),
    "code": set(), "pre": set(), "kbd": set(), "sup": set(), "sub": set(), "mark": set(),
    "blockquote": set(), "ul": set(), "ol": {"start"}, "li": set(),
    "table": set(), "thead": set(), "tbody": set(), "tr": set(),
    "th": {"align", "colspan", "rowspan"}, "td": {"align", "colspan", "rowspan"},
    "details": {"open"}, "summary": set(), "dl": set(), "dt": set(), "dd": set(),
}
VOID = {"img", "br", "hr", "source"}
# dropped along with everything inside them
DROP = {"script", "style", "iframe", "object", "embed", "form", "input", "button", "select", "textarea",
        "svg", "math", "template", "noscript", "video", "audio", "canvas", "head", "title", "meta", "link"}
# dropped tags that never have a closing tag: only the tag itself goes, never what follows it
DROP_VOID = {"input", "embed", "meta", "link", "base", "area", "col", "param", "track", "wbr", "keygen"}
NUMERIC = {"width", "height", "colspan", "rowspan", "start"}


class _Clean(HTMLParser):
    def __init__(self, full_name: str, readme_dir: str) -> None:
        super().__init__(convert_charrefs=True)
        self.full = full_name
        self.dir = readme_dir
        self.out: list[str] = []
        self.skip = 0  # inside a dropped element
        self.open: list[str] = []
        self.drop_a: list[bool] = []  # GitHub's heading anchors (#links with an icon) are left out

    def _url(self, url: str, kind: str) -> str | None:
        url = (url or "").strip()
        if not url:
            return None
        if url.startswith("#"):
            return None  # in-page links go nowhere inside the panel
        parts = urlsplit(url)
        if parts.scheme in ("http", "https"):
            return url
        if parts.scheme == "mailto" and kind == "href":
            return url
        if parts.scheme or url.startswith("//"):
            return None
        # a path in the repository, relative to the README's folder
        path = posixpath.normpath(posixpath.join(self.dir, parts.path)).lstrip("/")
        if path.startswith(".."):
            return None
        safe = quote(path)
        if kind == "src":
            return f"https://raw.githubusercontent.com/{self.full}/HEAD/{safe}"
        return f"https://github.com/{self.full}/blob/HEAD/{safe}" + (f"#{parts.fragment}" if parts.fragment else "")

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag in DROP_VOID:
            if not self.skip and tag == "input" and (dict(attrs).get("type") or "").lower() == "checkbox":
                self.out.append("☑" if "checked" in dict(attrs) else "☐")  # a to-do list's tick box
            return
        if self.skip:
            if tag in DROP and tag not in VOID:
                self.skip += 1
            return
        if tag in DROP:
            self.skip = 1
            return
        if tag not in ALLOWED:
            return  # the tag goes, what's inside it stays
        keep = []
        a = dict(attrs)
        for name, value in attrs:
            if name not in ALLOWED[tag] or value is None:
                continue
            if name in ("href", "src"):
                value = self._url(value, name)
                if value is None:
                    continue
            elif name == "srcset":
                first = value.split(",")[0].strip().split(" ")[0]
                value = self._url(first, "src")
                if value is None:
                    continue
            elif name in NUMERIC:
                if not re.fullmatch(r"\d{1,4}%?", value.strip()):
                    continue
            elif name == "align":
                if value.lower() not in ("left", "right", "center"):
                    continue
            keep.append(f'{name}="{escape(value, quote=True)}"')
        if tag == "a":
            href = (a.get("href") or "")
            dropped = href.startswith("#") and "anchor" in (a.get("class") or "")
            self.drop_a.append(dropped)
            if dropped:
                self.skip = 1  # its icon goes too (closed in handle_endtag)
                return
            keep += ['target="_blank"', 'rel="noopener noreferrer"']
        if tag == "img":
            keep += ['loading="lazy"', 'referrerpolicy="no-referrer"']
            if not any(k.startswith("src=") for k in keep):
                return
        attr = (" " + " ".join(keep)) if keep else ""
        self.out.append(f"<{tag}{attr}>")
        if tag not in VOID:
            self.open.append(tag)

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self.handle_starttag(tag, attrs)
        if tag not in VOID and self.open and self.open[-1] == tag and not self.skip:
            self.handle_endtag(tag)

    def handle_endtag(self, tag: str) -> None:
        if tag in DROP_VOID:
            return
        if self.skip:
            if tag == "a" and self.drop_a and self.drop_a[-1] and self.skip == 1:
                self.drop_a.pop()
                self.skip = 0
                return
            if tag in DROP:
                self.skip -= 1
            return
        if tag == "a" and self.drop_a:
            self.drop_a.pop()
        if tag not in ALLOWED or tag in VOID or tag not in self.open:
            return
        while self.open:
            t = self.open.pop()
            self.out.append(f"</{t}>")
            if t == tag:
                break

    def handle_data(self, data: str) -> None:
        if not self.skip:
            self.out.append(escape(data, quote=False))

    def result(self) -> str:
        while self.open:
            self.out.append(f"</{self.open.pop()}>")
        return "".join(self.out)


def clean(html: str, full_name: str, readme_path: str = "README.md") -> str:
    """Safe HTML for the panel. Paths in the README become links to GitHub and pictures from it."""
    parser = _Clean(full_name, posixpath.dirname(readme_path))
    parser.feed(html)
    parser.close()
    return parser.result().strip()


async def fetch(session: aiohttp.ClientSession, full_name: str, token: str | None) -> str | None:
    """The README as GitHub renders it, cleaned. None when there isn't one or GitHub said no."""
    headers = {"Accept": "application/vnd.github.html+json", "User-Agent": USER_AGENT, "X-GitHub-Api-Version": "2022-11-28"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    try:
        async with session.get(f"{GITHUB_API}/repos/{full_name}/readme", headers=headers,
                               timeout=aiohttp.ClientTimeout(total=20)) as resp:
            if resp.status != 200:
                return None
            body = await resp.content.read(MAX_BYTES)
            path = "README.md"
    except (aiohttp.ClientError, asyncio.TimeoutError):
        return None
    html = body.decode("utf-8", "replace")
    if p := re.search(r'data-path="([^"]+)"', html[:2000]):
        path = p.group(1)  # a README in a folder: its pictures are relative to that folder
    m = re.search(r'<article[^>]*>(.*)</article>', html, flags=re.S)
    return clean(m.group(1) if m else html, full_name, path)
