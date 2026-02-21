/*
Week 5 — Meditative Camera: "Drift"

Course: GBDA302 | Instructors: Dr. Karen Cochrane & David Han
Date: Feb. 12, 2026

Inspired by: Super Mario 64 — the quiet, contemplative moments
of simply existing in a vast, open world.

Controls:
  - The camera auto-scrolls gently through the world
  - Arrow keys or A/D nudge the camera speed (subtle influence)
  - Mouse hover near screen edges also nudges the camera
  - Click on hidden symbols when they glow to "collect" them

Concept:
  A reflective journey through a layered, atmospheric landscape.
  Soft parallax layers, drifting particles, and a gentle pace
  invite the viewer to slow down and observe. Hidden symbols
  scattered throughout reward careful attention.

References:
  - p5.js reference [1]
  - noise() for organic motion [2]
*/

const VIEW_W = 800;
const VIEW_H = 480;

// World dimensions
const WORLD_W = 4800;
const WORLD_H = VIEW_H;

// Camera state
let camX = 0;
let camBaseSpeed = 1.2;  // gentle auto-scroll
let camSpeed = 1.2;
let camNudge = 0;
let camDirection = 1;    // 1 = right, -1 = left

// Time
let t = 0;

// Layers
let stars = [];
let farMountains = [];
let nearMountains = [];
let trees = [];
let groundDetails = [];
let particles = [];

// Hidden symbols (bonus)
let symbols = [];
let discoveredCount = 0;
let totalSymbols = 0;

// Color palette — soft twilight
const SKY_TOP = [15, 10, 40];
const SKY_BOTTOM = [60, 30, 80];
const STAR_COL = [255, 255, 220, 180];
const FAR_MTN = [30, 20, 55];
const NEAR_MTN = [40, 28, 65];
const TREE_COL = [20, 35, 30];
const GROUND_COL = [18, 30, 25];
const PARTICLE_COL = [255, 220, 150];
const WATER_COL = [25, 40, 70, 120];

// Message fade
let messageAlpha = 255;
let messageText = "drift slowly... observe quietly...";
let discoveryAlpha = 0;
let discoveryText = "";

// Click burst effects
let bursts = [];

function setup() {
  createCanvas(VIEW_W, VIEW_H);
  noCursor();  // replaced by custom drawn cursor below

  generateStars();
  generateMountains();
  generateTrees();
  generateGroundDetails();
  generateParticles();
  generateSymbols();

  totalSymbols = symbols.length;
}

function draw() {
  t += 0.005;

  updateCamera();
  updateParticles();
  updateSymbols();

  // Draw sky gradient
  drawSky();

  // Draw stars (no parallax — fixed sky)
  drawStars();

  // Parallax layers
  push();
  drawFarMountains();
  drawNearMountains();
  drawWater();
  drawTrees();
  drawGround();
  drawGroundDetails();
  drawParticles();
  drawSymbols();
  pop();

  // HUD overlay
  drawHUD();
  drawMessages();
  drawBursts();
  drawCustomCursor();

  // Fade intro message
  if (messageAlpha > 0) messageAlpha -= 0.4;
  if (discoveryAlpha > 0) discoveryAlpha -= 1.5;
}

// ─── GENERATION ───────────────────────────────────────

function generateStars() {
  for (let i = 0; i < 120; i++) {
    stars.push({
      x: random(VIEW_W),
      y: random(VIEW_H * 0.55),
      size: random(1, 3),
      twinkleOffset: random(TAU),
      twinkleSpeed: random(0.01, 0.04),
    });
  }
}

function generateMountains() {
  // Far mountains — gentle rolling shapes
  let y = VIEW_H * 0.55;
  for (let x = 0; x < WORLD_W + 200; x += 3) {
    let n = noise(x * 0.002, 0) * 120 + noise(x * 0.008, 10) * 40;
    farMountains.push({ x: x, y: y - n });
  }

  // Near mountains — more detailed
  y = VIEW_H * 0.62;
  for (let x = 0; x < WORLD_W + 200; x += 3) {
    let n = noise(x * 0.003, 50) * 100 + noise(x * 0.012, 60) * 30;
    nearMountains.push({ x: x, y: y - n });
  }
}

