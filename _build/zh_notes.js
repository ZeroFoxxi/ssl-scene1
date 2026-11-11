// 写出 PPT，并把所有 XML 里残留的 lang="en-US"（pptxgenjs 对备注页的默认值）改为 zh-CN。
const fs = require("fs");
const JSZip = require("jszip");
module.exports = async function writeZh(p, out) {
  const buf = await p.write({ outputType: "nodebuffer" });
  const z = await JSZip.loadAsync(buf);
  for (const name of Object.keys(z.files)) {
    if (!/^ppt\/(slides|notesSlides)\/.*\.xml$/.test(name)) continue;
    const xml = await z.file(name).async("string");
    if (xml.includes('lang="en-US"')) z.file(name, xml.replace(/lang="en-US"/g, 'lang="zh-CN"'));
  }
  fs.writeFileSync(out, await z.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }));
  console.log("written", out);
};

// 对已写出的 PPT 文件做同样处理（用于先 writeFile 再 applyTheme 的脚本）。
module.exports.fixFile = async function fixFile(file) {
  const z = await JSZip.loadAsync(fs.readFileSync(file));
  for (const name of Object.keys(z.files)) {
    if (!/^ppt\/(slides|notesSlides|slideMasters|slideLayouts)\/.*\.xml$/.test(name)) continue;
    const xml = await z.file(name).async("string");
    if (xml.includes('lang="en-US"')) z.file(name, xml.replace(/lang="en-US"/g, 'lang="zh-CN"'));
  }
  fs.writeFileSync(file, await z.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }));
};
