import Phaser from "phaser";
import {
  getAowebSkinInventoryCell,
  getAowebSkinLayout,
  scaleSkinX,
  scaleSkinY,
} from "./aowebSkinLayout";
import { registerPlayerHudAssets, setupPlayerHudTextures } from "./playerHudFrame";

const INVENTORY_UI_PATH = "/assets/ao/uiGrafica/";

const INVENTORY_UI_KEYS = {
  cornerTopLeft: "inventory_corner_top_left",
  cornerTopRight: "inventory_corner_top_right",
  cornerBottomLeft: "inventory_corner_bottom_left",
  cornerBottomRight: "inventory_corner_bottom_right",

  edgeTop: "inventory_edge_top",
  edgeBottom: "inventory_edge_bottom",
  edgeLeft: "inventory_edge_left",
  edgeRight: "inventory_edge_right",

  slotBase: "inventory_slot_base",
  panelBase: "inventory_panel_base",
  macroMark: "macroMark",
} as const;

const INVENTORY_UI_FILES = {
  cornerTopLeft: "cornerIzqSup.png",
  cornerTopRight: "cornerDerSup.png",
  cornerBottomLeft: "cornerIzqInf.png",
  cornerBottomRight: "cornerDerInf.png",

  edgeTop: "largoSup.png",
  edgeBottom: "largoInf.png",
  edgeLeft: "largoIzqInv.png",
  edgeRight: "largoDer.png",

  // Este es el PNG del slot individual.
  // Si tu base final se llama inventoryBase.png en vez de inventoryTile.png,
  // cambiá esta línea.
  slotBase: "inventoryTile.png",
  panelBase: "invetoryBase.png",
  macroMark: "macroMark.png",
} as const;

export type InventoryPanelOptions = {
  cols?: number;
  rows?: number;
  slotScale?: number;
  gap?: number;
  padding?: number;
  /** Sin marco ni tiles visibles (la skin ya dibuja la grilla). */
  frameless?: boolean;
};

export type InventoryPanel = {
  container: Phaser.GameObjects.Container;
  slots: Phaser.GameObjects.Image[];
  width: number;
  height: number;
  getSlotCenter: (slotIndex: number) => { x: number; y: number };
  getSlotBottomRight: (slotIndex: number) => { x: number; y: number };
  layoutGrid: (bounds: { x: number; y: number; w: number; h: number }) => void;
  layoutSkinGrid: (
    origin: { x: number; y: number },
    screenW: number,
    screenH: number
  ) => void;
  layoutSkinGridInPanel: (
    panel: { x: number; y: number; w: number; h: number },
    screenW: number,
    screenH: number
  ) => void;
  getSlotTopLeft: (slotIndex: number) => { x: number; y: number };
};

export function registerInventoryPanelAssets(scene: Phaser.Scene): void {
  scene.load.image(
    INVENTORY_UI_KEYS.cornerTopLeft,
    INVENTORY_UI_PATH + INVENTORY_UI_FILES.cornerTopLeft
  );

  scene.load.image(
    INVENTORY_UI_KEYS.cornerTopRight,
    INVENTORY_UI_PATH + INVENTORY_UI_FILES.cornerTopRight
  );

  scene.load.image(
    INVENTORY_UI_KEYS.cornerBottomLeft,
    INVENTORY_UI_PATH + INVENTORY_UI_FILES.cornerBottomLeft
  );

  scene.load.image(
    INVENTORY_UI_KEYS.cornerBottomRight,
    INVENTORY_UI_PATH + INVENTORY_UI_FILES.cornerBottomRight
  );

  scene.load.image(
    INVENTORY_UI_KEYS.edgeTop,
    INVENTORY_UI_PATH + INVENTORY_UI_FILES.edgeTop
  );

  scene.load.image(
    INVENTORY_UI_KEYS.edgeBottom,
    INVENTORY_UI_PATH + INVENTORY_UI_FILES.edgeBottom
  );

  scene.load.image(
    INVENTORY_UI_KEYS.edgeLeft,
    INVENTORY_UI_PATH + INVENTORY_UI_FILES.edgeLeft
  );

  scene.load.image(
    INVENTORY_UI_KEYS.edgeRight,
    INVENTORY_UI_PATH + INVENTORY_UI_FILES.edgeRight
  );

  scene.load.image(
    INVENTORY_UI_KEYS.slotBase,
    INVENTORY_UI_PATH + INVENTORY_UI_FILES.slotBase
  );
  scene.load.image(
    INVENTORY_UI_KEYS.panelBase,
    INVENTORY_UI_PATH + INVENTORY_UI_FILES.panelBase
  );
  scene.load.image(
    INVENTORY_UI_KEYS.macroMark,
    INVENTORY_UI_PATH + INVENTORY_UI_FILES.macroMark
  );
  registerPlayerHudAssets(scene);
}