function generateTrees() {
  for (let i = 0; i < 80; i++) {
    trees.push({
      x: random(WORLD_W),
      baseY: VIEW_H * 0.82 + random(-5, 10),
      h: random(30, 70),
      w: random(8, 18),
      sway: random(TAU),
    });
  }
  trees.sort((a, b) => a.baseY - b.baseY); // depth sort
}

function generateGroundDetails() {
  for (let i = 0; i < 60; i++) {
    groundDetails.push({
      x: random(WORLD_W),
      y: VIEW_H * 0.82 + random(0, VIEW_H * 0.18),
      type: random() > 0.5 ? "grass" : "rock",
      size: random(3, 10),
    });
  }
}

function generateParticles() {
  for (let i = 0; i < 50; i++) {
    particles.push({
      x: random(WORLD_W),
      y: random(VIEW_H * 0.3, VIEW_H * 0.85),
      size: random(2, 5),
      baseY: 0,
      driftX: random(-0.1, 0.1),
      driftY: random(0.005, 0.02),
      phase: random(TAU),
      alpha: random(80, 200),
    });
    particles[i].baseY = particles[i].y;
  }
}

function generateSymbols() {
  // Hidden interactive symbols scattered through the world (bonus)
  // Symbols are: moon, star, spiral, eye, diamond, heart
  let types = ["moon", "star", "spiral", "eye", "diamond", "heart",
               "moon", "star", "spiral"];
  // Max reachable x with parallax 0.65: VIEW_W + (WORLD_W - VIEW_W) * 0.65 ≈ 3400
  let maxReach = VIEW_W + (WORLD_W - VIEW_W) * 0.65;
  let spacing = maxReach / (types.length + 1);

  for (let i = 0; i < types.length; i++) {
    symbols.push({
      x: spacing * (i + 1) + random(-60, 60),
      y: random(VIEW_H * 0.25, VIEW_H * 0.7),
      type: types[i],
      discovered: false,
      glowRadius: 0,
      visible: false,    // becomes visible when camera is near
      pulsePhase: random(TAU),
      size: 14,
    });
  }
}

// ─── CAMERA ───────────────────────────────────────────

function updateCamera() {
  // Player control via keyboard — overrides auto-scroll direction
  camNudge = 0;
  if (keyIsDown(RIGHT_ARROW) || keyIsDown(68)) {
    camDirection = 1;
    camNudge = 0.8;
  }
  if (keyIsDown(LEFT_ARROW) || keyIsDown(65)) {
    camDirection = -1;
    camNudge = 0.8;
  }

  // Mouse edge nudge
  if (mouseX > VIEW_W * 0.85) camNudge += map(mouseX, VIEW_W * 0.85, VIEW_W, 0, 0.4);
  if (mouseX < VIEW_W * 0.15) camNudge += map(mouseX, VIEW_W * 0.15, 0, 0, 0.4);

  // Gentle breathing speed variation
  let breathe = sin(t * 0.8) * 0.1;

  camSpeed = (camBaseSpeed + camNudge) * camDirection + breathe;
  camX += camSpeed;

  // Reverse direction at boundaries for continuous experience
  if (camX >= WORLD_W - VIEW_W) {
    camX = WORLD_W - VIEW_W;
    camDirection = -1;
  } else if (camX <= 0) {
    camX = 0;
    camDirection = 1;
  }
}

// ─── DRAWING ──────────────────────────────────────────

