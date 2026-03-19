// ============================================================
//  RATINHO MAROMBA 🐭💪
//  Jogo 2D simples com p5.js
//  Movimente o ratinho para pegar os pesos que caem!
// ============================================================

// --- CONFIGURAÇÕES GERAIS ---
const LARGURA = 480;
const ALTURA = 640;
const VELOCIDADE_RATINHO = 5;

// --- VARIÁVEIS DO JOGO ---
let ratinho;        // Objeto que representa o jogador
let pesos = [];     // Array de pesos caindo
let forca = 0;      // Pontuação atual (força)
let pr = 0;         // Personal Record (maior força já atingida)
let nivel = 1;      // Nível de dificuldade
let framesCadaNivel = 600; // Frames para subir de nível (~10s a 60fps)
let jogoAtivo = true;      // Controla se o jogo está rodando
let perdeuUltimo = false;  // Feedback visual ao perder um peso

// Controla quando spawnar um novo peso
let intervaloSpawn = 90; // A cada quantos frames aparece um novo peso
let frameUltimoSpawn = 0;

// ============================================================
//  SETUP — roda UMA vez no início
// ============================================================
function setup() {
  createCanvas(LARGURA, ALTURA);
  textFont('monospace');
  reiniciarJogo();
}

// ============================================================
//  DRAW — roda ~60x por segundo (loop principal)
// ============================================================
function draw() {
  // Fundo com efeito de grade (estilo academia retrô)
  desenharFundo();

  if (jogoAtivo) {
    // --- LÓGICA ---
    moverRatinho();
    spawnPeso();
    atualizarPesos();
    verificarNivel();

    // --- DESENHO ---
    desenharPesos();
    desenharRatinho(ratinho.x, ratinho.y);
    desenharHUD();
  } else {
    // Tela de game over
    desenharTelaGameOver();
  }
}

// ============================================================
//  REINICIAR JOGO
// ============================================================
function reiniciarJogo() {
  ratinho = {
    x: LARGURA / 2,
    y: ALTURA - 80,
    largura: 48,
    altura: 52,
  };
  pesos = [];
  forca = 0;
  nivel = 1;
  intervaloSpawn = 90;
  frameUltimoSpawn = 0;
  perdeuUltimo = false;
  jogoAtivo = true;
  frameCount = 0; // Reseta contagem de frames do p5
}

// ============================================================
//  PROGRESSÃO DE NÍVEL
// ============================================================
function verificarNivel() {
  // A cada X frames, sobe um nível e aumenta a dificuldade
  if (frameCount % framesCadaNivel === 0 && frameCount > 0) {
    nivel++;
    // Diminui intervalo de spawn (mínimo de 30 frames)
    intervaloSpawn = max(30, intervaloSpawn - 8);
  }
}

// ============================================================
//  SPAWN DE PESOS
// ============================================================
function spawnPeso() {
  if (frameCount - frameUltimoSpawn >= intervaloSpawn) {
    frameUltimoSpawn = frameCount;

    // Velocidade aumenta com o nível
    let vel = random(1.5, 2.5) + nivel * 0.4;

    pesos.push({
      x: random(30, LARGURA - 30),
      y: -30,
      velocidade: vel,
      tipo: escolherTipoPeso(), // Nome e valor do peso
      coletado: false,
      perdido: false,
    });
  }
}

// Retorna um tipo de peso aleatório com nome e valor de força
function escolherTipoPeso() {
  let tipos = [
    { nome: '5kg',  valor: 1,  cor: color(100, 200, 255) },
    { nome: '10kg', valor: 2,  cor: color(100, 255, 150) },
    { nome: '20kg', valor: 4,  cor: color(255, 220, 50)  },
    { nome: '45kg', valor: 8,  cor: color(255, 120, 50)  },
  ];

  // Pesos mais pesados aparecem mais com o nível
  let idx = floor(random(0, min(tipos.length, 1 + nivel)));
  return tipos[idx];
}

