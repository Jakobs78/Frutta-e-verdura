import {mkdir,copyFile} from 'node:fs/promises';
import {build} from 'esbuild';
await mkdir('dist',{recursive:true});
for(const file of ['index.html','style.css','favicon.svg'])await copyFile(file,`dist/${file}`);
await build({entryPoints:['game.js'],bundle:true,minify:true,format:'esm',target:['es2022'],outfile:'dist/game.js',legalComments:'eof'});
console.log('Gioco 3D pronto nella cartella dist.');
