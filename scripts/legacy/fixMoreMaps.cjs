const fs = require('fs');

let file = 'C:/Users/imaga/Desktop/AOWEB/src/data/mobs.json';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/"bosque"/g, '"mapa2"')
                 .replace(/"montana"/g, '"mapa3"')
                 .replace(/"desierto"/g, '"mapa4"')
                 .replace(/"pueblo"/g, '"mapa1"');
fs.writeFileSync(file, content);

file = 'C:/Users/imaga/Desktop/AOWEB/src/maps/worldMapLayout.ts';
content = fs.readFileSync(file, 'utf8');
content = content.replace(/"bosque"/g, '"mapa2"')
                 .replace(/"montana"/g, '"mapa3"')
                 .replace(/"desierto"/g, '"mapa4"');
fs.writeFileSync(file, content);
