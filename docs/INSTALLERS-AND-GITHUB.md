# Installers and GitHub, step by step

This guide is for someone new to GitHub. It shows every click. You do these once, then releasing a new version takes about five minutes of your time.

Words used here:

- **Repository (repo):** the project folder on GitHub, with its full history.
- **Commit:** a saved snapshot of your files, with a short message.
- **Push:** send your commits from your computer to GitHub.
- **Tag:** a name such as `v3.1.0` stuck on one commit. SungFluence uses tags to say "build installers from this commit".
- **GitHub Actions:** computers that GitHub lends you. They build the Windows, Mac and Linux installers for you, so you do not need a Mac or a Linux machine.

---

## Part 1. Put the code on GitHub

Your repository is `https://github.com/datakeen/Sungfluence`.

> If Claude already pushed the code for you, open that address in your browser. If you see the files and this README, skip to Part 2.

### 1.1 Install the tools (once)

1. Install **Git for Windows** from <https://git-scm.com/download/win>. Click through the installer with the default choices. It includes **Git Credential Manager**, which signs you in to GitHub in your browser.
2. Install **Node.js LTS** from <https://nodejs.org>. Click the big **LTS** button, run the file, and accept the defaults.

### 1.2 Open a terminal in the project folder

1. Open **File Explorer** and go to the folder that holds the SungFluence code (the folder with `package.json` in it).
2. Click in the address bar at the top, type `cmd`, and press **Enter**. A black window opens in that folder.

### 1.3 Tell Git who you are (once)

Type each line and press Enter:

```bash
git config --global user.name "datakeen"
```

```bash
git config --global user.email "you@example.com"
```

Use the email of your GitHub account.

### 1.4 Make the first commit (skip if Claude did it)

```bash
git init -b main
```

```bash
git add .
```

```bash
git commit -m "SungFluence 3.1.0"
```

### 1.5 Connect to GitHub and push

```bash
git remote add origin https://github.com/datakeen/Sungfluence.git
```

```bash
git push -u origin main
```

The first time, a window asks you to sign in to GitHub:

1. Click **Sign in with your browser**.
2. Your browser opens GitHub. Sign in if asked.
3. Click **Authorize git-ecosystem** (this is Git Credential Manager).
4. Go back to the black window. It finishes the upload.

Open <https://github.com/datakeen/Sungfluence> and press **F5**. You see your files.

### 1.6 Later changes

Each time you change something:

```bash
git add .
```

```bash
git commit -m "Say what changed, for example: smoother crop handles"
```

```bash
git push
```

**Tip:** if you prefer buttons to typing, install **GitHub Desktop** from <https://desktop.github.com>. Click **File → Add local repository**, choose the SungFluence code folder, write a message at the bottom left, click **Commit to main**, then click **Push origin** at the top.

---

## Part 2. Let GitHub build the installers

The file `.github/workflows/release.yml` already tells GitHub how to build installers for Windows, macOS and Linux.

### 2.1 Allow the workflow to make releases (once)

1. Open <https://github.com/datakeen/Sungfluence>.
2. Click **Settings** (the gear tab at the top right of the repository, not your account settings).
3. In the left column, click **Actions**, then **General**.
4. Under **Actions permissions**, choose **Allow all actions and reusable workflows**.
5. Scroll to **Workflow permissions**. Choose **Read and write permissions**.
6. Click **Save**.

Public repositories, like SungFluence, can use GitHub Actions for free. (Private repositories get a monthly allowance instead; one full build uses roughly 30 to 40 minutes of it, because macOS minutes count ten times.) You can see your usage under your profile picture → **Settings** → **Billing and plans**.

### 2.2 Option A: build without a release (good for testing)

1. Open the repository and click the **Actions** tab.
2. In the left column, click **Build installers**.
3. On the right, click the **Run workflow** button, keep **Branch: main**, and click the green **Run workflow**.
4. Wait. A yellow dot means it is working, a green check means done (about 10 to 15 minutes). Click the run to watch it.
5. When it is green, scroll down on the run page to **Artifacts**. Click `sungfluence-windows-latest`, `sungfluence-macos-latest` or `sungfluence-ubuntu-latest` to download a .zip with the installers inside.

