# Crow Discover

Crow Discover adds a **Discover** page to the Home Assistant sidebar for finding integrations, dashboard cards, themes and blueprints on GitHub, including the many that were never submitted to the Marketplace. Pick a project and Crow Discover hands it to Home Assistant's **Marketplace**, which installs it and keeps it updated, just like anything else from the Marketplace. Blueprints go to Home Assistant's own blueprint importer.

> **Nothing big downloaded.** Discover asks GitHub as you look, one page of about 40 projects at a time. There's no list to download and no scan. What you've already seen is kept for a day (you can choose an hour or a week), so going back is instant.

> **Crow Discover never installs anything itself.** The Marketplace does the installing, asks you to confirm, and handles updates and removal.

[![Marketplace](https://img.shields.io/badge/Marketplace-Custom-orange)](https://hacs.xyz/docs/marketplace/)
[![Home Assistant](https://img.shields.io/badge/Home%20Assistant-2026.11+-blue)](https://www.home-assistant.io/)

If you enjoy Crow Discover, you can support its development:

<a href="https://buymeacoffee.com/jamesmcginnis"><img src="https://img.buymeacoffee.com/button-api/?text=Buy%20Me%20a%20Coffee&emoji=&slug=jamesmcginnis&button_colour=FFDD00&font_colour=000000&font_family=Inter&outline_colour=000000&coffee_colour=ffffff" alt="Buy Me a Coffee" height="40"></a>

**Step 1 — Add the repository to the Marketplace:**

[![Open your Home Assistant instance and add this repository to the Marketplace.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=jamesmcginnis&repository=crow-discover&category=integration)

**Step 2 — After downloading and restarting, add the integration:**

[![Open your Home Assistant instance and start setting up Crow Discover.](https://my.home-assistant.io/badges/config_flow_start.svg)](https://my.home-assistant.io/redirect/config_flow_start/?domain=crow_discover)

**Step 3 — Open Discover in the sidebar.**

---

## What you get

- **Home Assistant projects on GitHub, as you browse**, including the many that aren't in the Marketplace. The ones your Marketplace already has are labelled.
- **Browse** the projects already **In Marketplace**, all projects, or one type (Integrations, Cards, Themes, Blueprints). Each project is labelled:
  - **In Marketplace** — already in your Marketplace; opens it there. Projects you've installed from it say **Installed**, or **Update available** when the Marketplace has a newer version.
  - **Marketplace-compatible** — laid out the way the Marketplace installs, so **Add to Marketplace** adds it as a custom repository and opens it in the Marketplace.
  - **Blueprint** — **Import Blueprint** opens Home Assistant's blueprint importer.
  - **Not installable** — says why (for example, a card's file isn't named the way the Marketplace looks for it), with **Ask the Author**, which opens a ready-written GitHub issue.
- **Search** names, descriptions, topics and READMEs, then **Search Code Too** for projects with no tags at all. A search starts when you stop typing (or straight away when you press Return), and the current list stays up until the new one is ready.
- **Paste any GitHub link** into the search bar to check that project.
- **Each project's README, laid out as on GitHub**, with its headings, tables, code and screenshots, in the project's sheet, and **What's new** from its latest release.
- **Author pages**: **More from** in a project's sheet (or its press-and-hold menu) shows everything that author has for Home Assistant. **Follow** an author and **Following** lists the newest projects from everyone you follow.
- **Hide** projects you'll never want: swipe left and tap Hide. They're left out of every list, and **Hidden** keeps them in case you want one back.
- **A Marketplace check** on every project: whether it's laid out the way the Marketplace installs, whether it was updated recently, whether it's archived, and whether it would replace an integration built into Home Assistant. When the Marketplace is signed in to GitHub, it confirms the result itself.
- **Projects not updated in over 2 years are hidden**, because they often break on current Home Assistant. The list says about how many were hidden, and **Show** brings them back.
- **Favourites**, each admin with their own: swipe a row right, tap the star in a project's sheet, or press and hold a row. Favourites shows a **New release** label when a project has released since you last opened it, and each favourite can have a note. Favourites has its own place under **Saved**, with Following and Hidden.
- **Swipe and hold**, as in the other Crow projects: swipe right to favourite, swipe left for the main action (Add to Marketplace, Open in Marketplace, Update or Import Blueprint), GitHub and Hide, or press and hold for a menu.
- **Favourites, Following and Hidden are each admin's own.** Following an author is only in Discover; nothing is followed on GitHub.
- **Import My GitHub Stars** adds the Home Assistant projects you've starred on GitHub to your Favourites, and **Star on GitHub Too** (off unless you turn it on) stars a project on GitHub when you favourite it.
- **Computer, iPad and phone layouts**, in the same style as the other Crow projects, following your light or dark theme, with a Glass or Classic style.

## How it works

Each time you open a type, search or scroll, Home Assistant asks GitHub for the next page:

1. **A few searches side by side**: by topic (`home-assistant`, `hacs`, `lovelace-custom-card`, `home-assistant-custom-component`, `home-assistant-theme`, `home-assistant-blueprint` and similar, depending on the type) and by name and description, so repos without topics are found too.
2. **Then each repo's files**, read 10 projects at a time and checked with the same rules the Marketplace uses, **before the page is shown**. You see "Checking 40 projects… 20 done" while it works, then the finished list, which doesn't change after that. Repos that aren't Home Assistant projects (config backups, say) are left out.

The number under each page's heading is GitHub's own estimate of how many repos match. **Show More** looks further, and adds the next projects below the ones already showing.

### Saved results

Search pages, GitHub's estimates, READMEs and release notes are kept for the time chosen in **Settings → General → Keep results for** (1 Hour, 1 Day or 1 Week; 1 Day to start). Each project's check is kept until the project changes on GitHub. **Refresh** always asks GitHub again, and **Clear Saved Results** empties it all. Settings shows how much is kept. Forks aren't searched (paste a fork's link to check it).

### With or without a GitHub token

| | With a token (recommended) | Without |
|---|---|---|
| Searches | Plenty | About 10 a minute |
| Checking projects | Every project, before it's listed | When you open it (60 an hour) |
| Search Code Too | Yes | No |

The token is a fine-grained GitHub token with **Public repositories (read-only)** access. For **Star on GitHub Too**, also give it **Starring: Read and write** under Account permissions; Settings → GitHub shows whether it has it. It's saved on your server, sent only to GitHub, and Discover → Settings → GitHub shows how to make one.

## Settings

Open **Discover**, tap **⋯** in the top-right corner, then **Settings**. (Home Assistant's own Configure button for Crow Discover points here too.)

| Page | What's on it |
|---|---|
| General | **Style:** Glass (see-through, like Crow Food's glass style) or Classic (solid). **Name in the sidebar.** **Keep results for** 1 Hour, 1 Day or 1 Week, how much is kept now, and **Clear Saved Results**. |
| GitHub | The **token**, whether GitHub accepts it and how many requests are left this hour, and how to make one. **Star on GitHub Too**, whether the token has Starring permission, and **Import My GitHub Stars**. |

## Privacy

Crow Discover reads public information from GitHub: search results, each project's file list, and a project's README and release notes (with their pictures, which your browser loads from GitHub) when you open it. Author pages show the author's GitHub picture, also loaded from GitHub. Results you've seen, and each admin's favourites (with any notes), hidden projects and followed authors, are kept on your server, in Home Assistant's storage. The only things it ever changes on GitHub are your own stars, and only if you turn on **Star on GitHub Too**. Nothing about your Home Assistant is sent anywhere.

## Requirements

- Home Assistant **2026.11** or newer (the version with the built-in Marketplace).
- The Discover page is for administrators only.

The panel's source is in `source/`; after changing it, run `node source/build.js` to copy it into `custom_components/crow_discover/www`.

## Licence

Crow Discover is proprietary software. See [LICENSE.md](LICENSE.md).
