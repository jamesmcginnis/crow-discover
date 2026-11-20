"""Live search: Discover asks GitHub each time you look, and nothing is stored on the server.

With a GitHub token, each page is one GraphQL request: a few searches side by side (by topic,
and by name and description), with each repository's file list in the same answer, so every
result is checked before it's shown. Without a token, GitHub's plain search is used (about 10
searches a minute), and a project is checked when it's opened.
"""

from __future__ import annotations

import asyncio
from collections import OrderedDict
from collections.abc import Callable
import datetime as dt
import importlib.util
import json
import logging
import re
import time
from typing import Any
from urllib.parse import quote

import aiohttp

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.storage import Store

from . import classify, github, readme
from .const import CACHE_STORE, CONF_CACHE_HOURS, CONF_TOKEN, DEFAULTS, GITHUB_API, OLD_DAYS

_LOGGER = logging.getLogger(__name__)

FILTERS = ("all", "integration", "card", "theme", "blueprint", "market", "compatible", "none", "author", "following")
LOGIN_RE = re.compile(r"^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$")
FOLLOW_CHUNK = 6  # authors in one search (GitHub limits how long a search can be)
MAX_FOLLOW_SEARCHES = 5
SORTS = ("updated", "stars", "best")
PER_SEARCH = 12  # results each search adds to a page (a page runs 3–4 searches side by side)
CHECK_BATCH = 10  # projects whose files are read in one request (bigger batches can be too slow for GitHub)

# What a search result needs before its files are checked: quick for GitHub to answer
LIGHT_FIELDS = """
  nameWithOwner name description stargazerCount pushedAt isArchived
  licenseInfo { spdxId }
  repositoryTopics(first: 12) { nodes { topic { name } } }
"""
MAX_ENTRIES = 5000  # projects whose check result is kept (the ones looked at longest ago go first)
MAX_READMES = 60
MAX_PAGES = 300

# The searches behind each type. The first is the one counts come from.
SEARCHES: dict[str, list[tuple[str, str]]] = {
    "all": [
        ("topic:home-assistant", "Topic: home-assistant"),
        ("topic:hacs", "Topic: hacs"),
        ("topic:homeassistant", "Topic: homeassistant"),
        ('"home assistant" in:name,description', "Description"),
    ],
    "integration": [
        ("topic:home-assistant-custom-component", "Topic: home-assistant-custom-component"),
        ("topic:hacs-integration", "Topic: hacs-integration"),
        ("topic:home-assistant-integration", "Topic: home-assistant-integration"),
        ('"home assistant" integration in:name,description', "Description"),
    ],
    "card": [
        ("topic:lovelace-custom-card", "Topic: lovelace-custom-card"),
        ("topic:lovelace-card", "Topic: lovelace-card"),
        ("topic:home-assistant-card", "Topic: home-assistant-card"),
        ('"home assistant" card in:name,description', "Description"),
    ],
    "theme": [
        ("topic:home-assistant-theme", "Topic: home-assistant-theme"),
        ("topic:lovelace-theme", "Topic: lovelace-theme"),
        ('"home assistant" theme in:name,description', "Description"),
    ],
    "blueprint": [
        ("topic:home-assistant-blueprint", "Topic: home-assistant-blueprint"),
        ("topic:home-assistant-blueprints", "Topic: home-assistant-blueprints"),
        ('"home assistant" blueprint in:name,description', "Description"),
    ],
}
# what you type is searched for in these ways
TEXT_SEARCHES = [
    ("{q} in:name,description,topics", "Search: name, description or topics"),
    ("{q} topic:home-assistant", "Search: topic home-assistant"),
    ("{q} topic:hacs", "Search: topic hacs"),
    ('{q} "home assistant" in:readme', "Search: README"),
]
CODE_SEARCHES = [
    ('{q} filename:manifest.json path:custom_components', "Code: custom_components manifest"),
    ('{q} filename:hacs.json', "Code: hacs.json"),
    ('{q} "customElements.define" extension:js', "Code: card JavaScript"),
]


class GitHubLimit(Exception):
    """GitHub asked to slow down, or refused the token."""


def status_of(e: dict, known: set[str]) -> str:
    """market / blueprint / compatible / none / unchecked, as the panel shows them."""
    if e["full_name"].lower() in known:
        return "market"
    if e.get("unchecked"):
        return "unchecked"
    if e.get("checking"):
        return "checking"
    if e["type"] == "blueprint":
        return "blueprint"
    return "compatible" if e.get("compatible") else "none"


