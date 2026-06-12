import Phaser from "phaser";
import { GAME_FONT, GAME_TEXT_RESOLUTION } from "./fonts";

const UI_DEPTH = 1000;

export type PartyMemberInfo = {
  id: string;
  name: string;
  level: number;
  hp: number;
  hpMax: number;
};

export type PartyOverlayHandlers = {
  onInvite: (targetName: string) => void;
  onKick: (targetId: string) => void;
  onLeave: () => void;
  onDissolve: () => void;
  onClose: () => void;
};

export class PartyOverlay {
  private container: Phaser.GameObjects.Container;
  private backdrop: Phaser.GameObjects.Graphics;
  private panel: Phaser.GameObjects.Graphics;
  private title: Phaser.GameObjects.Text;
  private inviteLabel: Phaser.GameObjects.Text;
  private inviteInputBg: Phaser.GameObjects.Graphics;
  private inviteInputText: Phaser.GameObjects.Text;
  private inviteBtn: Phaser.GameObjects.Graphics;
  private inviteBtnLabel: Phaser.GameObjects.Text;
  private inviteZone: Phaser.GameObjects.Zone;
  private membersContainer: Phaser.GameObjects.Container;
  private leaveBtn: Phaser.GameObjects.Graphics;
  private leaveLabel: Phaser.GameObjects.Text;
  private leaveZone: Phaser.GameObjects.Zone;
  private closeBtn: Phaser.GameObjects.Graphics;
  private closeLabel: Phaser.GameObjects.Text;
  private closeZone: Phaser.GameObjects.Zone;

  private visible = false;
  private partyId: string | null = null;
  private leaderId: string | null = null;
  private localPlayerId: string | null = null;
  private inviteInputValue = "";
  private members: PartyMemberInfo[] = [];

  constructor(private scene: Phaser.Scene, private handlers: PartyOverlayHandlers) {
    this.container = scene.add.container(0, 0).setDepth(UI_DEPTH + 100).setVisible(false);
    
    this.backdrop = scene.add.graphics();
    this.backdrop.fillStyle(0x000000, 0.6);
    
    this.panel = scene.add.graphics();
    
    this.title = scene.add.text(0, 0, "Grupo", {
      fontFamily: GAME_FONT,
      fontSize: "20px",
      color: "#ffffff",
      fontStyle: "bold",
      resolution: GAME_TEXT_RESOLUTION,
    }).setOrigin(0.5, 0);

    this.inviteLabel = scene.add.text(0, 0, "Invitar jugador", {
      fontFamily: GAME_FONT,
      fontSize: "13px",
      color: "#cccccc",
      resolution: GAME_TEXT_RESOLUTION,
    });
    this.inviteInputBg = scene.add.graphics();
    this.inviteInputText = scene.add.text(0, 0, "", {
      fontFamily: GAME_FONT,
      fontSize: "14px",
      color: "#ffffff",
      resolution: GAME_TEXT_RESOLUTION,
    });
    this.inviteBtn = scene.add.graphics();
    this.inviteBtnLabel = scene.add.text(0, 0, "Invitar", {
      fontFamily: GAME_FONT,
      fontSize: "14px",
      color: "#ffffff",
      resolution: GAME_TEXT_RESOLUTION,
    }).setOrigin(0.5, 0.5);
    this.inviteZone = scene.add.zone(0, 0, 80, 30).setInteractive({ useHandCursor: true });
    this.inviteZone.on("pointerdown", () => this.submitInvite());

    this.membersContainer = scene.add.container(0, 0);

    this.leaveBtn = scene.add.graphics();
    this.leaveLabel = scene.add.text(0, 0, "Salir del Grupo", {
      fontFamily: GAME_FONT,
      fontSize: "14px",
      color: "#ffffff",
      resolution: GAME_TEXT_RESOLUTION,
    }).setOrigin(0.5, 0.5);
    this.leaveZone = scene.add.zone(0, 0, 140, 30).setInteractive({ useHandCursor: true });
    this.leaveZone.on("pointerdown", () => {
      if (this.leaderId === this.localPlayerId) {
        this.handlers.onDissolve();
        return;
      }
      this.handlers.onLeave();
    });

    this.closeBtn = scene.add.graphics();
    this.closeLabel = scene.add.text(0, 0, "Cerrar", {
      fontFamily: GAME_FONT,
      fontSize: "14px",
      color: "#ffffff",
      resolution: GAME_TEXT_RESOLUTION,
    }).setOrigin(0.5, 0.5);
    this.closeZone = scene.add.zone(0, 0, 80, 30).setInteractive({ useHandCursor: true });
    this.closeZone.on("pointerdown", () => this.handlers.onClose());

    this.container.add([
      this.backdrop,
      this.panel,
      this.title,
      this.inviteLabel,
      this.inviteInputBg,
      this.inviteInputText,
      this.inviteBtn,
      this.inviteBtnLabel,
      this.inviteZone,
      this.membersContainer,
      this.leaveBtn,
      this.leaveLabel,
      this.leaveZone,
      this.closeBtn,
      this.closeLabel,
      this.closeZone,
    ]);

    scene.input.keyboard?.on("keydown", (event: KeyboardEvent) => this.handleKeyDown(event));
  }

