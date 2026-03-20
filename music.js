// ============================================================
//  music.js — Música chiptune gerada pelo Web Audio API
//  Funciona sem nenhum arquivo de áudio externo!
//  O navegador sintetiza os sons em tempo real.
// ============================================================

let audioCtx        = null;  // contexto de áudio
let musicaTocando   = false; // está rodando?
let mutado          = false; // silenciado?
let stepAtual       = 0;     // qual passo da sequência estamos
let proximoTempo    = 0;     // quando tocar o próximo passo
let timerScheduler  = null;  // referência ao setTimeout do loop
let audioDesbloqueado = false; // iOS/Android exigem toque antes de tocar áudio

// --- DESBLOQUEIO DE ÁUDIO NO CELULAR ---
// iOS e Android bloqueiam o Web Audio API até o usuário tocar na tela.
// Este listener nativo (fora do p5.js) garante que o desbloqueio acontece
// no momento exato do primeiro toque — único jeito confiável no celular.
function _desbloquearAudio() {
  if (audioDesbloqueado) return;

  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }

  // Toca um buffer silencioso de 1 amostra — isso "acorda" o iOS
  let buffer  = audioCtx.createBuffer(1, 1, 22050);
  let source  = audioCtx.createBufferSource();
  source.buffer = buffer;
  source.connect(audioCtx.destination);
  source.start(0);

  // Resume caso esteja suspenso (comportamento padrão no Android Chrome)
  audioCtx.resume().then(function () {
    audioDesbloqueado = true;
    // Se o jogo já pediu para tocar música, inicia agora
    if (musicaTocando) _iniciarLoop();
  });
}

// Adiciona listeners nativos para o primeiro toque/clique
window.addEventListener('touchstart', _desbloquearAudio, { once: true });
window.addEventListener('mousedown',  _desbloquearAudio, { once: true });

// --- TEMPO ---
const BPM  = 132;                 // batidas por minuto (energia de academia!)
const STEP = 60 / BPM / 4;       // duração de 1 semicolcheia em segundos
const LOOKAHEAD     = 0.15;       // agenda notas X segundos à frente
const SCHEDULE_MS   = 40;         // checa a fila a cada X milissegundos

// --- NOTAS (frequências em Hz) ---
// O underscore _ representa silêncio (frequência 0)
const N = {
  _:  0,
  C3: 130.81, D3: 146.83, E3: 164.81, G3: 196.00, A3: 220.00,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23,
  G4: 392.00, A4: 440.00, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880.00,
};

// --- SEQUÊNCIAS DE 16 PASSOS (um compasso em 4/4 com semicolcheias) ---

// Melodia principal (onda quadrada = som clássico de videogame 8-bit)
const MEL = [
  N.E5, N._,  N.E5, N._,  N.G5, N._,  N.E5, N._,
  N.D5, N._,  N.C5, N._,  N.D5, N.E5, N.G5, N._,
];

// Segunda voz / harmonia (aparece no segundo compasso para variar)
const MEL2 = [
  N._,  N._,  N.C5, N._,  N._,  N._,  N.B4, N._,
  N.A4, N._,  N._,  N._,  N.G4, N._,  N.A4, N.B4,
];

// Baixo (onda de dente de serra = mais grosso/encorpado)
const BAIXO = [
  N.C3, N._,  N._,  N.C3, N._,  N._,  N.E3, N._,
  N.A3, N._,  N._,  N.A3, N._,  N._,  N.G3, N._,
];

// Bombo (kick drum)
const KICK  = [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0];

// Caixa (snare)
const SNARE = [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,1,0];

// Chimbal (hi-hat)
const HIHAT = [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,1];

// Alterna entre as duas melodias a cada compasso
let compasso = 0;

// ============================================================
//  INICIAR MÚSICA
//  Deve ser chamado DEPOIS de uma interação do usuário
//  (browsers bloqueiam áudio sem interação prévia)
// ============================================================
function iniciarMusica() {
  if (musicaTocando) return; // já está tocando
  musicaTocando = true;
  stepAtual     = 0;
  compasso      = 0;

  // Se o áudio já foi desbloqueado pelo toque, inicia imediatamente
  // Senão, _desbloquearAudio() vai chamar _iniciarLoop() quando o toque chegar
  if (audioDesbloqueado && audioCtx) {
    audioCtx.resume().then(_iniciarLoop);
  }
}

