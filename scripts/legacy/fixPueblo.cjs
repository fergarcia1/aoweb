const fs = require('fs');

function replaceInFile(file, search, rep) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    let newContent = content.split(search).join(rep);
    if(content !== newContent) {
      fs.writeFileSync(file, newContent);
      console.log('Updated ' + file);
    }
  }
}

replaceInFile('C:/Users/imaga/Desktop/AOWEB/src/data/characters.ts', '"pueblo"', '"mapa1"');
replaceInFile('C:/Users/imaga/Desktop/AOWEB/src/maps/worldMapLayout.ts', '"pueblo"', '"mapa1"');
replaceInFile('C:/Users/imaga/Desktop/AOWEB/src/npcs/npcDefinitions.ts', 'pueblo', 'mapa1');
replaceInFile('C:/Users/imaga/Desktop/AOWEB/src/npcs/npcDefinitions.ts', 'PUEBLO', 'MAPA1');
replaceInFile('C:/Users/imaga/Desktop/AOWEB/src/scenes/GameScene.ts', 'Pueblo', 'Ullathorpe');
replaceInFile('C:/Users/imaga/Desktop/AOWEB/src/scenes/gameSceneModules/GameSceneMobController.ts', 'pueblo', 'mapa1');
replaceInFile('C:/Users/imaga/Desktop/AOWEB/src/scenes/gameSceneModules/GameSceneMultiplayerController.ts', 'Pueblo', 'Ullathorpe');
replaceInFile('C:/Users/imaga/Desktop/AOWEB/server/src/systems/InventorySystem.ts', 'Pueblo', 'Ullathorpe');
