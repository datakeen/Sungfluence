# Building SungFluence

How to run SungFluence from source and build its installers, on your own computer or with GitHub Actions in your own copy (fork) of the repository.

## Run from source

You need [Node.js](https://nodejs.org) 26, the version the builds use (24 also works), and [Git](https://git-scm.com).

```bash
git clone https://github.com/datakeen/Sungfluence.git
```

```bash
cd Sungfluence
```

```bash
npm install
```

```bash
npm start
```

`npm start` builds `src/` from `app/` and opens the desktop app. `npm run web` serves the web version at http://localhost:8080, and a double-click on `src/index.html` opens it in a browser.

Edit the files in `app/`, never in `src/`, then run `npm run build`.

## Build installers on your computer

Each system builds its own installers best: Windows on Windows, macOS on a Mac, Linux on Linux.

| System | Command | Files in `dist/` |
| --- | --- | --- |
| Windows | `npm run dist:win` | Setup `.exe` (x64) and a portable `.exe`. For Windows on ARM, also run `npx electron-builder --win nsis --arm64`. |
| macOS | `npm run dist:mac` | `.dmg` (universal) |
| Linux | `npm run dist:linux` | `.AppImage`, `.deb` and `.tar.gz` |

On Linux, install the tools first, for example `sudo apt install git nodejs npm`.

The builds are not code-signed unless you add a certificate (see **Signing** in the README), so each system warns on first start:

- **Windows:** "Windows protected your PC". Click **More info**, then **Run anyway**.
- **macOS:** right-click the app, choose **Open**, then **Open** again.
- **Linux AppImage:** run `chmod +x SungFluence-*.AppImage`, then start it.

## Build installers with GitHub Actions

The workflow `.github/workflows/release.yml` builds all three systems on GitHub's computers, so you do not need a Mac or a Linux machine.

1. In your repository on GitHub, open **Settings → Actions → General**. Under **Workflow permissions**, choose **Read and write permissions** and save. The workflow needs this to create releases.
2. **To test a build:** open the **Actions** tab, click **Build installers**, then **Run workflow**. When it finishes, the installers are under **Artifacts** on the run's page.
3. **To make a release:** push a version tag.

```bash
git tag -a v3.2.0 -m "SungFluence 3.2.0"
```

```bash
git push origin v3.2.0
```

After about 15 minutes, a **draft** release with every installer appears under **Releases**. Edit it, add notes, and click **Publish release**. The tag should match `"version"` in `package.json`; `docs/RELEASING.md` has the full checklist.

Public repositories can use GitHub Actions for free. Private repositories get a monthly allowance; a full build uses roughly 30 to 40 minutes of it, because macOS minutes count ten times.

## Publish the web version

The workflow `.github/workflows/web.yml` publishes the website and the web app to GitHub Pages on every push to `main`. It runs `npm run build` (the app in `src/`), then `npm run site`, which writes `pages/`:

- the website from `site/` at the root, with `404.html` for any missing address,
- the web app, a copy of `src/`, under `try/`,
- a `sw.js` at the root that clears the offline copy of the old web app, which used to live at the root.

In your repository, open **Settings → Pages** and under **Build and deployment → Source** choose **GitHub Actions**. The next push, or **Actions → Web app → Run workflow**, publishes the website at `https://YOUR-NAME.github.io/REPOSITORY/` and the app at `https://YOUR-NAME.github.io/REPOSITORY/try/`. For another address, set `SITE_BASE` (the path, such as `/REPOSITORY/`) and `SITE_URL` (the full address) in the workflow.

To try the site on your computer: `npm run build`, then `node scripts/site.js --serve`, and open http://localhost:8090/Sungfluence/. The pictures on the website are drawn by the app itself: after a change to how a style looks, run `npm run site:images` and commit the new files in `site/img`. `npm run test:site` checks the site.

## When something goes wrong

- **A build job is red:** open it, click the red step and read the last lines. Most often `npm ci` failed because `package-lock.json` is missing or out of date; run `npm install`, commit `package-lock.json`, and push.
- **No release appears after a tag:** check that the tag reached GitHub (`git push origin vX.Y.Z`) and that the workflow has **Read and write permissions**.
- **`npm run dist:win` fails with "Cannot create symbolic link: A required privilege is not held by the client":** electron-builder unpacks an archive that contains links, which Windows allows only in Developer Mode. Turn it on once (**Settings → System → For developers → Developer Mode**), or run the command from an administrator terminal.
- **The tests cannot start a browser:** run `npx playwright install chromium`. Where that browser is blocked, the tests use the Chrome or Edge already installed.
