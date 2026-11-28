# Output and export

## Output panel

The Output panel runs from the size of the artwork to how it is shown.

1. **Artboard**: the **Width** in pixels that exports use, as a preset or an **Exact width**, and the **Margin** around the artwork. The height follows the photo or the crop; the note under the margin shows it. Letter sizes are measured in artboard pixels. The sizes a style or a recipe starts with grow and shrink with the width, so the art keeps its look; a size you set by hand stays as it is.
2. **Background**: the paper color behind the letters. On the T-shirt preview it is the T-shirt color and shows shirt colors. **+ Custom** picks any color. The checkered swatch, **Transparent**, leaves the color out of the file, for T-shirts, stickers and overlays. The artboard then shows a checkerboard. The clear area stays clear in PNG, SVG and PDF; JPG gets the paper color, which keeps a thin gray ring. **Show transparency as**, right under the swatches while Transparent is on, shows the clear area as a **Checkerboard**, plain **Black** or plain **White** on screen only; files stay clear. Keep the color close to what you will print on anyway, because the letters are chosen to show on it. The same block is in the Text art panel.
   **Printed on**: SungFluence assumes the picture is printed on light paper. **Auto** reads the paper or T-shirt color and says whether it is light, gray or dark; **Light**, **Gray** and **Dark** set it by hand, for example for a transparent print on a dark shirt. The letter colors are fitted to it (see **Fit colors to the paper** in [Text art](text-art.md)). The note under the picture shows the choice, and a click on it opens this section.
3. **Output color**: RGB for screens; CMYK pulls colors into what printing ink can show; 16 colors for terminals; Gray; B/W for stamps, stencils and vinyl.
4. **Print**: the print size (ISO A and B, US paper, photo prints, posters, clothes, or a custom size), portrait or landscape, an angle for the art, the page margin and the dpi. See [Printing](printing.md) for which dpi to use.
5. **Show on**: preview the art on the artboard, on paper, or on a T-shirt. Only the screen changes. The Paper and T-shirt previews zoom with Ctrl and the wheel or the zoom buttons, move when you drag, and work with **Compare**. Drawing tools work on the Artboard view.

How strongly the photo shows in Mix view is set on the **Mix** button at the top: click **Mix** again while it is on. **Gentle on this computer** is in Settings (the gear).

## Export window

Click **Export** at the top right, press Ctrl E, or choose a format from the **Export** menu. The window lists every format on the left. Pick one to see its options on the right, with a line that tells you the size of the result. Click **Export** to save the file. The window remembers your last format and its options.

**Most used** sits at the top of the list: **PNG at artboard size**, **PNG for print**, **PDF for print** and **SVG with live text**. Below them the other formats follow in their groups. Each format has a short hint under its name, so you can tell them apart. While more formats wait below, the bottom of the list fades and shows **More formats**; click it or scroll to see them.

Some formats let you choose the **layers to include**: Photo, Vector and Text art. Formats under Text art, Text twins, Code and Office need text art, so apply a style first.

### Picture

| Format | What you get |
| --- | --- |
| PNG of the visible layers | The chosen layers, in their order, at artboard size. |
| JPG of the visible layers | A smaller file for sharing. JPG has no transparency, so the background gets the paper color. |
| SVG of the visible layers | The photo as a picture, vector shapes, and the text art as live letters. |
| PNG of the photo and vector | The photo with shapes and lines, without text art. |
| SVG or PNG of the vector layer | Only the Vector layer: shapes, and lines with a stroke or fill. Plain lines only guide text and stay out. The PNG has a transparent background. When the layer has nothing to draw, Export is dimmed and the window says why. |
| PNG of the edited photo | The photo with its adjustments, crop and objects, transparent where you removed areas. The file ends in -photo.png, or -cutout.png when part of the photo was removed. |

### Text art

In the window, PNG at artboard size, PNG for print, PDF for print and SVG with live text are listed under **Most used**.

| Format | What you get |
| --- | --- |
| PNG for print | The size and dpi chosen under Print in the Output panel. The dpi is saved in the file, so photo editors and print shops see the print size. |
| PNG at artboard size | The artboard width in pixels. |
| SVG with live text | Letters that stay editable in Illustrator, Inkscape or Figma. |
| PDF for print | A page of the chosen print size with the artwork on it, with live letters in SungFluence's own fonts: they stay sharp at any zoom, and the text can be selected. A turned artwork stays turned. Letters filled with the photo, and Urdu or Arabic letters, go in as a picture at the chosen dpi. **As a picture** puts the whole artwork in as a picture at that dpi, exactly as on screen. With a transparent background the page still gets the paper color, so it looks as on screen; **Leave the background clear** leaves it out, and PDF viewers then show the art on white. The same holds for CMYK PDF, which also prints dark tones as a rich black. |
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
| Login message | A file named `motd`, with no extension. On Linux, copy it to `/etc/motd` and people see it when they sign in. Plain text, or with 16 or 256 terminal colors. |

### Office

| Format | What you get |
| --- | --- |
| Word document | A `.docx` holding the art as real text in Consolas, one paragraph per row, at the letter size that fills the page. Choose A4 or Letter, portrait or landscape, and whether to keep the colors. The letters can still be edited, searched and recolored in Word. |
| Excel picture in cells | An `.xlsx` where every character is one colored cell, with the cells made square. The sheet itself is the picture. Fewer colors make a smaller file. |
| Excel letters in color | An `.xlsx` holding the characters themselves, each one colored and nothing filled. Shrink the view and the sheet is the picture; zoom in and it is still text you can read, search and edit. The letters take the colors of the picture, grey by tone, or one ink of your choice from the paper color to full strength. |
| Excel color by number | A hidden picture to fill in: every cell holds a number from 1 to the number of shades you chose, with a thin border to color inside, and the second sheet is the key saying which color each number is. |

These files are written by SungFluence itself, with no help from Word or Excel, and open in Word, Excel, LibreOffice and Google Docs or Sheets. They start from the same grid as the text twins, so **Width in characters**, **Characters** and **Cell shape** change what lands in them. For the Excel pictures, choose a square cell shape (1 : 1) so the picture is not stretched. If the tones come out the wrong way round for the paper you are using, tick **Swap ink and paper**.

### Keep the style settings inside the file

PNG and SVG formats offer **Keep the style settings inside the file**. It is off unless you turn it on. When it is on, the file also stores the look: the styles, their text, colors, paper and photo adjustments. It never stores the photo itself.

Open such a file in SungFluence (Open, or drag it onto the canvas) and the look is applied to the photo you have open. To open the file as a normal picture instead, click **Open as a picture** in the message that appears.

### Project

**Save project** (Ctrl S) keeps everything in one `.sungfluence` file: the photo, its crop and removed areas, lines, objects, layers and every setting. In the Export window you can choose which layers the project keeps. Open it again with **Open project** or the **Open** button.

A `.sungfluence` file is a zip. Inside are `project.json` with the settings, the photo, any placed images and a small preview. Projects saved as `.json` by older versions still open. SungFluence also saves your work on its own and offers to restore it next time.

## Sizes and quality

Exports are always drawn at full size, even when the preview is set to Fast. For a print, choose the print size and dpi first; the Export window shows the pixel size it will use. Large prints take longer; a progress bar shows how far it is, and **Cancel** stops it.
