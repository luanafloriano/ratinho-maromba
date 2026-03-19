// ============================================================
//  RATINHO MAROMBA 🐭💪 — versão 2.0
// ============================================================

// --- TAMANHO LÓGICO DO JOGO (coordenadas internas, nunca mudam) ---
const LARGURA  = 480;
const ALTURA   = 640;

// --- ESCALA RESPONSIVA ---
// Calcula quanto o canvas deve encolher para caber na tela do celular
let ESCALA = 1;

// --- ESTADOS DO JOGO ---
// 'inicio' → 'jogando' → 'transicao' → 'jogando' → ... → 'gameOver'
let estado = 'inicio';

// --- DADOS DO JOGADOR ---
let ratinho;
let forca        = 0;  // Força atual (pode diminuir)
let pr           = 0;  // Personal Record (só sobe)
let energia      = 100; // Barra de energia (0–100)
let totalPegos   = 0;  // Total de pesos pegos na sessão (só sobe)

// --- PESOS CAINDO ---
let pesos          = [];
let intervaloSpawn = 90;  // frames entre cada peso
let frameSpawn     = 0;

// --- ANIMAÇÃO DE LEVANTAMENTO ---
let animFrames        = 0;   // Contador regressivo (>0 = levantando)
let ultimoPeso        = null; // Último peso pego (para mostrar "+Xkg")

// --- FASES ---
// Cada fase tem nome, cor temática, velocidade e intervalo de spawn
const FASES = [
  {
    numero: 1, nome: 'Ratinho Fresquinho 🌱',
    limiteTotal: 12,          // quantos pesos pegar para avançar
    velMin: 1.5, velMax: 2.8, // velocidade de queda
    spawnInterval: 90,        // frames entre spawns
    corTema: [100, 220, 255], // cor do grid / destaque
    pesosDisponiveis: [0, 1], // índices dos tipos de peso disponíveis
  },
  {
    numero: 2, nome: 'Modo Treino 💪',
    limiteTotal: 30,
    velMin: 2.5, velMax: 3.8,
    spawnInterval: 72,
    corTema: [100, 255, 150],
    pesosDisponiveis: [0, 1, 2],
  },
  {
    numero: 3, nome: 'Modo Besta 🔥',
    limiteTotal: 55,
    velMin: 3.5, velMax: 5.0,
    spawnInterval: 55,
    corTema: [255, 220, 50],
    pesosDisponiveis: [0, 1, 2, 3],
  },
  {
    numero: 4, nome: 'Lenda da Academia 🏆',
    limiteTotal: Infinity,    // nunca avança (fase final)
    velMin: 5.0, velMax: 7.0,
    spawnInterval: 38,
    corTema: [255, 100, 50],
    pesosDisponiveis: [0, 1, 2, 3, 4],
  },
];

// Tipos de peso (do mais leve ao mais pesado)
const TIPOS_PESO = [
  { nome: '5kg',   valor: 1,  cor: '#64C8FF' },
  { nome: '10kg',  valor: 2,  cor: '#64FF96' },
  { nome: '20kg',  valor: 4,  cor: '#FFDC32' },
  { nome: '45kg',  valor: 8,  cor: '#FF7832' },
  { nome: '100kg', valor: 15, cor: '#DC32FF' },
];

let faseAtual    = 0; // índice em FASES (0 a 3)
let emTransicao  = false;
let frameTransi  = 0;

// ============================================================
//  SETUP
// ============================================================
function setup() {
  // Calcula a escala para caber na tela mantendo a proporção
  ESCALA = min(windowWidth / LARGURA, windowHeight / ALTURA);
  // Cria o canvas já no tamanho certo para o dispositivo
  let cnv = createCanvas(floor(LARGURA * ESCALA), floor(ALTURA * ESCALA));
  cnv.style('display', 'block');
  // Evita zoom em retina/iPhone (usa 1 pixel = 1 ponto CSS)
  pixelDensity(1);
  textFont('monospace');
  criarRatinho();
}