def _is_builtin(domain: str) -> bool:
    try:
        return importlib.util.find_spec(f"homeassistant.components.{domain}") is not None
    except (ImportError, ValueError):
        return False


class LiveDiscover:
    """Answers the panel by asking GitHub."""

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        self.hass = hass
        self.entry = entry
        self.known: set[str] = set()  # what the Marketplace on this install already has
        self.on_settings: Callable[[dict, dict], Any] | None = None
        # each project's check result, kept until it changes on GitHub (newest last)
        self._entries: OrderedDict[str, dict] = OrderedDict()
        self._cache: dict[str, tuple[float, Any]] = {}  # search pages and counts, kept for the chosen time
        self._readmes: dict[str, tuple[float, Any]] = {}  # READMEs, and release notes ("rel:" keys)
        self._store = Store(hass, 1, CACHE_STORE)
        self.limit_until = 0.0

    # ── settings ──────────────────────────────────────
    @property
    def options(self) -> dict:
        return {**DEFAULTS, **{k: v for k, v in self.entry.options.items() if k in DEFAULTS}}

    @property
    def token(self) -> str | None:
        return self.options[CONF_TOKEN] or None

    async def async_set_settings(self, changes: dict) -> dict:
        old = self.options
        new = {**old, **changes}
        self.hass.config_entries.async_update_entry(self.entry, options=new)
        if self.on_settings:
            await self.on_settings(old, new)
        if old[CONF_TOKEN] != new[CONF_TOKEN]:
            self._cache.clear()
            self._changed()
        return self.options

    def set_known(self, names: list[str]) -> None:
        self.known = {n.lower() for n in names if isinstance(n, str)}

    def info(self) -> dict:
        return {"signed_in": bool(self.token), "old_days": OLD_DAYS,
                "limited": time.time() < self.limit_until}

    # ── talking to GitHub ─────────────────────────────
    @property
    def _session(self) -> aiohttp.ClientSession:
        return async_get_clientsession(self.hass)

    async def _graphql(self, query: str) -> dict:
        async with self._session.post(f"{GITHUB_API}/graphql", headers=github._headers(self.token), json={"query": query},
                                      timeout=aiohttp.ClientTimeout(total=30)) as resp:
            if resp.status == 401:
                raise GitHubLimit("token")
            if resp.status in (403, 429):
                self._limited(resp.headers)
                raise GitHubLimit("rate_limit")
            if resp.status in (502, 503, 504):
                raise GitHubLimit("slow")  # GitHub gave up on a request that took too long
            resp.raise_for_status()
            res = await resp.json(content_type=None)
        errors = res.get("errors") or []
        if errors and not res.get("data"):
            if any("rate limit" in str(e.get("message", "")).lower() or e.get("type") == "RATE_LIMITED" for e in errors):
                self.limit_until = time.time() + 60
                raise GitHubLimit("rate_limit")
            _LOGGER.debug("GitHub said: %s", errors)
            raise GitHubLimit("github")
        return res.get("data") or {}

    async def _rest(self, path: str) -> Any:
        async with self._session.get(f"{GITHUB_API}{path}", headers=github._headers(self.token),
                                     timeout=aiohttp.ClientTimeout(total=30)) as resp:
            if resp.status == 401:
                raise GitHubLimit("token")
            if resp.status in (403, 429):
                self._limited(resp.headers)
                raise GitHubLimit("rate_limit")
            if resp.status == 422:
                return None
            resp.raise_for_status()
            return await resp.json(content_type=None)

    def _limited(self, headers) -> None:
        reset = headers.get("x-ratelimit-reset") or headers.get("X-RateLimit-Reset")
        retry = headers.get("retry-after") or headers.get("Retry-After")
        if retry:
            self.limit_until = time.time() + int(retry)
        elif reset:
            self.limit_until = float(reset)
        else:
            self.limit_until = time.time() + 60

    # ── results kept between visits (and restarts) ────
    @property
    def ttl(self) -> float:
        return float(self.options[CONF_CACHE_HOURS]) * 3600

    async def async_load(self) -> None:
        data = await self._store.async_load() or {}
        for e in data.get("entries") or []:
            if isinstance(e, dict) and e.get("full_name"):
                self._entries[e["full_name"].lower()] = e
        now = time.time()
        self._cache = {k: (v[0], v[1]) for k, v in (data.get("cache") or {}).items() if now - v[0] < self.ttl}
        # READMEs kept by an older version are thrown away when the way they're cleaned changes
        if data.get("readme_version") == readme.VERSION:
            self._readmes = {k: (v[0], v[1]) for k, v in (data.get("readmes") or {}).items() if now - v[0] < self.ttl}

    def _to_save(self) -> dict:
        return {
            "entries": [e for e in self._entries.values() if not e.get("unchecked")],
            "cache": {k: [t, v] for k, (t, v) in self._cache.items()},
            "readmes": {k: [t, v] for k, (t, v) in self._readmes.items()},
            "readme_version": readme.VERSION,
        }

    def _changed(self) -> None:
        self._store.async_delay_save(self._to_save, 30)

    async def async_flush(self) -> None:
        await self._store.async_save(self._to_save())

    async def async_clear(self) -> None:
        self._entries.clear()
        self._cache.clear()
        self._readmes.clear()
        await self._store.async_save(self._to_save())

    async def async_cache_info(self) -> dict:
        data = self._to_save()
        size = await self.hass.async_add_executor_job(lambda: len(json.dumps(data)))
        return {"bytes": size, "projects": len(data["entries"]), "pages": len(self._cache), "readmes": len([k for k in self._readmes if not k.startswith("rel:")])}

    def _cached(self, key: str) -> Any:
        hit = self._cache.get(key)
        if hit and time.time() - hit[0] < self.ttl:
            return hit[1]
        return None

    def _remember(self, key: str, value: Any) -> None:
        if len(self._cache) > MAX_PAGES:
            for k in sorted(self._cache, key=lambda k: self._cache[k][0])[:100]:
                self._cache.pop(k, None)
        self._cache[key] = (time.time(), value)
        self._changed()

    def _keep(self, e: dict) -> None:
        self._entries[e["full_name"].lower()] = e
        self._entries.move_to_end(e["full_name"].lower())
        while len(self._entries) > MAX_ENTRIES:
            self._entries.popitem(last=False)
        self._changed()

    def known_entry(self, full: str) -> dict | None:
        return self._entries.get(full.lower())

    @staticmethod
    def _cutoff() -> str:
        return (dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=OLD_DAYS)).date().isoformat()

    def _searches(self, flt: str, q: str, who: list[str] | None = None) -> list[tuple[str, str]]:
        who = [w for w in (who or []) if LOGIN_RE.match(w)]
        if flt == "author":
            if not who:
                return []
            u = f"user:{who[0]}"
            if q:
                return [(f"{q} {u}", "Author search")]
            return [(f'{u} "home assistant" in:name,description,readme', "Author"), (f"{u} topic:home-assistant", "Author"),
                    (f"{u} topic:hacs", "Author"), (f"{u} topic:homeassistant", "Author")]
        if flt == "following":
            out = []
            for i in range(0, min(len(who), FOLLOW_CHUNK * MAX_FOLLOW_SEARCHES), FOLLOW_CHUNK):
                users = " ".join(f"user:{w}" for w in who[i:i + FOLLOW_CHUNK])
                out.append((f'{q + " " if q else ""}{users} "home assistant" in:name,description,readme', "Following"))
            return out
        if q:
            return [(s.format(q=q), label) for s, label in TEXT_SEARCHES]
        return SEARCHES.get(flt) or SEARCHES["all"]

    @staticmethod
    def _qualifiers(sort: str, show_old: bool, cutoff: str) -> str:
        out = []
        if not show_old:
            out.append(f"pushed:>={cutoff}")
        if sort == "updated":
            out.append("sort:updated-desc")
        elif sort == "stars":
            out.append("sort:stars-desc")
        return " ".join(out)

    def row(self, e: dict) -> dict:
        return {
            "full_name": e["full_name"],
            "description": e.get("description") or "",
            "type": e.get("type") or "",
            "stars": e.get("stars", 0),
            "pushed_at": e.get("pushed_at") or "",
            "status": status_of(e, self.known),
            "fork_of": e.get("fork_of"),
            "archived": bool(e.get("archived")),
            "old": (e.get("pushed_at") or "")[:10] < self._cutoff(),
            "release": e.get("release") or "",
            "found_by": e.get("found_by") or "",
        }

    # ── a page of results ─────────────────────────────
    async def async_query(self, flt: str, q: str, sort: str, show_old: bool, cursors: dict | None, fresh: bool,
                          who: list[str] | None = None) -> dict:
        """One page. cursors: what the last page returned (None for the first page)."""
        q = " ".join((q or "").replace('"', " ").split())[:120]
        searches = self._searches(flt, q, who)
        if not searches:
            return {"rows": [], "cursors": None, "more": False, "checked": bool(self.token)}
        cutoff = self._cutoff()
        quals = self._qualifiers(sort, show_old, cutoff)
        key = json.dumps([flt, q, sort, show_old, cursors, bool(self.token), sorted(w.lower() for w in (who or []))])
        if not fresh and (hit := self._cached(key)):
            return self._present(hit, flt)
        if self.token:
            res = await self._query_checked(searches, quals, cursors)
        else:
            res = await self._query_quick(searches, quals, cursors)
        self._remember(key, res)
        return self._present(res, flt)

    def _present(self, res: dict, flt: str) -> dict:
        entries = []
        for e in res["entries"]:
            now = self._entries.get(e["full_name"].lower())
            if res.get("checked") and e.get("checking") and now is None:
                continue  # checked since, and not a Home Assistant project
            entries.append(now if (now and not now.get("checking") and res.get("checked")) else e)
        rows = [self.row(e) for e in entries]
        if flt in TYPE_FILTERS and res.get("checked"):
            rows = [r for r in rows if r["type"] == flt or r["status"] == "checking"]
        return {"rows": rows, "cursors": res["cursors"], "more": res["more"], "checked": res.get("checked", False)}

    async def _query_checked(self, searches: list[tuple[str, str]], quals: str, cursors: dict | None) -> dict:
        """A page of search results, without reading files (that's async_check, in small batches)."""
        parts = []
        live = []
        per = PER_SEARCH if len(searches) >= 3 else 40 // max(1, len(searches))
        for i, (s, label) in enumerate(searches):
            cur = (cursors or {}).get(str(i), "")
            if cursors is not None and cur is None:
                continue  # that search has no more pages
            after = f", after: {json.dumps(cur)}" if cur else ""
            full = f"{s} {quals}".strip()
            parts.append(f's{i}: search(query: {json.dumps(full)}, type: REPOSITORY, first: {per}{after}) '
                         f'{{ pageInfo {{ hasNextPage endCursor }} nodes {{ ... on Repository {{ {LIGHT_FIELDS} }} }} }}')
            live.append((i, label))
        if not parts:
            return {"entries": [], "cursors": cursors or {}, "more": False, "checked": True}
        data = await self._graphql("query { " + " ".join(parts) + " }")
        entries: list[dict] = []
        seen: set[str] = set()
        new_cursors = dict(cursors or {})
        for i, label in live:
            block = data.get(f"s{i}") or {}
            info = block.get("pageInfo") or {}
            new_cursors[str(i)] = info.get("endCursor") if info.get("hasNextPage") else None
            for node in block.get("nodes") or []:
                if not node or not node.get("nameWithOwner"):
                    continue
                name = node["nameWithOwner"]
                if name.lower() in seen:
                    continue
                seen.add(name.lower())
                entries.append(self._light(node, label))
        more = any(v is not None for v in new_cursors.values())
        return {"entries": entries, "cursors": new_cursors, "more": more, "checked": True}

    def _light(self, node: dict, label: str) -> dict:
        """A search result before its files are read (or the earlier check, when it hasn't changed since)."""
        name = node["nameWithOwner"]
        old = self._entries.get(name.lower())
        if old and not old.get("checking") and not old.get("unchecked") and old.get("pushed_at") == node.get("pushedAt"):
            if node.get("stargazerCount") is not None and old.get("stars") != node["stargazerCount"]:
                old["stars"] = node["stargazerCount"]
            return old  # checked before and not changed since
        topics = [n["topic"]["name"] for n in ((node.get("repositoryTopics") or {}).get("nodes") or []) if n.get("topic")]
        e = {
            "full_name": name,
            "description": (node.get("description") or "")[:300],
            "stars": node.get("stargazerCount") or 0,
            "pushed_at": node.get("pushedAt") or "",
            "archived": bool(node.get("isArchived")),
            "licence": ((node.get("licenseInfo") or {}).get("spdxId")) or "",
            "topics": topics[:12],
            "type": _guess_type({"topics": topics, "name": node.get("name") or "", "description": node.get("description")}),
            "checking": True,
            "found_by": label,
        }
        self._keep(e)
        return e

    # ── an author ─────────────────────────────────────
    async def async_author(self, login: str) -> dict:
        if not LOGIN_RE.match(login or ""):
            return {"error": "not_found"}
        key = json.dumps(["author", login.lower()])
        if hit := self._cached(key):
            return hit
        if self.token:
            data = await self._graphql(
                f"query {{ o: repositoryOwner(login: {json.dumps(login)}) {{ __typename login avatarUrl(size: 160) url "
                "... on User { name bio websiteUrl } ... on Organization { name description websiteUrl } } }")
            o = data.get("o")
            if not o:
                return {"error": "not_found"}
            out = {"login": o["login"], "name": o.get("name") or "", "bio": o.get("bio") or o.get("description") or "",
                   "avatar": o.get("avatarUrl") or "", "url": o.get("url") or f"https://github.com/{o['login']}",
                   "site": o.get("websiteUrl") or "", "org": o.get("__typename") == "Organization"}
        else:
            u = await self._rest(f"/users/{login}")
            if not u:
                return {"error": "not_found"}
            out = {"login": u["login"], "name": u.get("name") or "", "bio": u.get("bio") or "", "avatar": u.get("avatar_url") or "",
                   "url": u.get("html_url") or f"https://github.com/{u['login']}", "site": u.get("blog") or "",
                   "org": u.get("type") == "Organization"}
        out["bio"] = (out["bio"] or "")[:300]
        self._remember(key, out)
        return out

    async def async_check(self, names: list[str]) -> dict:
        """Read the files of a few projects. Returns their rows, and the ones that aren't Home Assistant projects."""
        rows: list[dict] = []
        drop: list[str] = []

        async def run(chunk: list[str], depth: int = 0) -> None:
            parts = []
            for j, full in enumerate(chunk):
                owner, name = full.split("/", 1)
                parts.append(f"r{j}: repository(owner: {json.dumps(owner)}, name: {json.dumps(name)}) {{ {classify.GRAPHQL_FIELDS} }}")
            try:
                data = await self._graphql("query { " + " ".join(parts) + " }")
            except (GitHubLimit, asyncio.TimeoutError) as exc:
                if isinstance(exc, GitHubLimit) and str(exc) not in ("slow",):
                    raise
                if len(chunk) > 1 and depth < 3:  # too slow for GitHub: try smaller batches
                    half = len(chunk) // 2
                    await run(chunk[:half], depth + 1)
                    await run(chunk[half:], depth + 1)
                    return
                raise GitHubLimit("slow") from exc
            for j, full in enumerate(chunk):
                node = data.get(f"r{j}")
                before = self._entries.get(full.lower()) or {}
                if not node:
                    drop.append(full)
                    continue
                e = classify.classify(classify.normalize_graphql(node))
                if e is None:
                    drop.append(full)
                    self._entries.pop(full.lower(), None)
                    continue
                e["found_by"] = before.get("found_by") or "Search"
                e["_checked_at"] = time.time()
                self._keep(e)
                rows.append(self.row(e))

        names = [n for n in names if isinstance(n, str) and "/" in n][:CHECK_BATCH * 3]
        for i in range(0, len(names), CHECK_BATCH):
            await run(names[i:i + CHECK_BATCH])
        return {"rows": rows, "drop": drop}

    async def _query_quick(self, searches: list[tuple[str, str]], quals: str, cursors: dict | None) -> dict:
        """Without a token: GitHub's plain search, one search a page (it allows about 10 a minute)."""
        s, label = searches[0]
        page = int((cursors or {}).get("page") or 1)
        res = await self._rest(f"/search/repositories?q={quote(f'{s} {quals}'.strip(), safe='')}&per_page=30&page={page}")
        entries = []
        for item in (res or {}).get("items") or []:
            e = {
                "full_name": item["full_name"],
                "description": (item.get("description") or "")[:300],
                "stars": item.get("stargazers_count", 0),
                "pushed_at": item.get("pushed_at") or "",
                "archived": bool(item.get("archived")),
                "licence": ((item.get("license") or {}).get("spdx_id")) or "",
                "topics": (item.get("topics") or [])[:12],
                "type": _guess_type(item),
                "unchecked": True,
                "found_by": label,
            }
            if (old := self._entries.get(e["full_name"].lower())) and not old.get("unchecked"):
                e = old
            entries.append(e)
        total = (res or {}).get("total_count", 0)
        more = page * 30 < min(total, 1000)
        return {"entries": entries, "cursors": {"page": page + 1}, "more": more, "checked": False}

    # ── counts (GitHub's own estimates) ───────────────
    async def async_counts(self, q: str, show_old: bool) -> dict:
        q = " ".join((q or "").replace('"', " ").split())[:120]
        cutoff = self._cutoff()
        key = json.dumps(["counts", q, show_old, bool(self.token)])
        if hit := self._cached(key):
            return hit
        if self.token:
            parts = []
            names = []
            types = [None] if q else list(SEARCHES)
            for t in types:
                s = self._searches(t or "all", q)[0][0]
                for old in (False, True):
                    alias = f"c{len(names)}"
                    full = s if old else f"{s} pushed:>={cutoff}"
                    parts.append(f'{alias}: search(query: {json.dumps(full)}, type: REPOSITORY, first: 0) {{ repositoryCount }}')
                    names.append((t or "all", old))
            data = await self._graphql("query { " + " ".join(parts) + " }")
            counts: dict[str, int] = {}
            everything: dict[str, int] = {}
            for i, (t, old) in enumerate(names):
                n = ((data.get(f"c{i}") or {}).get("repositoryCount")) or 0
                (everything if old else counts)[t] = n
        else:
            s = self._searches("all", q)[0][0]
            res_new = await self._rest(f"/search/repositories?q={quote(f'{s} pushed:>={cutoff}', safe='')}&per_page=1")
            counts = {"all": (res_new or {}).get("total_count", 0)}
            everything = {"all": counts["all"]}  # one search fewer: GitHub allows few without a token
        out = {
            "counts": counts if show_old is False else everything,
            "hidden_old": {t: max(0, everything.get(t, 0) - counts.get(t, 0)) for t in counts} if self.token else {},
        }
        self._remember(key, out)
        return out

    # ── one project ───────────────────────────────────
    async def _check_one(self, full: str) -> dict | None:
        if self.token:
            owner, name = full.split("/", 1)
            data = await self._graphql(f"query {{ r: repository(owner: {json.dumps(owner)}, name: {json.dumps(name)}) {{ {classify.GRAPHQL_FIELDS} }} }}")
            node = data.get("r")
            return classify.normalize_graphql(node) if node else None
        try:
            return await github.rest_normalize(self._session, full, None)
        except github.GitHubError as exc:
            raise GitHubLimit("rate_limit" if str(exc) == "rate_limit" else "token") from exc

    async def async_detail(self, full: str) -> dict:
        e = self._entries.get(full.lower())
        if e is None or e.get("unchecked") or e.get("checking"):
            found_by = (e or {}).get("found_by") or ""
            r = await self._check_one(full)
            if r is None:
                return {"error": "not_found"}
            e = classify.classify(r)
            if e is None:
                return {"error": "not_ha", "full_name": r["full_name"]}
            e["found_by"] = found_by or "Your link"
            self._keep(e)
        out = dict(e)
        out.update(self.row(e))
        out["builtin"] = False
        if e["type"] == "integration" and e.get("path", "").startswith("custom_components/"):
            domain = e["path"].split("/")[1]
            out["domain"] = domain
            out["builtin"] = await self.hass.async_add_executor_job(_is_builtin, domain)
        key = e["full_name"].lower()
        hit = self._readmes.get(key)
        if hit and time.time() - hit[0] < self.ttl:
            out["readme_html"] = hit[1]
        else:
            out["readme_html"] = await readme.fetch(self._session, e["full_name"], self.token)
            if out["readme_html"]:
                self._readmes[key] = (time.time(), out["readme_html"])
                while len(self._readmes) > MAX_READMES:
                    self._readmes.pop(min(self._readmes, key=lambda k: self._readmes[k][0]))
                self._changed()
        out["readme"] = "" if out["readme_html"] else await github.readme_excerpt(self._session, e["full_name"])
        out["release_notes"] = await self._release_notes(e["full_name"]) if e.get("release") else None
        return out

    async def _release_notes(self, full: str) -> dict | None:
        """The latest release: its name, date and notes as GitHub shows them (cleaned)."""
        key = f"rel:{full.lower()}"
        hit = self._readmes.get(key)
        if hit and time.time() - hit[0] < self.ttl:
            return hit[1]
        try:
            async with self._session.get(f"{GITHUB_API}/repos/{full}/releases/latest",
                                         headers=github._headers(self.token, "application/vnd.github.html+json"),
                                         timeout=aiohttp.ClientTimeout(total=20)) as resp:
                if resp.status != 200:
                    return None
                r = await resp.json(content_type=None)
        except (aiohttp.ClientError, asyncio.TimeoutError, ValueError):
            return None
        html = (r.get("body_html") or "")[:150_000]
        out = {"tag": r.get("tag_name") or "", "name": r.get("name") or "", "published": r.get("published_at") or "",
               "url": r.get("html_url") or f"https://github.com/{full}/releases",
               "html": readme.clean(html, full, "") if html.strip() else ""}
        self._readmes[key] = (time.time(), out)
        self._changed()
        return out

    async def async_lookup(self, text: str) -> dict:
        full = github.parse_repo(text)
        if not full:
            return {"error": "not_a_link"}
        try:
            r = await self._check_one(full)
        except GitHubLimit as exc:
            return {"error": str(exc)}
        except (aiohttp.ClientError, asyncio.TimeoutError):
            return {"error": "download"}
        if not r:
            return {"error": "not_found", "full_name": full}
        e = classify.classify(r)
        if not e:
            return {"error": "not_ha", "full_name": r["full_name"]}
        e["found_by"] = "Your link"
        self._keep(e)
        return {"row": self.row(e)}

    async def async_code_search(self, q: str) -> dict:
        """Search code for what was typed (needs a token; GitHub allows about 10 a minute)."""
        if not self.token:
            return {"error": "needs_token"}
        q = " ".join((q or "").replace('"', " ").split())[:80]
        if not q:
            return {"rows": []}
        names: dict[str, str] = {}
        for s, label in CODE_SEARCHES:
            res = await self._rest(f"/search/code?q={quote(s.format(q=q), safe='')}&per_page=30")
            for item in (res or {}).get("items") or []:
                repo = item.get("repository") or {}
                if repo.get("full_name") and not repo.get("private"):
                    names.setdefault(repo["full_name"], label)
        todo = list(names)[:30]
        for full in todo:
            if full.lower() not in self._entries:
                self._entries[full.lower()] = {"full_name": full, "found_by": names[full], "checking": True}
        res = await self.async_check(todo)
        rows = res["rows"]
        return {"rows": rows}

    async def async_github_status(self, token: str | None = None) -> dict:
        token = token if token is not None else self.token
        if not token:
            return {"ok": False, "error": "no_token"}
        try:
            async with self._session.get(f"{GITHUB_API}/rate_limit", headers=github._headers(token),
                                         timeout=aiohttp.ClientTimeout(total=20)) as resp:
                if resp.status == 401:
                    return {"ok": False, "error": "token"}
                if resp.status != 200:
                    return {"ok": False, "error": "download"}
                data = await resp.json(content_type=None)
        except (aiohttp.ClientError, asyncio.TimeoutError):
            return {"ok": False, "error": "download"}
        res = data.get("resources") or {}
        gql, search = res.get("graphql") or {}, res.get("search") or {}
        return {"ok": True, "remaining": gql.get("remaining"), "limit": gql.get("limit"),
                "search_remaining": search.get("remaining"), "search_limit": search.get("limit")}


TYPE_FILTERS = ("integration", "card", "theme", "blueprint")


def _guess_type(item: dict) -> str:
    """Without a token the files aren't read, so the type is a guess from topics, name and description."""
    words = (" ".join(item.get("topics") or []) + " " + (item.get("name") or "") + " " + (item.get("description") or "")).lower()
    if "blueprint" in words:
        return "blueprint"
    if "theme" in words:
        return "theme"
    if any(w in words for w in ("card", "lovelace", "dashboard")):
        return "card"
    return "integration"
