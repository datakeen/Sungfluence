# Open-source credits

SungFluence is free software under the [GNU AGPL, version 3 or later](LICENSE). It stands on the work of many people who shared their code and their typefaces. Thank you all. This page lists what SungFluence includes, who made it, and the license it comes under. Each row links the full text of its license. In the app's credits window the texts follow this page. In the source code they are in the [licenses folder](https://github.com/datakeen/Sungfluence/tree/main/licenses), with the same list as data in [licenses/third-party.json](licenses/third-party.json).

Every copy of SungFluence carries this page and the license texts: the installers, the web app, the website and the source code. In the app, open **Help → Open-source credits**, or **About SungFluence → Open-source credits**.

## Libraries in the app

| Project | What it does in SungFluence | License | Copyright | Full text |
| --- | --- | --- | --- | --- |
| [jsPDF](https://github.com/parallax/jsPDF) 2.5.1 | PDF export | MIT | (c) 2010-2021 James Hall; (c) 2015-2021 yWorks GmbH; and the authors listed in the notices file | [MIT-jsPDF.txt](licenses/MIT-jsPDF.txt), [jsPDF-bundled-notices.txt](licenses/jsPDF-bundled-notices.txt) |
| [fflate](https://github.com/101arrowz/fflate) 0.4, inside jsPDF | Compression in PDF files | MIT | (c) 2020 Arjun Barrett | [MIT-fflate.txt](licenses/MIT-fflate.txt) |
| JPEG encoder by Adobe, inside jsPDF | JPEG pictures in PDF files | BSD-3-Clause | (c) 2008 Adobe Systems Incorporated | [jsPDF-bundled-notices.txt](licenses/jsPDF-bundled-notices.txt) |
| [omggif](https://github.com/deanm/omggif), inside jsPDF | GIF reading | MIT | (c) 2013 Dean McNamee | [jsPDF-bundled-notices.txt](licenses/jsPDF-bundled-notices.txt) |
| Other code inside jsPDF | WebP parser, plugins, Unicode Bidi, MD5, color parser | MIT and permissive | Dominik Homberger, Steven Spungin (TwelveTone LLC), Aras Abbasi, Youssef Beddad, James Robb, Antti Palola, Eduardo Menezes de Morais, Jussi Utunen, Owen Leong, Alex Shensis, Joseph Myers, Stoyan Stefanov, FPDF | [jsPDF-bundled-notices.txt](licenses/jsPDF-bundled-notices.txt) |
| [Babel](https://babeljs.io) helper functions, inside jsPDF | Small helpers, such as a type check, that the Babel compiler wrote into the jsPDF build | MIT | (c) 2014-present Sebastian McKenzie and other contributors | [MIT-Babel.txt](licenses/MIT-Babel.txt) |
| [JSZip](https://github.com/Stuk/jszip) 3.10.1 | ZIP export | MIT (chosen from MIT or GPLv3) | (c) 2009-2016 Stuart Knightley, David Duponchel, Franz Buchinger, António Afonso | [MIT-JSZip.txt](licenses/MIT-JSZip.txt) |
| [pako](https://github.com/nodeca/pako) 1.0, inside JSZip | Compression in ZIP files | MIT and Zlib | (C) 2014-2017 Vitaly Puzrin and Andrei Tuputcyn; zlib (C) 1995-2013 Jean-loup Gailly and Mark Adler | [MIT-and-Zlib-pako.txt](licenses/MIT-and-Zlib-pako.txt) |
| [lie](https://github.com/calvinmetcalf/lie) 3.3.0, inside JSZip | Promises | MIT | (c) 2014-2018 Calvin Metcalf, Jordan Harband | [MIT-lie.txt](licenses/MIT-lie.txt) |
| [immediate](https://github.com/calvinmetcalf/immediate) 3.0.6, inside JSZip | Scheduling | MIT | (c) 2012 Barnesandnoble.com, llc, Donavon West, Domenic Denicola, Brian Cavalier | [MIT-immediate.txt](licenses/MIT-immediate.txt) |
| [setImmediate.js](https://github.com/YuzuJS/setImmediate) 1.0.5, inside JSZip | Scheduling | MIT | (c) 2012 Barnesandnoble.com, llc, Donavon West, and Domenic Denicola | [MIT-setimmediate.txt](licenses/MIT-setimmediate.txt) |

## Typefaces

The font files come from [Fontsource](https://fontsource.org), which cuts each family into smaller parts by script. SungFluence ships those files unchanged. The SIL Open Font License lets anyone use, share and bundle these fonts, but not sell them on their own.

| Typeface | Used for | License | Copyright | Full text |
| --- | --- | --- | --- | --- |
| [Inter](https://github.com/rsms/inter) | The app's interface and the website | SIL Open Font License 1.1 | Copyright 2016 The Inter Project Authors | [OFL-1.1-Inter.txt](licenses/OFL-1.1-Inter.txt) |
| [JetBrains Mono](https://github.com/JetBrains/JetBrainsMono) | Monospace text art and the website | SIL Open Font License 1.1 | Copyright 2020 The JetBrains Mono Project Authors | [OFL-1.1-JetBrainsMono.txt](licenses/OFL-1.1-JetBrainsMono.txt) |
| [Oswald](https://github.com/googlefonts/OswaldFont) | Condensed text art and the website | SIL Open Font License 1.1 | Copyright 2016 The Oswald Project Authors | [OFL-1.1-Oswald.txt](licenses/OFL-1.1-Oswald.txt) |
| [Playfair Display](https://github.com/clauseggers/Playfair-Display) | Serif text art and the website headings | SIL Open Font License 1.1, Reserved Font Name "Playfair Display" | Copyright 2017 The Playfair Display Project Authors | [OFL-1.1-PlayfairDisplay.txt](licenses/OFL-1.1-PlayfairDisplay.txt) |
| [Noto Naskh Arabic](https://github.com/notofonts/arabic) | Arabic text art | SIL Open Font License 1.1 | Copyright 2022 The Noto Project Authors | [OFL-1.1-NotoNaskhArabic.txt](licenses/OFL-1.1-NotoNaskhArabic.txt) |
| [Noto Nastaliq Urdu](https://github.com/notofonts/nastaliq) | Urdu text art | SIL Open Font License 1.1 | Copyright 2022 The Noto Project Authors | [OFL-1.1-NotoNastaliqUrdu.txt](licenses/OFL-1.1-NotoNastaliqUrdu.txt) |
| [Special Elite](https://fonts.google.com/specimen/Special+Elite) by Astigmatic | Typewriter text art | Apache License 2.0 | Copyright (c) 2010 by Brian J. Bonislawsky DBA Astigmatic (AOETI) | [Apache-2.0-SpecialElite.txt](licenses/Apache-2.0-SpecialElite.txt) |

PDF exports embed fixed-weight copies of Inter, Oswald, Playfair Display, JetBrains Mono and Special Elite, so the letters in a PDF are the same as on screen and stay sharp at any zoom. They come from the Fontsource packages `@fontsource/inter`, `@fontsource/oswald`, `@fontsource/playfair-display`, `@fontsource/jetbrains-mono` and `@fontsource/special-elite`, under the same licenses as above. The app turns them into TrueType when it writes a PDF.

The single-file version (`sungfluence.html`) does not include the fonts or the two libraries. It loads them while it runs, the fonts from Google Fonts and the libraries from cdnjs, under the same licenses.

## The desktop app and its installers

| Project | What it does | License | Copyright | Full text |
| --- | --- | --- | --- | --- |
| [Electron](https://www.electronjs.org) 33.2.1 | The desktop window | MIT | (c) Electron contributors; (c) 2013-2020 GitHub Inc. | [MIT-Electron.txt](licenses/MIT-Electron.txt) |
| Chromium, V8, FFmpeg and the other parts of Electron | The engine inside Electron | BSD-3-Clause, LGPL 2.1 (FFmpeg) and many others | The Chromium Authors and others | `LICENSES.chromium.html`, installed with the app (see below) |
| [electron-builder](https://www.electron.build) 25.1.8 | Makes the installers; its scripts run inside them | MIT | (c) 2015 Loopline Systems | [MIT-electron-builder.txt](licenses/MIT-electron-builder.txt) |
| [NSIS](https://nsis.sourceforge.io) 3.0.4.1 | The Windows Setup and Portable files | zlib/libpng, with CPL 1.0 and bzip2 parts | (C) 1999-2018 Contributors | [NSIS-COPYING.txt](licenses/NSIS-COPYING.txt) |
| elevate.exe and the NSIS plug-ins Nsis7z, StdUtils, UAC, WinShell, nsProcess and SpiderBanner | Small helpers while installing or removing | LGPL 2.1 (Nsis7z, StdUtils) and others | Johannes Passing; Igor Pavlov and others; LoRd_MuldeR | [installer-tools.txt](licenses/installer-tools.txt), [LGPL-2.1.txt](licenses/LGPL-2.1.txt) |
| [AppImage runtime](https://github.com/AppImage/AppImageKit), with libfuse and squashfuse | Starts the app from the Linux AppImage file | MIT, LGPL 2.1 (libfuse) and BSD 2-Clause (squashfuse) | Simon Peter and the AppImageKit contributors; Miklos Szeredi and others; Dave Vasilevsky | [appimage-runtime.txt](licenses/appimage-runtime.txt), [LGPL-2.1.txt](licenses/LGPL-2.1.txt) |

The notices of Chromium and the projects inside it are in `LICENSES.chromium.html`. On Windows and Linux it is in the folder where SungFluence is installed, next to `LICENSE.electron.txt`. On macOS both files are in `SungFluence.app/Contents/Resources`. Nsis7z, StdUtils and libfuse ship unchanged under the LGPL 2.1; their source code is at the addresses in [installer-tools.txt](licenses/installer-tools.txt) and [appimage-runtime.txt](licenses/appimage-runtime.txt). FFmpeg is used as a shared library under the LGPL; its source is available from [ffmpeg.org](https://ffmpeg.org) and from the Electron project.

## SungFluence's own plugins

The built-in Confetti and Contours plugins and the plugin template are under the MIT License, not the AGPL, so plugin authors can borrow from them and pick their own license: [MIT-SungFluence-plugins.txt](licenses/MIT-SungFluence-plugins.txt). Copyright (C) 2026 Ahmed Bilal.

## Ideas, data and pictures

- **One-line arts and faces.** Some one-line arts and faces in the Type toolbox are well-known internet kaomoji, such as `¯\_(ツ)_/¯` and `(╯°□°）╯︵ ┻━┻`. They are also collected in the [ART library](https://github.com/sepandhaghighi/art) by Sepand Haghighi (MIT), which inspired the Type toolbox. Thank you.
- **ASCII ramps.** The Classic and Detailed character ramps follow [Paul Bourke's](https://paulbourke.net/dataformats/asciiart/) page "Character representation of grey scale images" (1997).
- **OKLab.** Fit colors to the paper works in [OKLab](https://bottosson.github.io/posts/oklab/), the color space published by Björn Ottosson.
- **Standards.** The fancy letters, symbols and marks come from Unicode. Color contrast follows the W3C's WCAG formulas, and HTML entity names come from the HTML standard.
- **Sample pictures.** The cat, coffee, camera, rocket, animals, swirl and face samples were made with AI image tools by the author for this project. The "lines" sample and the test images were drawn for this project.

## Tools used to build and test

These do not ship with SungFluence, but it could not be made without them: [Node.js](https://nodejs.org) (MIT), [Fontsource](https://fontsource.org) (MIT), [Playwright](https://playwright.dev) (Apache 2.0, Microsoft) for the tests, [http-server](https://github.com/http-party/http-server) (MIT) for `npm run web`, and [GitHub Actions](https://github.com/actions) (MIT) for the installers and the website.

## Adding something new

Anything from someone else that goes into SungFluence, such as a library, a font, an icon set or a table of data, needs three things in the same change: an entry in `licenses/third-party.json`, its license text in `licenses/`, and a line on this page. `tests/notices.test.js` checks this.