// Recalcula escala se girar o celular ou redimensionar a janela
function windowResized() {
  ESCALA = min(windowWidth / LARGURA, windowHeight / ALTURA);
  resizeCanvas(floor(LARGURA * ESCALA), floor(ALTURA * ESCALA));
}

function criarRatinho() {
  ratinho = { x: LARGURA / 2, y: ALTURA - 90, w: 50, h: 55 };
}

// ============================================================
//  LOOP PRINCIPAL
// ============================================================
function draw() {
  // Aplica a escala em TUDO que for desenhado
  // Assim o jogo usa sempre as coordenadas lógicas (480x640)
  // independente do tamanho real da tela
  scale(ESCALA);

  switch (estado) {
    case 'inicio':     telaInicio();     break;
    case 'jogando':    loopJogo();       break;
    case 'transicao':  telaTransicao();  break;
    case 'gameOver':   telaGameOver();   break;
  }
}

// ============================================================
//  REINICIAR
// ============================================================
function reiniciar() {
  criarRatinho();
  pesos          = [];
  forca          = 0;
  energia        = 100;
  totalPegos     = 0;
  faseAtual      = 0;
  intervaloSpawn = FASES[0].spawnInterval;
  frameSpawn     = 0;
  animFrames     = 0;
  ultimoPeso     = null;
  emTransicao    = false;
  estado         = 'jogando';
  frameCount     = 0;
  // Inicia a música (só funciona após interação do usuário — regra dos browsers)
  iniciarMusica();
}

// ============================================================
//  FASE ATUAL (objeto de configuração)
// ============================================================
function fase() {
  return FASES[faseAtual];
}

// ============================================================
//  NÍVEL MUSCULAR (0 = magrelo … 4 = monstro)
// ============================================================
function nivelMuscular() {
  if (forca < 8)   return 0;
  if (forca < 22)  return 1;
  if (forca < 50)  return 2;
  if (forca < 100) return 3;
  return 4;
}

// ============================================================
//  LOOP DO JOGO
// ============================================================
function loopJogo() {
  desenharFundo();
  mover();
  spawnPeso();
  atualizarPesos();
  desenharPesos();
  desenharRatinho(ratinho.x, ratinho.y);
  hud();
  if (animFrames > 0) animFrames--;
}

// ============================================================
//  MOVIMENTAÇÃO
// ============================================================
function mover() {
  let vel = 5 + faseAtual * 0.5; // fica levemente mais rápido por fase

  if (keyIsDown(LEFT_ARROW) || keyIsDown(65))  ratinho.x -= vel;
  if (keyIsDown(RIGHT_ARROW) || keyIsDown(68)) ratinho.x += vel;

  // Toque (celular): ratinho desliza até o dedo
  // Divide por ESCALA para converter coordenada de tela → coordenada lógica
  if (touches.length > 0) {
    ratinho.x = lerp(ratinho.x, touches[0].x / ESCALA, 0.15);
  }

  ratinho.x = constrain(ratinho.x, ratinho.w / 2, LARGURA - ratinho.w / 2);
}

// ============================================================
//  SPAWN DE PESOS
// ============================================================
function spawnPeso() {
  if (frameCount - frameSpawn < intervaloSpawn) return;
  frameSpawn = frameCount;

  let f   = fase();
  let vel = random(f.velMin, f.velMax);
  let idx = f.pesosDisponiveis[floor(random(f.pesosDisponiveis.length))];

  pesos.push({ x: random(30, LARGURA - 30), y: -30, vel, tipo: TIPOS_PESO[idx] });
}

// ============================================================
//  ATUALIZAR PESOS
// ============================================================
function atualizarPesos() {
  for (let i = pesos.length - 1; i >= 0; i--) {
    let p = pesos[i];
    p.y += p.vel;

    // Coletou?
    if (colidiu(p)) {
      forca += p.tipo.valor;
      energia = min(100, energia + 4);
      if (forca > pr) pr = forca;
      totalPegos++;
      animFrames  = 28;
      ultimoPeso  = p.tipo;
      pesos.splice(i, 1);
      verificarAvanco();
      continue;
    }

    // Passou da tela?
    if (p.y > ALTURA + 30) {
      energia -= 22;
      forca = max(0, forca - 2);
      pesos.splice(i, 1);
      if (energia <= 0) {
        energia = 0;
        estado  = 'gameOver';
      }
    }
  }
}

