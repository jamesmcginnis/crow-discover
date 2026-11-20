"""Favourites: each admin's own list, saved on the server, with notes, new-release tracking,
and (when switched on in Settings → GitHub) stars on GitHub. Also each admin's hidden projects
and the authors they follow.
"""

from __future__ import annotations

import asyncio
import time
from typing import Any

import aiohttp

from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store

from . import github
from .const import CONF_STAR, FAVOURITES_STORE, GITHUB_API
from .live import GitHubLimit, LiveDiscover

# words that make a starred repo worth checking when importing stars
HA_WORDS = ("home-assistant", "homeassistant", "home assistant", "hacs", "lovelace", "hass", "blueprint", "custom_component", "custom-component")


class Favourites:
    def __init__(self, hass: HomeAssistant, live: LiveDiscover) -> None:
        self.hass = hass
        self.live = live
        self._store = Store(hass, 1, FAVOURITES_STORE)
        self._users: dict[str, dict[str, dict]] = {}
        self._hidden: dict[str, dict[str, dict]] = {}
        self._follows: dict[str, dict[str, dict]] = {}

    async def async_load(self) -> None:
        data = await self._store.async_load() or {}
        self._users = data.get("users") or {}
        self._hidden = data.get("hidden") or {}
        self._follows = data.get("follows") or {}

    def _data(self) -> dict:
        return {"users": self._users, "hidden": self._hidden, "follows": self._follows}

    def _save(self) -> None:
        self._store.async_delay_save(self._data, 5)

    async def async_flush(self) -> None:
        await self._store.async_save(self._data())

    def _mine(self, user_id: str) -> dict[str, dict]:
        return self._users.setdefault(user_id, {})

    # ── what the panel shows ──────────────────────────
    def _new(self, fav: dict, e: dict | None) -> bool:
        """A newer release than the one there was when it was favourited (or last opened)."""
        if not e or not e.get("release"):
            return False
        return bool(fav.get("release") is not None and e["release"] != fav.get("release"))

    def summary(self, user_id: str) -> dict:
        """Names, notes and New release flags, for marking favourites in any list (no GitHub request)."""
        out = {}
        for key, fav in self._mine(user_id).items():
            e = self.live.known_entry(key)
            out[key] = {"full_name": fav["full_name"], "note": fav.get("note", ""), "added": fav.get("added"),
                        "new_release": self._new(fav, e), "release": (e or {}).get("release") or ""}
        return out

    async def async_list(self, user_id: str, fresh: bool) -> dict:
        """The favourites, checked again on GitHub when that's been a while (or fresh is asked for)."""
        mine = self._mine(user_id)
        names = [f["full_name"] for f in mine.values()]
        rows, errors = [], None
        if names and self.live.token:
            stale = [n for n in names if fresh or not self.live.known_entry(n) or self.live.known_entry(n).get("checking")
                     or time.time() - (self.live.known_entry(n).get("_checked_at") or 0) > self.live.ttl]
            if stale:
                try:
                    res = await self.live.async_check(stale)
                    for n in res["drop"]:
                        e = self.live.known_entry(n)
                        if e is None:
                            pass  # gone from GitHub, or no longer a Home Assistant project: still listed
                except (GitHubLimit, aiohttp.ClientError, asyncio.TimeoutError) as exc:
                    errors = str(exc) if isinstance(exc, GitHubLimit) else "download"
        for key, fav in mine.items():
            e = self.live.known_entry(key)
            if e and not e.get("checking"):
                row = self.live.row(e)
            else:
                row = {"full_name": fav["full_name"], "description": fav.get("description", ""), "type": fav.get("type", ""),
                       "stars": 0, "pushed_at": "", "status": "unchecked" if not self.live.token else "gone",
                       "fork_of": None, "archived": False, "old": False, "release": "", "found_by": "Favourites"}
            row["fav"] = {"note": fav.get("note", ""), "added": fav.get("added"), "new_release": self._new(fav, e)}
            rows.append(row)
        return {"rows": rows, "error": errors}

    # ── changing them ─────────────────────────────────
    async def async_add(self, user_id: str, full: str) -> dict:
        mine = self._mine(user_id)
        e = self.live.known_entry(full)
        if e is None or e.get("checking") or e.get("unchecked"):
            try:
                await self.live.async_check([full]) if self.live.token else None
            except (GitHubLimit, aiohttp.ClientError, asyncio.TimeoutError):
                pass
            e = self.live.known_entry(full) or e
        name = (e or {}).get("full_name") or full
        mine[name.lower()] = {
            "full_name": name,
            "added": time.time(),
            "release": (e or {}).get("release") or "",
            "description": (e or {}).get("description") or "",
            "type": (e or {}).get("type") or "",
            "note": (mine.get(name.lower()) or {}).get("note", ""),
        }
        self._save()
        starred = await self._star(name, True) if self.live.options[CONF_STAR] else None
        return {"ok": True, "starred": starred}

    async def async_remove(self, user_id: str, full: str) -> dict:
        self._mine(user_id).pop(full.lower(), None)
        self._save()
        starred = await self._star(full, False) if self.live.options[CONF_STAR] else None
        return {"ok": True, "starred": starred}

    def set_note(self, user_id: str, full: str, note: str) -> None:
        fav = self._mine(user_id).get(full.lower())
        if fav is not None:
            fav["note"] = note.strip()[:500]
            self._save()

    def seen(self, user_id: str, full: str) -> None:
        """Opened: its current release is no longer new."""
        fav = self._mine(user_id).get(full.lower())
        e = self.live.known_entry(full)
        if fav is not None and e and e.get("release") and fav.get("release") != e["release"]:
            fav["release"] = e["release"]
            self._save()

    # ── GitHub stars ──────────────────────────────────
    async def _star(self, full: str, on: bool) -> str:
        """'ok', or why not ('permission', 'no_token', 'download')."""
        token = self.live.token
        if not token:
            return "no_token"
        try:
            async with self.live._session.request("PUT" if on else "DELETE", f"{GITHUB_API}/user/starred/{full}",
                                                  headers=github._headers(token), timeout=aiohttp.ClientTimeout(total=20)) as resp:
                if resp.status in (204, 304):
                    return "ok"
                if resp.status in (401, 403, 404):
                    return "permission"
                return "download"
        except (aiohttp.ClientError, asyncio.TimeoutError):
            return "download"

    async def async_can_star(self) -> bool | None:
        """Whether the token can see your stars (Starring permission). None when there's no token."""
        token = self.live.token
        if not token:
            return None
        try:
            async with self.live._session.get(f"{GITHUB_API}/user/starred?per_page=1", headers=github._headers(token),
                                              timeout=aiohttp.ClientTimeout(total=20)) as resp:
                return resp.status == 200
        except (aiohttp.ClientError, asyncio.TimeoutError):
            return None

    async def async_import_stars(self, user_id: str) -> dict:
        """Add the Home Assistant projects you've starred on GitHub to your favourites."""
        token = self.live.token
        if not token:
            return {"error": "no_token"}
        starred: list[dict] = []
        try:
            for page in range(1, 11):  # up to 1,000 stars
                async with self.live._session.get(f"{GITHUB_API}/user/starred?per_page=100&page={page}",
                                                  headers=github._headers(token), timeout=aiohttp.ClientTimeout(total=30)) as resp:
                    if resp.status in (401, 403, 404):
                        return {"error": "permission"}
                    resp.raise_for_status()
                    batch = await resp.json(content_type=None)
                starred.extend(batch or [])
                if len(batch or []) < 100:
                    break
        except (aiohttp.ClientError, asyncio.TimeoutError):
            return {"error": "download"}
        mine = self._mine(user_id)
        maybe = []
        for r in starred:
            words = (" ".join(r.get("topics") or []) + " " + r.get("name", "") + " " + (r.get("description") or "")).lower()
            if r.get("full_name") and r["full_name"].lower() not in mine and any(w in words for w in HA_WORDS):
                maybe.append(r["full_name"])
        added = []
        for i in range(0, len(maybe), 30):
            try:
                await self.live.async_check(maybe[i:i + 30])
            except (GitHubLimit, aiohttp.ClientError, asyncio.TimeoutError):
                break
        for full in maybe:
            e = self.live.known_entry(full)
            if e and not e.get("checking"):
                mine[e["full_name"].lower()] = {"full_name": e["full_name"], "added": time.time(), "release": e.get("release") or "",
                                                "description": e.get("description") or "", "type": e.get("type") or "", "note": ""}
                added.append(e["full_name"])
        self._save()
        return {"added": len(added), "looked_at": len(starred)}


    # ── hidden projects (each admin's own) ────────────
    def prefs(self, user_id: str) -> dict:
        """What the panel needs to leave hidden projects out, and to show who you follow."""
        return {
            "hidden": [h["full_name"] for h in self._hidden.get(user_id, {}).values()],
            "follows": sorted(self._follows.get(user_id, {}).values(), key=lambda f: f["login"].lower()),
        }

    def set_hidden(self, user_id: str, full: str, hidden: bool) -> None:
        mine = self._hidden.setdefault(user_id, {})
        if hidden:
            e = self.live.known_entry(full) or {}
            name = e.get("full_name") or full
            mine[name.lower()] = {"full_name": name, "hidden_at": time.time(), "description": e.get("description") or "",
                                  "type": e.get("type") or ""}
        else:
            mine.pop(full.lower(), None)
        self._save()

    def hidden_list(self, user_id: str) -> dict:
        """Hidden projects, newest first, as they were last checked (no GitHub request)."""
        rows = []
        for key, h in sorted(self._hidden.get(user_id, {}).items(), key=lambda kv: -kv[1].get("hidden_at", 0)):
            e = self.live.known_entry(key)
            if e and not e.get("checking"):
                row = self.live.row(e)
            else:
                row = {"full_name": h["full_name"], "description": h.get("description", ""), "type": h.get("type", ""),
                       "stars": 0, "pushed_at": "", "status": "unchecked", "fork_of": None, "archived": False,
                       "old": False, "release": "", "found_by": "Hidden"}
            row["hidden_at"] = h.get("hidden_at")
            rows.append(row)
        return {"rows": rows}

    # ── authors you follow (each admin's own) ─────────
    def follow_logins(self, user_id: str) -> list[str]:
        return [f["login"] for f in self._follows.get(user_id, {}).values()]

    def set_follow(self, user_id: str, author: dict, follow: bool) -> None:
        mine = self._follows.setdefault(user_id, {})
        login = author["login"]
        if follow:
            mine[login.lower()] = {"login": login, "name": (author.get("name") or "")[:100],
                                   "avatar": (author.get("avatar") or "")[:300], "added": time.time()}
        else:
            mine.pop(login.lower(), None)
        self._save()
