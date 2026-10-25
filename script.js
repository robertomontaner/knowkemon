// ============================================================
// Knowkemon — puntos de esfuerzo (EVs) de Gen 3, por juego
// ============================================================

// --- Metadatos de estadísticas (clave interna -> etiqueta / color) ---
const STAT_META = {
  hp:              { key: 'hp',              label: 'PS',        hue: 25  },
  attack:          { key: 'attack',          label: 'Ataque',    hue: 55  },
  defense:         { key: 'defense',         label: 'Defensa',   hue: 95  },
  special_attack:  { key: 'special_attack',  label: 'At. Esp.',  hue: 255 },
  special_defense: { key: 'special_defense', label: 'Def. Esp.', hue: 160 },
  speed:           { key: 'speed',           label: 'Velocidad', hue: 320 },
};
const STAT_ORDER = ['hp', 'attack', 'defense', 'special_attack', 'special_defense', 'speed'];

// --- Tipos: nombre en español (mostrado) -> identificador en el JSON ---
const TYPE_MAP = {
  'Normal': 'normal', 'Fuego': 'fire', 'Agua': 'water', 'Planta': 'grass',
  'Eléctrico': 'electric', 'Hielo': 'ice', 'Lucha': 'fighting', 'Veneno': 'poison',
  'Tierra': 'ground', 'Volador': 'flying', 'Psíquico': 'psychic', 'Bicho': 'bug',
  'Roca': 'rock', 'Fantasma': 'ghost', 'Dragón': 'dragon', 'Siniestro': 'dark',
  'Acero': 'steel',
};

// --- Juegos: orden de visualización + abreviatura para las tarjetas ---
const GAME_META = [
  { key: 'firered',  abbr: 'RF' },
  { key: 'leafgreen', abbr: 'VH' },
  { key: 'ruby',      abbr: 'R'  },
  { key: 'sapphire',  abbr: 'Z'  },
  { key: 'emerald',   abbr: 'E'  },
];

const fg  = h => `oklch(0.46 0.13 ${h})`;
const bg  = h => `oklch(0.945 0.045 ${h})`;
const dot = h => `oklch(0.64 0.16 ${h})`;

const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

// --- Estado de la app ---
const state = {
  q: '',
  stat: null,   // clave de STAT_META o null
  tipo: null,   // etiqueta en español de TYPE_MAP o null
  data: [],     // se llena tras el fetch
};

// --- Elementos del DOM ---
const els = {
  search: document.getElementById('search-input'),
  statChips: document.getElementById('stat-chips'),
  typeChips: document.getElementById('type-chips'),
  reset: document.getElementById('reset-btn'),
  grid: document.getElementById('grid'),
  empty: document.getElementById('empty-state'),
  titulo: document.getElementById('titulo'),
  conteo: document.getElementById('conteo'),
  template: document.getElementById('card-template'),
};

// ------------------------------------------------------------
// Carga de datos
// ------------------------------------------------------------