// ============================================================
//  ATUALIZAR PESOS (mover, checar colisão, remover)
// ============================================================
function atualizarPesos() {
  perdeuUltimo = false;

  for (let i = pesos.length - 1; i >= 0; i--) {
    let p = pesos[i];
    p.y += p.velocidade;

    // Checa colisão com o ratinho
    if (colidiuComRatinho(p)) {
      forca += p.tipo.valor;
      if (forca > pr) pr = forca; // Atualiza PR
      pesos.splice(i, 1); // Remove o peso coletado
      continue;
    }

    // Peso passou da tela
    if (p.y > ALTURA + 30) {
      perdeuUltimo = true;
      forca = max(0, forca - 1); // Perde 1 de força por deixar cair
      pesos.splice(i, 1);
    }
  }
}

// Retorna true se o peso está sobre o ratinho
function colidiuComRatinho(p) {
  return (
    p.x > ratinho.x - ratinho.largura / 2 - 15 &&
    p.x < ratinho.x + ratinho.largura / 2 + 15 &&
    p.y + 20 > ratinho.y - ratinho.altura / 2 &&
    p.y < ratinho.y + ratinho.altura / 2
  );
}

// ============================================================
//  MOVIMENTAÇÃO DO RATINHO
// ============================================================
function moverRatinho() {
  // Seta esquerda ou A
  if (keyIsDown(LEFT_ARROW) || keyIsDown(65)) {
    ratinho.x -= VELOCIDADE_RATINHO;
  }
  // Seta direita ou D
  if (keyIsDown(RIGHT_ARROW) || keyIsDown(68)) {
    ratinho.x += VELOCIDADE_RATINHO;
  }

  // Limita o ratinho dentro da tela
  ratinho.x = constrain(ratinho.x, ratinho.largura / 2, LARGURA - ratinho.largura / 2);
}

// ============================================================
//  TECLA PRESSIONADA (eventos pontuais)
// ============================================================
function keyPressed() {
  // R para reiniciar (na tela de game over ou a qualquer momento)
  if (key === 'r' || key === 'R') {
    reiniciarJogo();
  }
}

// ============================================================
//  DESENHOS
// ============================================================

// Fundo com linhas de grade
function desenharFundo() {
  background(15, 15, 35);

  stroke(25, 25, 55);
  strokeWeight(1);
  for (let x = 0; x < LARGURA; x += 40) {
    line(x, 0, x, ALTURA);
  }
  for (let y = 0; y < ALTURA; y += 40) {
    line(0, y, LARGURA, y);
  }

  // Chão
  fill(40, 40, 80);
  noStroke();
  rect(0, ALTURA - 20, LARGURA, 20);
}

// Desenha o ratinho como formas geométricas
function desenharRatinho(cx, cy) {
  // Feedback visual: fica vermelho ao perder peso
  let corCorpo = perdeuUltimo ? color(255, 80, 80) : color(220, 200, 190);

  noStroke();

  // --- ORELHAS ---
  fill(corCorpo);
  ellipse(cx - 18, cy - 28, 20, 20); // orelha esquerda
  ellipse(cx + 18, cy - 28, 20, 20); // orelha direita
  fill(255, 150, 160); // interior rosa das orelhas
  ellipse(cx - 18, cy - 28, 11, 11);
  ellipse(cx + 18, cy - 28, 11, 11);

  // --- CORPO ---
  fill(corCorpo);
  ellipse(cx, cy, 44, 52);

  // --- CABEÇA ---
  ellipse(cx, cy - 22, 38, 34);

  // --- FOCINHO ---
  fill(255, 180, 190);
  ellipse(cx, cy - 14, 18, 12);

  // --- NARIZ ---
  fill(180, 60, 80);
  ellipse(cx, cy - 18, 7, 5);

  // --- OLHOS ---
  fill(30, 20, 40);
  ellipse(cx - 10, cy - 26, 7, 7);
  ellipse(cx + 10, cy - 26, 7, 7);
  // Brilho nos olhos
  fill(255);
  ellipse(cx - 8, cy - 28, 3, 3);
  ellipse(cx + 12, cy - 28, 3, 3);

  // --- BIGODES ---
  stroke(180, 160, 150);
  strokeWeight(1.5);
  // Esquerda
  line(cx - 9, cy - 14, cx - 26, cy - 10);
  line(cx - 9, cy - 13, cx - 26, cy - 14);
  line(cx - 9, cy - 12, cx - 26, cy - 17);
  // Direita
  line(cx + 9, cy - 14, cx + 26, cy - 10);
  line(cx + 9, cy - 13, cx + 26, cy - 14);
  line(cx + 9, cy - 12, cx + 26, cy - 17);

  noStroke();

  // --- BRAÇOS (halteres) ---
  // Braço esquerdo
  fill(corCorpo);
  rect(cx - 34, cy - 8, 12, 22, 4); // braço
  fill(60, 60, 70);
  rect(cx - 42, cy - 6, 8, 6, 2);   // peso esquerdo
  rect(cx - 26, cy - 6, 8, 6, 2);   // peso direito do halter
  fill(150, 120, 80);
  rect(cx - 36, cy - 3, 12, 3, 1);  // barra do halter

  // Braço direito
  fill(corCorpo);
  rect(cx + 22, cy - 8, 12, 22, 4); // braço
  fill(60, 60, 70);
  rect(cx + 18, cy - 6, 8, 6, 2);
  rect(cx + 34, cy - 6, 8, 6, 2);
  fill(150, 120, 80);
  rect(cx + 24, cy - 3, 12, 3, 1);

  // --- PERNAS ---
  fill(corCorpo);
  rect(cx - 14, cy + 20, 12, 16, 4); // perna esq
  rect(cx + 2, cy + 20, 12, 16, 4);  // perna dir

  // --- TÊNIS ---
  fill(230, 60, 60);
  ellipse(cx - 8, cy + 37, 18, 9);
  ellipse(cx + 8, cy + 37, 18, 9);

  // --- CAUDA ---
  stroke(200, 170, 160);
  strokeWeight(2.5);
  noFill();
  beginShape();
  curveVertex(cx + 18, cy + 10);
  curveVertex(cx + 28, cy + 20);
  curveVertex(cx + 36, cy + 10);
  curveVertex(cx + 32, cy - 5);
  endShape();
  noStroke();
}