// Inicia o loop interno (só chamado quando o AudioContext está ativo)
function _iniciarLoop() {
  if (!musicaTocando) return;
  proximoTempo = audioCtx.currentTime + 0.05;
  agendar();
}

// ============================================================
//  PARAR MÚSICA
// ============================================================
function pararMusica() {
  musicaTocando = false;
  if (timerScheduler) clearTimeout(timerScheduler);
}

// ============================================================
//  ALTERNAR MUDO
// ============================================================
function toggleMudo() {
  mutado = !mutado;
}

// ============================================================
//  LOOP DE AGENDAMENTO
//  Fica chamando a si mesmo agendando os próximos sons
//  com um pouco de antecedência para não cortar o áudio
// ============================================================
function agendar() {
  if (!musicaTocando) return;

  while (proximoTempo < audioCtx.currentTime + LOOKAHEAD) {
    tocarPasso(stepAtual, proximoTempo);

    stepAtual++;
    if (stepAtual >= 16) {
      stepAtual = 0;
      compasso  = (compasso + 1) % 4; // alterna melodias a cada 4 compassos
    }

    proximoTempo += STEP;
  }

  timerScheduler = setTimeout(agendar, SCHEDULE_MS);
}

// ============================================================
//  TOCAR UM PASSO DA SEQUÊNCIA
// ============================================================
function tocarPasso(step, tempo) {
  if (mutado) return;

  // Alterna entre a melodia principal e a segunda voz
  let melAtual = (compasso % 2 === 0) ? MEL : MEL2;
  if (melAtual[step]) tocarNota(melAtual[step], tempo, STEP * 0.8,  'square',   0.16);
  if (BAIXO[step])    tocarNota(BAIXO[step],    tempo, STEP * 1.9,  'sawtooth', 0.10);

  if (KICK[step])  tocarKick(tempo);
  if (SNARE[step]) tocarSnare(tempo);
  if (HIHAT[step]) tocarHihat(tempo);
}

// ============================================================
//  SONS BÁSICOS
// ============================================================

// Nota melódica (oscilador com envelope de volume)
function tocarNota(freq, tempo, dur, tipo, vol) {
  let osc  = audioCtx.createOscillator();
  let gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.type = tipo;
  osc.frequency.setValueAtTime(freq, tempo);

  gain.gain.setValueAtTime(vol, tempo);
  gain.gain.exponentialRampToValueAtTime(0.0001, tempo + dur);

  osc.start(tempo);
  osc.stop(tempo + dur + 0.01);
}

// Bombo: oscilador que cai rapidamente de frequência
function tocarKick(tempo) {
  let osc  = audioCtx.createOscillator();
  let gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.frequency.setValueAtTime(160, tempo);
  osc.frequency.exponentialRampToValueAtTime(0.001, tempo + 0.25);
  gain.gain.setValueAtTime(0.9, tempo);
  gain.gain.exponentialRampToValueAtTime(0.0001, tempo + 0.25);

  osc.start(tempo);
  osc.stop(tempo + 0.26);
}

// Caixa: ruído branco filtrado
function tocarSnare(tempo) {
  let dur    = 0.14;
  let buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * dur, audioCtx.sampleRate);
  let data   = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

  let src    = audioCtx.createBufferSource();
  let gain   = audioCtx.createGain();
  let filter = audioCtx.createBiquadFilter();

  src.buffer         = buffer;
  filter.type        = 'highpass';
  filter.frequency.value = 800;

  src.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);

  gain.gain.setValueAtTime(0.45, tempo);
  gain.gain.exponentialRampToValueAtTime(0.0001, tempo + dur);
  src.start(tempo);
}

// Chimbal: ruído branco bem agudo e curto
function tocarHihat(tempo) {
  let dur    = 0.04;
  let buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * dur, audioCtx.sampleRate);
  let data   = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

  let src    = audioCtx.createBufferSource();
  let gain   = audioCtx.createGain();
  let filter = audioCtx.createBiquadFilter();

  src.buffer         = buffer;
  filter.type        = 'highpass';
  filter.frequency.value = 6000;

  src.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);

  gain.gain.setValueAtTime(0.13, tempo);
  gain.gain.exponentialRampToValueAtTime(0.0001, tempo + dur);
  src.start(tempo);
}