  show(localPlayerId: string | null) {
    this.localPlayerId = localPlayerId;
    this.visible = true;
    this.container.setVisible(true);
    this.renderMembers();
    this.layout();
  }

  hide() {
    this.visible = false;
    this.container.setVisible(false);
  }

  isOpen() {
    return this.visible;
  }

  updateParty(partyId: string | null, leaderId: string | null, members: PartyMemberInfo[]) {
    this.partyId = partyId;
    this.leaderId = leaderId;
    this.members = members;
    this.renderMembers();
    if (this.visible) this.layout();
  }

  private renderMembers() {
    this.membersContainer.removeAll(true);
    let y = 0;
    const cardW = 280;
    const cardH = 50;
    const hpBarW = 120;
    const hpBarH = 8;

    if (this.members.length === 0) {
      const empty = this.scene.add.text(0, 0, "Sin grupo actual.", {
        fontFamily: GAME_FONT,
        fontSize: "14px",
        color: "#cccccc",
        resolution: GAME_TEXT_RESOLUTION,
      });
      this.membersContainer.add(empty);
      return;
    }

    for (const member of this.members) {
      const isLeader = member.id === this.leaderId;
      const isLocal = member.id === this.localPlayerId;
      
      const card = this.scene.add.graphics();
      card.fillStyle(0x222222, 1);
      card.lineStyle(1, isLocal ? 0x4da6ff : 0x444444, 1);
      card.fillRoundedRect(0, y, cardW, cardH, 4);
      card.strokeRoundedRect(0, y, cardW, cardH, 4);
      
      let nameStr = member.name;
      let nameColor = "#ffffff";
      if (isLeader) {
        nameStr = `[LÍDER] ${member.name}`;
        nameColor = "#ffcc00";
      } else if (isLocal) {
        nameStr = `[TÚ] ${member.name}`;
        nameColor = "#4da6ff";
      }

      const name = this.scene.add.text(10, y + 8, nameStr, {
        fontFamily: GAME_FONT,
        fontSize: "14px",
        color: nameColor,
        fontStyle: "bold",
        resolution: GAME_TEXT_RESOLUTION,
      });
      
      const level = this.scene.add.text(cardW - 10, y + 10, `Nv. ${member.level}`, {
        fontFamily: GAME_FONT,
        fontSize: "11px",
        color: "#999999",
        resolution: GAME_TEXT_RESOLUTION,
      }).setOrigin(1, 0);

      // HP Bar
      const hpBg = this.scene.add.graphics();
      hpBg.fillStyle(0x330000, 1);
      hpBg.fillRect(10, y + 30, hpBarW, hpBarH);
      
      const hpFill = this.scene.add.graphics();
      const pct = Math.max(0, Math.min(1, member.hp / member.hpMax));
      hpFill.fillStyle(0xff3333, 1);
      hpFill.fillRect(10, y + 30, hpBarW * pct, hpBarH);

      const hpText = this.scene.add.text(10 + hpBarW + 8, y + 27, `${member.hp}/${member.hpMax}`, {
        fontFamily: GAME_FONT,
        fontSize: "11px",
        color: "#cccccc",
        resolution: GAME_TEXT_RESOLUTION,
      });

      this.membersContainer.add([card, name, level, hpBg, hpFill, hpText]);

      if (this.leaderId === this.localPlayerId && !isLocal) {
        const kickBtn = this.scene.add.graphics();
        const kickLabel = this.scene.add.text(0, 0, "X", {
          fontFamily: GAME_FONT,
          fontSize: "12px",
          color: "#ffffff",
          fontStyle: "bold",
          resolution: GAME_TEXT_RESOLUTION,
        }).setOrigin(0.5, 0.5);
        
        const btnX = cardW - 35;
        const btnY = y + 25;
        const btnSize = 22;

        kickBtn.fillStyle(0x772222, 1);
        kickBtn.lineStyle(1, 0xaa5555, 1);
        kickBtn.fillRoundedRect(btnX, btnY, btnSize, btnSize, 2);
        kickBtn.strokeRoundedRect(btnX, btnY, btnSize, btnSize, 2);
        
        kickLabel.setPosition(btnX + btnSize / 2, btnY + btnSize / 2);
        
        const kickZone = this.scene.add.zone(btnX + btnSize / 2, btnY + btnSize / 2, btnSize, btnSize).setInteractive({ useHandCursor: true });
        kickZone.on("pointerdown", () => this.handlers.onKick(member.id));
        
        this.membersContainer.add([kickBtn, kickLabel, kickZone]);
      }
      y += 60;
    }
  }

