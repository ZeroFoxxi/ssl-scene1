// 两页竞品算法与部署补充：可编辑原生文本、规格行与来源链接。
// 构建：npm install pptxgenjs jszip && node _build/build_comp2.js
// 数据与证据边界：comp2_data.json；PPT 字体保持 Microsoft YaHei，中文语言 zh-CN。
const pptxgen = require('pptxgenjs');
const fs = require('fs');
const path = require('path');
const { fixPptxLanguage } = require('./fix_pptx_language');
const D = JSON.parse(fs.readFileSync(path.join(__dirname, 'comp2_data.json'), 'utf8'));
const OUT = path.join(process.env.OUT_DIR || path.join(__dirname, '..'), '竞品补充页_萤石与思必驰.pptx');
const F = 'Microsoft YaHei';
const C = { navy:'17375E', text:'243447', muted:'64748B', rule:'DCE4ED', light:'F3F6FA', teal:'147D70', tealLight:'EAF4F1', amber:'9A6518', white:'FFFFFF' };
const p = new pptxgen();
p.layout = 'LAYOUT_WIDE';
p.title = '竞品补充页：萤石与思必驰';
p.subject = '摄像头声源定位：算法、部署平台与对标边界';
p.author = '令狐雅熙';
p.lang = 'zh-CN';
p.theme = { headFontFace:F, bodyFontFace:F, lang:'zh-CN' };
const tx = (s,text,x,y,w,h,o={}) => s.addText(text, { x,y,w,h,fontFace:F,lang:'zh-CN',fontSize:13,color:C.text,margin:0,valign:'mid',breakLine:false,paraSpaceAfter:0,...o });
const rect = (s,x,y,w,h,fill,line=fill) => s.addShape('rect',{x,y,w,h,fill:{color:fill},line:{color:line,width:.6}});
const rule = (s,y) => s.addShape('line',{x:.6,y,w:12.13,h:0,line:{color:C.rule,width:.65}});

function makePage(data,index) {
  const s = p.addSlide();
  s.background = { color:C.white };
  tx(s,'声源定位算法预研  /  竞品补充',.6,.26,10,.22,{fontSize:10,color:C.muted});
  tx(s,data.title,.6,.68,10.45,.47,{fontSize:25,bold:true,color:C.navy});
  rect(s,11.33,.71,1.4,.36,C.navy);
  tx(s,data.tag,11.33,.71,1.4,.36,{fontSize:12,bold:true,color:C.white,align:'center'});
  tx(s,data.lead,.6,1.19,12.13,.32,{fontSize:13,color:C.muted});

  rect(s,.6,1.76,12.13,1.06,C.light);
  rect(s,.6,1.76,.055,1.06,C.teal);
  tx(s,data.object,.82,1.90,9.3,.32,{fontSize:18,bold:true,color:C.navy});
  tx(s,data.object_detail,.82,2.27,9.35,.22,{fontSize:12.1});
  tx(s,data.object_note,.82,2.56,9.4,.16,{fontSize:10.1,color:C.muted});
  s.addShape('line',{x:10.56,y:1.96,w:0,h:.66,line:{color:C.rule,width:1}});
  tx(s,data.object_label,10.79,1.95,1.72,.2,{fontSize:10,color:C.muted});
  tx(s,data.object_value,10.79,2.25,1.72,.37,{fontSize:13,bold:true,color:C.teal,breakLine:false});

  tx(s,'核查项',.82,3.04,2.16,.22,{fontSize:10.5,bold:true,color:C.muted});
  tx(s,'公开信息与当前边界',3.06,3.04,9.4,.22,{fontSize:10.5,bold:true,color:C.muted});
  rule(s,3.36);
  let y = 3.36;
  const heights = [.75,.47,.47,.47,.47];
  data.rows.forEach((r,i)=>{
    const h=heights[i];
    if(r.focus) rect(s,.6,y,12.13,h,C.tealLight);
    tx(s,r.label,.82,y+.09,2.15,h-.18,{fontSize:12.6,bold:true,color:r.focus?C.teal:C.navy});
    if(r.secondary) {
      tx(s,r.primary,3.06,y+.09,9.38,.27,{fontSize:13.1,bold:true,color:C.navy});
      tx(s,r.secondary,3.06,y+.42,9.38,.22,{fontSize:11.6,color:C.muted});
    } else {
      tx(s,r.primary,3.06,y+.08,9.38,h-.16,{fontSize:12.8});
    }
    y+=h;
    if(i>0)rule(s,y);
  });

  rect(s,.6,6.21,12.13,.68,C.light);
  tx(s,data.action_title,.82,6.33,1.73,.22,{fontSize:12.3,bold:true,color:C.teal});
  tx(s,data.action,2.58,6.30,9.88,.27,{fontSize:11.9});
  tx(s,data.action_note,2.58,6.64,9.88,.16,{fontSize:9.6,color:C.muted});

  const count=data.sources.length;
  const sourceWidths=count===4?[3.5,2.75,2.75,3.13]:[4.1,3.6,4.43];
  let sx=.6;
  data.sources.forEach((source,i)=>{
    tx(s,`[${source.id}] ${source.label} ↗`,sx,7.02,sourceWidths[i]-.14,.19,{fontSize:9,color:C.muted,hyperlink:{url:source.url,tooltip:source.url}});
    sx+=sourceWidths[i];
  });
  tx(s,`公开资料截至 ${D.as_of}  ·  未公开项保留待核实`,.6,7.30,10.8,.13,{fontSize:8.2,color:C.muted});
  tx(s,String(index+1).padStart(2,'0'),12.20,7.25,.53,.2,{fontSize:10,color:C.teal,align:'right'});
  s.addNotes([
    '本页为可插入技术综述的竞品补充，公开资料核对日期：'+D.as_of+'。',
    ...data.notes,
    '来源清单：',
    ...data.sources.map(v=>`[${v.id}] ${v.label}；${v.grade}；${v.url}`)
  ].join('\n\n'));
}
D.pages.forEach(makePage);
p.writeFile({fileName:OUT}).then(async()=>{await fixPptxLanguage(OUT);console.log('written',OUT);}).catch(error=>{console.error(error);process.exitCode=1;});
