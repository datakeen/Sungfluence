# Releasing a new version

A checklist for maintainers, so every release is complete. Version numbers follow [Semantic Versioning](https://semver.org/): a bug fix raises the last number (3.1.1), a new feature the middle one (3.2.0), and a change that can break old projects or plugins the first one (4.0.0).

## 1. Prepare

1. Pull the latest code: `git pull`.
2. In `CHANGELOG.md`, rename **Unreleased** to the new version and today's date, for example `## [3.2.0] - 2026-12-01`. Add a fresh, empty **Unreleased** section above it, and update the compare links at the bottom.
3. In `package.json`, set `"version"` to the same number.
4. If the app looks different, retake the tutorial pictures: `npm run build`, then `npm run help:shots`.
5. Check that the help pages still match the app (`docs/help`). The style reference and shortcuts are written from the code on every build, so they are always current.

## 2. Check

```bash
npm run build
```

```bash
npm test
```

```bash
npm run test:smoke
```

Look at the screenshots in `tests/out/`. Open the app (`npm start`) and try the new features once by hand.

## 3. Publish

```bash
git add .
```

```bash
git commit -m "Release 3.2.0"
```

```bash
git push
```

```bash
git tag -a v3.2.0 -m "SungFluence 3.2.0"
```

```bash
git push origin v3.2.0
```

GitHub builds the installers for Windows, macOS and Linux (about 15 minutes) and makes a **draft** release. More about the build: [BUILDING.md](BUILDING.md).

## 4. Announce

1. Open the draft release on GitHub. Paste the version's part of `CHANGELOG.md` as the description. Download one installer and try it.
2. Click **Publish release**.
3. On SourceForge, upload the installers (or let it mirror the GitHub release). Upload `docs/downloads/README.md` into the same folder: SourceForge shows it under the file list. Update the summary if needed.
