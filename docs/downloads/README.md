# Download SungFluence

SungFluence turns pictures into art made of letters: word portraits, calligrams poured into a shape, spirals of text, ASCII and Braille art, typewriter drawings and more. It supports right-to-left languages such as Urdu and Arabic, with their letters properly joined. Free and open source, and everything runs on your own computer: photos are never uploaded.

Don't want to install anything? **[Use it in your browser](https://datakeen.github.io/Sungfluence/)**.

## Which file do I need?

In the file names below, `x.y.z` is the version number, for example `3.2.0`.

| Your computer | Download | Notes |
| --- | --- | --- |
| **Windows 10 or 11** (most PCs) | `SungFluence-Setup-x.y.z-x64.exe` | The usual choice. Run it and follow the steps. |
| Windows on ARM (for example Snapdragon laptops) | `SungFluence-Setup-x.y.z-arm64.exe` | |
| Windows, without installing | `SungFluence-Portable-x.y.z.exe` | Runs from any folder or a USB stick. |
| **macOS 11 or newer** (Intel or Apple silicon) | `SungFluence-x.y.z-mac-universal.dmg` | Open it and drag SungFluence to Applications. |
| **Linux**, any distribution | `SungFluence-x.y.z-linux-x86_64.AppImage` | Make it executable (`chmod +x`), then run it. |
| Ubuntu, Debian and similar | `SungFluence-x.y.z-linux-amd64.deb` | `sudo apt install ./SungFluence-x.y.z-linux-amd64.deb` |
| Linux, by hand | `SungFluence-x.y.z-linux-x64.tar.gz` | Unpack and run `sungfluence`. |

Releases up to 3.3.0 also list a combined Windows installer and files ending in `.yml`, `.blockmap` or `.zip`. You do not need them; newer releases leave them out.

## The first start

The installers are not code-signed yet, so your system may warn you once:

- **Windows:** "Windows protected your PC". Click **More info**, then **Run anyway**.
- **macOS:** right-click SungFluence in Applications, choose **Open**, then **Open** again. If macOS says the app is damaged, run `xattr -cr /Applications/SungFluence.app` in Terminal.
- **Linux AppImage:** run `chmod +x SungFluence-*.AppImage` first.

## Getting started

Open SungFluence and press **F1**: the Help window has a five-minute tutorial and a reference for every panel and style. It works offline.

## More

- What changed in each version: [changelog](https://github.com/datakeen/Sungfluence/blob/main/CHANGELOG.md)
- Source code and every release: [github.com/datakeen/Sungfluence](https://github.com/datakeen/Sungfluence)
- Found a bug, or have an idea? [Open an issue](https://github.com/datakeen/Sungfluence/issues)

SungFluence is free and open source software under the [GNU Affero General Public License, version 3 or later](https://www.gnu.org/licenses/agpl-3.0.html).
