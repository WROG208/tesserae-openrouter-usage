# OpenRouter Usage for Tesserae

A native [Tesserae](https://github.com/dmellok/tesserae) widget that displays OpenRouter credit balance, spending, request counts, and token usage on e-ink dashboards.

The widget retrieves data on the Tesserae server. OpenRouter credentials are never sent to the browser or e-ink device.

## Features

- Current OpenRouter credit balance
- Total credits purchased and total account usage
- Spending for the latest completed activity day
- Prompt, completion, and reasoning token totals
- Request count
- Seven-day spending chart
- Most-used model by spend
- Ten-minute local cache to reduce API traffic
- Cached-data fallback when OpenRouter is temporarily unavailable
- Responsive layouts for Tesserae `xs`, `sm`, `md`, and `lg` cells
- E-ink-friendly rendering without animations

OpenRouter may return several rows for the same model when requests are routed through different providers. The widget combines those rows into daily and per-model totals.

## Requirements

- A working Tesserae installation compatible with `1.x` widgets
- An OpenRouter account
- An OpenRouter **Management API Key**
- Network access from the Tesserae server to `openrouter.ai`

Create the management key from OpenRouter's Management API Keys page. A normal inference key is not sufficient for the account credits and activity endpoints.

## Installation

### Tesserae catalog

After the widget is accepted into the community catalog:

1. Open Tesserae.
2. Go to **Settings → Widgets → Browse catalog**.
3. Find **OpenRouter Usage**.
4. Select **Install**.
5. Restart Tesserae if requested.

### Manual installation

Copy the widget directory into a plugin location visible to Tesserae as:

```text
plugins/openrouter_usage/
├── plugin.json
├── client.js
└── server.py
```

For Docker installations, a persistent read-only bind mount can be used:

```yaml
services:
  tesserae:
    volumes:
      - ./data:/app/data
      - ./openrouter_usage:/app/plugins/openrouter_usage:ro
```

Restart Tesserae after installing the directory:

```bash
docker compose up -d
```

## Configuration

1. Open Tesserae.
2. Go to **Settings → Widgets → OpenRouter Usage**.
3. Enter an OpenRouter Management API Key.
4. Save the widget settings.
5. Open the dashboard composer and add **OpenRouter Usage** to a page.
6. Preview the dashboard before sending it to a panel.

The key is declared as a secret Tesserae setting. It is used only by the widget's server-side Python code.

## OpenRouter data

The widget reads two documented OpenRouter endpoints:

| Endpoint | Purpose |
| --- | --- |
| `GET https://openrouter.ai/api/v1/credits` | Total credits purchased and total account usage |
| `GET https://openrouter.ai/api/v1/activity` | Daily model, provider, request, cost, and token activity |

Available balance is calculated as:

```text
total credits - total usage
```

The activity endpoint reports the previous 30 completed UTC days. Consequently, the token and daily-spending sections are not real-time and may not include the current UTC day. Credit balance and total usage are current when OpenRouter responds.

## Privacy and security

The widget:

- Connects only to `openrouter.ai`.
- Declares `network:openrouter.ai` in its Tesserae capabilities.
- Reads only its own Tesserae plugin settings.
- Stores cached API results only in its assigned Tesserae data directory.
- Does not send credentials or raw API responses to client-side JavaScript.
- Does not access prompts, completions, conversations, or message content.
- Does not include analytics or third-party tracking.

An OpenRouter management key has administrative privileges. Protect the Tesserae data directory, do not commit settings or cache files, and never place the key inside `server.py`, `client.js`, `plugin.json`, Docker Compose, screenshots, or issue reports.

## Caching and failures

Successful results are cached for ten minutes in Tesserae's plugin data directory. When OpenRouter is temporarily unavailable, the widget uses the last successful cached result and marks the display as `CACHED`. If no cache exists, the widget displays a friendly error rather than preventing the dashboard from rendering.

## Repository layout

For a standalone public repository, place the widget files at the repository root:

```text
tesserae-openrouter-usage/
├── plugin.json
├── client.js
├── server.py
├── README.md
├── LICENSE
└── tests/
    └── test_smoke.py
```

Do not commit Tesserae's `data/` directory, `settings.json`, cache files, `.env` files, or API keys.

Suggested `.gitignore`:

```gitignore
__pycache__/
*.py[cod]
.pytest_cache/
.env
data/
settings.json
*.tar.gz
*.sha256
```

## Publishing through the Tesserae catalog

Tesserae's community catalog expects the widget to be hosted in its own public GitHub repository and published as a tagged release.

1. Validate `plugin.json` against Tesserae's current plugin schema.
2. Test all supported cell sizes.
3. Commit the source to a public GitHub repository.
4. Create and push a version tag, such as `v1.0.0`.
5. Calculate the SHA-256 of GitHub's tag archive.
6. Capture at least an `lg.png` rendered screenshot.
7. Fork `dmellok/tesserae-widgets`.
8. Add the screenshot under `screenshots/openrouter_usage/lg.png`.
9. Add the widget entry to `widgets.json`.
10. Open a pull request describing network access, settings, secret handling, caching, and failure behavior.

Example catalog entry:

```json
{
  "id": "openrouter_usage",
  "name": "OpenRouter Usage",
  "description": "OpenRouter credit balance, spending, requests and token usage for Tesserae dashboards.",
  "icon": "ph-chart-line-up",
  "author": {
    "name": "N4ASS",
    "github": "WROG208"
  },
  "tags": ["developer"],
  "kind": "widget",
  "tesserae_compat": "1.x",
  "screenshot_sizes": ["lg"],
  "release": {
    "version": "1.0.0",
    "tarball_url": "https://github.com/WROG208/tesserae-openrouter-usage/archive/refs/tags/v1.0.0.tar.gz",
    "sha256": "GENERATE_AFTER_PUBLISHING_V1.0.0_TAG"
  },
  "source": "https://github.com/WROG208/tesserae-openrouter-usage"
}
```

The catalog has a closed list of accepted tags. Confirm the current schema and replace `developer` if it is not an accepted value when submitting.

## Disclaimer

This community widget is not affiliated with or endorsed by OpenRouter or Tesserae. API formats and availability may change. Review the OpenRouter and Tesserae documentation before deploying updates.

## License

Released under the [MIT License](LICENSE).
