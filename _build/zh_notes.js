// 写出 PPT，并把所有 XML 里残留的 lang="en-US"（pptxgenjs 对备注页的默认值）改为 zh-CN。
const fs = require("fs");
const JSZip = require("jszip");
// 幻灯片、备注、母版、版式、备注母版、图表里的语言标签都改为中文；altLang="en-US"（中文文字的西文备用语言）是正常写法，不改
const PARTS = /^ppt\/(slides|notesSlides|slideMasters|slideLayouts|notesMasters|charts)\/[^/]+\.xml$/;
const EN = / lang="en-US"/, EN_G = / lang="en-US"/g;
module.exports = async function writeZh(p, out) {
  const buf = await p.write({ outputType: "nodebuffer" });
  const z = await JSZip.loadAsync(buf);
  for (const name of Object.keys(z.files)) {
    if (!PARTS.test(name)) continue;
    const xml = await z.file(name).async("string");
    if (EN.test(xml)) z.file(name, xml.replace(EN_G, ' lang="zh-CN"'));
  }
  dropDirs(z);
  fs.writeFileSync(out, await z.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }));
  console.log("written", out);
};

// 对已写出的 PPT 文件做同样处理（用于先 writeFile 再 applyTheme 的脚本）。
module.exports.fixFile = async function fixFile(file) {
  const z = await JSZip.loadAsync(fs.readFileSync(file));
  for (const name of Object.keys(z.files)) {
    if (!PARTS.test(name)) continue;
    const xml = await z.file(name).async("string");
    if (EN.test(xml)) z.file(name, xml.replace(EN_G, ' lang="zh-CN"'));
  }
  dropDirs(z);
  fs.writeFileSync(file, await z.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }));
};

// 去掉 ZIP 里的文件夹条目（部分云盘 / 协同编辑打不开带文件夹条目的 PPT）。
function dropDirs(z) {
  // 只删文件夹条目本身；z.remove() 会连文件夹里的文件一起删掉，不能用
  for (const name of Object.keys(z.files).filter((n) => z.files[n].dir)) delete z.files[name];
}
