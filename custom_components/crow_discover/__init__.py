"""Crow Discover: find Home Assistant projects on GitHub and hand them to the Marketplace.

Nothing is downloaded or stored: the panel asks GitHub (through Home Assistant, which
keeps the token) each time you look.
"""

from __future__ import annotations

import hashlib
import logging
from pathlib import Path

from homeassistant.components import frontend, panel_custom
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store

from . import websocket
from .const import (
    CONF_SIDEBAR_TITLE,
    DEFAULT_SIDEBAR_TITLE,
    DOMAIN,
    FILES_URL,
    OLD_FILES,
    OLD_STORES,
    PANEL_ELEMENT,
    PANEL_URL,
    VERSION,
)
from .favourites import Favourites
from .live import LiveDiscover

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Crow Discover from its config entry."""
    data = hass.data.setdefault(DOMAIN, {})

    # served once per run of Home Assistant (static paths can't be taken away again)
    if not data.get("static"):
        www = Path(__file__).parent / "www"
        await hass.http.async_register_static_paths([StaticPathConfig(FILES_URL, str(www), False)])
        websocket.async_register(hass)
        data["static"] = True

    live = LiveDiscover(hass, entry)
    await live.async_load()
    data["live"] = live
    favs = Favourites(hass, live)
    await favs.async_load()
    data["favourites"] = favs

    # the panel's address changes whenever its file does, so browsers and the app never keep an old copy
    data["stamp"] = await hass.async_add_executor_job(_stamp)
    await _register_panel(hass, live.options[CONF_SIDEBAR_TITLE])

    async def settings_changed(old: dict, new: dict) -> None:
        if old[CONF_SIDEBAR_TITLE] != new[CONF_SIDEBAR_TITLE]:
            frontend.async_remove_panel(hass, PANEL_URL)
            await _register_panel(hass, new[CONF_SIDEBAR_TITLE])

    live.on_settings = settings_changed
    hass.async_create_task(_tidy_up(hass))
    return True


def _stamp() -> str:
    try:
        body = (Path(__file__).parent / "www" / "crow-discover-panel.js").read_bytes()
    except OSError:
        return VERSION
    return f"{VERSION}-{hashlib.sha1(body).hexdigest()[:10]}"


async def _register_panel(hass: HomeAssistant, title: str) -> None:
    await panel_custom.async_register_panel(
        hass,
        frontend_url_path=PANEL_URL,
        webcomponent_name=PANEL_ELEMENT,
        sidebar_title=title or DEFAULT_SIDEBAR_TITLE,
        sidebar_icon="mdi:binoculars",
        module_url=f"{FILES_URL}/crow-discover-panel.js?v={hass.data[DOMAIN].get('stamp', VERSION)}",
        require_admin=True,
        config={},
    )


async def _tidy_up(hass: HomeAssistant) -> None:
    """Remove what earlier test versions kept on the server (the downloaded list and scan progress)."""
    def remove() -> None:
        for name in OLD_FILES:
            Path(hass.config.path(".storage", name)).unlink(missing_ok=True)

    await hass.async_add_executor_job(remove)
    for key in OLD_STORES:
        await Store(hass, 1, key).async_remove()


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Remove the panel."""
    frontend.async_remove_panel(hass, PANEL_URL)
    data = hass.data.get(DOMAIN, {})
    if live := data.pop("live", None):
        await live.async_flush()
    if favs := data.pop("favourites", None):
        await favs.async_flush()
    return True
