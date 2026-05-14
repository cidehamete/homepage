# jasonboog.com

A small editorial site for Jason Boog. Four pages, one stylesheet, one
content file, one tiny admin. No build step. No framework.

```
jasonboog-site/
├── index.html          ← Home
├── about.html
├── resume.html
├── contact.html
├── site.css            ← One stylesheet
├── site.js             ← Renders pages from content.json
├── content.json        ← Every editable piece of text & every image URL
├── admin/
│   └── index.html      ← Web editor (commits content.json to GitHub)
└── README.md
```

When the site loads, `site.js` fetches `content.json` and fills in the
page. When you edit something in `/admin`, it writes a new
`content.json` to the GitHub repo. Cloudflare Pages sees the commit and
redeploys ~30 seconds later.

---

## Getting it online (one-time setup)

### 1. Put it on GitHub

```bash
cd jasonboog-site
git init
git add .
git commit -m "Initial site"
# Create an empty repo on github.com first, then:
git branch -M main
git remote add origin https://github.com/jasonboog/jasonboog-site.git
git push -u origin main
```

You can keep the repo **private**. The admin uses your GitHub token —
the public site only loads `content.json` from the deployed Cloudflare
Pages URL, not from GitHub.

### 2. Deploy with Cloudflare Pages

1. Go to **dash.cloudflare.com → Workers & Pages → Create → Pages → Connect to Git**.
2. Pick the `jasonboog-site` repo.
3. Build settings:
   - **Framework preset:** None
   - **Build command:** *(leave empty)*
   - **Build output directory:** `/` (the repo root)
4. Save and deploy. You'll get a URL like `jasonboog-site.pages.dev`. Open it — the site should be live.

### 3. Point jasonboog.com at it

In Cloudflare Pages → your project → **Custom domains → Set up a custom domain → `jasonboog.com`**. Cloudflare handles the DNS automatically if the domain is on the same account.

Once that's working, you can decommission WordPress whenever you're ready.

### 4. Get a GitHub token for the admin

1. Go to <https://github.com/settings/tokens?type=beta> → **Generate new token (fine-grained)**.
2. **Repository access:** *Only select repositories* → `jasonboog-site`.
3. **Permissions → Repository → Contents:** *Read and write*.
4. Save. Copy the token (it starts with `github_pat_…`) — you'll only see it once.

### 5. Connect the admin

1. Go to `https://jasonboog.com/admin` (or the pages.dev URL).
2. First time only, you'll see a setup screen. Fill in:
   - **Owner:** `jasonboog` (your GitHub username)
   - **Repo:** `jasonboog-site`
   - **Branch:** `main`
   - **Path:** `content.json`
   - **Token:** the `github_pat_…` you just made
3. Click **Connect**. The token is stored in your browser's `localStorage` only — it's not sent anywhere except api.github.com.

You're set. To edit anything, go to `/admin`, change a field, click **Save changes**. The page redeploys automatically.

---

## How to update the site

### Add a piece (article link) to a Room
Admin → **Four Rooms** → expand a room → **Pieces → + Add piece** → fill in title + URL → **Save changes**.

### Edit a blurb
Admin → the relevant pane (e.g. **About Page**) → change the text → **Save changes**.

### Refresh the daily image rotation
You collect a new set of images around a theme:

1. Admin → **Image Collections** → **+ New collection**.
2. Give it an id (`mid-century-libraries`), a name (`The Reading Room`), a deck, source credit, and an accent color.
3. **+ Add plate** for each image. For every plate:
   - `slot` — `hero` for the daily image at top, or one of `open-book` / `wititi` / `history-club` / `writing-machines` to dress one of the four rooms. (If you add a plate with the same slot as a room, that room shows that image.)
   - `url` — the direct URL to a public-domain image (Library of Congress, Internet Archive, Smithsonian Open Access, etc.)
   - `focus` — CSS object-position. `center`, `center 30%`, `left 40%`, etc. Pulls the crop where you want it.
   - `title`, `creator`, `year` — caption metadata
4. At the top of the Image Collections pane, change **Currently hung** to your new collection.
5. **Save changes**.

The whole site re-dresses on the next page load.

The **hero plate** rotates daily — the same plate is shown to everyone for a given calendar day, then it advances.

### Italics and inline links
Anywhere you see a `*asterisks*` or `[text](url)` hint, you can use those:

- `*Born Reading*` → *Born Reading*
- `[Fable](https://fable.co)` → [Fable](https://fable.co)

That's the entire markdown vocabulary — kept tiny on purpose.

### Add a new room
Admin → **Four Rooms** → **+ Add room** at the bottom. Then go to **Image Collections** and add a plate with a matching `slot` in your active collection (or the room will show a placeholder).

---

## Where good public-domain images live

- **Library of Congress** — <https://www.loc.gov/free-to-use/>. The current "Computer Room" collection comes from here. Right-click the highest-res image and copy the URL.
- **Internet Archive** — <https://archive.org/details/image>
- **Smithsonian Open Access** — <https://www.si.edu/openaccess>
- **NYPL Public Domain Collections** — <https://digitalcollections.nypl.org/collections/lanes>
- **The Met Open Access** — <https://www.metmuseum.org/art/collection/search>

Direct image URLs from these sources are stable enough to hot-link. If you ever want to mirror them onto Cloudflare's CDN (R2), tell me and we'll wire it up.

---

## Editing locally (optional)

If you'd rather work in a real editor sometimes:

```bash
git pull
# edit content.json by hand
git commit -am "Edit content"
git push
```

Cloudflare redeploys on every push, same as the admin.

You can preview locally with any static server:

```bash
cd jasonboog-site
python3 -m http.server 8000
# open http://localhost:8000
```

---

## Troubleshooting

**Admin says "Could not reach repo"** — the token's repo permissions are wrong, or the owner/repo name is misspelled. Re-check the token: it must have **Contents: Read and write** on this specific repo.

**Saved but the site didn't update** — wait ~30s for Cloudflare to redeploy, then hard-refresh (Cmd-Shift-R). Check **Cloudflare Pages → Deployments** for the build log.

**An image disappeared** — public-domain image URLs occasionally rotate. The site falls back to a `[ plate not found ]` placeholder. Swap the URL in the admin.

**I want to reset the admin connection** — sidebar → "Reset connection". Re-paste your token.

---

## Notes

- The admin commit message is always `Edit content via /admin`. If you want a custom message, edit by hand.
- The token sits in `localStorage`. It can read and write `content.json`. It cannot delete your repo or do anything else if you scoped it correctly (Contents: Read/write only). Revoke any time at <https://github.com/settings/tokens>.
- Italics policy: reserved for actual titles of works (per the design). The admin doesn't enforce this — just a convention.
