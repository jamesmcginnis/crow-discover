"""A project's README as GitHub shows it: GitHub turns the Markdown into HTML, and this keeps
only safe, plain formatting (headings, lists, tables, code, links and pictures) before the
panel shows it. Scripts, styles, forms, frames and event handlers never get through.
"""

from __future__ import annotations

import asyncio
from html import escape
import logging
from html.parser import HTMLParser
import posixpath
import re
from urllib.parse import quote, urlsplit

import aiohttp

from .const import GITHUB_API, USER_AGENT
from .github import read_upto

_LOGGER = logging.getLogger(__name__)

MAX_BYTES = 600_000
PARTIAL = "<!--crow-discover:partial-->"  # added to a README that didn't come through in full
VERSION = 5  # bump when cleaning changes, so READMEs kept from before are fetched again

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
# HTML tags that never have a closing tag
HTML_VOID = DROP_VOID | {"img", "br", "hr", "source"}
NUMERIC = {"width", "height", "colspan", "rowspan", "start"}


class _Clean(HTMLParser):
    """Keeps the safe parts. A dropped part (an icon, a form, a script…) can never take more with it
    than the section it's in: the moment its parent closes, the README carries on, even when the
    dropped part was never closed properly."""

    def __init__(self, full_name: str, readme_dir: str) -> None:
        super().__init__(convert_charrefs=True)
        self.full = full_name
        self.dir = readme_dir
        self.out: list[str] = []
        self.skipping: list[str] = []  # the tags open inside a dropped part (the first one is the part itself)
        self.open: list[str] = []
        self.cut_short: list[str] = []  # dropped parts that weren't closed properly

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
        if self.skipping:
            if tag not in HTML_VOID:
                self.skipping.append(tag)
            return
        if tag in DROP_VOID:
            if tag == "input" and (dict(attrs).get("type") or "").lower() == "checkbox":
                self.out.append("☑" if "checked" in dict(attrs) else "☐")  # a to-do list's tick box
            return
        if tag in DROP:
            self.skipping = [tag]
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
            if href.startswith("#") and "anchor" in (a.get("class") or ""):
                self.skipping = ["a"]  # GitHub's heading anchor and its icon are left out
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
        if self.skipping:
            return  # <path/> and the like inside a dropped part
        if tag in DROP and tag not in HTML_VOID:
            return  # a dropped part that's empty: <svg ... />
        self.handle_starttag(tag, attrs)
        if tag not in VOID and self.open and self.open[-1] == tag:
            self.handle_endtag(tag)

    def handle_endtag(self, tag: str) -> None:
        if self.skipping:
            if tag in self.skipping:
                del self.skipping[len(self.skipping) - 1 - self.skipping[::-1].index(tag):]
                return
            # this closes something outside the dropped part, which never closed: stop dropping here
            self.cut_short.append(self.skipping[0])
            self.skipping = []
        if tag in HTML_VOID:
            return
        if tag not in ALLOWED or tag not in self.open:
            return
        while self.open:
            t = self.open.pop()
            self.out.append(f"</{t}>")
            if t == tag:
                break

    def handle_data(self, data: str) -> None:
        if not self.skipping:
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
    out = parser.result().strip()
    # say so in the log when a lot of the text went missing, so the cause is quick to find
    before, after = len(_text(html)), len(_text(out))
    if parser.skipping or parser.cut_short or (before > 400 and after < before * 0.6):
        _LOGGER.warning("README of %s: kept %s of %s characters of text (unclosed parts: %s)",
                        full_name, after, before, ", ".join(parser.cut_short + parser.skipping[:1]) or "none")
    return out


def _text(html: str) -> str:
    """Rough visible text, for the check above: no tags, no scripts, styles or icons."""
    html = re.sub(r"(?is)<(script|style|svg|template|noscript)\b.*?</\1\s*>", " ", html)
    return " ".join(re.sub(r"<[^>]+>", " ", html).split())


async def fetch(session: aiohttp.ClientSession, full_name: str, token: str | None) -> str | None:
    """The README as GitHub renders it, cleaned. None when there isn't one or GitHub said no."""
    headers = {"Accept": "application/vnd.github.html+json", "User-Agent": USER_AGENT, "X-GitHub-Api-Version": "2022-11-28"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    body = b""
    for _ in range(2):  # a README that arrives cut off is asked for once more
        try:
            async with session.get(f"{GITHUB_API}/repos/{full_name}/readme", headers=headers,
                                   timeout=aiohttp.ClientTimeout(total=20)) as resp:
                if resp.status != 200:
                    return None
                body = await read_upto(resp, MAX_BYTES)
        except (aiohttp.ClientError, asyncio.TimeoutError):
            if body:
                break  # keep what came the first time
            return None
        if _complete(body):
            break
    path = "README.md"
    html = body.decode("utf-8", "replace")
    if p := re.search(r'data-path="([^"]+)"', html[:2000]):
        path = p.group(1)  # a README in a folder: its pictures are relative to that folder
    m = re.search(r'<article[^>]*>(.*)</article>', html, flags=re.S)
    if not m:
        m = re.search(r'<article[^>]*>(.*)', html, flags=re.S)  # cut off before its end
    out = clean(m.group(1) if m else html, full_name, path)
    if not _complete(body):
        _LOGGER.warning("README of %s didn't come through in full (%s bytes)", full_name, len(body))
        out += PARTIAL
    return out


def _complete(body: bytes) -> bool:
    """GitHub wraps a README in <article>…</article>: no closing tag means it was cut off."""
    if len(body) >= MAX_BYTES:
        return False
    return b"<article" not in body[:5000] or b"</article>" in body
