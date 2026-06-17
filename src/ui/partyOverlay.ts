import Phaser from "phaser";

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

type PartyOverlayGlobal = typeof globalThis & {
  __aowebPartyOverlays?: PartyOverlay[];
};

export class PartyOverlay {
  private readonly container: HTMLDivElement;
  private readonly inviteInput: HTMLInputElement;
  private readonly membersList: HTMLDivElement;
  private readonly leaveBtn: HTMLButtonElement;
  
  private visible = false;
  private partyId: string | null = null;
  private leaderId: string | null = null;
  private localPlayerId: string | null = null;
  private members: PartyMemberInfo[] = [];

  constructor(private readonly scene: Phaser.Scene, private readonly handlers: PartyOverlayHandlers) {
    const globalOverlays = globalThis as PartyOverlayGlobal;
    globalOverlays.__aowebPartyOverlays?.forEach((overlay) => overlay.destroy());
    globalOverlays.__aowebPartyOverlays = [this];

    this.container = document.createElement("div");
    this.container.style.position = "absolute";
    this.container.style.top = "50%";
    this.container.style.left = "50%";
    this.container.style.transform = "translate(-50%, -50%)";
    this.container.style.width = "340px";
    this.container.style.maxHeight = "min(680px, calc(100vh - 32px))";
    this.container.style.boxSizing = "border-box";
    this.container.style.overflowY = "auto";
    this.container.style.background = "linear-gradient(180deg, rgba(28, 12, 10, 0.98), rgba(10, 8, 9, 0.98))";
    this.container.style.border = "1px solid #7d3028";
    this.container.style.borderRadius = "6px";
    this.container.style.padding = "14px";
    this.container.style.color = "#f3dcc5";
    this.container.style.fontFamily = "Arial, sans-serif";
    this.container.style.zIndex = "1100";
    this.container.style.display = "none";
    this.container.style.boxShadow = "0 16px 48px rgba(0, 0, 0, 0.65)";

    this.container.innerHTML = `
      <style>
        .ao-party-title { margin: 0 0 12px; text-align: center; font-size: 20px; color: #ffd9a6; font-weight: bold; }
        .ao-party-section { border-top: 1px solid rgba(196, 92, 72, 0.45); padding-top: 12px; margin-top: 12px; }
        .ao-party-section-title { margin: 0 0 8px; font-size: 12px; color: #d8a475; text-transform: uppercase; font-weight: bold; }
        .ao-party-invite-row { display: flex; gap: 8px; margin-bottom: 12px; }
        .ao-party-input { flex: 1; height: 26px; border: 1px solid #8f4737; background: #1a0a08; color: #ffe6c8; padding: 0 8px; font-size: 13px; border-radius: 4px; }
        .ao-party-input:focus { outline: none; border-color: #ffd9a6; }
        .ao-party-btn { height: 26px; min-width: 70px; border: 1px solid #8f4737; background: #2b1512; color: #ffe6c8; cursor: pointer; font-size: 12px; font-weight: bold; border-radius: 4px; box-sizing: border-box; }
        .ao-party-btn:hover { background: #3d1d18; }
        .ao-party-btn-danger { background: #661510; border-color: #992d24; color: #ffd9d6; }
        .ao-party-btn-danger:hover { background: #7a1a14; }
        .ao-party-members-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; max-height: 280px; overflow-y: auto; }
        .ao-party-member-card { display: flex; align-items: center; justify-content: space-between; background: rgba(30, 20, 20, 0.6); border: 1px solid #4a2520; border-radius: 4px; padding: 8px 10px; }
        .ao-party-member-card.local { border-color: #4da6ff; }
        .ao-party-member-info { flex: 1; display: flex; flex-direction: column; gap: 4px; }
        .ao-party-member-header { display: flex; align-items: center; justify-content: space-between; }
        .ao-party-member-name { font-size: 13px; font-weight: bold; }
        .ao-party-member-name.leader { color: #ffcc00; }
        .ao-party-member-name.local { color: #4da6ff; }
        .ao-party-member-level { font-size: 11px; color: #a69080; margin-right: 12px; }
        .ao-party-member-hp-container { display: flex; align-items: center; gap: 6px; }
        .ao-party-member-hp-bar { flex: 1; max-width: 140px; height: 8px; background: #330000; border: 1px solid #550000; border-radius: 2px; overflow: hidden; position: relative; }
        .ao-party-member-hp-fill { height: 100%; background: #ff3333; transition: width 0.2s ease; }
        .ao-party-member-hp-text { font-size: 11px; color: #d8a475; font-family: monospace; }
        .ao-party-btn-kick { width: 22px; height: 22px; border: 1px solid #992d24; background: #661510; color: #ffffff; font-weight: bold; cursor: pointer; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 11px; line-height: 1; }
        .ao-party-btn-kick:hover { background: #7a1a14; }
        .ao-party-empty { text-align: center; padding: 16px; font-size: 13px; color: #a69080; font-style: italic; }
        .ao-party-footer { display: flex; justify-content: space-between; border-top: 1px solid rgba(196, 92, 72, 0.45); padding-top: 12px; }
      </style>
      <h2 class="ao-party-title">Grupo</h2>
      
      <div class="ao-party-section">
        <h3 class="ao-party-section-title">Invitar jugador</h3>
        <div class="ao-party-invite-row">
          <input type="text" class="ao-party-input" id="ao-party-invite-input" placeholder="Nombre del jugador..." maxlength="20" />
          <button class="ao-party-btn" id="ao-party-invite-btn">Invitar</button>
        </div>
      </div>

      <div class="ao-party-section">
        <h3 class="ao-party-section-title">Miembros</h3>
        <div class="ao-party-members-list" id="ao-party-members"></div>
      </div>

      <div class="ao-party-footer">
        <button class="ao-party-btn ao-party-btn-danger" id="ao-party-leave-btn">SALIR</button>
        <button class="ao-party-btn" id="ao-party-close-btn">Cerrar</button>
      </div>
    `;

    document.body.appendChild(this.container);

    this.inviteInput = this.container.querySelector("#ao-party-invite-input")!;
    this.membersList = this.container.querySelector("#ao-party-members")!;
    this.leaveBtn = this.container.querySelector("#ao-party-leave-btn")!;

    // Stop keyboard events from bubbling up to Phaser's window listener
    const stopPropagation = (e: KeyboardEvent) => {
      e.stopPropagation();
    };
    this.inviteInput.addEventListener("keydown", (e) => {
      e.stopPropagation(); // Prevent Phaser key capture/preventDefault
      if (e.key === "Enter") {
        e.preventDefault();
        this.submitInvite();
      } else if (e.key === "Escape") {
        e.preventDefault();
        this.handlers.onClose();
      }
    });
    this.inviteInput.addEventListener("keyup", stopPropagation);
    this.inviteInput.addEventListener("keypress", stopPropagation);

    // Focus and blur events to suspend Phaser keyboard input
    this.inviteInput.addEventListener("focus", () => {
      if (this.scene.input?.keyboard) {
        this.scene.input.keyboard.enabled = false;
      }
    });
    this.inviteInput.addEventListener("blur", () => {
      if (this.scene.input?.keyboard) {
        this.scene.input.keyboard.enabled = true;
      }
    });

    // Event listeners
    this.container.querySelector("#ao-party-invite-btn")!.addEventListener("click", () => this.submitInvite());

    this.leaveBtn.addEventListener("click", () => {
      if (this.leaderId === this.localPlayerId) {
        this.handlers.onDissolve();
      } else {
        this.handlers.onLeave();
      }
    });

    this.container.querySelector("#ao-party-close-btn")!.addEventListener("click", () => this.handlers.onClose());
    
    // Global ESC handler
    document.addEventListener("keydown", this.handleDocumentKeyDown, true);
  }

