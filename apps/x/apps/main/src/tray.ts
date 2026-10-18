import { app, Menu, Tray, nativeImage } from "electron";
import { toggleQuickAsk } from "./quick-ask.js";

/**
 * Menu bar / system tray presence (Granola-style resident app).
 *
 * The icon is a robot-head glyph pre-rendered as a macOS "template"
 * image (pure black + alpha). Embedded as base64 so the tray never
 * depends on asset paths that differ between dev and packaged layouts.
 * Template rendering makes macOS tint it correctly in light/dark menu
 * bars and while highlighted.
 */
const TRAY_ICON_18 =
  "iVBORw0KGgoAAAANSUhEUgAAABIAAAASCAYAAABWzo5XAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAEOSURBVDhPvdIxSwMxGMbxsyI4FRUcBCv4IcS9LuLcRehUJ79BoR/BjoKL4OLs0KlVBxfBodShoFCcFEsp1A9QEP0/ZwKJ5nrlLH3gR8ib5CU5Lpp3Nsz4r9TwijpyKmTNPb7wjEUVsmYXutF+PJsyunoJp7jAuRnfcOnMz1DGEoKpQs+Y1gkW4GUZTwgdSNLHOrys4QXa8IEj7KFjao9mXoHWbaMCvKyiB224UcGkCdWu49lPWlDtHZsquElqZA+Fmqc20tVvcYdPU9P4ANVHppbayBqjgSszduGuBxutwH5sq40dxzHc9QG24EW/v67ubkyjF+TxJwfQdUOHfhviEInRm4vQPzPJNmadKPoGowN6hc1Fl6QAAAAASUVORK5CYII=";
const TRAY_ICON_36 =
  "iVBORw0KGgoAAAANSUhEUgAAACQAAAAkCAYAAADhAJiYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAEOSURBVFhH7ZchDgIxEEUrkUgkR0AiOQISyRGQSG6ARCIRCCQSwQGQSCQSiYT/SZpMNgPbbWdTCH3JE5DZ4W+7DbOu8K9M4ALOXp8ys4QP4R5mowNlGO8QZqELvyoQ2UEZ5gy5ctngj28hwxwhVy07U8hAPGmtM4BzyK05vJHbxEAX8V1Vnj4GHsEouBVr6J8NSxmu8dbybrRmVm5gMEx/h1ojS4O3j4VaA2uD/2r8qWnb4FP5KVCV2BqaHEgjpa4Ekmh1JZBEq0sOZG0JVKd5oDq0a6S/G2gMtQbWBgfqQ62BtbzxYDh2ak2s5Ljb6O2Eq3SFWrNUbzBqtubkuIInqDVuKleFo2sPFgot4NwTi3XrDSaypKoAAAAASUVORK5CYII=";

interface TrayActions {
  openApp: () => void;
  toggleMeetingNotes: () => void;
}

let tray: Tray | null = null;
let actions: TrayActions | null = null;
let recording = false;

// Tray commands issued while the renderer wasn't ready to receive them
// (window closed or still loading). Drained by the renderer on mount via
// app:consumePendingTrayCommand — same pull pattern as pending deep links.
let pendingToggleMeetingNotes = false;

export function markPendingToggleMeetingNotes(): void {
  pendingToggleMeetingNotes = true;
}

export function consumePendingToggleMeetingNotes(): boolean {
  const value = pendingToggleMeetingNotes;
  pendingToggleMeetingNotes = false;
  return value;
}

function buildTrayIcon() {
  const icon = nativeImage.createEmpty();
  icon.addRepresentation({
    scaleFactor: 1,
    buffer: Buffer.from(TRAY_ICON_18, "base64"),
  });
  icon.addRepresentation({
    scaleFactor: 2,
    buffer: Buffer.from(TRAY_ICON_36, "base64"),
  });
  icon.setTemplateImage(true);
  return icon;
}

