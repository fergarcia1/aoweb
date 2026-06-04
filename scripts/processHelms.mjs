import { PNG } from 'pngjs';
import fs from 'fs';
import path from 'path';

const IN_DIR = 'C:\\Users\\imaga\\Desktop\\helms  a convertir';
const OUT_DIR = 'C:\\Users\\imaga\\Desktop\\AOWEB\\public\\assets\\ao\\helms';

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

const files = fs.readdirSync(IN_DIR).filter(f => f.endsWith('.png'));

for (const file of files) {
  const inPath = path.join(IN_DIR, file);
  const outPath = path.join(OUT_DIR, file);
  
  const data = fs.readFileSync(inPath);
  const png = PNG.sync.read(data);
  
  // Convert black (0,0,0) to transparent
  for (let i = 0; i < png.data.length; i += 4) {
    if (png.data[i] === 0 && png.data[i+1] === 0 && png.data[i+2] === 0) {
      png.data[i+3] = 0; // Alpha = 0
    }
  }
  
  // Note: Since these are already formatted (user said 128x128 or 64x64), we'll just save them.
  const buffer = PNG.sync.write(png);
  fs.writeFileSync(outPath, buffer);
  console.log('Processed', file);
}
console.log('Finished processing helms.');
