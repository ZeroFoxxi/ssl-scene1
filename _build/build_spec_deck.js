// 数据源：spec_data.py → spec_data.json。依赖：npm install pptxgenjs
const pptxgen = require('pptxgenjs');
const path = require('path');
const fs = require('fs');
const { fixPptxLanguage } = require('./fix_pptx_language');
const D = JSON.parse(fs.readFileSync(path.join(__dirname, 'spec_data.json'), 'utf8'));
const OUT = path.join(process.env.OUT_DIR || path.join(__dirname, '..'), '竞品规格调研_萤石与思必驰.pptx');
const F = process.env.PPTX_FONT || 'Microsoft YaHei';
const C = {navy:'17375E',text:'1F2937',gray:'5B6B7F',light:'EEF2F7',teal:'1F7A68',mint:'E3F1EE',amber:'B8691A',sand:'FBF0E3',blue:'2F6EB5',white:'FFFFFF',border:'CBD5E1'};
const p = new pptxgen();
p.layout='LAYOUT_WIDE';p.author='令狐雅熙';p.title='竞品规格调研：萤石与思必驰';p.subject='声源定位算法选型与证据口径';
p.theme={headFontFace:F,bodyFontFace:F,lang:'zh-CN'};
function t(s,text,x,y,w,h,o={}){s.addText(text,{x,y,w,h,fontFace:F,lang:'zh-CN',fontSize:13,color:C.text,margin:0,valign:'top',breakLine:false,paraSpaceAfter:3,...o});}
function rect(s,x,y,w,h,fill){s.addShape('roundRect',{x,y,w,h,rectRadius:0.06,fill:{color:fill},line:{color:fill},radius:0.06});}
function slide(title,sub){const s=p.addSlide();s.background={color:C.white};const n=p._slides.length;t(s,title,.55,.3,12.2,.65,{fontSize:23,bold:true,color:C.navy});if(sub)t(s,sub,.55,1.02,12.2,.42,{fontSize:11.5,color:C.gray});t(s,'声源定位竞品规格调研｜萤石与思必驰｜2026.11.10',.55,7.06,10,.2,{fontSize:9,color:C.gray});t(s,String(n),12.2,7.04,.55,.25,{fontSize:10,color:C.gray,align:'right'});return s;}
function table(s,rows,x,y,widths,heights,size=11){
 const r=rows.map((row,i)=>row.map(v=>({text:String(v),options:i===0?{bold:true,color:C.white,fill:C.navy}:{} })));
 s.addTable(r,{x,y,w:widths.reduce((a,b)=>a+b,0),colW:widths,rowH:heights,fontFace:F,lang:'zh-CN',fontSize:size,color:C.text,margin:[.09,.10,.08,.10],border:{type:'solid',pt:.7,color:C.border},valign:'middle',autoPage:false,fill:C.white,paraSpaceAfter:0});
}
function callout(s,text,y=6.15,h=.62){rect(s,.55,y,12.22,h,C.sand);t(s,text,.75,y+.12,11.82,h-.17,{fontSize:12,color:C.amber});}
function card(s,label,text,x,y,w,h,fill=C.light){rect(s,x,y,w,h,fill);t(s,label,x+.22,y+.17,w-.44,.38,{fontSize:16,bold:true,color:C.navy});t(s,text,x+.22,y+.68,w-.44,h-.82,{fontSize:14});}
function notes(s,rows){s.addNotes(rows.map(r=>r.join('｜')).join('\n\n'));}
// 1. 封面
{
 const s=p.addSlide();s.background={color:C.navy};
 for(const r of [2.35,1.65,.95])s.addShape('ellipse',{x:10.7-r,y:3.7-r,w:2*r,h:2*r,fill:{color:C.navy,transparency:100},line:{color:'3A6390',width:1.5}});
 t(s,'摄像头转向说话人 · 算法预研',.8,1.75,9,.5,{fontSize:18,color:'CADCFC'});
 t(s,'竞品规格调研',.8,2.55,9,1,{fontSize:42,bold:true,color:C.white});
 t(s,'萤石与思必驰',.82,3.67,8,.7,{fontSize:28,color:C.white});
 t(s,'内存与模型 · 执行单元 · 离线能力 · 定位与整机时延',.82,4.65,10,.6,{fontSize:17,color:'CADCFC'});
 t(s,'令狐雅熙　｜　2026.11.10 修订',.82,6.5,10,.4,{fontSize:13,color:'CADCFC'});
 s.addNotes('范围：萤石整机、思必驰算法方案与模组；乐鑫仅作公开嵌入式实现参照。监管披露中的厂商指标不等于统一测试结果。完整字段与来源见配套 Excel。');
}
// 2. 结论
{
 const s=slide('结论：两家定位模块的资源指标均未公开，思必驰 SDK 是最快的对标途径','已公开的是阵列、功能与精度口径；内存、模型、执行单元与时延需通过 SDK 规格或样机实测获得。');
 const labels=['已查到','未查到','公开参照','下一步'];
 D.implications.forEach((v,i)=>card(s,labels[i],v,.55+(i%2)*6.22,1.68+Math.floor(i/2)*2.13,6,1.94,[C.mint,C.sand,C.light,C.light][i]));
 callout(s,'模型量级待竞品数据补齐后确定；在此之前首轮保留 SRP-PHAT 与 GEVD-MUSIC 对照，同步测效果、内存与耗时。',6.12,.67);
 s.addNotes('结论分四点。已查到的：萤石 C6C 有 3 麦和 4 麦两代产品，都支持 360 度声源定位，公司披露的“高精度声源定位”识别率 86%，是自家实验室测的；思必驰的模组有双麦、四麦、六麦，标称正负 5 度，它的 Linux SDK 在唤醒后会回调方位。没查到的：两家定位模块的内存、模型大小、跑在 CPU、DSP 还是 NPU、时延，公开资料里都没有，第 3 页的总表列得很清楚。公开参照：乐鑫公开了一个 4 麦定位的实测，约 206 KB 内存、每 8 毫秒帧处理 0.65 毫秒、CPU 约 8.1%，可以作为同类嵌入式实现的量级参考，但不代表竞品。下一步：申请思必驰的 Linux SDK，用同一段多通道音频直接对比；买萤石样机实测整机响应；拿到数据再确定模型量级和算力预算。在这之前，首轮先保留 SRP-PHAT 和 GEVD-MUSIC 两个方法做对照，效果、内存和耗时一起测。');
}
// 2b. 五项指标总表
{
 const s=slide('五项指标总表：竞品定位模块的五项均未公开，只有公开参照有完整数据','“未公开”指本轮公开资料未查到；离线 / 在线只写有出处的结论。完整出处见配套 Excel“五项指标总表”。');
 const pend=v=>/未公开|待/.test(v);
 const head=D.matrix_cols.slice(0,7).map(v=>({text:v,options:{bold:true,color:C.white,fill:C.navy,align:'center'}}));
 const body=D.matrix.map((r,i)=>{
  const ref=r[0].startsWith('参照')||r[0].startsWith('本方案');
  const fill=r[0].startsWith('参照')?C.light:(r[0].startsWith('本方案')?C.mint:C.white);
  return r.slice(0,7).map((v,j)=>({text:v,options:{fill,bold:j===0,color:(j>=1&&j<=5&&pend(v))?C.amber:C.text}}));
 });
 s.addTable([head,...body],{x:.55,y:1.6,w:12.22,colW:[2.45,1.75,1.25,1.5,1.8,1.42,2.05],rowH:[.4,.6,.68,.6,.5,.55,.6,.6],fontFace:F,lang:'zh-CN',fontSize:10,color:C.text,margin:[.05,.07,.05,.07],border:{type:'solid',pt:.7,color:C.border},valign:'middle',autoPage:false});
 callout(s,'对标路径：思必驰申请 SDK，在同一段多通道音频上做算法级对比；萤石用样机实测整机响应（触发→转动、触发→入画）。',6.28,.52);
 s.addNotes('这页按选型需要的五项列出：内存占用、模型大小、运行在 CPU / DSP / NPU、离线还是在线、时延。萤石和思必驰的定位模块这五项都没有公开，表里如实写“未公开”。能看到的只有阵列和精度这类信息，放在最后一列。思必驰的 Linux SDK 手册定义为离线语音技术，这是有出处的；萤石只知道公司整体的音频算法可以放云端或设备端，具体产品没说。灰色一行是乐鑫的公开参照，五项都有数据：约 206 KB 内存、不用神经网络、CPU 约 8.1%、端侧、每 8 毫秒帧处理 0.65 毫秒。绿色一行是本方案现状，只有导向表大小是实测的，其他要移植后再测。补数据的路径是：思必驰申请 SDK 做算法级对比，萤石用样机实测整机响应。');
}
// 3. 萤石
{
 const s=slide('萤石：锁定具体 SKU，单品规格与公司级指标分开','C6C 三麦 / 四麦来自不同资料对象；实测时记录样机 SKU、版本、触发方式和麦克风配置。');
 table(s,[['对标对象','已公开信息','选型边界'],
 ['1080P 无极巡航版\nCS-C6C-1C2WFRV','2019 官方资讯：3 麦、360° 声源定位；商城列声源定位与人形跟踪。\n来源 S3 / S18','定位 RAM、模型、处理器执行单元、离线依赖与时延均未公开。'],
 ['300 万 AI 无极款\nCS-C6C-3H3WFRV','问询回复：C6C/3MP 无极版 4 麦、听声辨位；商城确认 SKU。\n来源 S2 / S17','麦克风数量需核对具体样机；86% 不直接填入单品性能。'],
 ['公司披露的算法指标\n不是某款样机规格','“高精度声源定位”识别率 86.0%，行业平均 77.0%；发行人实验室结果。\n来源 S2 印刷页 8-1-1-207','未说明角度阈值与完整场景；不能与本方案 Acc@10° 直接比较。']
 ],.55,1.63,[2.55,5.25,4.42],[.42,1.15,1.15,1.15],12);
 callout(s,'整机对标：分别测声音触发→开始转动、声音触发→目标入画，以及转向命中率；同步记录声音与画面。',6.12,.67);
 notes(s,D.rows.filter(r=>r[0]==='萤石'));
}
// 4. 思必驰
{
 const s=slide('思必驰：Linux SDK 更接近“唤醒后首次定向”的对标需求','模组精度、会议检测率与整机声像追踪来自不同对象，分别留证。');
 table(s,[['对象 / 来源','可核实能力','尚缺条件'],
 ['线性阵列 Linux SDK\nS16 §2','线性四麦 / 六麦；16 kHz、16-bit 音频输入；唤醒回调后返回 {"doa":95}。','SDK 版本、授权与支持平台；DOA 增量 RAM、资源文件大小、处理耗时。'],
 ['AI 阵列模组\nS1 页 1-1-137','双 / 四 / 六麦；披露 ±5° 定位、180° / 360° 拾音。','具体模组、阵列与测试条件；不能套到 C60 或 SDK。'],
 ['会议拾扩音技术\nS1 页 1-1-196','方向检测率 >98%；扩声延迟 ≤22 ms。','角度容差与测试场景；22 ms 属于扩声，不是定位处理时延。'],
 ['C40 / C60 摄像头\nS1 页 1-1-134','配合麦克风，语音定位 + 视觉锁定发言人，支持声像追踪。','具体麦克风配置和 DOA 执行位置；离线指令不证明整条链路离线。']
 ],.55,1.63,[2.35,5.12,4.75],[.42,.96,.96,.96,.96],11.7);
 callout(s,'TH 系列芯片只能提供平台线索；DSP / NPU 的存在不能证明某款产品的 DOA 实际运行位置。',6.24,.55);
 notes(s,D.rows.filter(r=>r[0]==='思必驰'));
}
// 5. 内存与耗时
{
 const s=slide('资源口径：模块内存池、Python 导向表、部署估算分别报告','本方案配置：4 麦、16 kHz、nfft=512、300–4000 Hz，共 119 频点；KiB = 1024 bytes。');
 rect(s,.55,1.6,12.22,1.18,C.mint);
 t(s,'乐鑫 ESP32-P4：公开的 DOA 模块资源（S13）',.77,1.76,11.8,.32,{fontSize:15,bold:true,color:C.teal});
 t(s,'约 206 KB 内存池 = 内部 RAM 57 KB + PSRAM 149 KB；0.65 ms / 8 ms 帧；CPU 约 8.1%。\n条件：400 MHz、HEX PSRAM 250 MHz、半径 5 cm 四麦圆阵、10° 网格；单位沿用原文。',.77,2.16,11.8,.48,{fontSize:12.1});
 table(s,[['本方案：仅导向表','1° 网格 / KiB','5° 网格 / KiB','10° 网格 / KiB'],...D.memory.map(r=>[r[0],...r.slice(2).map(x=>x.toFixed(3))])],.55,3.09,[5.02,2.4,2.4,2.4],[.42,.57,.57,.57],12);
 t(s,'WakeDOA 10°：SRP 表 401.625 + MUSIC A 表 267.750 = 669.375 KiB。\n实测取 NumPy 数组 nbytes；complex64 行仅为容量估算，尚未验证部署精度、处理时间和峰值 RAM。',.65,5.52,12,.55,{fontSize:12,color:C.gray});
 callout(s,'以上数组不含 STFT、音频缓存、协方差和临时量，不能当作总内存；帧长也不能当作算法处理时间。',6.22,.57);
 s.addNotes('复核命令：python _build/measure_doa_memory.py。SRP 表为 6×119×G 个 complex128；MUSIC A 为 4×119×G。WakeDOA 初始化同时持有两类表。complex64 估算按每元素 8 bytes 计算；当前代码未作类型修改。');
}
// 6. 缺口与数据
{
 const s=slide('下一步：统一测试条件，申请 SDK，预留实录数据采集时间','数据采集覆盖设备准备、试采、标注、回传和质检。');
 table(s,[['要确认什么','获取方式','形成什么结果'],...D.gaps],.55,1.63,[2.55,6.12,3.55],[.42,.82,.82,.82,.82,.82],11.2);
 callout(s,'算法：词尾→回调、回调→方位输出；整机：触发→转动、触发→入画。各段分别计时、报告分位数。',6.36,.47);
 notes(s,D.gaps);
}
// 7. 来源，两列保留全部可点击链接
{
 const s=slide('资料来源：完整规格、出处与待确认项见配套 Excel','A：官方技术文档 / 监管披露；B：官方产品资料；C：媒体 / 拆解 / 二手资料。等级不等于独立性能验证。');
 D.sources.forEach((r,i)=>{const col=Math.floor(i/9),row=i%9,x=.55+col*6.22,y=1.69+row*.51;
 t(s,'['+r[0]+' · '+r[1]+']',x,y,.8,.34,{fontSize:10.5,bold:true,color:r[1]==='A'?C.teal:C.blue});
 t(s,r[2]+' ↗',x+.84,y,5.1,.46,{fontSize:10.5,color:C.blue,hyperlink:{url:r[3],tooltip:r[3]}});
 });
 t(s,'关键页：S2 印刷页 8-1-1-206 / 207；S1 印刷页 1-1-134 / 137 / 196；S16 第 2 节；S13 资源章节。',.55,6.47,12.2,.36,{fontSize:10.5,color:C.gray});
 s.addNotes('可访问的原始资料已重新核对，访问日期 2026-11-10。S8 本轮仅返回页面框架，不将未能确认的八麦或离线追踪作为结论。平台媒体报道仅作线索，定位资源需向厂商确认。');
}
p.writeFile({fileName:OUT}).then(async()=>{ await fixPptxLanguage(OUT); console.log('written',OUT); }).catch(error=>{ console.error(error); process.exitCode=1; });
