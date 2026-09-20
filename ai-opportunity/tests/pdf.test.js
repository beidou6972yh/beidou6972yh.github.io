import test from 'node:test';
import assert from 'node:assert/strict';
import {DOMMatrix,ImageData,Path2D} from '@napi-rs/canvas';
import {parseFile} from '../parsers.js';
Object.assign(globalThis,{DOMMatrix,ImageData,Path2D});
function samplePDF(text){
 const stream=`BT /F1 12 Tf 72 720 Td (${text}) Tj ET`;
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`];
 let s='%PDF-1.4\n',offsets=[0];objects.forEach((o,i)=>{offsets.push(s.length);s+=`${i+1} 0 obj\n${o}\nendobj\n`;});const start=s.length;
 s+=`xref\n0 6\n0000000000 65535 f \n`+offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`;
 const bytes=new TextEncoder().encode(s);return {name:'sample.pdf',size:bytes.length,arrayBuffer:async()=>bytes.buffer};
}
test('PDF text extraction preserves page provenance',async()=>{const d=await parseFile(samplePDF('Order review must verify quote and materials.'));assert.ok(d.chunks.some(c=>c.text.includes('Order review')));assert.ok(d.chunks[0].location.includes('第 1 页'));});
test('PDF without useful text is not accepted as evidence',async()=>{await assert.rejects(()=>parseFile(samplePDF('')),/未提取到有效文字/);});