function colidiu(p) {
  return (
    p.x > ratinho.x - ratinho.w / 2 - 14 &&
    p.x < ratinho.x + ratinho.w / 2 + 14 &&
    p.y + 18 > ratinho.y - ratinho.h / 2 &&
    p.y < ratinho.y + ratinho.h / 2
  );
}

// ============================================================
//  AVANÇO DE FASE
// ============================================================
function verificarAvanco() {
  if (faseAtual >= FASES.length - 1) return;            // já na última
  if (totalPegos >= fase().limiteTotal) {
    faseAtual++;
    intervaloSpawn = fase().spawnInterval;
    estado         = 'transicao';
    frameTransi    = 0;
  }
}

// ============================================================
//  TECLADO / TOQUE
// ============================================================
function keyPressed() {
  if ((key === 'r' || key === 'R') && estado === 'gameOver') reiniciar();
  if (key === ' ') {
    if (estado === 'inicio')    reiniciar();
    if (estado === 'transicao') estado = 'jogando';
  }
  // M para mudo/des-mudo
  if (key === 'm' || key === 'M') toggleMudo();
}

function mousePressed() {
  // Converte coordenada do clique para coordenada lógica
  botaoClicado(mouseX / ESCALA, mouseY / ESCALA);
}

function touchStarted() {
  // Converte coordenada do toque para coordenada lógica
  if (touches.length > 0) botaoClicado(touches[0].x / ESCALA, touches[0].y / ESCALA);
  return false;
}

function touchMoved() { return false; }

function botaoClicado(x, y) {
  // Botão de mudo funciona em qualquer estado
  if (clicouMudo(x, y)) { toggleMudo(); return; }

  if (estado === 'inicio')    { if (dentroBtn(x, y, LARGURA/2, ALTURA/2 + 140, 220, 55)) reiniciar(); }
  if (estado === 'transicao') { estado = 'jogando'; }
  if (estado === 'gameOver')  { if (dentroBtn(x, y, LARGURA/2, ALTURA/2 + 100, 220, 55)) reiniciar(); }
}

function dentroBtn(px, py, bx, by, bw, bh) {
  return px > bx - bw/2 && px < bx + bw/2 && py > by - bh/2 && py < by + bh/2;
}

// ============================================================
//  DESENHOS — FUNDO
// ============================================================
function desenharFundo() {
  background(15, 15, 35);
  let ct = fase().corTema;

  // Grade temática por fase
  stroke(ct[0] * 0.08, ct[1] * 0.08, ct[2] * 0.08 + 15);
  strokeWeight(1);
  for (let x = 0; x < LARGURA; x += 40) line(x, 0, x, ALTURA);
  for (let y = 0; y < ALTURA; y += 40) line(0, y, LARGURA, y);

  // Chão
  noStroke();
  fill(35, 35, 70);
  rect(0, ALTURA - 18, LARGURA, 18);
}

// ============================================================
//  DESENHOS — PESOS
// ============================================================
function desenharPesos() {
  for (let p of pesos) {
    let c = color(p.tipo.cor);
    // Brilho
    noFill();
    stroke(red(c), green(c), blue(c), 70);
    strokeWeight(9);
    ellipse(p.x, p.y, 44, 44);
    // Disco
    noStroke();
    fill(50, 50, 65);
    ellipse(p.x, p.y, 43, 43);
    fill(c);
    ellipse(p.x, p.y, 34, 34);
    fill(50, 50, 65);
    ellipse(p.x, p.y, 14, 14);
    // Label
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(8);
    textStyle(BOLD);
    text(p.tipo.nome, p.x, p.y);
    textStyle(NORMAL);
  }
}