export function setupInventoryPanelTextures(scene: Phaser.Scene): void {
  for (const key of Object.values(INVENTORY_UI_KEYS)) {
    const texture = scene.textures.get(key);

    if (texture.key !== "__MISSING") {
      texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
  }
  setupPlayerHudTextures(scene);
}

export function createInventoryPanel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  options: InventoryPanelOptions = {}
): InventoryPanel {
  const cols = options.cols ?? 5;
  const rows = options.rows ?? 4;
  const frameless = options.frameless ?? false;
  const slotScale = options.slotScale ?? 2;
  const gap = options.gap ?? 6;
  const padding = options.padding ?? 14;

  const slotTexture = scene.textures
    .get(INVENTORY_UI_KEYS.slotBase)
    .getSourceImage() as { width: number; height: number };

  const slotWidth = slotTexture.width * slotScale;
  const slotHeight = slotTexture.height * slotScale;

  const gridWidth = cols * slotWidth + (cols - 1) * gap;
  const gridHeight = rows * slotHeight + (rows - 1) * gap;

  const panelWidth = gridWidth + padding * 2;
  const panelHeight = gridHeight + padding * 2;
  const gridStartX = (panelWidth - gridWidth) / 2;

  const container = scene.add.container(x, y);
  container.setScrollFactor(0);

  if (!frameless) {
    createInventoryFrame(scene, container, panelWidth, panelHeight);

    const panelBase = scene.add.image(
      gridStartX,
      padding,
      INVENTORY_UI_KEYS.panelBase
    );
    panelBase.setOrigin(0, 0);
    panelBase.setDisplaySize(gridWidth, gridHeight);
    container.add(panelBase);
  }

  const slots: Phaser.GameObjects.Image[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const slotIndex = row * cols + col;

      const slotX = gridStartX + col * (slotWidth + gap);
      const slotY = padding + row * (slotHeight + gap);

      const slot = scene.add.image(
        slotX,
        slotY,
        INVENTORY_UI_KEYS.slotBase
      );

      slot.setOrigin(0, 0);
      slot.setDisplaySize(slotWidth, slotHeight);
      slot.setData("slotIndex", slotIndex);
      if (frameless) {
        // Mantener los slots "invisibles" pero clickeables en la skin.
        slot.setAlpha(0.001);
      }

      container.add(slot);
      slots.push(slot);
    }
  }

  const layoutGrid = (bounds: { x: number; y: number; w: number; h: number }) => {
    container.setPosition(bounds.x, bounds.y);
    const slotGap = 2;
    const slotW = Math.floor((bounds.w - slotGap * (cols - 1)) / cols);
    const slotH = Math.floor((bounds.h - slotGap * (rows - 1)) / rows);
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const slotIndex = row * cols + col;
        const slot = slots[slotIndex];
        const slotX = col * (slotW + slotGap);
        const slotY = row * (slotH + slotGap);
        slot.setPosition(slotX, slotY);
        slot.setDisplaySize(slotW, slotH);
      }
    }
  };

  const positionSkinGridSlots = (
    slotW: number,
    slotH: number,
    gapX: number,
    gapY: number
  ) => {
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const slotIndex = row * cols + col;
        const slot = slots[slotIndex];
        slot.setPosition(col * (slotW + gapX), row * (slotH + gapY));
        slot.setDisplaySize(slotW, slotH);
      }
    }
  };

  const layoutSkinGrid = (
    origin: { x: number; y: number },
    screenW: number,
    screenH: number
  ) => {
    const cell = getAowebSkinInventoryCell();
    const slotW = scaleSkinX(cell.w, screenW);
    const slotH = scaleSkinY(cell.h, screenH);
    const gapX = scaleSkinX(cell.gapX, screenW);
    const gapY = scaleSkinY(cell.gapY, screenH);
    const ox = scaleSkinX(origin.x, screenW);
    const oy = scaleSkinY(origin.y, screenH);
    container.setPosition(ox, oy);
    positionSkinGridSlots(slotW, slotH, gapX, gapY);
  };

  const layoutSkinGridInPanel = (
    panel: { x: number; y: number; w: number; h: number },
    screenW: number,
    screenH: number
  ) => {
    const cell = getAowebSkinInventoryCell();
    const slotW = scaleSkinX(cell.w, screenW);
    const slotH = scaleSkinY(cell.h, screenH);
    const gapX = scaleSkinX(cell.gapX, screenW);
    const gapY = scaleSkinY(cell.gapY, screenH);
    const gridW = cols * slotW + (cols - 1) * gapX;
    const gridH = rows * slotH + (rows - 1) * gapY;
    const px = scaleSkinX(panel.x, screenW);
    const py = scaleSkinY(panel.y, screenH);
    const pw = scaleSkinX(panel.w, screenW);
    const ph = scaleSkinY(panel.h, screenH);
    const gridPad = getAowebSkinLayout().inventoryGridPad ?? { top: 0, left: 0 };
    const padTop = scaleSkinY(gridPad.top, screenH);
    const padLeft = scaleSkinX(gridPad.left, screenW);
    const ox = px + Math.max(0, Math.floor((pw - gridW) / 2)) + padLeft;
    const oy =
      gridPad.top > 0
        ? py + padTop
        : py + Math.max(0, Math.floor((ph - gridH) / 2)) + padTop;
    container.setPosition(ox, oy);
    positionSkinGridSlots(slotW, slotH, gapX, gapY);
  };

  return {
    container,
    slots,
    width: panelWidth,
    height: panelHeight,
    layoutGrid,
    layoutSkinGrid,
    layoutSkinGridInPanel,
    getSlotTopLeft: (slotIndex: number) => {
      const slot = slots[slotIndex];
      return { x: slot.x + 2, y: slot.y + 2 };
    },
    getSlotCenter: (slotIndex: number) => {
      const slot = slots[slotIndex];

      return {
        x: slot.x + slot.displayWidth / 2,
        y: slot.y + slot.displayHeight / 2,
      };
    },
    getSlotBottomRight: (slotIndex: number) => {
      const slot = slots[slotIndex];

      return {
        x: slot.x + slot.displayWidth - 3,
        y: slot.y + slot.displayHeight - 3,
      };
    },
  };
}

