"""Adding Crow Discover. Its settings are in Discover → ⋯ → Settings."""

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.config_entries import ConfigEntry, ConfigFlow, ConfigFlowResult, OptionsFlow
from homeassistant.core import callback

from .const import DOMAIN


class CrowDiscoverConfigFlow(ConfigFlow, domain=DOMAIN):
    """Add Crow Discover."""

    VERSION = 1

    async def async_step_user(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        if self._async_current_entries():
            return self.async_abort(reason="single_instance_allowed")
        if user_input is not None:
            return self.async_create_entry(title="Crow Discover", data={}, options={})
        return self.async_show_form(step_id="user", data_schema=vol.Schema({}))

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: ConfigEntry) -> OptionsFlow:
        return CrowDiscoverOptionsFlow()


class CrowDiscoverOptionsFlow(OptionsFlow):
    """Points to the Settings page inside Discover, so there's only one place to change things."""

    async def async_step_init(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        if user_input is not None:
            return self.async_create_entry(data=dict(self.config_entry.options))
        return self.async_show_form(step_id="init", data_schema=vol.Schema({}))