export function createAppTray(trayActions: TrayActions): void {
  if (tray) return;
  actions = trayActions;

  try {
    tray = new Tray(buildTrayIcon());
  } catch (error) {
    // Tray support can be missing (some Linux environments). The app just
    // behaves as before: no resident presence.
    console.error("[Tray] Failed to create tray:", error);
    return;
  }

  rebuildMenu();

  // macOS opens the context menu on any click. On Windows/Linux a plain
  // left-click should open the app; the menu stays on right-click.
  if (process.platform !== "darwin") {
    tray.on("click", () => actions?.openApp());
  }
}

export function hasTray(): boolean {
  return tray !== null;
}

export function isRecordingActive(): boolean {
  return recording;
}

export function setTrayRecordingState(isRecording: boolean): void {
  if (recording === isRecording) return;
  recording = isRecording;
  rebuildMenu();
  if (isRecording) startWaveAnimation();
  else stopWaveAnimation();
}

// --- Recording indicator: animated mini-waveform beside the tray icon ---
// macOS renders tray titles to the right of the icon. Braille cells give
// 1-dot-wide bars (two bars per character, four height steps each) — a slim
// waveform, an unmissable "Crabapple Bot is capturing this meeting" signal.

const WAVE_FRAME_MS = 300;
const WAVE_BAR_COUNT = 5;
// Dot bits for a bar of height 1–4 (index 0–3), built bottom-up. Two bars
// per braille cell (left column: dots 7,3,2,1 — right column: dots 8,6,5,4)
// keeps the columns tightly packed; the sine wave keeps every bar ≥1 dot so
// no column ever reads as missing.
const WAVE_LEFT_BITS = [0x40, 0x44, 0x46, 0x47];
const WAVE_RIGHT_BITS = [0x80, 0xa0, 0xb0, 0xb8];
// Radians per bar / per frame: together they make the crest travel smoothly
// leftward across the five bars.
const WAVE_SPATIAL_STEP = 1.1;
const WAVE_PHASE_STEP = 0.9;

let waveTimer: NodeJS.Timeout | null = null;
let wavePhase = 0;

function waveString(phase: number): string {
  const levels: number[] = [];
  for (let i = 0; i < WAVE_BAR_COUNT; i++) {
    const level = Math.round(1.5 + 1.5 * Math.sin(phase + i * WAVE_SPATIAL_STEP));
    levels.push(Math.min(3, Math.max(0, level)));
  }
  let out = "";
  for (let i = 0; i < levels.length; i += 2) {
    const left = WAVE_LEFT_BITS[levels[i]];
    const right = levels[i + 1] !== undefined ? WAVE_RIGHT_BITS[levels[i + 1]] : 0;
    out += String.fromCharCode(0x2800 + left + right);
  }
  return out;
}

function startWaveAnimation(): void {
  if (!tray || process.platform !== "darwin") return;
  stopWaveAnimation();
  waveTimer = setInterval(() => {
    if (!tray) return;
    wavePhase += WAVE_PHASE_STEP;
    tray.setTitle(` ${waveString(wavePhase)}`, { fontType: "monospaced" });
  }, WAVE_FRAME_MS);
}

function stopWaveAnimation(): void {
  if (waveTimer) {
    clearInterval(waveTimer);
    waveTimer = null;
  }
  if (tray && process.platform === "darwin") tray.setTitle("");
}

function rebuildMenu(): void {
  if (!tray) return;
  const menu = Menu.buildFromTemplate([
    { label: "Open Crabapple Bot", click: () => actions?.openApp() },
    // Permanent discoverability for the global quick-ask shortcut — the
    // accelerator renders next to the label (display only; the real binding
    // is the globalShortcut in quick-ask.ts).
    {
      label: "Quick Ask",
      accelerator: "Alt+Shift+Space",
      registerAccelerator: false,
      click: () => toggleQuickAsk(),
    },
    recording
      ? {
          label: "Stop recording and generate notes",
          click: () => actions?.toggleMeetingNotes(),
        }
      : {
          label: "Start meeting notes",
          click: () => actions?.toggleMeetingNotes(),
        },
    { type: "separator" },
    { label: "Quit Crabapple Bot", click: () => app.quit() },
  ]);
  tray.setContextMenu(menu);
  tray.setToolTip(recording ? "Crabapple Bot — recording meeting" : "Crabapple Bot");
}
