"""Websocket commands the panel uses. All of them are for admins only."""

from __future__ import annotations

import asyncio
from typing import Any

import aiohttp
import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback

from .const import (
    CACHE_CHOICES,
    CONF_CACHE_HOURS,
    CONF_SIDEBAR_TITLE,
    CONF_STAR,
    CONF_STYLE,
    CONF_TOKEN,
    DEFAULT_SIDEBAR_TITLE,
    DOMAIN,
    STYLE_CLASSIC,
    STYLE_GLASS,
    VERSION,
)
from .favourites import Favourites
from .live import FILTERS, LOGIN_RE, SORTS, GitHubLimit, LiveDiscover


def _live(hass: HomeAssistant, connection, msg_id: int) -> LiveDiscover | None:
    live = hass.data.get(DOMAIN, {}).get("live")
    if live is None:
        connection.send_error(msg_id, "not_loaded", "Crow Discover isn't set up")
    return live


async def _github(connection, msg_id: int, coro) -> None:
    """Run a GitHub request and answer with its result, or with why it failed."""
    try:
        connection.send_result(msg_id, await coro)
    except GitHubLimit as exc:
        connection.send_error(msg_id, str(exc), str(exc))
    except asyncio.TimeoutError:
        connection.send_error(msg_id, "slow", "GitHub took too long to answer")
    except aiohttp.ClientError:
        connection.send_error(msg_id, "download", "Couldn't reach GitHub")


@callback
def async_register(hass: HomeAssistant) -> None:
    for cmd in (ws_info, ws_query, ws_check, ws_counts, ws_repo, ws_lookup, ws_code, ws_known,
                ws_settings_get, ws_settings_set, ws_github_status, ws_cache_info, ws_cache_clear,
                ws_fav_summary, ws_fav_list, ws_fav_add, ws_fav_remove, ws_fav_note, ws_fav_seen, ws_fav_import,
                ws_prefs, ws_hide, ws_hidden_list, ws_author, ws_follow):
        websocket_api.async_register_command(hass, cmd)