function drawSky() {
  // Vertical gradient
  noStroke();
  for (let y = 0; y < VIEW_H; y++) {
    let inter = map(y, 0, VIEW_H, 0, 1);
    let r = lerp(SKY_TOP[0], SKY_BOTTOM[0], inter);
    let g = lerp(SKY_TOP[1], SKY_BOTTOM[1], inter);
    let b = lerp(SKY_TOP[2], SKY_BOTTOM[2], inter);
    stroke(r, g, b);
    line(0, y, VIEW_W, y);
  }
  noStroke();
}

function drawStars() {
  noStroke();
  for (let s of stars) {
    let twinkle = sin(frameCount * s.twinkleSpeed + s.twinkleOffset);
    let alpha = map(twinkle, -1, 1, 40, STAR_COL[3]);
    fill(STAR_COL[0], STAR_COL[1], STAR_COL[2], alpha);
    ellipse(s.x, s.y, s.size);
  }
}

function drawFarMountains() {
  let parallax = 0.2; // slow movement
  fill(FAR_MTN[0], FAR_MTN[1], FAR_MTN[2]);
  noStroke();
  beginShape();
  vertex(0, VIEW_H);
  for (let pt of farMountains) {
    let screenX = pt.x - camX * parallax;
    // wrap
    screenX = ((screenX % (WORLD_W + 200)) + (WORLD_W + 200)) % (WORLD_W + 200);
    if (screenX >= -10 && screenX <= VIEW_W + 10) {
      vertex(screenX, pt.y);
    }
  }
  vertex(VIEW_W, VIEW_H);
  endShape(CLOSE);
}

function drawNearMountains() {
  let parallax = 0.45;
  fill(NEAR_MTN[0], NEAR_MTN[1], NEAR_MTN[2]);
  noStroke();
  beginShape();
  vertex(0, VIEW_H);
  for (let pt of nearMountains) {
    let screenX = pt.x - camX * parallax;
    if (screenX >= -10 && screenX <= VIEW_W + 10) {
      vertex(screenX, pt.y);
    }
  }
  vertex(VIEW_W, VIEW_H);
  endShape(CLOSE);
}

function drawWater() {
  // Subtle reflective water layer
  let waterY = VIEW_H * 0.78;
  noStroke();
  for (let y = waterY; y < VIEW_H; y += 2) {
    let alpha = map(y, waterY, VIEW_H, 20, WATER_COL[3]);
    let shimmer = sin(y * 0.1 + t * 20) * 5;
    fill(WATER_COL[0] + shimmer, WATER_COL[1], WATER_COL[2], alpha);
    rect(0, y, VIEW_W, 2);
  }
}

function drawTrees() {
  let parallax = 0.7;
  for (let tr of trees) {
    let screenX = tr.x - camX * parallax;
    if (screenX < -50 || screenX > VIEW_W + 50) continue;

    let sway = sin(t * 3 + tr.sway) * 2;

    // Trunk
    stroke(TREE_COL[0] + 10, TREE_COL[1] + 5, TREE_COL[2] + 5);
    strokeWeight(tr.w * 0.3);
    line(screenX, tr.baseY, screenX + sway, tr.baseY - tr.h);

    // Canopy - soft circle
    noStroke();
    let canopyAlpha = map(tr.baseY, VIEW_H * 0.77, VIEW_H * 0.92, 100, 180);
    fill(TREE_COL[0], TREE_COL[1] + 15, TREE_COL[2], canopyAlpha);
    ellipse(screenX + sway, tr.baseY - tr.h, tr.w * 2.5, tr.h * 0.6);
    fill(TREE_COL[0] - 5, TREE_COL[1] + 25, TREE_COL[2] + 5, canopyAlpha * 0.6);
    ellipse(screenX + sway - tr.w * 0.3, tr.baseY - tr.h * 0.85, tr.w * 1.5, tr.h * 0.4);
  }
}

function drawGround() {
  noStroke();
  fill(GROUND_COL[0], GROUND_COL[1], GROUND_COL[2]);
  rect(0, VIEW_H * 0.82, VIEW_W, VIEW_H * 0.18);
}