// ============================================================
//  DESENHOS — RATINHO
//  nivelMuscular 0 (magrelo) → 4 (monstro)
//  animFrames > 0 → levantando peso (braços pra cima)
// ============================================================
function desenharRatinho(cx, cy) {
  let nm        = nivelMuscular();
  let levantando = animFrames > 0;

  // Escala geral cresce com o nível muscular
  let escala = [1.0, 1.06, 1.13, 1.22, 1.35][nm];

  // Largura do corpo e braços cresce com o nível
  let cW  = [44, 50, 58, 68, 80][nm]; // corpo width
  let bW  = [10, 14, 18, 24, 30][nm]; // braço width
  let bH  = [14, 16, 18, 22, 26][nm]; // braço height

  // Cor do corpo: fica mais avermelhada/bronzeada conforme fica musculoso
  let corBase = lerpColor(color(220, 200, 190), color(210, 140, 100), nm / 4);
  if (levantando) corBase = lerpColor(corBase, color(255, 160, 60), 0.4);

  push();
  translate(cx, cy);
  scale(escala);

  noStroke();

  // ── ORELHAS ──
  fill(corBase);
  ellipse(-19, -30, 21, 21);
  ellipse(19, -30, 21, 21);
  fill(255, 150, 165);
  ellipse(-19, -30, 12, 12);
  ellipse(19, -30, 12, 12);

  // ── CORPO ──
  fill(corBase);
  ellipse(0, 2, cW, 54);

  // Abdômen (six-pack) a partir do nível 2
  if (nm >= 2) {
    fill(lerpColor(corBase, color(180, 120, 80), 0.3));
    let linhas = nm >= 4 ? 3 : 2; // 3 linhas = 6 cubinhos
    for (let l = 0; l < linhas; l++) {
      ellipse(-7, -4 + l * 10, 11, 9);
      ellipse(7,  -4 + l * 10, 11, 9);
    }
  }

  // ── CABEÇA ──
  fill(corBase);
  ellipse(0, -23, 40, 36);

  // ── FOCINHO ──
  fill(255, 185, 195);
  ellipse(0, -15, 19, 13);

  // ── NARIZ ──
  fill(180, 60, 80);
  ellipse(0, -19, 8, 5);

  // ── OLHOS ──
  fill(30, 20, 40);
  if (levantando) {
    // Olhos franzidos (esforço)
    arc(-11, -27, 8, 8, PI, TWO_PI);
    arc(11,  -27, 8, 8, PI, TWO_PI);
  } else {
    ellipse(-11, -27, 8, 8);
    ellipse(11,  -27, 8, 8);
    fill(255);
    ellipse(-9, -29, 3, 3);
    ellipse(13, -29, 3, 3);
  }

  // ── BOCA ──
  if (levantando) {
    // Boca aberta mostrando esforço
    stroke(100, 40, 50);
    strokeWeight(1.5);
    noFill();
    arc(0, -12, 14, 9, 0, PI);
    noStroke();
    fill(255);
    rect(-5, -12, 5, 5, 1);
    rect(1,  -12, 5, 5, 1);
  }

  // ── BIGODES ──
  stroke(180, 155, 145);
  strokeWeight(1.5);
  line(-9, -15, -27, -11); line(-9, -14, -27, -15); line(-9, -13, -27, -18);
  line( 9, -15,  27, -11); line( 9, -14,  27, -15); line( 9, -13,  27, -18);
  noStroke();

  // ── SUOR (ao levantar) ──
  if (levantando) {
    fill(100, 180, 255, 210);
    ellipse(-23, -18, 5, 9);
    ellipse(26,  -12, 4, 8);
  }

  // ── BRAÇOS ──
  // Posição: ao lado do corpo (normal) ou erguidos (levantando)
  let bracoY    = levantando ? -bH - 22 : -bH / 2;   // Y do topo do braço
  let haltY     = levantando ? -bH - 24 : -bH / 2 + 2; // Y do halter
  let esquerdaX = -cW / 2 - bW + 2;
  let direitaX  =  cW / 2 - 2;

  // Braço esquerdo
  fill(corBase);
  rect(esquerdaX, bracoY, bW, bH + (levantando ? 5 : 8), 4);
  // Bíceps como bump (nivel 1+)
  if (nm >= 1 && !levantando) {
    fill(lerpColor(corBase, color(255, 140, 80), nm / 4));
    ellipse(esquerdaX + bW/2, bracoY + 4, bW * 1.3, bW);
  }

  // Braço direito
  fill(corBase);
  rect(direitaX, bracoY, bW, bH + (levantando ? 5 : 8), 4);
  if (nm >= 1 && !levantando) {
    fill(lerpColor(corBase, color(255, 140, 80), nm / 4));
    ellipse(direitaX + bW/2, bracoY + 4, bW * 1.3, bW);
  }

  // Veias nos braços (nível 3+)
  if (nm >= 3) {
    stroke(160, 70, 100, 160);
    strokeWeight(1.3);
    line(esquerdaX + 3, bracoY + 4, esquerdaX + 7, bracoY + bH - 2);
    line(direitaX + 3,  bracoY + 4, direitaX + 7,  bracoY + bH - 2);
    noStroke();
  }

  // Halteres
  fill(65, 65, 75);
  rect(esquerdaX - 8, haltY, 10, 7, 2);
  rect(esquerdaX + bW - 2, haltY, 10, 7, 2);
  fill(direitaX, haltY, 10, 7, 2); // typo-safe fallback
  fill(65, 65, 75);
  rect(direitaX - 8, haltY, 10, 7, 2);
  rect(direitaX + bW - 2, haltY, 10, 7, 2);
  // Barra do halter
  fill(160, 130, 85);
  rect(esquerdaX + 2, haltY + 2, bW - 3, 3, 1);
  rect(direitaX + 2, haltY + 2, bW - 3, 3, 1);

  // ── PERNAS ──
  fill(corBase);
  rect(-15, 22, 13, 17, 4);
  rect(2,   22, 13, 17, 4);

  // ── TÊNIS ──
  fill(220, 50, 50);
  ellipse(-9,  40, 19, 10);
  ellipse(9,   40, 19, 10);
  fill(255, 80, 80);
  ellipse(-12, 38, 8, 5);
  ellipse(12,  38, 8, 5);

  // ── CAUDA ──
  stroke(200, 168, 155);
  strokeWeight(2.5);
  noFill();
  beginShape();
  let tx = cW / 2 - 2;
  curveVertex(tx,      12);
  curveVertex(tx + 12, 22);
  curveVertex(tx + 20, 10);
  curveVertex(tx + 16, -6);
  endShape();
  noStroke();

  // ── AURA (nível 4 = monstro) ──
  if (nm >= 4) {
    let a = sin(frameCount * 0.12) * 35 + 55;
    fill(255, 200, 50, a);
    noStroke();
    ellipse(0, 0, cW + 24, 76);
  }

  pop();

  // ── TEXTO "+Xkg" ao pegar peso ──
  if (levantando && ultimoPeso) {
    let alpha = map(animFrames, 28, 0, 255, 0);
    fill(255, 225, 50, alpha);
    textAlign(CENTER);
    textSize(17);
    textStyle(BOLD);
    text('+' + ultimoPeso.valor + ' kg! 💪', cx, cy - 85 * escala);
    textStyle(NORMAL);
  }
}