  private submitInvite() {
    const targetName = this.inviteInputValue.trim();
    if (!targetName) {
      return;
    }
    this.handlers.onInvite(targetName);
    this.inviteInputValue = "";
    this.syncInviteInputText();
  }

  private syncInviteInputText() {
    this.inviteInputText.setText(this.inviteInputValue ? `> ${this.inviteInputValue}` : "> ");
  }

  private handleKeyDown(event: KeyboardEvent) {
    if (!this.visible) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (event.key === "Escape") {
      this.handlers.onClose();
      return;
    }
    if (event.key === "Enter") {
      this.submitInvite();
      return;
    }
    if (event.key === "Backspace") {
      this.inviteInputValue = this.inviteInputValue.slice(0, -1);
      this.syncInviteInputText();
      return;
    }
    if (
      event.key.length === 1 &&
      !event.repeat &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey &&
      this.inviteInputValue.length < 20
    ) {
      this.inviteInputValue += event.key;
      this.syncInviteInputText();
    }
  }

  layout() {
    const w = this.scene.scale.width;
    const h = this.scene.scale.height;
    
    this.backdrop.clear().fillRect(0, 0, w, h);
    
    const panelW = 340;
    const panelH = 420;
    const x = (w - panelW) / 2;
    const y = (h - panelH) / 2;
    
    this.panel.clear();
    this.panel.fillStyle(0x111111, 0.98);
    this.panel.lineStyle(2, 0x4da6ff, 1);
    this.panel.fillRoundedRect(x, y, panelW, panelH, 8);
    this.panel.strokeRoundedRect(x, y, panelW, panelH, 8);
    
    // Header divider
    this.panel.lineStyle(1, 0x333333, 1);
    this.panel.lineBetween(x + 15, y + 45, x + panelW - 15, y + 45);

    this.title.setPosition(x + panelW / 2, y + 15);
    
    // Invite Section
    this.inviteLabel.setPosition(x + 30, y + 55);
    this.inviteInputBg.clear();
    this.inviteInputBg.fillStyle(0x000000, 1).fillRect(x + 30, y + 78, 200, 30);
    this.inviteInputBg.lineStyle(1, 0x444444, 1).strokeRect(x + 30, y + 78, 200, 30);
    this.inviteInputText.setPosition(x + 38, y + 84);
    this.syncInviteInputText();

    this.inviteBtn.clear();
    this.inviteBtn.fillStyle(0x2d5a27, 1); // Dark green for invite
    this.inviteBtn.lineStyle(1, 0x4caf50, 1);
    this.inviteBtn.fillRoundedRect(x + 240, y + 78, 70, 30, 2);
    this.inviteBtn.strokeRoundedRect(x + 240, y + 78, 70, 30, 2);
    this.inviteBtnLabel.setPosition(x + 275, y + 93);
    this.inviteZone.setPosition(x + 275, y + 93).setSize(70, 30);

    this.membersContainer.setPosition(x + 30, y + 125);
    
    const btnY = y + panelH - 35;
    
    // Leave Button
    this.leaveBtn.clear();
    this.leaveBtn.fillStyle(0x772222, 1);
    this.leaveBtn.lineStyle(1, 0xaa5555, 1);
    this.leaveBtn.fillRoundedRect(x + 30, btnY - 15, 140, 30, 4);
    this.leaveBtn.strokeRoundedRect(x + 30, btnY - 15, 140, 30, 4);
    this.leaveLabel.setPosition(x + 100, btnY);
    this.leaveZone.setPosition(x + 100, btnY).setSize(140, 30);
    
    // Close Button
    this.closeBtn.clear();
    this.closeBtn.fillStyle(0x333333, 1);
    this.closeBtn.lineStyle(1, 0x666666, 1);
    this.closeBtn.fillRoundedRect(x + panelW - 110, btnY - 15, 80, 30, 4);
    this.closeBtn.strokeRoundedRect(x + panelW - 110, btnY - 15, 80, 30, 4);
    this.closeLabel.setPosition(x + panelW - 70, btnY);
    this.closeZone.setPosition(x + panelW - 70, btnY).setSize(80, 30);

    if (this.leaderId === this.localPlayerId) {
       this.leaveLabel.setText("DISOLVER");
       this.leaveBtn.fillStyle(0x992222, 1); // Brighter red for leader dissolve
    } else {
       this.leaveLabel.setText("SALIR");
    }
  }
}