function createInventoryFrame(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  width: number,
  height: number
): void {
  const cornerTexture = scene.textures
    .get(INVENTORY_UI_KEYS.cornerTopLeft)
    .getSourceImage() as { width: number; height: number };

  const cornerWidth = cornerTexture.width;
  const cornerHeight = cornerTexture.height;

  const edgeWidth = width - cornerWidth * 2;
  const edgeHeight = height - cornerHeight * 2;

  const background = scene.add.rectangle(
    cornerWidth,
    cornerHeight,
    edgeWidth,
    edgeHeight,
    0x111111,
    0.85
  );
  background.setOrigin(0, 0);
  container.add(background);

  const topLeft = scene.add.image(
    0,
    0,
    INVENTORY_UI_KEYS.cornerTopLeft
  );
  topLeft.setOrigin(0, 0);

  const topRight = scene.add.image(
    width - cornerWidth,
    0,
    INVENTORY_UI_KEYS.cornerTopRight
  );
  topRight.setOrigin(0, 0);

  const bottomLeft = scene.add.image(
    0,
    height - cornerHeight,
    INVENTORY_UI_KEYS.cornerBottomLeft
  );
  bottomLeft.setOrigin(0, 0);

  const bottomRight = scene.add.image(
    width - cornerWidth,
    height - cornerHeight,
    INVENTORY_UI_KEYS.cornerBottomRight
  );
  bottomRight.setOrigin(0, 0);

  const topEdge = scene.add.tileSprite(
    cornerWidth,
    0,
    edgeWidth,
    cornerHeight,
    INVENTORY_UI_KEYS.edgeTop
  );
  topEdge.setOrigin(0, 0);

  const bottomEdge = scene.add.tileSprite(
    cornerWidth,
    height - cornerHeight,
    edgeWidth,
    cornerHeight,
    INVENTORY_UI_KEYS.edgeBottom
  );
  bottomEdge.setOrigin(0, 0);

  const leftEdge = scene.add.tileSprite(
    0,
    cornerHeight,
    cornerWidth,
    edgeHeight,
    INVENTORY_UI_KEYS.edgeLeft
  );
  leftEdge.setOrigin(0, 0);

  const rightEdge = scene.add.tileSprite(
    width - cornerWidth,
    cornerHeight,
    cornerWidth,
    edgeHeight,
    INVENTORY_UI_KEYS.edgeRight
  );
  rightEdge.setOrigin(0, 0);

  container.add([
    background,
    topEdge,
    bottomEdge,
    leftEdge,
    rightEdge,
    topLeft,
    topRight,
    bottomLeft,
    bottomRight,
  ]);
}