// ============================================================
//  HUD
// ============================================================
function hud() {
  // Painel superior
  noStroke();
  fill(0, 0, 0, 150);
  rect(0, 0, LARGURA, 80);

  // Força
  fill(100, 255, 150);
  textAlign(LEFT, TOP);
  textSize(11);
  text('💪 FORÇA', 12, 6);
  textSize(21);
  text(forca + ' kg', 12, 20);

  // PR
  fill(255, 215, 0);
  textAlign(CENTER, TOP);
  textSize(11);
  text('🏆 PR', LARGURA / 2, 6);
  textSize(21);
  text(pr + ' kg', LARGURA / 2, 20);

  // Fase
  let ct = fase().corTema;
  fill(ct[0], ct[1], ct[2]);
  textAlign(RIGHT, TOP);
  textSize(11);
  text('FASE', LARGURA - 12, 6);
  textSize(21);
  text(faseAtual + 1, LARGURA - 12, 20);

  // Barra de energia
  barraEnergia();

  // Nível muscular (texto descritivo)
  let nomes = ['Magrelo 🌱', 'Novato 💪', 'Treinado 🔥', 'Musculoso ⚡', 'Monstro 👹'];
  fill(200, 200, 255);
  textAlign(LEFT, TOP);
  textSize(10);
  text(nomes[nivelMuscular()], 10, 65);

  // Botão de mudo (canto superior direito, fora do painel)
  botaoMudo(LARGURA - 36, 88);

  // Dica de controles nas primeiras 4 segundos
  if (frameCount < 240) {
    let alpha = map(frameCount, 180, 240, 255, 0);
    fill(255, 255, 255, alpha);
    textAlign(CENTER, BOTTOM);
    textSize(12);
    text('← → ou arrastar o dedo para mover', LARGURA / 2, ALTURA - 26);
  }
}