### 2.3 Option B: make a real release with a tag

1. Change `"version"` in `package.json` if needed, for example `"version": "3.1.0"`.
2. In the black window:

```bash
npm run build
```

```bash
git add .
```

```bash
git commit -m "Release 3.1.0"
```

```bash
git push
```

```bash
git tag v3.1.0
```

```bash
git push origin v3.1.0
```

3. Open the **Actions** tab. A run named after the tag starts by itself.
4. When all three jobs are green, click the **Releases** link on the right side of the repository's main page (or open `https://github.com/datakeen/Sungfluence/releases`).
5. You see a **Draft** release holding all the installers. Click the pencil (**Edit**), write a few lines about what is new, and click **Publish release**.

The version in the tag (`v3.1.0`) should match `"version"` in `package.json`. For the next release, raise both, for example to `3.1.1` and `v3.1.1`.

**Note for a private repository:** only people you invite can see the release. To share the installers with everyone, either make the repository public (**Settings → General → Danger Zone → Change visibility**), or download the files and share them another way.

---

## Part 3. Build installers on your own computer

GitHub is the easy way. You can also build locally. Each system builds its own installers best: Windows on Windows, Mac on a Mac, Linux on Linux.

### Windows (on your PC)

In the black window, in the project folder:

```bash
npm install
```

```bash
npm run dist:win
```

After a few minutes the folder `dist` holds:

- `SungFluence-Setup-3.1.0-x64.exe` and `-arm64.exe`: installers. Double-click to install.
- `SungFluence-Portable-3.1.0.exe`: runs without installing.

Windows shows "Windows protected your PC" for unsigned apps. Click **More info → Run anyway**.

### macOS (on a Mac)

1. Install Node.js LTS from <https://nodejs.org> and Git (macOS asks to install the command line tools the first time you type `git`).
2. Open **Terminal** (press **Cmd + Space**, type `Terminal`, press **Return**).
3. Run:

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
npm run dist:mac
```

The `dist` folder holds a `.dmg` and a `.zip`. They are unsigned, so the first time you open the app, right-click it and choose **Open**.

### Linux (Ubuntu, Debian and others)

```bash
sudo apt install git nodejs npm
```

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
npm run dist:linux
```

The `dist` folder holds an `.AppImage`, a `.deb` and a `.tar.gz`. For the AppImage, run `chmod +x SungFluence-*.AppImage`, then double-click it.

---

## Part 4. The web version (optional)

The workflow `.github/workflows/web.yml` publishes the app as a website with GitHub Pages on every push to `main`.

1. Open the repository → **Settings** → **Pages** (left column).
2. Under **Build and deployment → Source**, choose **GitHub Actions**.
3. Push any change to `main`. After a minute or two, the address appears at the top of the Pages screen.

GitHub Pages for a private repository needs a paid GitHub plan. On the free plan, make the repository public first, or skip this part.

---

## When something goes wrong

- **`git push` says "rejected" or "fetch first":** someone (or the GitHub website) changed the repository. Run `git pull --rebase`, then `git push` again.
- **The sign-in window does not appear:** run `git credential-manager configure`, then push again.
- **A build job is red:** click the red job, then the red step, and read the last lines. Most often `npm ci` failed because `package-lock.json` was not committed. Run `npm install`, commit `package-lock.json`, and push.
- **No release appears:** check that you pushed the tag (`git push origin v3.1.0`) and that step 2.1 gave the workflow **Read and write permissions**.
- **`npm run dist:win` fails with "Cannot create symbolic link: A required privilege is not held by the client":** electron-builder unpacks a tool archive that contains Mac links, and Windows only allows links in Developer Mode. Turn it on once: **Start → Settings → System → For developers → Developer Mode → On**, then run `npm run dist:win` again. (Running the black window as administrator also works.)
- **The tests cannot start a browser:** run `npx playwright install chromium`. On some Windows computers that browser is blocked; the tests then use the Chrome or Edge you already have.
