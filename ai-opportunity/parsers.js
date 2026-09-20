import {unzipSync,strFromU8} from './vendor/fflate.js';
export const MAX_FILE=8*1024*1024, MAX_TEXT=40000;
const xml=s=>{const d=new DOMParser().parseFromString(s,'application/xml');if(d.querySelector('parsererror'))throw Error('文档 XML 无法读取。');return d;};
const all=(d,n)=>Array.from(d.getElementsByTagNameNS('*',n));
export function textChunks(text,label='段落') {
  const chunks=[];let offset=0;
  for(const line of text.replace(/\r\n?/g,'\n').split(/\n+/)){const t=line.trim();if(!t)continue;for(let i=0;i<t.length;i+=700){const piece=t.slice(i,i+Math.min(700,MAX_TEXT-offset));chunks.push({location:`${label} ${chunks.length+1}`,text:piece});offset+=piece.length;if(offset>=MAX_TEXT)return chunks;}}
  return chunks;
}
export function parseCSV(text,delimiter=',') {
  const rows=[];let row=[],cell='',quoted=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else if(quoted||cell===''){quoted=!quoted;}else cell+=c;}
    else if(c===delimiter&&!quoted){row.push(cell);cell='';}
    else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(x=>x!==''))rows.push(row);row=[];cell='';}
    else cell+=c;
    if(rows.length>10000)throw Error('表格行数超过 10,000，请上传较小样本。');
  }
  if(quoted)throw Error('CSV 引号没有闭合，请检查文件。');
  row.push(cell);if(row.some(x=>x!==''))rows.push(row);return rows;
}
function spreadsheetChunks(rows,label) {
  if(!rows.length)return [];
  const header=rows[0].map((x,i)=>String(x||`列${i+1}`));
  return [{location:`${label} / 表头`,text:header.join(' | ')},...rows.slice(1,301).map((r,i)=>({location:`${label} / 第 ${i+2} 行`,text:r.map((v,j)=>`${header[j]||'列'+(j+1)}：${v}`).join('；').slice(0,2000)}))];
}
function officeEntries(bytes) {
  let total=0,count=0;
  return unzipSync(bytes,{filter:f=>{
    if(++count>3000)throw Error('文档内部文件过多，请上传较小样本。');
    if(!/^(word\/document.xml|xl\/(sharedStrings.xml|workbook.xml|_rels\/workbook.xml.rels|worksheets\/sheet\d+.xml))$/.test(f.name))return false;
    total+=f.originalSize;
    if(f.originalSize>6*1024*1024||total>16*1024*1024)throw Error('文档解压后过大，请截取样本后再上传。');
    return true;
  }});
}
export async function parseFile(file) {
  if(file.size>MAX_FILE)throw Error('单个文件不能超过 8 MB。');
  const ext=file.name.split('.').pop().toLowerCase();
  const bytes=new Uint8Array(await file.arrayBuffer());
  let chunks=[],warnings=[];
  if(['txt','md','json','csv','tsv'].includes(ext)) {
    let text=new TextDecoder('utf-8').decode(bytes).replace(/^\uFEFF/,'');
    if(text.includes('\uFFFD')){text=new TextDecoder('gb18030').decode(bytes);warnings.push('已尝试按 GB18030 解码，请核对中文是否正常。');}
    if(ext==='csv'||ext==='tsv'){const rows=parseCSV(text,ext==='tsv'?'\t':',');chunks=spreadsheetChunks(rows,'表格');if(rows.length>301)warnings.push(`共 ${rows.length-1} 行数据，仅分析前 300 行。`);}
    else chunks=textChunks(text);
    if(text.length>MAX_TEXT)warnings.push('仅保留前 40,000 字符范围内的摘录。');
  } else if(ext==='docx'||ext==='xlsx') {
    const entries=officeEntries(bytes);
    const get=p=>{if(!entries[p])throw Error('文件结构不完整，可能不是有效的 Office 文档。');return xml(strFromU8(entries[p]));};
    if(ext==='docx'){
      chunks=all(get('word/document.xml'),'p').map((p,i)=>({location:`段落 ${i+1}`,text:all(p,'t').map(x=>x.textContent).join('')})).filter(x=>x.text.trim());
      warnings.push('提取正文及表格文字；图片、批注、页眉页脚不纳入分析。');
    }else {
      const shared=entries['xl/sharedStrings.xml']?all(get('xl/sharedStrings.xml'),'si').map(s=>all(s,'t').map(t=>t.textContent).join('')):[];
      const rels=entries['xl/_rels/workbook.xml.rels']?all(get('xl/_rels/workbook.xml.rels'),'Relationship'):[];
      const sheets=entries['xl/workbook.xml']?all(get('xl/workbook.xml'),'sheet'):[];
      const paths=Object.keys(entries).filter(p=>p.startsWith('xl/worksheets/')).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
      if(!paths.length)throw Error('没有找到可读取的工作表。');
      for(const path of paths.slice(0,12)){
        const rel=rels.find(r=>('xl/'+(r.getAttribute('Target')||'').replace(/^\/?xl\//,'').replace(/^\//,''))===path);
        const name=sheets.find(s=>s.getAttribute('r:id')===rel?.getAttribute('Id'))?.getAttribute('name')||path.split('/').pop();
        const rows=all(get(path),'row');
        const values=rows.slice(0,301).map(row=>{
          const cells=[];
          for(const c of all(row,'c')){
            const ref=c.getAttribute('r')||'';const col=ref.match(/^[A-Z]+/)?.[0];let idx=0;
            if(col){for(const a of col)idx=idx*26+a.charCodeAt(0)-64;idx--;}else idx=cells.length;
            if(idx>199)continue;
            const value=all(c,'v')[0]?.textContent||'';
            cells[idx]=c.getAttribute('t')==='s'?(shared[Number(value)]||''):c.getAttribute('t')==='inlineStr'?all(c,'t').map(t=>t.textContent).join(''):value;
          }return Array.from(cells,v=>v??'');
        });
        chunks.push(...spreadsheetChunks(values,`工作表 ${name}`));
        if(rows.length>301)warnings.push(`${name} 仅读取前 300 行数据。`);
      }
      warnings.push('读取单元格文本和公式缓存值，不执行公式；日期可能显示为 Excel 序列值。每表最多 200 列，最多 12 个工作表。');
    }
  } else if(ext==='pdf') {
    const pdfjs=await import('./vendor/pdf.min.mjs');
    pdfjs.GlobalWorkerOptions.workerSrc=new URL('./vendor/pdf.worker.min.mjs',import.meta.url).href;
    const task=pdfjs.getDocument({data:bytes,isEvalSupported:false,useSystemFonts:true,disableFontFace:true});
    let pdf;try{
      pdf=await task.promise;
      for(let n=1;n<=Math.min(pdf.numPages,40);n++){
        const page=await pdf.getPage(n);const content=await page.getTextContent();
        const text=content.items.map(x=>x.str+(x.hasEOL?'\n':' ')).join('');
        chunks.push(...textChunks(text,`第 ${n} 页 / 摘录`));
        if(chunks.reduce((sum,c)=>sum+c.text.length,0)>MAX_TEXT)break;
      }
      if(pdf.numPages>40)warnings.push(`PDF 共 ${pdf.numPages} 页，仅读取前 40 页范围内的文本。`);
      warnings.push('仅提取文字层，不识别扫描图片；复杂表格阅读顺序需核对。');
    }finally{await task.destroy();}
  } else throw Error('暂不支持此格式。请转为 DOCX、XLSX、文字 PDF、CSV 或纯文本。');
  let size=0;const selected=[];
  for(const c of chunks){if(size>=MAX_TEXT)break;const text=c.text.slice(0,MAX_TEXT-size);size+=text.length;selected.push({...c,text});}
  if(size>=MAX_TEXT)warnings.push('摘录已达到 40,000 字符上限，其余内容未分析。');
  if(!selected.some(c=>c.text.trim().length>2))throw Error('未提取到有效文字。扫描 PDF、图片或受保护文档请先转成文字，再粘贴内容。');
  return {id:crypto.randomUUID(),name:file.name,chunks:selected,characters:size,warnings:[...new Set(warnings)]};
}
