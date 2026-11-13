# The Goal Kings: Top 100 Goalscorers in Football History

A free, static, dark-mode football stats site: a glowing progress ring tracking Cristiano Ronaldo's race to 1,000 career goals, plus a searchable, filterable Top 100 with a detailed modal for every player.

Pure HTML, CSS and vanilla JavaScript. No build step, no framework, no cost. Hosts on GitHub Pages.

## Project structure

```
goal-kings/
├── index.html      # page markup
├── style.css       # dark theme, animations, responsive layout
├── app.js          # loads players.json, renders tracker, grid, filters, modal
├── players.json    # ALL the data (edit this to update the site)
└── README.md
```

## A note on the data

**FIFA does not publish an official all-time goalscorers list**, so no figure here is truly "FIFA-official". Totals differ between IFFHS, RSSSF, Guinness and national federations depending on whether friendlies, reserve, wartime and lower-division goals count. The site shows this openly:

| Ranks | Basis | Quality tag |
|-------|-------|-------------|
| 1-27 | IFFHS-based top-level table (17 Oct 2026), with Ronaldo and Messi updated to 10 Nov 2026 | `sourced` (Bican, Pelé, Romário are marked `disputed`) |
| 28-82 | RSSSF all-competition-levels tallies (19 Jul 2026). These include lower leagues and unofficial matches, so they are **not** comparable to ranks 1-27 | `sourced` |
| 83-100 | Rounded estimates from memory, **not verified** | `estimate` |

Please replace the `estimate` entries with sourced numbers when you can. Only the first 27 players have a club/country and competition breakdown, and only some have tournament goals; the rest show a friendly "not available" message in the modal. Assists are only filled in for Ronaldo and Messi.

## Run it locally

Browsers block `fetch()` on `file://`, so use a tiny local server:

```bash
cd goal-kings
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploy to GitHub Pages (free)

### 1. Create the repository
1. Sign in at [github.com](https://github.com) (free account is fine).
2. Click the **+** in the top-right, then **New repository**.
3. Name it, for example, `goal-kings`. Choose **Public** (required for free GitHub Pages on personal accounts).
4. Leave "Add a README" unticked, then click **Create repository**.

### 2. Upload the files (no Git needed)
1. On the empty repo page, click **uploading an existing file**.
2. Drag in `index.html`, `style.css`, `app.js`, `players.json` and `README.md` (the files themselves, not a parent folder).
3. Click **Commit changes**.

**Or with Git commands:**
```bash
cd goal-kings
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/goal-kings.git
git push -u origin main
```

### 3. Turn on GitHub Pages
1. In the repo, open **Settings**, then **Pages** in the left sidebar.
2. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
3. Choose branch **main** and folder **/ (root)**, then click **Save**.
4. Wait 1-2 minutes and refresh. The page shows your live URL:
   `https://YOUR-USERNAME.github.io/goal-kings/`

## Update the stats every 24 hours

Everything is driven by `players.json`, so updating never touches the code.

1. Open `players.json` in your repo and click the **pencil icon** (Edit).
2. For Ronaldo's counter, change these:
   - `meta.lastUpdated` and `tracker.asOf` to today's date (`YYYY-MM-DD`).
   - In Ronaldo's entry: raise `breakdown.league` / `cup` / `continental` / `national` by the goals scored. **`totalGoals`, `clubGoals` and `nationalGoals` should be updated to match** (total = club + national; club = league + cup + continental).
   - Optionally update `assists`, `matches`, and `tracker.matchesPerMonth` if the fixture pace changes.
3. Do the same for any other player whose numbers changed.
4. Click **Commit changes**. GitHub Pages republishes in about a minute. Hard-refresh the site (Ctrl/Cmd + Shift + R) to see it.

**Tips**
- Keep the JSON valid: watch commas and quotes. Paste it into [jsonlint.com](https://jsonlint.com) if the site shows a load error.
- The page fetches the file with a cache-buster, so visitors always get the latest version once Pages has redeployed.
- To add or reorder players, edit the `players` array and keep each `rank` and `id` unique. Use `null` for unknown numbers.

### Field reference (per player)

| Field | Meaning |
|-------|---------|
| `id`, `rank`, `name` | unique id (lowercase, hyphens), position, display name |
| `countryCode` | flag code (e.g. `pt`, `ar`, `gb-eng`); use `null` for none |
| `status` | `"Active"` or `"Retired"` |
| `totalGoals` | number used for ranking and the ring |
| `totalIsMinimum` / `totalIsApprox` | show `985+` or `~985` |
| `clubGoals`, `nationalGoals`, `breakdown` | enable the donut and bars (use `null` to skip) |
| `tournaments` | `[{ "label": "FIFA World Cup", "goals": 10 }]` |
| `altTotals` | other published totals, shown as a table |
| `dataQuality` | `sourced`, `disputed` or `estimate` (shows a badge) |

### Tracker settings (`tracker` block)

`playerId` (who the main ring follows), `target` (1000), `asOf` (date of the count), `goalsPerMatch` and `matchesPerMonth` (used for the *illustrative* projected date). Set these to match the real fixture schedule.

## Customising

- Colours live in `:root` at the top of `style.css`.
- The legend chips above the ring are built automatically from the six highest-scoring active players.
- Each player has a shareable link: `https://YOUR-USERNAME.github.io/goal-kings/#player=lionel-messi`.
