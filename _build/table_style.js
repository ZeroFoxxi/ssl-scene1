// 把 pptxgenjs 生成的表格改为 PowerPoint 内置表格样式（默认：中度样式 2 - 强调 1），
// 去掉逐格手动填色与边框，使表格在 PowerPoint“表设计”里可一键切换样式、随主题色变化。
// 填充色为 FFFFFE 的单元格视为“保留白底”（如产品图行），转成 FFFFFF 保留。
const fs = require("fs");
const JSZip = require("jszip");
const MEDIUM_2_ACCENT_1 = "{5C22544A-7EE6-4342-B048-85BDC9FD1C3A}";

module.exports = async function applyTableStyle(file, styleId) {
  const id = styleId || MEDIUM_2_ACCENT_1;
  const z = await JSZip.loadAsync(fs.readFileSync(file));
  for (const name of Object.keys(z.files)) {
    if (!/^ppt\/slides\/slide\d+\.xml$/.test(name)) continue;
    let xml = await z.file(name).async("string");
    if (!xml.includes("<a:tbl>")) continue;
    xml = xml.replace(/<a:tblPr\/>|<a:tblPr>[\s\S]*?<\/a:tblPr>/g,
      `<a:tblPr firstRow="1" bandRow="1"><a:tableStyleId>${id}</a:tableStyleId></a:tblPr>`);
    xml = xml.replace(/<a:tcPr([^>]*)>([\s\S]*?)<\/a:tcPr>/g, (m, attrs, inner) => {
      const keepWhite = inner.includes('<a:srgbClr val="FFFFFE"/>');
      let body = inner.replace(/<a:ln[LRTB][^>]*>[\s\S]*?<\/a:ln[LRTB]>/g, "")
                      .replace(/<a:solidFill>[\s\S]*?<\/a:solidFill>/g, "");
      if (keepWhite) body += '<a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill>';
      return `<a:tcPr${attrs}>${body}</a:tcPr>`;
    });
    z.file(name, xml);
  }
  fs.writeFileSync(file, await z.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }));
  console.log("table style applied", file);
};