  private handleDocumentKeyDown = (e: KeyboardEvent) => {
    if (this.isOpen() && e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      this.handlers.onClose();
    }
  };

  private submitInvite() {
    const targetName = this.inviteInput.value.trim();
    if (!targetName) return;
    this.handlers.onInvite(targetName);
    this.inviteInput.value = "";
  }

  show(localPlayerId: string | null) {
    this.localPlayerId = localPlayerId;
    this.visible = true;
    this.container.style.display = "block";
    this.renderMembers();
    
    // Focus input
    setTimeout(() => {
      this.inviteInput.focus();
      this.inviteInput.select();
    }, 40);
  }

  hide() {
    this.visible = false;
    this.container.style.display = "none";
    if (this.scene.input?.keyboard) {
      this.scene.input.keyboard.enabled = true; // Ensure keyboard is re-enabled
    }
  }

  isOpen() {
    return this.container.style.display === "block";
  }

  updateParty(partyId: string | null, leaderId: string | null, members: PartyMemberInfo[]) {
    this.partyId = partyId;
    this.leaderId = leaderId;
    this.members = members;
    this.renderMembers();
  }

  layout() {
    // Left backward compatibility wrapper (HTML is layout-independent of Phaser window resizing)
  }

  private renderMembers() {
    this.membersList.innerHTML = "";

    if (this.members.length === 0) {
      this.membersList.innerHTML = `<div class="ao-party-empty">Sin grupo actual.</div>`;
      this.leaveBtn.style.display = "none";
      return;
    }

    this.leaveBtn.style.display = "block";
    if (this.leaderId === this.localPlayerId) {
      this.leaveBtn.innerText = "DISOLVER";
    } else {
      this.leaveBtn.innerText = "SALIR";
    }

    for (const member of this.members) {
      const isLeader = member.id === this.leaderId;
      const isLocal = member.id === this.localPlayerId;

      const card = document.createElement("div");
      card.className = "ao-party-member-card";
      if (isLocal) {
        card.classList.add("local");
      }

      let nameStr = member.name;
      let nameClass = "";
      if (isLeader) {
        nameStr = `[LÍDER] ${member.name}`;
        nameClass = "leader";
      } else if (isLocal) {
        nameStr = `[TÚ] ${member.name}`;
        nameClass = "local";
      }

      const hpPct = Math.max(0, Math.min(100, (member.hp / member.hpMax) * 100));

      let kickBtnHtml = "";
      if (this.leaderId === this.localPlayerId && !isLocal) {
        kickBtnHtml = `<button class="ao-party-btn-kick" data-member-id="${member.id}">X</button>`;
      }

      card.innerHTML = `
        <div class="ao-party-member-info">
          <div class="ao-party-member-header">
            <span class="ao-party-member-name ${nameClass}">${nameStr}</span>
            <span class="ao-party-member-level">Nv. ${member.level}</span>
          </div>
          <div class="ao-party-member-hp-container">
            <div class="ao-party-member-hp-bar">
              <div class="ao-party-member-hp-fill" style="width: ${hpPct}%"></div>
            </div>
            <span class="ao-party-member-hp-text">${member.hp}/${member.hpMax}</span>
          </div>
        </div>
        ${kickBtnHtml}
      `;

      const kickBtn = card.querySelector(".ao-party-btn-kick");
      if (kickBtn) {
        kickBtn.addEventListener("click", () => {
          this.handlers.onKick(member.id);
        });
      }

      this.membersList.appendChild(card);
    }
  }

  destroy() {
    document.removeEventListener("keydown", this.handleDocumentKeyDown, true);
    this.container.remove();
  }
}