@websocket_api.websocket_command({vol.Required("type"): "crow_discover/info"})
@websocket_api.require_admin
@callback
def ws_info(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    if (live := _live(hass, connection, msg["id"])) is None:
        return
    info = live.info()
    info.update({"version": VERSION, "style": live.options[CONF_STYLE],
                 "marketplace": "marketplace" in hass.config.components})
    connection.send_result(msg["id"], info)


@websocket_api.websocket_command({
    vol.Required("type"): "crow_discover/query",
    vol.Optional("filter", default="all"): vol.In(FILTERS),
    vol.Optional("q", default=""): str,
    vol.Optional("sort", default="updated"): vol.In(SORTS),
    vol.Optional("show_old", default=False): bool,
    vol.Optional("cursors"): vol.Any(None, dict),
    vol.Optional("fresh", default=False): bool,
    vol.Optional("author"): str,
})
@websocket_api.require_admin
@websocket_api.async_response
async def ws_query(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    if (live := _live(hass, connection, msg["id"])) is None:
        return
    who = None
    if msg["filter"] == "author":
        who = [msg.get("author") or ""]
    elif msg["filter"] == "following":
        who = favs.follow_logins(_user(connection)) if (favs := _favs(hass)) else []
    await _github(connection, msg["id"], live.async_query(
        msg["filter"], msg["q"], msg["sort"], msg["show_old"], msg.get("cursors"), msg["fresh"], who))


@websocket_api.websocket_command({vol.Required("type"): "crow_discover/check", vol.Required("names"): [str]})
@websocket_api.require_admin
@websocket_api.async_response
async def ws_check(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    if (live := _live(hass, connection, msg["id"])) is None:
        return
    await _github(connection, msg["id"], live.async_check(msg["names"]))


@websocket_api.websocket_command({
    vol.Required("type"): "crow_discover/counts",
    vol.Optional("q", default=""): str,
    vol.Optional("show_old", default=False): bool,
})
@websocket_api.require_admin
@websocket_api.async_response
async def ws_counts(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    if (live := _live(hass, connection, msg["id"])) is None:
        return
    await _github(connection, msg["id"], live.async_counts(msg["q"], msg["show_old"]))


@websocket_api.websocket_command({vol.Required("type"): "crow_discover/repo", vol.Required("full_name"): str})
@websocket_api.require_admin
@websocket_api.async_response
async def ws_repo(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    if (live := _live(hass, connection, msg["id"])) is None:
        return
    await _github(connection, msg["id"], live.async_detail(msg["full_name"]))


@websocket_api.websocket_command({vol.Required("type"): "crow_discover/lookup", vol.Required("text"): str})
@websocket_api.require_admin
@websocket_api.async_response
async def ws_lookup(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    if (live := _live(hass, connection, msg["id"])) is None:
        return
    connection.send_result(msg["id"], await live.async_lookup(msg["text"]))


@websocket_api.websocket_command({vol.Required("type"): "crow_discover/code_search", vol.Required("q"): str})
@websocket_api.require_admin
@websocket_api.async_response
async def ws_code(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    if (live := _live(hass, connection, msg["id"])) is None:
        return
    await _github(connection, msg["id"], live.async_code_search(msg["q"]))


@websocket_api.websocket_command({vol.Required("type"): "crow_discover/marketplace_known", vol.Required("names"): [str]})
@websocket_api.require_admin
@callback
def ws_known(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    if (live := _live(hass, connection, msg["id"])) is None:
        return
    live.set_known(msg["names"])
    connection.send_result(msg["id"])


def _settings(live: LiveDiscover) -> dict:
    o = dict(live.options)
    token = o.pop(CONF_TOKEN, "") or ""
    o["token_set"] = bool(token)
    o["token_hint"] = f"…{token[-4:]}" if len(token) > 8 else ""
    return o


@websocket_api.websocket_command({vol.Required("type"): "crow_discover/settings/get"})
@websocket_api.require_admin
@callback
def ws_settings_get(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    if (live := _live(hass, connection, msg["id"])) is None:
        return
    connection.send_result(msg["id"], _settings(live))


@websocket_api.websocket_command({
    vol.Required("type"): "crow_discover/settings/set",
    vol.Required("settings"): {
        vol.Optional(CONF_STYLE): vol.In((STYLE_GLASS, STYLE_CLASSIC)),
        vol.Optional(CONF_SIDEBAR_TITLE): vol.All(str, vol.Length(max=40)),
        vol.Optional(CONF_TOKEN): vol.All(str, vol.Length(max=400)),
        vol.Optional(CONF_CACHE_HOURS): vol.In(CACHE_CHOICES),
        vol.Optional(CONF_STAR): bool,
    },
})
@websocket_api.require_admin
@websocket_api.async_response
async def ws_settings_set(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    if (live := _live(hass, connection, msg["id"])) is None:
        return
    changes = dict(msg["settings"])
    if CONF_SIDEBAR_TITLE in changes:
        changes[CONF_SIDEBAR_TITLE] = changes[CONF_SIDEBAR_TITLE].strip() or DEFAULT_SIDEBAR_TITLE
    if CONF_TOKEN in changes:
        token = changes[CONF_TOKEN].strip()
        if token:
            status = await live.async_github_status(token)
            if not status.get("ok"):
                connection.send_error(msg["id"], status.get("error") or "token", "GitHub didn't accept that token")
                return
        changes[CONF_TOKEN] = token
    await live.async_set_settings(changes)
    connection.send_result(msg["id"], _settings(live))


@websocket_api.websocket_command({vol.Required("type"): "crow_discover/github_status"})
@websocket_api.require_admin
@websocket_api.async_response
async def ws_github_status(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    if (live := _live(hass, connection, msg["id"])) is None:
        return
    status = await live.async_github_status()
    if status.get("ok") and (favs := _favs(hass)):
        status["can_star"] = await favs.async_can_star()
    connection.send_result(msg["id"], status)


def _favs(hass: HomeAssistant) -> Favourites | None:
    return hass.data.get(DOMAIN, {}).get("favourites")


@websocket_api.websocket_command({vol.Required("type"): "crow_discover/cache/info"})
@websocket_api.require_admin
@websocket_api.async_response
async def ws_cache_info(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    if (live := _live(hass, connection, msg["id"])) is None:
        return
    connection.send_result(msg["id"], await live.async_cache_info())


@websocket_api.websocket_command({vol.Required("type"): "crow_discover/cache/clear"})
@websocket_api.require_admin
@websocket_api.async_response
async def ws_cache_clear(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    if (live := _live(hass, connection, msg["id"])) is None:
        return
    await live.async_clear()
    connection.send_result(msg["id"], await live.async_cache_info())


# ── favourites: each admin has their own ─────────────
def _user(connection) -> str:
    return connection.user.id


@websocket_api.websocket_command({vol.Required("type"): "crow_discover/fav/summary"})
@websocket_api.require_admin
@callback
def ws_fav_summary(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    if (favs := _favs(hass)) is None:
        connection.send_error(msg["id"], "not_loaded", "Crow Discover isn't set up")
        return
    connection.send_result(msg["id"], favs.summary(_user(connection)))


@websocket_api.websocket_command({vol.Required("type"): "crow_discover/fav/list", vol.Optional("fresh", default=False): bool})
@websocket_api.require_admin
@websocket_api.async_response
async def ws_fav_list(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    if (favs := _favs(hass)) is None:
        connection.send_error(msg["id"], "not_loaded", "Crow Discover isn't set up")
        return
    connection.send_result(msg["id"], await favs.async_list(_user(connection), msg["fresh"]))


@websocket_api.websocket_command({vol.Required("type"): "crow_discover/fav/add", vol.Required("full_name"): str})
@websocket_api.require_admin
@websocket_api.async_response
async def ws_fav_add(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    if (favs := _favs(hass)) is None:
        connection.send_error(msg["id"], "not_loaded", "Crow Discover isn't set up")
        return
    connection.send_result(msg["id"], await favs.async_add(_user(connection), msg["full_name"]))


@websocket_api.websocket_command({vol.Required("type"): "crow_discover/fav/remove", vol.Required("full_name"): str})
@websocket_api.require_admin
@websocket_api.async_response
async def ws_fav_remove(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    if (favs := _favs(hass)) is None:
        connection.send_error(msg["id"], "not_loaded", "Crow Discover isn't set up")
        return
    connection.send_result(msg["id"], await favs.async_remove(_user(connection), msg["full_name"]))


@websocket_api.websocket_command({vol.Required("type"): "crow_discover/fav/note", vol.Required("full_name"): str,
                                  vol.Required("note"): vol.All(str, vol.Length(max=2000))})
@websocket_api.require_admin
@callback
def ws_fav_note(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    if (favs := _favs(hass)) is None:
        connection.send_error(msg["id"], "not_loaded", "Crow Discover isn't set up")
        return
    favs.set_note(_user(connection), msg["full_name"], msg["note"])
    connection.send_result(msg["id"])


@websocket_api.websocket_command({vol.Required("type"): "crow_discover/fav/seen", vol.Required("full_name"): str})
@websocket_api.require_admin
@callback
def ws_fav_seen(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    if (favs := _favs(hass)) is None:
        connection.send_error(msg["id"], "not_loaded", "Crow Discover isn't set up")
        return
    favs.seen(_user(connection), msg["full_name"])
    connection.send_result(msg["id"])


@websocket_api.websocket_command({vol.Required("type"): "crow_discover/fav/import_stars"})
@websocket_api.require_admin
@websocket_api.async_response
async def ws_fav_import(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    if (favs := _favs(hass)) is None:
        connection.send_error(msg["id"], "not_loaded", "Crow Discover isn't set up")
        return
    connection.send_result(msg["id"], await favs.async_import_stars(_user(connection)))


# ── hidden projects and followed authors: each admin has their own ─────
@websocket_api.websocket_command({vol.Required("type"): "crow_discover/prefs"})
@websocket_api.require_admin
@callback
def ws_prefs(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    if (favs := _favs(hass)) is None:
        connection.send_error(msg["id"], "not_loaded", "Crow Discover isn't set up")
        return
    connection.send_result(msg["id"], favs.prefs(_user(connection)))


@websocket_api.websocket_command({vol.Required("type"): "crow_discover/hide", vol.Required("full_name"): vol.All(str, vol.Length(max=200)),
                                  vol.Required("hidden"): bool})
@websocket_api.require_admin
@callback
def ws_hide(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    if (favs := _favs(hass)) is None:
        connection.send_error(msg["id"], "not_loaded", "Crow Discover isn't set up")
        return
    favs.set_hidden(_user(connection), msg["full_name"], msg["hidden"])
    connection.send_result(msg["id"], favs.prefs(_user(connection)))


@websocket_api.websocket_command({vol.Required("type"): "crow_discover/hidden/list"})
@websocket_api.require_admin
@callback
def ws_hidden_list(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    if (favs := _favs(hass)) is None:
        connection.send_error(msg["id"], "not_loaded", "Crow Discover isn't set up")
        return
    connection.send_result(msg["id"], favs.hidden_list(_user(connection)))


@websocket_api.websocket_command({vol.Required("type"): "crow_discover/author", vol.Required("login"): str})
@websocket_api.require_admin
@websocket_api.async_response
async def ws_author(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    if (live := _live(hass, connection, msg["id"])) is None:
        return
    await _github(connection, msg["id"], live.async_author(msg["login"]))


@websocket_api.websocket_command({
    vol.Required("type"): "crow_discover/follow",
    vol.Required("login"): str,
    vol.Required("follow"): bool,
    vol.Optional("name", default=""): str,
    vol.Optional("avatar", default=""): str,
})
@websocket_api.require_admin
@callback
def ws_follow(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    if (favs := _favs(hass)) is None:
        connection.send_error(msg["id"], "not_loaded", "Crow Discover isn't set up")
        return
    if not LOGIN_RE.match(msg["login"]):
        connection.send_error(msg["id"], "not_found", "Not a GitHub name")
        return
    avatar = msg["avatar"] if msg["avatar"].startswith("https://avatars.githubusercontent.com/") else ""
    favs.set_follow(_user(connection), {"login": msg["login"], "name": msg["name"], "avatar": avatar}, msg["follow"])
    connection.send_result(msg["id"], favs.prefs(_user(connection)))