async function loadData() {
  try {
    const response = await fetch('./data/pokemon-gen3-evs.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    state.data = await response.json();
    state.data.forEach(p => {
      if (!p.ubicaciones) { p._buscable = ''; return; }
      const nombres = new Set();
      Object.values(p.ubicaciones).forEach(entradas => {
        entradas.forEach(e => nombres.add(traducirLugar(e.lugar)));
      });
      p._buscable = norm([...nombres].join(' '));
    });
  } catch (err) {
    console.error('No se pudieron cargar los datos:', err);
    els.conteo.textContent = 'Error al cargar los datos';
    els.titulo.textContent = 'No se pudo conectar con la API local';
    return;
  }
  buildStatChips();
  buildTypeChips();
  render();
}

// ------------------------------------------------------------
// Construcción de los filtros (chips)
// ------------------------------------------------------------

function buildStatChips() {
  els.statChips.innerHTML = '';
  STAT_ORDER.forEach(key => {
    const meta = STAT_META[key];
    const btn = document.createElement('button');
    btn.className = 'chip-stat';
    btn.innerHTML = `<span class="dot" style="background:${dot(meta.hue)}"></span>${meta.label}`;
    btn.addEventListener('click', () => {
      state.stat = state.stat === key ? null : key;
      render();
    });
    btn.dataset.key = key;
    els.statChips.appendChild(btn);
  });
}

function buildTypeChips() {
  els.typeChips.innerHTML = '';
  Object.keys(TYPE_MAP).forEach(label => {
    const btn = document.createElement('button');
    btn.className = 'chip-type';
    btn.textContent = label;
    btn.addEventListener('click', () => {
      state.tipo = state.tipo === label ? null : label;
      render();
    });
    btn.dataset.label = label;
    els.typeChips.appendChild(btn);
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
  els.typeChips.querySelectorAll('.chip-type').forEach(btn => {
    btn.classList.toggle('active', state.tipo === btn.dataset.label);
  });
}

// ------------------------------------------------------------
// Ayudas de datos: EVs y ubicaciones
// ------------------------------------------------------------

// Devuelve [{key, label, valor}] de las stats que suben (valor > 0)
function statsQueOtorgan(pokemon) {
  return STAT_ORDER
    .filter(key => pokemon.evs_given[key] > 0)
    .map(key => ({ key, label: STAT_META[key].label, valor: pokemon.evs_given[key] }));
}

// Para un juego dado, elige la ubicación más común (mayor rareza_%)
function mejorLugar(entradasDelJuego) {
  if (!entradasDelJuego || entradasDelJuego.length === 0) return null;
  return entradasDelJuego.reduce((mejor, actual) => {
    const rMejor = mejor['rareza_%'] ?? 0;
    const rActual = actual['rareza_%'] ?? 0;
    return rActual > rMejor ? actual : mejor;
  }).lugar;
}

// Agrupa juegos que comparten la misma ubicación principal
// p.ej. "R/Z/E: Ruta 110 · RF/VH: Ruta 1"
function resumenLugares(pokemon) {
  if (!pokemon.ubicaciones) return null;

  const porJuego = GAME_META
    .map(g => ({ abbr: g.abbr, lugar: mejorLugar(pokemon.ubicaciones[g.key]) }))
    .filter(g => g.lugar);

  if (porJuego.length === 0) return null;

  const grupos = [];
  porJuego.forEach(({ abbr, lugar }) => {
    const grupoExistente = grupos.find(g => g.lugar === lugar);
    if (grupoExistente) grupoExistente.abbrs.push(abbr);
    else grupos.push({ lugar, abbrs: [abbr] });
  });

  return grupos.map(g => `<b>${g.abbrs.join('/')}</b>: ${escapeHtml(traducirLugar(g.lugar))}`).join(' · ');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function nombreLegible(identificador) {
  return identificador.replace(/-/g, ' ');
}

// ------------------------------------------------------------
// Traducción de identificadores de ubicación a español legible
// (los datos crudos vienen como slugs en inglés, p.ej. "hoenn-route-110")
// ------------------------------------------------------------

// Nombres propios completos que no siguen ningún patrón genérico
const PROPER_ES = {
  'safari-zone': 'Zona Safari',
  'battle-frontier': 'Frontera de Batalla',
  'altering-cave': 'Cueva Cambiante',
  'power-plant': 'Central Eléctrica',
  'petalburg-woods': 'Bosque Petalburgo',
  'petalburg-city': 'Ciudad Petalburgo',
  'rusturf-tunnel': 'Túnel Rusturf',
  'granite-cave': 'Cueva Granito',
  'meteor-falls': 'Cueva Meteoro',
  'fiery-path': 'Camino Ardiente',
  'jagged-pass': 'Paso Escarpado',
  'mt-pyre': 'Monte Pírico',
  'shoal-cave': 'Cueva Litoral',
  'new-mauville': 'Nueva Mauville',
  'seafloor-cavern': 'Cueva Submarina',
  'sky-pillar': 'Pilar Celeste',
  'team-aqua-hideout': 'Escondite del Team Aqua',
  'team-magma-hideout': 'Escondite del Team Magma',
  'magma-hideout': 'Escondite Magma',
  'desert-ruins': 'Ruinas Desconocidas',
  'desert-underpass': 'Paso Subterráneo del Desierto',
  'island-cave': 'Cueva de la Isla',
  'ancient-tomb': 'Tumba Antigua',
  'marine-cave': 'Gruta Marina',
  'terra-cave': 'Cueva Terrestre',
  'cave-of-origin': 'Cueva del Origen',
  'southern-island': 'Isla del Sur',
  'birth-island': 'Isla del Nacimiento',
  'faraway-island': 'Isla Lejana',
  'navel-rock': 'Roca Ombligo',
  'mirage-tower': 'Torre Espejismo',
  'mirage-island': 'Isla Espejismo',
  'trainer-tower': 'Torre de Entrenadores',
  'diglett-s-cave': 'Cueva Diglett',
  'digletts-cave': 'Cueva Diglett',
  'pokemon-tower': 'Torre Pokémon',
  'pokemon-mansion': 'Mansión Pokémon',
  'rock-tunnel': 'Túnel Roca',
  'seafoam-islands': 'Islas Cangrejo',
  'cerulean-cave': 'Cueva Celeste',
  'ss-anne': 'S.S. Anne',
  'mt-ember': 'Monte Ember',
  'mt-moon': 'Monte Luna',
  'viridian-forest': 'Bosque Verde',
  'kindle-road': 'Camino Kindle',
  'treasure-beach': 'Playa del Tesoro',
  'water-path': 'Camino de Agua',
  'water-labyrinth': 'Laberinto de Agua',
  'green-path': 'Sendero Verde',
  'canyon-entrance': 'Entrada del Cañón',
  'cape-brink': 'Cabo Brink',
  'bond-bridge': 'Puente del Vínculo',
  'five-isle-meadow': 'Pradera de las Cinco Islas',
  'memorial-pillar': 'Pilar Conmemorativo',
  'outcast-island': 'Isla Marginada',
  'pattern-bush': 'Arbusto del Patrón',
  'ruin-valley': 'Valle de las Ruinas',
  'tanoby-ruins': 'Ruinas Tanoby',
  'three-isle-port': 'Puerto de las Tres Islas',
  'sevault-canyon': 'Cañón Sevault',
  'resort-gorgeous': 'Complejo Fabuloso',
  'berry-forest': 'Bosque de las Bayas',
  'artisan-cave': 'Cueva del Artesano',
  'lost-cave': 'Cueva Perdida',
};

// Sufijos de tipo de asentamiento
const SUFIJOS_LUGAR = [
  { re: /^(.+)-city$/, plantilla: n => `Ciudad ${n}` },
  { re: /^(.+)-town$/, plantilla: n => `Pueblo ${n}` },
  { re: /^(.+)-island$/, plantilla: n => `Isla ${n}` },
];

// Traducción palabra por palabra para lo que no tenga entrada propia (respaldo)
const WORD_ES = {
  cave: 'Cueva', forest: 'Bosque', tunnel: 'Túnel', tower: 'Torre',
  road: 'Camino', path: 'Sendero', valley: 'Valle', canyon: 'Cañón',
  ruins: 'Ruinas', mountain: 'Monte', rock: 'Roca', bridge: 'Puente',
  beach: 'Playa', port: 'Puerto', plant: 'Central', pillar: 'Pilar',
  tomb: 'Tumba', hideout: 'Escondite', labyrinth: 'Laberinto',
  meadow: 'Pradera', bush: 'Arbusto', chamber: 'Cámara', island: 'Isla',
  cavern: 'Cueva', woods: 'Bosque', falls: 'Cascada', pass: 'Paso',
};

// Cualificadores entre paréntesis (planta, zona, dirección…)
const QUALIFIER_ES = {
  area: 'zona', entrance: 'entrada', summit: 'cima', inside: 'interior',
  cave: 'cueva', outside: 'exterior', back: 'fondo', waterfall: 'catarata',
  underwater: 'bajo el agua', north: 'norte', south: 'sur', east: 'este',
  west: 'oeste', 'high-tide': 'marea alta', 'low-tide': 'marea baja',
  middle: 'centro', apex: 'cima', se: 'SE', sw: 'SO', ne: 'NE', nw: 'NO',
};

function capitalizar(palabra) {
  return palabra.charAt(0).toUpperCase() + palabra.slice(1);
}

function traducirBase(base) {
  // 1) coincidencia exacta con nombre propio conocido
  if (PROPER_ES[base]) return PROPER_ES[base];

  // 2) ruta numerada ("route-101", "sea-route-19")
  const rutaMar = base.match(/^sea-route-(\d+)$/);
  if (rutaMar) return `Ruta marina ${rutaMar[1]}`;
  const ruta = base.match(/^route-(\d+)$/);
  if (ruta) return `Ruta ${ruta[1]}`;

  // 3) camino de la victoria (con o sin "-2" de la versión remake)
  if (/^victory-road(-2)?$/.test(base)) return 'Camino Victoria';

  // 4) sufijos de ciudad / pueblo / isla ("petalburg-city" ya cubierto arriba,
  //    esto es para las que no tienen entrada propia)
  for (const { re, plantilla } of SUFIJOS_LUGAR) {
    const m = base.match(re);
    if (m) return plantilla(m[1].split('-').map(capitalizar).join(' '));
  }

  // 5) respaldo genérico: traducir palabra por palabra si se puede
  return base.split('-')
    .map(tok => WORD_ES[tok] || capitalizar(tok))
    .join(' ');
}

function traducirCualificador(cal) {
  if (!cal) return '';
  // separa cosas como "expansion-north" en tokens
  return cal.split('-').map(tok => QUALIFIER_ES[tok] || tok).join(' ');
}

// Convierte un slug crudo de ubicación (p.ej. "hoenn-route-110 (underwater)")
// en un nombre legible en español (p.ej. "Ruta 110 (bajo el agua)")
function traducirLugar(slugCrudo) {
  const m = slugCrudo.match(/^([a-z0-9-]+)(?:\s*\(([^)]+)\))?$/i);
  if (!m) return slugCrudo;
  let [, base, cal] = m;
  base = base.replace(/^(hoenn|kanto)-/, '');
  const nombre = traducirBase(base);
  const cualificador = traducirCualificador(cal);
  return cualificador ? `${nombre} (${cualificador})` : nombre;
}

// ------------------------------------------------------------
// Filtrado
// ------------------------------------------------------------

function filtrar() {
  const nq = norm(state.q.trim());
  return state.data.filter(p => {
    if (state.stat && !(p.evs_given[state.stat] > 0)) return false;
    if (state.tipo) {
      const tipoId = TYPE_MAP[state.tipo];
      if (!p.tipos.includes(tipoId)) return false;
    }
    if (nq) {
      const enNombre = norm(p.name).includes(nq);
      const enLugares = p._buscable.includes(nq);
      if (!enNombre && !enLugares) return false;
    }
    return true;
  });
}

// ------------------------------------------------------------
// Render
// ------------------------------------------------------------

function tituloActual(cantidadFiltrada) {
  const { stat, tipo, q } = state;
  if (stat && tipo) return `${STAT_META[stat].label} · tipo ${tipo}`;
  if (stat) return `Suben ${STAT_META[stat].label}`;
  if (tipo) return `Tipo ${tipo}`;
  if (q.trim()) return `Resultados de "${q.trim()}"`;
  return 'Todas las especies';
}

function crearTarjeta(pokemon) {
  const nodo = els.template.content.firstElementChild.cloneNode(true);
  const stats = statsQueOtorgan(pokemon);

  const evNum = nodo.querySelector('.mon-ev-num');
  const evLabel = nodo.querySelector('.mon-ev-label');
  evNum.textContent = `+${pokemon.total_evs}`;

  if (stats.length === 1) {
    evLabel.textContent = stats[0].label;
    evNum.style.color = fg(STAT_META[stats[0].key].hue);
    evLabel.style.color = fg(STAT_META[stats[0].key].hue);
    nodo.querySelector('.mon-ev').style.background = bg(STAT_META[stats[0].key].hue);
  } else {
    evLabel.textContent = stats.map(s => s.label).join(' / ');
    evNum.style.color = 'oklch(0.4 0.02 264)';
    evLabel.style.color = 'oklch(0.4 0.02 264)';
    nodo.querySelector('.mon-ev').style.background = 'oklch(0.94 0.006 264)';
  }

  nodo.querySelector('.mon-name').textContent = nombreLegible(pokemon.name);
  nodo.querySelector('.mon-types').textContent = pokemon.tipos
    .map(t => Object.keys(TYPE_MAP).find(k => TYPE_MAP[k] === t) || t)
    .join(' · ');

  const lugares = resumenLugares(pokemon);
  nodo.querySelector('.mon-places').innerHTML = lugares || 'No disponible en estado salvaje (evolución / intercambio)';

  return nodo;
}

function render() {
  refreshChipStyles();
  const lista = filtrar();

  els.titulo.textContent = tituloActual(lista.length);
  els.conteo.textContent = `${lista.length} de ${state.data.length} especies`;

  els.grid.innerHTML = '';
  const frag = document.createDocumentFragment();
  lista.forEach(p => frag.appendChild(crearTarjeta(p)));
  els.grid.appendChild(frag);

  els.empty.hidden = lista.length !== 0;
}

// ------------------------------------------------------------
// Eventos
// ------------------------------------------------------------

els.search.addEventListener('input', e => {
  state.q = e.target.value;
  render();
});

els.reset.addEventListener('click', () => {
  state.q = '';
  state.stat = null;
  state.tipo = null;
  els.search.value = '';
  render();
});

// ------------------------------------------------------------
// Arranque
// ------------------------------------------------------------

loadData();