function drawGroundDetails() {
  let parallax = 0.8;
  for (let d of groundDetails) {
    let screenX = d.x - camX * parallax;
    if (screenX < -20 || screenX > VIEW_W + 20) continue;

    noStroke();
    if (d.type === "grass") {
      stroke(30, 55, 35, 150);
      strokeWeight(1);
      for (let j = 0; j < 3; j++) {
        let gx = screenX + j * 3 - 3;
        let sway = sin(t * 4 + d.x + j) * 2;
        line(gx, d.y, gx + sway, d.y - d.size * 2);
      }
    } else {
      fill(35, 30, 40, 120);
      ellipse(screenX, d.y, d.size * 1.5, d.size * 0.8);
    }
  }
}

function updateParticles() {
  for (let p of particles) {
    p.x += p.driftX;
    p.y = p.baseY + sin(frameCount * p.driftY + p.phase) * 15;

    // Wrap horizontally
    if (p.x < 0) p.x += WORLD_W;
    if (p.x > WORLD_W) p.x -= WORLD_W;
  }
}

function drawParticles() {
  let parallax = 0.6;
  noStroke();
  for (let p of particles) {
    let screenX = p.x - camX * parallax;
    if (screenX < -10 || screenX > VIEW_W + 10) continue;

    let pulse = sin(frameCount * 0.03 + p.phase) * 0.3 + 0.7;
    fill(PARTICLE_COL[0], PARTICLE_COL[1], PARTICLE_COL[2], p.alpha * pulse);
    ellipse(screenX, p.y, p.size * pulse, p.size * pulse);

    // Soft glow
    fill(PARTICLE_COL[0], PARTICLE_COL[1], PARTICLE_COL[2], p.alpha * pulse * 0.2);
    ellipse(screenX, p.y, p.size * 3, p.size * 3);
  }
}

// ─── HIDDEN SYMBOLS (BONUS) ──────────────────────────

function updateSymbols() {
  let parallax = 0.65;
  for (let s of symbols) {
    let screenX = s.x - camX * parallax;
    // Symbol becomes visible when camera is near
    let distFromCenter = abs(screenX - VIEW_W / 2);
    s.visible = distFromCenter < VIEW_W * 0.4;
    s.glowRadius = s.visible ? lerp(s.glowRadius, 1, 0.03) : lerp(s.glowRadius, 0, 0.05);
  }
}

function drawSymbols() {
  let parallax = 0.65;
  for (let s of symbols) {
    if (s.discovered && s.glowRadius < 0.01) continue;

    let screenX = s.x - camX * parallax;
    if (screenX < -50 || screenX > VIEW_W + 50) continue;

    let pulse = sin(frameCount * 0.04 + s.pulsePhase) * 0.3 + 0.7;
    let glow = s.glowRadius * pulse;

    if (s.discovered) {
      // Collected — gentle expanding fade
      glow *= 1.5;
      let fadeAlpha = max(0, 150 * s.glowRadius);
      fill(255, 230, 180, fadeAlpha * 0.15);
      ellipse(screenX, s.y, 40 * glow, 40 * glow);
      continue;
    }

    if (glow < 0.01) continue;

    // Outer glow
    noStroke();
    fill(255, 220, 150, 30 * glow);
    ellipse(screenX, s.y, 50 * glow, 50 * glow);
    fill(255, 220, 150, 60 * glow);
    ellipse(screenX, s.y, 30 * glow, 30 * glow);

    // Draw the symbol shape
    push();
    translate(screenX, s.y);
    let sz = s.size * glow;
    fill(255, 240, 200, 200 * glow);
    noStroke();

    drawSymbolShape(s.type, sz);
    pop();
  }
}

