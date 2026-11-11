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
