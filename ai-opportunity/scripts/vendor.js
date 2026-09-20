import {mkdir,copyFile} from 'node:fs/promises';
await mkdir(new URL('../vendor/',import.meta.url),{recursive:true});
for(const [from,to] of [
 ['fflate/esm/browser.js','fflate.js'],['fflate/LICENSE','fflate-LICENSE.txt'],
 ['pdfjs-dist/legacy/build/pdf.min.mjs','pdf.min.mjs'],['pdfjs-dist/legacy/build/pdf.worker.min.mjs','pdf.worker.min.mjs'],['pdfjs-dist/LICENSE','pdfjs-LICENSE.txt']
])await copyFile(new URL('../node_modules/'+from,import.meta.url),new URL('../vendor/'+to,import.meta.url));
console.log('Vendored pinned dependencies. No CDN is used at runtime.');
