import Phaser from "phaser";
import { CharacterSelectScene } from "./scenes/CharacterSelectScene";
import { GameScene } from "./scenes/GameScene";
import { setupAppNavbar } from "./ui/appNavbar";
import { reportStartupError, setupErrorDiagnostics } from "./debug/errorDiagnostics";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game",
  width: 800,
  height: 600,
  // Fondo fuera de los tiles del mapa (cuando la cámara sale del borde).
  backgroundColor: "#2f3918",
  antialias: false,
  pixelArt: true,
  autoRound: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [GameScene, CharacterSelectScene],
};

setupErrorDiagnostics();

try {
  const game = new Phaser.Game(config);
  setupAppNavbar(game);
} catch (error) {
  reportStartupError(error);
  throw error;
}
