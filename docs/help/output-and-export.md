# Output and export

## Output panel

- **Paper color (background)**: the color behind the letters. On the T-shirt preview this section is called **T-shirt color (background)** and shows shirt colors. **Transparent background** leaves the color out of the file, for T-shirts, stickers and overlays. Keep the color close to what you will print on anyway, because the letters are chosen to show on it. JPG cannot be transparent, so a JPG gets this color behind the letters.
- **Output color**: RGB for screens; CMYK pulls colors into what printing ink can show; 16 colors for terminals; Gray; B/W for stamps, stencils and vinyl.
- **Margin**: space around the artwork.
- **Artboard width**: the size in pixels that exports use. The height follows the photo or the crop. Letter sizes are measured in artboard pixels.
- **Show on**: preview the art on the artboard, on paper, or on a T-shirt. The Paper and T-shirt previews zoom with Ctrl and the wheel or the zoom buttons, move when you drag, and work with **Compare**. Drawing tools work on the Artboard view.
- **Photo strength in Mix view**: how strong the photo is behind the letters in Mix.
- **Print**: the print size (ISO A and B, US paper, photo prints, posters, clothes, or a custom size), portrait or landscape, an angle for the art, the page margin and the dpi. See [Printing](printing.md) for which dpi to use.
- **Gentle on this computer**: works in smaller steps with longer pauses, for slow or busy computers.

## Export window

Click **Export** at the top right, press Ctrl E, or choose a format from the **Export** menu. The window lists every format on the left. Pick one to see its options on the right, with a line that tells you the size of the result. Click **Export** to save the file. The window remembers your last format and its options.

Some formats let you choose the **layers to include**: Photo, Vector and Text art. Formats under Text art, Text twins and Code need text art, so apply a style first.

### Picture

| Format | What you get |
| --- | --- |
| PNG of the visible layers | The chosen layers, in their order, at artboard size. |
| JPG of the visible layers | A smaller file for sharing. JPG has no transparency, so the background gets the paper color. |
| SVG of the visible layers | The photo as a picture, vector shapes, and the text art as live letters. |
| Photo and vector, PNG | The photo with shapes and lines, without text art. |
| Vector layer, SVG or PNG | Only the Vector layer. The PNG has a transparent background. |
| Photo layer, edited | The photo with its adjustments, crop and objects, transparent where you removed areas. |

### Text art

| Format | What you get |
| --- | --- |
| PNG for print | The size and dpi chosen under Print in the Output panel. |
| PNG at artboard size | The artboard width in pixels. |
| SVG with live text | Letters that stay editable in Illustrator, Inkscape or Figma. |
| PDF for print | A page of the chosen print size with the artwork on it. |
| CMYK PDF, vector | Live letters with CMYK ink values, for print shops. |
| CMYK plates | Four separations (cyan, magenta, yellow, black) as PNG files in a zip, for screen printing. |

### Text twins

Any style can also come out as text that you can paste into a chat, a code file or a terminal.

| Format | What you get |
| --- | --- |
| Plain text | Characters only, in a .txt file. |
| Markdown | The text inside a code block, for README files and chats. |
| HTML page | A web page with the characters in their colors. |
| Terminal colors | Colored text for a terminal, in 16 colors, 256 colors or full color. Show it with `cat`. |
| SVG for README files | Rows of text in a small SVG. GitHub and GitLab show it as a picture, and it needs no fonts or scripts. |
| Grid text, exact | The exact characters of an ASCII or Braille layer. |
| Color terminal text, exact | An ASCII layer with 16-color codes, letter for letter. |

Options for text:

- **Width in characters**: 40, 60, 80, 100, 120 or 160. 80 fits a classic terminal.
- **Characters**: keyboard characters from light to dark, shade blocks, Braille dots, the letters A to Z in order, digits, ASCII letters only, ASCII symbols only, or your own characters. SungFluence measures the ink in each character and sorts them, so you can type them in any order. With A to Z you can type your own text to repeat instead.
- **Cell shape**: how much taller a character is than it is wide in the font where the text will be read. Terminals and code editors are about 2 to 1; Notepad and most text boxes about 1.8 to 1. The right shape keeps circles round.
- **Spaces for white areas**: leaves the paper as spaces. Turn it off to fill every cell.
- **Swap ink and paper**: for dark backgrounds.

### Code

| Format | What you get |
| --- | --- |
| Code | The text art as a string or a comment block in JavaScript, TypeScript, Python, C, C++, C#, Java, Go, Rust, Shell, PowerShell, Ruby, PHP, Lua, SQL or HTML. A string comes with a few lines that print it. |
| --help header | A shell script whose `--help` starts with the art, followed by a usage text to fill in. |
| Login message | A `motd` file. On Linux, copy it to `/etc/motd` and people see it when they sign in. Plain or with terminal colors. |

### Keep the style settings inside the file

PNG and SVG formats offer **Keep the style settings inside the file**. It is off unless you turn it on. When it is on, the file also stores the look: the styles, their text, colors, paper and photo adjustments. It never stores the photo itself.

Open such a file in SungFluence (Open, or drag it onto the canvas) and the look is applied to the photo you have open. To open the file as a normal picture instead, click **Open as a picture** in the message that appears.

### Project

**Save project** (Ctrl S) keeps everything in one `.sungfluence` file: the photo, its crop and removed areas, lines, objects, layers and every setting. In the Export window you can choose which layers the project keeps. Open it again with **Open project** or the **Open** button.

A `.sungfluence` file is a zip. Inside are `project.json` with the settings, the photo, any placed images and a small preview. Projects saved as `.json` by older versions still open. SungFluence also saves your work on its own and offers to restore it next time.

## Sizes and quality

Exports are always drawn at full size, even when the preview is set to Fast. For a print, choose the print size and dpi first; the Export window shows the pixel size it will use. Large prints take longer; a progress bar shows how far it is, and **Cancel** stops it.
