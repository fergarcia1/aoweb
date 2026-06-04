import * as fs from "fs";
import * as path from "path";
import { Jimp } from "jimp";

export async function convertBmpToPng(fileNums: number[]) {
  const sourceDir = "C:/Users/imaga/Desktop/imperiumclassic/Imperium-Clasico/Fixtures/Recursos descomprimidos/Graficos";
  const targetDir = "public/assets/ao/graficos";

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  console.log(`Convirtiendo ${fileNums.length} imágenes BMP a PNG con fondo transparente...`);

  for (const num of fileNums) {
    const bmpPath = path.join(sourceDir, `${num}.bmp`);
    const pngPath = path.join(targetDir, `${num}.png`);

    if (!fs.existsSync(bmpPath)) {
      console.warn(`No se encontró el archivo: ${bmpPath}`);
      continue;
    }

    try {
      const image = await Jimp.read(bmpPath);
      // Make black transparent
      image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
        const r = this.bitmap.data[idx];
        const g = this.bitmap.data[idx + 1];
        const b = this.bitmap.data[idx + 2];
        if (r === 0 && g === 0 && b === 0) {
          this.bitmap.data[idx + 3] = 0; // Alpha
        }
      });
      await image.write(pngPath);
      console.log(`Convertido: ${num}.bmp -> ${num}.png`);
    } catch (e) {
      console.error(`Error procesando ${num}.bmp:`, e);
    }
  }
}

const args = process.argv.slice(2);
if (args[0]) {
  try {
    const deps = JSON.parse(fs.readFileSync(args[0], "utf-8"));
    convertBmpToPng(deps);
  } catch(e) {
    console.error("Error leyendo archivo de deps", e);
  }
}