// Botãozinho de mudo — ícone 🔊 ou 🔇
function botaoMudo(bx, by) {
  noStroke();
  fill(0, 0, 0, 120);
  ellipse(bx, by, 38, 38);
  textAlign(CENTER, CENTER);
  textSize(18);
  text(mutado ? '🔇' : '🔊', bx, by);
}

// Checa se clicou no botão de mudo (coordenadas já convertidas pela ESCALA)
function clicouMudo(x, y) {
  // bx e by iguais ao botaoMudo acima
  return dist(x, y, LARGURA - 36, 88) < 20;
}

function barraEnergia() {
  let bx = 12, by = 52, bw = LARGURA - 24, bh = 9;

  fill(35, 35, 60);
  rect(bx, by, bw, bh, 4);

  let cor;
  if (energia > 60)      cor = color(50, 220, 80);
  else if (energia > 30) cor = color(220, 200, 50);
  else                   cor = color(220, 60, 60);

  // Piscada quando crítico
  if (energia < 30 && frameCount % 18 < 9) cor = color(255, 120, 120);

  fill(cor);
  rect(bx, by, bw * (energia / 100), bh, 4);

  fill(180);
  textAlign(LEFT, TOP);
  textSize(9);
  text('ENERGIA', bx, by - 11);
}

// ============================================================
//  TELA — INÍCIO
// ============================================================
function telaInicio() {
  background(15, 15, 35);

  // Estrelas piscando
  noStroke();
  for (let i = 0; i < 60; i++) {
    let sx = (i * 137.5 + 30) % LARGURA;
    let sy = (i * 97.3  + 20) % ALTURA;
    fill(255, 255, 255, sin(frameCount * 0.04 + i) * 80 + 160);
    ellipse(sx, sy, 2, 2);
  }

  // Título
  let bounce = sin(frameCount * 0.05) * 6;
  textAlign(CENTER, CENTER);

  fill(255, 215, 0);
  textSize(42);
  textStyle(BOLD);
  text('RATINHO', LARGURA / 2, ALTURA / 2 - 165 + bounce);

  fill(255, 90, 90);
  textSize(30);
  text('MAROMBA 💪', LARGURA / 2, ALTURA / 2 - 118 + bounce);
  textStyle(NORMAL);

  // Preview do ratinho musculoso
  let forcaOrig = forca;
  forca = 60; // força temporária para mostrar musculoso
  desenharRatinho(LARGURA / 2, ALTURA / 2 - 10);
  forca = forcaOrig;

  // Botão iniciar
  botao(LARGURA / 2, ALTURA / 2 + 140, 220, 55, '▶  JOGAR', color(50, 180, 90), color(80, 220, 120));

  // Instruções
  fill(170, 170, 210);
  textSize(12);
  textAlign(CENTER, CENTER);
  text('← → ou arrastar o dedo para mover', LARGURA / 2, ALTURA / 2 + 195);
  text('Pegue os pesos! Não deixe nenhum cair!', LARGURA / 2, ALTURA / 2 + 213);

  // Botão de mudo
  botaoMudo(LARGURA - 36, 36);
}