// Desenha os pesos caindo
function desenharPesos() {
  for (let p of pesos) {
    let c = p.tipo.cor;

    // Brilho ao redor
    noFill();
    stroke(red(c), green(c), blue(c), 80);
    strokeWeight(8);
    ellipse(p.x, p.y, 44, 44);

    // Disco do peso (círculo)
    noStroke();
    fill(50, 50, 60);
    ellipse(p.x, p.y, 42, 42);

    fill(c);
    ellipse(p.x, p.y, 34, 34);

    fill(50, 50, 60);
    ellipse(p.x, p.y, 14, 14);

    // Rótulo com o peso
    fill(255);
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(9);
    textStyle(BOLD);
    text(p.tipo.nome, p.x, p.y);
    textStyle(NORMAL);
  }
}

// HUD — informações na tela
function desenharHUD() {
  // Painel superior
  noStroke();
  fill(0, 0, 0, 140);
  rect(0, 0, LARGURA, 60);

  // Força atual
  fill(100, 255, 150);
  textAlign(LEFT, TOP);
  textSize(13);
  text('💪 FORÇA', 12, 8);
  textSize(22);
  text(forca + ' kg', 12, 24);

  // PR
  fill(255, 215, 0);
  textAlign(CENTER, TOP);
  textSize(13);
  text('🏆 PR', LARGURA / 2, 8);
  textSize(22);
  text(pr + ' kg', LARGURA / 2, 24);

  // Nível
  fill(255, 130, 60);
  textAlign(RIGHT, TOP);
  textSize(13);
  text('NÍVEL', LARGURA - 12, 8);
  textSize(22);
  text(nivel, LARGURA - 12, 24);

  // Dica de controles (apenas no início)
  if (frameCount < 180) {
    fill(255, 255, 255, map(frameCount, 120, 180, 255, 0));
    textAlign(CENTER, BOTTOM);
    textSize(13);
    text('← → ou A D para mover | R para reiniciar', LARGURA / 2, ALTURA - 28);
  }
}

// Tela de game over (por enquanto o jogo nunca termina, mas está pronto)
function desenharTelaGameOver() {
  background(15, 15, 35, 200);

  fill(255, 80, 80);
  textAlign(CENTER, CENTER);
  textSize(36);
  text('GAME OVER', LARGURA / 2, ALTURA / 2 - 60);

  fill(255, 215, 0);
  textSize(22);
  text('🏆 PR: ' + pr + ' kg', LARGURA / 2, ALTURA / 2 - 10);

  fill(200);
  textSize(16);
  text('Pressione R para jogar de novo', LARGURA / 2, ALTURA / 2 + 40);
}