function drawSymbolShape(type, sz) {
  switch (type) {
    case "moon":
      // Crescent moon
      fill(255, 240, 200, 200);
      ellipse(0, 0, sz * 1.6, sz * 1.6);
      fill(15, 10, 40); // sky color to cut out crescent
      ellipse(sz * 0.4, -sz * 0.2, sz * 1.3, sz * 1.3);
      break;

    case "star":
      fill(255, 240, 200, 220);
      drawStar(0, 0, sz * 0.4, sz, 5);
      break;

    case "spiral":
      noFill();
      stroke(255, 240, 200, 180);
      strokeWeight(1.5);
      beginShape();
      for (let a = 0; a < TAU * 2.5; a += 0.15) {
        let r = a * sz * 0.07;
        vertex(cos(a) * r, sin(a) * r);
      }
      endShape();
      noStroke();
      break;

    case "eye":
      // Simple eye shape
      fill(255, 240, 200, 200);
      ellipse(0, 0, sz * 2, sz);
      fill(15, 10, 40);
      ellipse(0, 0, sz * 0.7, sz * 0.7);
      fill(255, 240, 200, 200);
      ellipse(sz * 0.15, -sz * 0.1, sz * 0.25, sz * 0.25);
      break;

    case "diamond":
      fill(255, 240, 200, 200);
      beginShape();
      vertex(0, -sz);
      vertex(sz * 0.6, 0);
      vertex(0, sz);
      vertex(-sz * 0.6, 0);
      endShape(CLOSE);
      break;

    case "heart":
      fill(255, 200, 200, 200);
      beginShape();
      for (let a = 0; a < TAU; a += 0.1) {
        let r = sz * 0.08;
        let hx = r * 16 * pow(sin(a), 3);
        let hy = -r * (13 * cos(a) - 5 * cos(2*a) - 2 * cos(3*a) - cos(4*a));
        vertex(hx, hy);
      }
      endShape(CLOSE);
      break;
  }
}

function drawStar(cx, cy, innerR, outerR, points) {
  beginShape();
  for (let i = 0; i < points * 2; i++) {
    let angle = (i / (points * 2)) * TAU - HALF_PI;
    let r = i % 2 === 0 ? outerR : innerR;
    vertex(cx + cos(angle) * r, cy + sin(angle) * r);
  }
  endShape(CLOSE);
}

// ─── HUD & MESSAGES ──────────────────────────────────

function drawHUD() {
  // Discovered symbols counter — subtle, bottom-right
  if (discoveredCount > 0) {
    fill(255, 240, 200, 120);
    noStroke();
    textSize(12);
    textAlign(RIGHT, BOTTOM);
    text(discoveredCount + " / " + totalSymbols + " discovered", VIEW_W - 15, VIEW_H - 12);
  }

  // Subtle arrow hints at edges
  let edgeAlpha = 40;
  fill(255, 255, 255, edgeAlpha);
  textSize(18);
  textAlign(CENTER, CENTER);
  if (camX > 5) text("\u2190", 20, VIEW_H / 2);
  if (camX < WORLD_W - VIEW_W - 5) text("\u2192", VIEW_W - 20, VIEW_H / 2);

  // Controls hint — very subtle, bottom-left
  fill(255, 255, 255, 50);
  textSize(10);
  textAlign(LEFT, BOTTOM);
  text("arrow keys to nudge \u00B7 click glowing symbols", 12, VIEW_H - 12);
}

function drawMessages() {
  // Intro message
  if (messageAlpha > 0) {
    fill(255, 240, 220, messageAlpha);
    noStroke();
    textSize(22);
    textAlign(CENTER, CENTER);
    text(messageText, VIEW_W / 2, VIEW_H / 2 - 40);
  }

  // Discovery message
  if (discoveryAlpha > 0) {
    fill(255, 230, 180, discoveryAlpha);
    textSize(16);
    textAlign(CENTER, CENTER);
    text(discoveryText, VIEW_W / 2, VIEW_H * 0.35);
  }
}

// ─── CUSTOM CURSOR ───────────────────────────────────

