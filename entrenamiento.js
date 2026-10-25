// ============================================================
// Knowkemon — mejores spots para entrenar EVs por juego
// ============================================================

const STAT_META = {
  hp:              { label: 'PS',        hue: 25  },
  attack:          { label: 'Ataque',    hue: 55  },
  defense:         { label: 'Defensa',   hue: 95  },
  special_attack:  { label: 'At. Esp.',  hue: 255 },
  special_defense: { label: 'Def. Esp.', hue: 160 },
  speed:           { label: 'Velocidad', hue: 320 },
};
const STAT_ORDER = ['hp', 'attack', 'defense', 'special_attack', 'special_defense', 'speed'];

const GAME_GROUPS = [
  { key: 'rubi_zafiro_esmeralda', label: 'Rubí / Zafiro / Esmeralda' },
  { key: 'rojo_fuego_verde_hoja', label: 'Rojo Fuego / Verde Hoja' },
];

const fg = h => `oklch(0.46 0.13 ${h})`;
const bg = h => `oklch(0.945 0.045 ${h})`;
const dot = h => `oklch(0.64 0.16 ${h})`;

const state = {
  stat: 'hp',
  juego: 'rubi_zafiro_esmeralda',
  data: null,
};

const els = {
  statChips: document.getElementById('mini-stat-chips'),
  gameToggle: document.getElementById('mini-game-toggle'),
  list: document.getElementById('mini-list'),
  template: document.getElementById('spot-template'),
};

async function loadData() {
  try {
    const response = await fetch('./data/mejores-spots-ev.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    state.data = await response.json();
  } catch (err) {
    console.error('No se pudieron cargar los spots de entrenamiento:', err);
    els.list.innerHTML = '<p style="font-family:\'Plus Jakarta Sans\',sans-serif;color:var(--muted);font-size:13px;">No se pudo cargar la información. Revisá que data/mejores-spots-ev.json exista.</p>';
    return;
  }
  buildStatChips();
  buildGameToggle();
  render();
}

function buildStatChips() {
  els.statChips.innerHTML = '';
  STAT_ORDER.forEach(key => {
    const meta = STAT_META[key];
    const btn = document.createElement('button');
    btn.className = 'chip-stat';
    btn.dataset.key = key;
    btn.innerHTML = `<span class="dot" style="background:${dot(meta.hue)}"></span>${meta.label}`;
    btn.addEventListener('click', () => {
      state.stat = key;
      render();
    });
    els.statChips.appendChild(btn);
  });
}

function buildGameToggle() {
  els.gameToggle.innerHTML = '';
  GAME_GROUPS.forEach(g => {
    const btn = document.createElement('button');
    btn.className = 'chip-game';
    btn.dataset.key = g.key;
    btn.textContent = g.label;
    btn.addEventListener('click', () => {
      state.juego = g.key;
      render();
    });
    els.gameToggle.appendChild(btn);
  });
}

function refreshChipStyles() {
  els.statChips.querySelectorAll('.chip-stat').forEach(btn => {
    const key = btn.dataset.key;
    const on = state.stat === key;
    const hue = STAT_META[key].hue;
    btn.classList.toggle('active', on);
    btn.style.background = on ? bg(hue) : 'transparent';
    btn.style.color = on ? fg(hue) : '';
    btn.style.borderColor = on ? bg(hue) : '';
  });
  els.gameToggle.querySelectorAll('.chip-game').forEach(btn => {
    btn.classList.toggle('active', state.juego === btn.dataset.key);
  });
}

function crearSpotCard(entrada) {
  const nodo = els.template.content.firstElementChild.cloneNode(true);

  const esSalvaje = entrada.tipo === 'salvaje';
  const nombre = esSalvaje ? entrada.pokemon : entrada.nombre;
  const detalle = esSalvaje
    ? [entrada.lugar, entrada.metodo].filter(Boolean).join(' — ')
    : entrada.detalle;

  nodo.querySelector('.spot-ev').textContent = typeof entrada.ev === 'number' ? `+${entrada.ev}` : entrada.ev;
  nodo.querySelector('.spot-name').textContent = nombre;
  nodo.querySelector('.spot-tag').textContent = esSalvaje ? 'Combate salvaje' : 'VS Seeker';
  nodo.querySelector('.spot-detail').textContent = detalle;

  const notas = [];
  if (typeof entrada.porcentaje === 'number') notas.push(`${entrada.porcentaje}% de encuentro`);
  if (entrada.solo_juego) notas.push(`solo en ${capitalizar(entrada.solo_juego)}`);
  if (entrada.nota) notas.push(entrada.nota);
  nodo.querySelector('.spot-note').textContent = notas.join(' · ');

  const hue = STAT_META[state.stat].hue;
  nodo.querySelector('.spot-badge').style.background = bg(hue);
  nodo.querySelector('.spot-ev').style.color = fg(hue);

  return nodo;
}

function capitalizar(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function render() {
  refreshChipStyles();
  const entradas = (state.data[state.stat] && state.data[state.stat][state.juego]) || [];

  els.list.innerHTML = '';
  if (entradas.length === 0) {
    els.list.innerHTML = '<p style="font-family:\'Plus Jakarta Sans\',sans-serif;color:var(--muted);font-size:13px;">Sin datos para esta combinación todavía.</p>';
    return;
  }

  const frag = document.createDocumentFragment();
  entradas.forEach(e => frag.appendChild(crearSpotCard(e)));
  els.list.appendChild(frag);
}

loadData();
