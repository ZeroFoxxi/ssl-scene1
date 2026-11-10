// 修正 pptxgenjs 未传递到部分表格 run 的文本语言，保留原字体、文本和布局。
// 用法：node _build/fix_pptx_language.js path/to/deck.pptx
// 依赖：npm install jszip
const fs = require('fs');
const JSZip = require('jszip');

async function fixPptxLanguage(fileName) {
  const zip = await JSZip.loadAsync(fs.readFileSync(fileName));
  let changed = false;
  for (const name of Object.keys(zip.files)) {
    if (!name.startsWith('ppt/') || !name.endsWith('.xml')) continue;
    const xml = await zip.file(name).async('string');
    const fixed = xml.replace(/<a:(?:rPr|defRPr|endParaRPr)\b[^>]*>/g, tag =>
      tag.replace(/\s+lang="[^"]*"/g, '').replace(/\s*\/?>$/, end => ' lang="zh-CN"' + end));
    if (fixed !== xml) {
      zip.file(name, fixed);
      changed = true;
    }
  }
  if (changed) fs.writeFileSync(fileName, await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));
}

module.exports = { fixPptxLanguage };
if (require.main === module) {
  if (!process.argv[2]) { console.error('用法：node _build/fix_pptx_language.js path/to/deck.pptx'); process.exitCode = 1; }
  else fixPptxLanguage(process.argv[2]).catch(error => { console.error(error); process.exitCode = 1; });
}