function drawCustomCursor() {
  // Soft glowing dot cursor that fits the meditative aesthetic
  let nearSymbol = isNearSymbol();
  let cursorSize = nearSymbol ? 14 : 8;
  let cursorAlpha = nearSymbol ? 220 : 140;

  noStroke();
  // Outer glow
  fill(255, 230, 180, cursorAlpha * 0.2);
  ellipse(mouseX, mouseY, cursorSize * 3, cursorSize * 3);
  // Inner glow
  fill(255, 240, 200, cursorAlpha * 0.5);
  ellipse(mouseX, mouseY, cursorSize * 1.5, cursorSize * 1.5);
  // Core
  fill(255, 250, 230, cursorAlpha);
  ellipse(mouseX, mouseY, cursorSize, cursorSize);

  // Ring hint when near a clickable symbol
  if (nearSymbol) {
    noFill();
    stroke(255, 230, 180, 100 + sin(frameCount * 0.08) * 50);
    strokeWeight(1.5);
    ellipse(mouseX, mouseY, cursorSize * 3.5, cursorSize * 3.5);
    noStroke();
  }
}

function isNearSymbol() {
  let parallax = 0.65;
  for (let s of symbols) {
    if (s.discovered) continue;
    let screenX = s.x - camX * parallax;
    let d = dist(mouseX, mouseY, screenX, s.y);
    if (d < 40 && s.glowRadius > 0.3) return true;
  }
  return false;
}

// ─── BURST EFFECTS ───────────────────────────────────

function drawBursts() {
  for (let i = bursts.length - 1; i >= 0; i--) {
    let b = bursts[i];
    b.life -= 0.015;
    if (b.life <= 0) {
      bursts.splice(i, 1);
      continue;
    }

    let progress = 1 - b.life;
    let radius = b.maxRadius * progress;
    let alpha = b.life * 255;

    noFill();

    // Expanding ring
    stroke(255, 230, 180, alpha * 0.8);
    strokeWeight(2 * b.life);
    ellipse(b.x, b.y, radius * 2, radius * 2);

    // Inner ring
    stroke(255, 250, 220, alpha * 0.5);
    strokeWeight(1);
    ellipse(b.x, b.y, radius * 1.2, radius * 1.2);

    // Scattered spark particles
    noStroke();
    for (let p of b.sparks) {
      let sx = b.x + cos(p.angle) * radius * p.dist;
      let sy = b.y + sin(p.angle) * radius * p.dist;
      fill(255, 240, 200, alpha * p.alpha);
      ellipse(sx, sy, p.size * b.life, p.size * b.life);
    }

    noStroke();
  }
}

function spawnBurst(x, y) {
  let sparks = [];
  for (let i = 0; i < 12; i++) {
    sparks.push({
      angle: random(TAU),
      dist: random(0.5, 1.2),
      size: random(2, 6),
      alpha: random(0.4, 1),
    });
  }
  bursts.push({
    x: x,
    y: y,
    life: 1.0,
    maxRadius: 60,
    sparks: sparks,
  });
}

// ─── INTERACTION ─────────────────────────────────────

function mousePressed() {
  let parallax = 0.65;
  for (let s of symbols) {
    if (s.discovered) continue;
    let screenX = s.x - camX * parallax;
    let d = dist(mouseX, mouseY, screenX, s.y);
    // Generous click area (40px) so it feels forgiving
    if (d < 40 && s.glowRadius > 0.2) {
      s.discovered = true;
      discoveredCount++;

      // Visual burst at the symbol location
      spawnBurst(screenX, s.y);

      // Discovery text
      discoveryAlpha = 255;
      discoveryText = "~ " + s.type + " discovered ~";

      // All discovered message
      if (discoveredCount === totalSymbols) {
        setTimeout(() => {
          messageAlpha = 255;
          messageText = "all symbols found... the world remembers you";
        }, 2000);
      }
      break;
    }
  }
}
