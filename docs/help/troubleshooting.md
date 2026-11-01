# Problems and answers

**The picture is blank, or I only see paper.**
Look at the layer eyes at the top right. In Text view only the text art shows; if it is hidden, nothing does. Click the eye of the Photo layer, or choose the Photo view.

**The letters show where I did not want them, for example all over a white background.**
On dark paper, light parts of the photo get the ink, and on light paper the dark parts do. Change the paper in the Output panel, use **Invert tones** under More controls, or remove the background in the Photo panel.

**It is slow.**
Choose **Fast** at the bottom. Fewer columns or bigger letters draw faster. On an older computer, turn on **Gentle on this computer** in the Output panel. Exports always use the full size, whatever the preview.

**Urdu letters are not joined.**
Use Calligram, Text portrait, Spiral or Rings. Other styles do not join Arabic script yet. See [Writing in Urdu and Arabic](urdu-and-arabic.md).

**My plugin does not load.**
The file must call `Sungfluence.plugin({...})`. A message at the bottom says what went wrong. Some web pages do not allow plugins; the desktop app does.

**Windows says "Windows protected your PC".**
The installers are not signed yet. Click **More info**, then **Run anyway**.

**macOS says the app is damaged or cannot be opened.**
Right-click the app in Applications, choose **Open**, then **Open** again. If it still refuses, run `xattr -cr /Applications/SungFluence.app` in Terminal.

**Where is my work?**
SungFluence saves your last session on its own and offers to restore it when you start. For anything you want to keep, use **Export → Save project** (Ctrl S).

**Something else?**
Please [open an issue on GitHub](https://github.com/datakeen/Sungfluence/issues) with the steps and a screenshot.
