import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {zipSync,strToU8} from '../vendor/fflate.js';
import {parseFile} from '../parsers.js';

const dom=new JSDOM(await readFile(new URL('../index.html',import.meta.url),'utf8'),{url:'https://diagnosis.example/'});
const win=dom.window;
Object.assign(globalThis,{window:win,document:win.document,localStorage:win.localStorage,DOMParser:win.DOMParser});
win.scrollTo=()=>{};win.HTMLElement.prototype.scrollIntoView=()=>{};
win.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
win.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new win.Event('close'));};
const registered=[];document.modelContext={registerTool:tool=>registered.push(tool)};
await import('../app.js');
const $=s=>document.querySelector(s);
const input=(selector,value,event='input')=>{const e=$(selector);e.value=value;e.dispatchEvent(new win.Event(event,{bubbles:true}));};
const click=s=>$(s).click();
const file=(name,bytes)=>({name,size:bytes.byteLength,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)});

test('all navigation steps render and demo produces expected ROI',()=>{
 assert.equal(document.querySelectorAll('.chain-item').length,15);
 click('#demo-button');assert.equal($('#view-report').hidden,false);assert.equal($('#demo-banner').hidden,false);
 assert.ok($('#roi-result').textContent.includes('2,480'));
 input('[data-roi-field="realization"]','0');assert.ok($('#roi-result').textContent.includes('500'));
 input('[data-roi-field="lossSaving"]','0');assert.ok($('#roi-result').textContent.includes('当前假设不回本'));
 click('#exit-demo');assert.equal($('#view-overview').hidden,false);
});
test('pasted untrusted markup remains text, no injected DOM',()=>{
 click('[data-view="materials"]');input('#paste-name','<img src=x onerror=alert(1)>');input('#paste-content','审单规范：必须核对报价材质与订单尺寸。<script>alert(1)</script>');click('#add-paste');
 assert.equal($('#documents img'),null);assert.equal($('#documents script'),null);assert.ok($('#documents').textContent.includes('<script>'));
 click('[data-stage="review"]');assert.ok($('#stage-form').textContent.includes('审单规范'));
});
test('ratings and narrative update report without fabricated unknown scores',()=>{
 for(const [id,value] of [['data','4'],['rules','4'],['output','5'],['repeat','5']])input(`[data-rating="${id}"]`,value,'change');
 input('#value-rating','5','change');input('#stage-notes','按实际记录复核。');
 input('#answer','我们每次由审单负责人确认冲突。');click('#answer-button');assert.ok($('#conversation').textContent.includes('审单负责人'));
 click('[data-view="report"]');assert.ok($('#rankings').textContent.includes('初步候选'));assert.ok($('#rankings').textContent.includes('待评估'));
});
test('model request requires consent; valid structure and forged citations handled',async()=>{
 click('[data-stage="review"]');click('#settings-button');input('#endpoint','https://model.example/v1');input('#model','test-model');input('#api-key','test-secret-not-real');click('#save-settings');
 let calls=0,body;
 globalThis.fetch=async(url,opts)=>{calls++;assert.equal(url,'https://model.example/v1/chat/completions');assert.equal(opts.redirect,'error');body=opts.body;assert.ok(!body.includes('test-secret-not-real'));return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({summary:'测试诊断，仍需人工核实。',questions:['每月订单量是多少？'],findings:[{stageId:'review',observation:'一致性核对有机会',recommendation:'先离线验证',sourceId:'nonexistent',quote:'我伪造了一条并不存在的材料'}]})}}]}),{status:200});};
 click('#analyze-button');assert.equal(calls,0);click('#confirm-send');assert.equal(calls,0);assert.ok($('#request-status').textContent.includes('确认'));
 $('#send-consent').checked=true;click('#confirm-send');await new Promise(r=>setTimeout(r,25));assert.equal(calls,1);assert.ok(body.includes('必须核对报价'));assert.ok($('#ai-analysis').textContent.includes('测试诊断'));assert.ok($('#ai-analysis').textContent.includes('无可核对'));assert.equal($('#send-dialog').open,false);
});
test('HTTP model error preserves user data and is visible',async()=>{
 globalThis.fetch=async()=>new Response('',{status:401});click('#analyze-button');$('#send-consent').checked=true;click('#confirm-send');await new Promise(r=>setTimeout(r,25));assert.ok($('#request-status').textContent.includes('401'));assert.ok($('#stage-notes').value.includes('审单负责人'));$('#send-dialog').close();
});
test('local save excludes key and restore preserves original state',()=>{
 click('#save-button');const saved=localStorage.getItem('home-ai-opportunity-v1');assert.ok(saved.includes('审单负责人'));assert.ok(!saved.includes('test-secret-not-real'));
 input('#stage-notes','修改后的说明');click('#restore-button');assert.ok($('#stage-notes').value.includes('审单负责人'));
});
test('WebMCP registration validates and returns current visible assessment',async()=>{
 assert.equal(registered.length,1);const tool=registered[0];assert.equal(tool.annotations.readOnlyHint,true);const r=await tool.execute({});assert.equal(r.stages.length,15);assert.equal(r.goal,'提效');assert.throws(()=>tool.execute({unexpected:true}));
});
test('DOCX extracts document paragraphs and warns about skipped content',async()=>{
 const bytes=zipSync({'word/document.xml':strToU8('<w:document xmlns:w="urn:word"><w:body><w:p><w:r><w:t>审单核对报价与订单</w:t></w:r></w:p></w:body></w:document>')});
 const result=await parseFile(file('sample.docx',bytes));assert.equal(result.chunks[0].text,'审单核对报价与订单');assert.ok(result.warnings[0].includes('图片'));
});
test('XLSX extracts shared strings, inline strings and cached numeric values',async()=>{
 const bytes=zipSync({'xl/sharedStrings.xml':strToU8('<sst xmlns="urn:sheet"><si><t>订单号</t></si><si><t>DEMO-001</t></si></sst>'),'xl/workbook.xml':strToU8('<workbook xmlns="urn:sheet" xmlns:r="urn:rel"><sheets><sheet name="审单记录" r:id="rId1"/></sheets></workbook>'),'xl/_rels/workbook.xml.rels':strToU8('<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>'),'xl/worksheets/sheet1.xml':strToU8('<worksheet xmlns="urn:sheet"><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="inlineStr"><is><t>报价</t></is></c></row><row r="2"><c r="A2" t="s"><v>1</v></c><c r="B2"><v>1200</v></c></row></sheetData></worksheet>')});
 const result=await parseFile(file('sample.xlsx',bytes));assert.ok(result.chunks[1].text.includes('报价：1200'));assert.ok(result.chunks[1].location.includes('审单记录'));
});
test('oversized and malformed files fail without adding phantom content',async()=>{
 await assert.rejects(()=>parseFile({name:'big.csv',size:9*1024*1024}),/8 MB/);
 await assert.rejects(()=>parseFile(file('bad.docx',strToU8('not-a-zip'))));
 await assert.rejects(()=>parseFile(file('photo.png',strToU8('fake'))),/暂不支持/);
});
test('reset removes local data and sensitive configuration',()=>{
 click('#reset-button');click('#confirm-reset');assert.equal(localStorage.getItem('home-ai-opportunity-v1'),null);assert.equal($('#api-key').value,'');assert.equal($('#doc-count').textContent,'0');assert.ok($('#coverage-label').textContent.startsWith('0 /'));
});
