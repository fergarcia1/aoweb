import Phaser from "phaser";
import { Facing } from "../../player/playerSprites";
import { STEP_DURATION_MS } from "../../config";
import { loadKeybindings, type Keybindings } from "../../config/keybindings";
import type { MoveDirection } from "./types";

export type InputHandlers = {
  shouldCaptureInput: () => boolean;
  onMacroHotkey: (macroIndex: number) => void;
  isWorldPointerBlocked: () => boolean;
  onRightClick: (pointer: Phaser.Input.Pointer, currentlyOver: Phaser.GameObjects.GameObject[]) => void;
  onPointerDown: (pointer: Phaser.Input.Pointer, currentlyOver: Phaser.GameObjects.GameObject[]) => void;
};

/**
 * Gestiona la entrada de teclado y ratón de Phaser, el stack de movimiento
 * y la traducción de teclas en intenciones de juego.
 */
export class InputManager {
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
  };
  private attackKey!: Phaser.Input.Keyboard.Key;
  private equipSelectedSlotKey!: Phaser.Input.Keyboard.Key;
  private dropSelectedSlotKey!: Phaser.Input.Keyboard.Key;
  private pickupKey!: Phaser.Input.Keyboard.Key;
  private useItemKey!: Phaser.Input.Keyboard.Key;
  private meditateKey!: Phaser.Input.Keyboard.Key;
  private worldMapToggleKey!: Phaser.Input.Keyboard.Key;
  private partyToggleKey!: Phaser.Input.Keyboard.Key;
  private cancelSpellTargetingKey!: Phaser.Input.Keyboard.Key;
  private bindings: Keybindings = loadKeybindings();

  private movementKeyStack: Facing[] = [];
  private bufferedMovementTap: { facing: Facing; expiresAt: number } | null = null;
  
  private lastMacroCode: string | null = null;

  constructor(private scene: Phaser.Scene, private handlers: InputHandlers) {
    this.setupInput();
    this.setupPointerInput();
  }

  private setupInput() {
    if (!this.scene.input.keyboard) {
      return;
    }

    this.cursors = this.scene.input.keyboard.createCursorKeys();
    this.refreshKeybindings();
    this.meditateKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.N);
    this.worldMapToggleKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M);
    this.partyToggleKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);
    this.cancelSpellTargetingKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

    this.scene.input.keyboard.on("keydown", (event: KeyboardEvent) => {
      this.recordMovementKeyDown(event);
      this.handleMacroHotkey(event);
    });
    this.scene.input.keyboard.on("keyup", (event: KeyboardEvent) => {
      this.recordMovementKeyUp(event);
    });
  }

  public refreshKeybindings(): void {
    if (!this.scene.input.keyboard) {
      return;
    }

    this.bindings = loadKeybindings();
    this.wasd = {
      up: this.scene.input.keyboard.addKey(this.bindings.moveUp),
      down: this.scene.input.keyboard.addKey(this.bindings.moveDown),
      left: this.scene.input.keyboard.addKey(this.bindings.moveLeft),
      right: this.scene.input.keyboard.addKey(this.bindings.moveRight),
    };
    this.attackKey = this.scene.input.keyboard.addKey(this.bindings.attack);
    this.equipSelectedSlotKey = this.scene.input.keyboard.addKey(this.bindings.equip);
    this.dropSelectedSlotKey = this.scene.input.keyboard.addKey(this.bindings.drop);
    this.useItemKey = this.scene.input.keyboard.addKey(this.bindings.useItem);
    this.pickupKey = this.scene.input.keyboard.addKey(this.bindings.pickup);
  }

  private setupPointerInput() {
    this.scene.game.canvas.addEventListener("contextmenu", (event) => {
      event.preventDefault();
    });

    this.scene.input.on("pointerdown", (pointer: Phaser.Input.Pointer, currentlyOver: Phaser.GameObjects.GameObject[]) => {
      if (this.handlers.isWorldPointerBlocked()) {
        return;
      }
      
      if (pointer.rightButtonDown()) {
          this.handlers.onRightClick(pointer, currentlyOver);
      } else {
          this.handlers.onPointerDown(pointer, currentlyOver);
      }
    });
  }

  private recordMovementKeyDown(event: KeyboardEvent): void {
    const facing = this.directionFromKeyboardEvent(event);
    if (!facing || event.repeat || !this.handlers.shouldCaptureInput()) {
      return;
    }
    this.movementKeyStack = this.movementKeyStack.filter((entry) => entry !== facing);
    this.movementKeyStack.push(facing);
    this.bufferedMovementTap = {
      facing,
      expiresAt: Date.now() + STEP_DURATION_MS + 140,
    };
  }

  private recordMovementKeyUp(event: KeyboardEvent): void {
    const facing = this.directionFromKeyboardEvent(event);
    if (!facing) {
      return;
    }
    this.movementKeyStack = this.movementKeyStack.filter((entry) => entry !== facing);
  }

  private directionFromKeyboardEvent(event: KeyboardEvent): Facing | null {
    if (event.keyCode === this.bindings.moveUp || event.code === "ArrowUp") return "up";
    if (event.keyCode === this.bindings.moveDown || event.code === "ArrowDown") return "down";
    if (event.keyCode === this.bindings.moveLeft || event.code === "ArrowLeft") return "left";
    if (event.keyCode === this.bindings.moveRight || event.code === "ArrowRight") return "right";
    return null;
  }

  private handleMacroHotkey(event: KeyboardEvent) {
    if (!event.code || !this.handlers.shouldCaptureInput()) {
      return;
    }
    
    // Simplistic macro index detection for Digits 0-9
    if (event.code.startsWith("Digit")) {
        const digit = parseInt(event.code.slice(5), 10);
        const macroIndex = (digit === 0) ? 9 : digit - 1;
        this.handlers.onMacroHotkey(macroIndex);
        return;
    }
    
    // The scene will handle custom key bindings via its own macro state if needed,
    // but we notify that A key was pressed.
    this.lastMacroCode = event.code;
  }

  public getTopPressedFacing(): Facing | null {
    for (let index = this.movementKeyStack.length - 1; index >= 0; index -= 1) {
      const facing = this.movementKeyStack[index];
      if (this.isFacingPressed(facing)) {
        return facing;
      }
      this.movementKeyStack.splice(index, 1);
    }
    return null;
  }

  public isFacingPressed(facing: Facing): boolean {
    if (facing === "up") return this.cursors.up.isDown || this.wasd.up.isDown;
    if (facing === "down") return this.cursors.down.isDown || this.wasd.down.isDown;
    if (facing === "left") return this.cursors.left.isDown || this.wasd.left.isDown;
    return this.cursors.right.isDown || this.wasd.right.isDown;
  }

  private consumeBufferedMovementTap(): Facing | null {
    const buffered = this.bufferedMovementTap;
    if (!buffered) return null;
    this.bufferedMovementTap = null;
    if (Date.now() > buffered.expiresAt) return null;
    return buffered.facing;
  }

  public getPressedDirection(): MoveDirection | null {
    const facing = this.consumeBufferedMovementTap() ?? this.getTopPressedFacing();
    if (!facing) return null;
    
    if (facing === "up") return { dx: 0, dy: -1, facing };
    if (facing === "down") return { dx: 0, dy: 1, facing };
    if (facing === "left") return { dx: -1, dy: 0, facing };
    return { dx: 1, dy: 0, facing };
  }

  // Getters for justPressed/isDown flags needed by processGameSceneFrameInput
  public get justPressedWorldMapToggle() { return Phaser.Input.Keyboard.JustDown(this.worldMapToggleKey); }
  public get justPressedPartyToggle() { return Phaser.Input.Keyboard.JustDown(this.partyToggleKey); }
  public get justPressedCancelTargeting() { return Phaser.Input.Keyboard.JustDown(this.cancelSpellTargetingKey); }
  public get justPressedMeditate() { return Phaser.Input.Keyboard.JustDown(this.meditateKey); }
  public get justPressedEquipSlot() { return Phaser.Input.Keyboard.JustDown(this.equipSelectedSlotKey); }
  public get justPressedDropSlot() { return Phaser.Input.Keyboard.JustDown(this.dropSelectedSlotKey); }
  public get justPressedPickup() { return Phaser.Input.Keyboard.JustDown(this.pickupKey); }
  public get justPressedUseItem() { return Phaser.Input.Keyboard.JustDown(this.useItemKey); }
  public get isAttackKeyDown() { return this.attackKey.isDown; }
  
  public get hasCursors() { return Boolean(this.cursors && this.wasd); }
  
  public getLastMacroCode() {
      const code = this.lastMacroCode;
      this.lastMacroCode = null;
      return code;
  }
}
