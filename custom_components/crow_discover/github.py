"""Small GitHub helpers: reading links, one repository without a token, and README previews."""

from __future__ import annotations

import asyncio
import json
import re
from typing import Any
from urllib.parse import quote

import aiohttp

from . import classify
from .const import GITHUB_API, RAW, USER_AGENT

REPO_RE = re.compile(r"(?:https?://)?(?:www\.)?github\.com/([A-Za-z0-9_.-]+)/([A-Za-z0-9_.-]+)|^([A-Za-z0-9_.-]+)/([A-Za-z0-9_.-]+)$")


class GitHubError(Exception):
    """Something GitHub said no to."""


def parse_repo(text: str) -> str | None:
    """owner/repo from a GitHub link or an owner/repo string."""
    m = REPO_RE.search((text or "").strip())
    if not m:
        return None
    owner, name = (m.group(1), m.group(2)) if m.group(1) else (m.group(3), m.group(4))
    name = re.sub(r"\.git$", "", name)
    if owner.lower() in ("orgs", "topics", "search", "settings", "marketplace", "features", "about"):
        return None
    return f"{owner}/{name}"


def _headers(token: str | None, accept: str = "application/vnd.github+json") -> dict[str, str]:
    h = {"Accept": accept, "User-Agent": USER_AGENT, "X-GitHub-Api-Version": "2022-11-28"}
    if token:
        h["Authorization"] = f"Bearer {token}"
    return h


async def _get(session: aiohttp.ClientSession, url: str, token: str | None, accept: str = "application/vnd.github+json") -> Any:
    async with session.get(url, headers=_headers(token, accept), timeout=aiohttp.ClientTimeout(total=30)) as resp:
        if resp.status == 404:
            return None
        if resp.status in (401,):
            raise GitHubError("token")
        if resp.status in (403, 429):
            raise GitHubError("rate_limit")
        resp.raise_for_status()
        return await resp.json(content_type=None)


async def rest_normalize(session: aiohttp.ClientSession, full: str, token: str | None) -> dict | None:
    """One repository through REST, for when there's no token. About 6–9 requests."""
    meta = await _get(session, f"{GITHUB_API}/repos/{full}", token)
    if not meta:
        return None
    full = meta["full_name"]

    async def listing(path: str) -> list[dict]:
        res = await _get(session, f"{GITHUB_API}/repos/{full}/contents/{path}", token)
        return res if isinstance(res, list) else []

    root = await listing("")
    dirs = {e["name"] for e in root if e.get("type") == "dir"}
    cc: dict[str, list[str]] = {}
    if "custom_components" in dirs:
        for e in (await listing("custom_components"))[:3]:
            if e.get("type") == "dir":
                cc[e["name"]] = [f["name"] for f in await listing(f"custom_components/{e['name']}")]
    dist = [e["name"] for e in await listing("dist") if e.get("type") == "file"] if "dist" in dirs else []
    themes = [e["name"] for e in await listing("themes") if e.get("type") == "file"] if "themes" in dirs else []
    blueprints: list[str] = []
    if "blueprints" in dirs:
        for e in await listing("blueprints"):
            if e.get("type") == "file":
                blueprints.append(f"blueprints/{e['name']}")
            elif e.get("type") == "dir" and len(blueprints) < 5:
                for f in await listing(f"blueprints/{e['name']}"):
                    if f.get("type") == "file":
                        blueprints.append(f"blueprints/{e['name']}/{f['name']}")
    release = await _get(session, f"{GITHUB_API}/repos/{full}/releases/latest", token) or {}
    hacs = None
    if any(e["name"] == "hacs.json" for e in root):
        try:
            async with session.get(f"{RAW}/{full}/HEAD/hacs.json", timeout=aiohttp.ClientTimeout(total=20)) as resp:
                if resp.status == 200:
                    hacs = json.loads(await resp.text())
                    if not isinstance(hacs, dict):
                        hacs = None
        except (aiohttp.ClientError, asyncio.TimeoutError, ValueError):
            hacs = None
    parent = meta.get("parent") or {}
    return {
        "full_name": full,
        "description": (meta.get("description") or "").strip(),
        "stars": meta.get("stargazers_count") or 0,
        "pushed_at": meta.get("pushed_at") or "",
        "archived": bool(meta.get("archived")),
        "private": bool(meta.get("private")),
        "fork_parent": parent.get("full_name"),
        "parent_pushed_at": parent.get("pushed_at"),
        "is_fork": bool(meta.get("fork")),
        "licence": ((meta.get("license") or {}).get("spdx_id")) or "",
        "topics": meta.get("topics") or [],
        "release": release.get("tag_name") or "",
        "release_assets": [a["name"] for a in release.get("assets") or []],
        "root_files": [e["name"] for e in root if e.get("type") == "file"],
        "root_dirs": sorted(dirs),
        "cc": cc,
        "dist": dist,
        "themes": themes,
        "blueprints": blueprints,
        "hacs": hacs,
    }


async def readme_excerpt(session: aiohttp.ClientSession, full: str, limit: int = 900) -> str:
    """The start of the README as plain text (raw.githubusercontent.com, not the API)."""
    for name in ("README.md", "readme.md", "Readme.md", "README.MD", "info.md"):
        try:
            async with session.get(f"{RAW}/{full}/HEAD/{name}", timeout=aiohttp.ClientTimeout(total=15)) as resp:
                if resp.status != 200:
                    continue
                text = (await read_upto(resp, 200_000)).decode("utf-8", "replace")
        except (aiohttp.ClientError, asyncio.TimeoutError):
            return ""
        return plain(text, limit)
    return ""


def plain(md: str, limit: int) -> str:
    """Markdown and HTML taken out, for a short preview."""
    t = re.sub(r"```.*?```", " ", md, flags=re.S)
    t = re.sub(r"<!--.*?-->", " ", t, flags=re.S)
    t = re.sub(r"<[^>]+>", " ", t)
    t = re.sub(r"!\[[^\]]*\]\([^)]*\)", " ", t)
    t = re.sub(r"\[!\[[^\]]*\]\([^)]*\)\]\([^)]*\)", " ", t)
    t = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", t)
    t = re.sub(r"^\s{0,3}#{1,6}\s*", "", t, flags=re.M)
    t = re.sub(r"^\s*[-*+]\s+", "• ", t, flags=re.M)
    t = re.sub(r"[*_`>|]", "", t)
    t = re.sub(r"^\s*[-=]{3,}\s*$", "", t, flags=re.M)
    lines = [ln.strip() for ln in t.splitlines()]
    t = "\n".join(ln for ln in lines if ln)
    t = re.sub(r"\n{2,}", "\n", t)
    if len(t) > limit:
        cut = t[:limit].rsplit(" ", 1)[0]
        t = cut.rstrip(" ,.;:") + "…"
    return t


async def read_upto(resp: aiohttp.ClientResponse, limit: int) -> bytes:
    """The whole answer, up to limit bytes. (content.read(limit) stops after the first piece GitHub
    sends, which cut longer READMEs short.)"""
    chunks: list[bytes] = []
    total = 0
    async for chunk in resp.content.iter_chunked(65536):
        chunks.append(chunk)
        total += len(chunk)
        if total >= limit:
            break
    return b"".join(chunks)[:limit]