// ============================================================
//  TELA — TRANSIÇÃO DE FASE
// ============================================================
function telaTransicao() {
  frameTransi++;
  background(15, 15, 35);

  let ct = fase().corTema;
  let pulso = sin(frameTransi * 0.12) * 80 + 175;

  // Partículas de fundo
  noStroke();
  for (let i = 0; i < 30; i++) {
    let px = (i * 193.7 + frameTransi * 2) % LARGURA;
    let py = (i * 151.3 + frameTransi * 1.5) % ALTURA;
    fill(ct[0], ct[1], ct[2], 60);
    ellipse(px, py, 6, 6);
  }

  fill(ct[0], ct[1], ct[2], pulso);
  textAlign(CENTER, CENTER);
  textSize(15);
  text('VOCÊ AVANÇOU!', LARGURA / 2, ALTURA / 2 - 110);

  textSize(42);
  textStyle(BOLD);
  text('FASE ' + (faseAtual + 1), LARGURA / 2, ALTURA / 2 - 68);
  textStyle(NORMAL);

  textSize(22);
  text(fase().nome, LARGURA / 2, ALTURA / 2 - 25);

  fill(255);
  textSize(16);
  text('💪 Força: ' + forca + ' kg', LARGURA / 2, ALTURA / 2 + 25);
  text('🏆 PR: ' + pr + ' kg', LARGURA / 2, ALTURA / 2 + 52);

  // Toque/clique para continuar (aparece depois de 90 frames)
  if (frameTransi > 90) {
    fill(200, 200, 200, sin(frameTransi * 0.2) * 80 + 175);
    textSize(14);
    text('Toque para continuar', LARGURA / 2, ALTURA / 2 + 110);
  }

  // Avança automaticamente após 5 segundos
  if (frameTransi > 300) estado = 'jogando';
}

// ============================================================
//  TELA — GAME OVER
// ============================================================
function telaGameOver() {
  background(15, 15, 35);

  // Ratinho caído (desenhado inclinado)
  push();
  translate(LARGURA / 2, ALTURA / 2 - 60);
  rotate(HALF_PI); // tombado de lado
  let forcaOrig = forca;
  forca = 5; // magrelo para mostrar que perdeu força
  desenharRatinho(0, 0);
  forca = forcaOrig;
  pop();

  fill(255, 80, 80);
  textAlign(CENTER, CENTER);
  textSize(34);
  textStyle(BOLD);
  text('ESGOTADO! 😵', LARGURA / 2, ALTURA / 2 + 30);
  textStyle(NORMAL);

  fill(255, 215, 0);
  textSize(18);
  text('🏆 PR: ' + pr + ' kg', LARGURA / 2, ALTURA / 2 + 65);

  fill(200);
  textSize(15);
  text('💪 Força final: ' + forca + ' kg', LARGURA / 2, ALTURA / 2 + 90);
  text('📊 Fase alcançada: ' + (faseAtual + 1), LARGURA / 2, ALTURA / 2 + 112);

  botao(LARGURA / 2, ALTURA / 2 + 160, 220, 55, '🔄 Jogar de novo', color(180, 40, 40), color(220, 80, 80));
  botaoMudo(LARGURA - 36, 36);
}

// ============================================================
//  HELPER — desenha botão com hover
// ============================================================
function botao(bx, by, bw, bh, label, corNormal, corHover) {
  // Converte a posição do mouse para coordenada lógica antes de checar hover
  let mx = mouseX / ESCALA;
  let my = mouseY / ESCALA;
  let hover = mx > bx - bw/2 && mx < bx + bw/2 &&
              my > by - bh/2 && my < by + bh/2;
  noStroke();
  fill(hover ? corHover : corNormal);
  rect(bx - bw/2, by - bh/2, bw, bh, 12);
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(19);
  textStyle(BOLD);
  text(label, bx, by);
  textStyle(NORMAL);
}
