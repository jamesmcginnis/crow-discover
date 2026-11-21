"""Constants for Crow Discover."""

DOMAIN = "crow_discover"
VERSION = "0.0.3"

PANEL_URL = "crow-discover"
PANEL_ELEMENT = "crow-discover-panel"
FILES_URL = "/crow_discover_files"

CONF_TOKEN = "github_token"
CONF_STYLE = "style"
CONF_SIDEBAR_TITLE = "sidebar_title"
CONF_CACHE_HOURS = "cache_hours"  # how long search pages, counts and READMEs are kept
CONF_STAR = "star_on_github"  # favouriting also stars the repo on GitHub
CACHE_CHOICES = (1, 24, 168)

STYLE_GLASS = "glass"
STYLE_CLASSIC = "classic"
DEFAULT_SIDEBAR_TITLE = "Discover"

DEFAULTS = {
    CONF_STYLE: STYLE_GLASS,
    CONF_SIDEBAR_TITLE: DEFAULT_SIDEBAR_TITLE,
    CONF_TOKEN: "",
    CONF_CACHE_HOURS: 24,
    CONF_STAR: False,
}
CACHE_STORE = "crow_discover.cache"
FAVOURITES_STORE = "crow_discover.favourites"

# Projects not updated for this long are hidden unless "Show" is tapped
OLD_DAYS = 730

GITHUB_API = "https://api.github.com"
RAW = "https://raw.githubusercontent.com"
USER_AGENT = f"CrowDiscover/{VERSION}"

# What earlier test versions kept on the server; removed when Crow Discover starts
OLD_FILES = ("crow_discover_index.json.gz", "crow_discover_index.json.gz.tmp")
OLD_STORES = ("crow_discover.overlay", "crow_discover.scan_state")
