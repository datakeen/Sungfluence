# Output and export

## Output panel

- **Paper**: the background color. **Transparent background** leaves it out, for T-shirts, stickers and overlays; pick the paper color closest to the shirt anyway, so the letters are chosen to show on it.
- **Output color**: RGB for screens; CMYK pulls colors into what printing ink can show; 16 colors for terminals; Gray; B/W for stamps, stencils and vinyl.
- **Margin**: space around the artwork.
- **Artboard width**: the size in pixels that exports use. The height follows the photo or the crop. Letter sizes are measured in artboard pixels.
- **Show on**: preview the art on the artboard, on paper, or on a T-shirt in a color of your choice.
- **Photo strength in Mix view**: how strong the photo is behind the letters in Mix.
- **Print**: a print size (A4 to A1, Letter, posters, a T-shirt chest print) and 150 or 300 dpi. The PNG and PDF for print use them.
- **Gentle on this computer**: works in smaller steps with longer pauses, for slow or busy computers.

## Export menu

Click **Export** at the top right, or press Ctrl E.

### What you see

| Export | What you get |
| --- | --- |
| PNG of the visible layers | Every layer that is shown, in its order, at artboard size. |
| SVG of the visible layers | The photo as a picture, vector shapes, and the text art as live letters. |
| Photo and vector, PNG | The photo with shapes and lines, without text art. |
| Vector layer, SVG or PNG | Only the Vector layer. The PNG has a transparent background. |
| Photo layer, edited | The photo with its adjustments, crop and objects, transparent where you removed areas. |

### Text art

| Export | What you get |
| --- | --- |
| PNG for print | The size and dpi chosen under Print in the Output panel. |
| PNG at artboard size | The artboard width in pixels. |
| SVG with live text | Letters that stay editable in Illustrator, Inkscape or Figma. |
| PDF for print | A page of the chosen print size with the artwork on it. |
| CMYK PDF, vector | Live letters with CMYK ink values, for print shops. |
| CMYK plates | Four separations (cyan, magenta, yellow, black) as PNG files in a zip, for screen printing. |
| Text file, Braille or ASCII | Any style turned into plain text, 120 characters wide. |
| Grid text, exact | The exact characters of an ASCII or Braille layer. |
| Color terminal text | An ASCII layer with 16-color codes for terminals. |

### Project

**Save project** (Ctrl S) keeps the photo, its crop and removed areas, lines, objects, layers and every setting in one `.json` file. Open it again with **Open project** or the **Open** button. SungFluence also saves your work on its own and offers to restore it next time.

## Sizes and quality

Exports are always drawn at full size, even when the preview is set to Fast. For a print, choose the print size and dpi first; the menu shows the pixel size it will use. Large prints take longer; a progress bar shows how far it is, and **Cancel** stops it.
