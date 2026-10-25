// ============================================================
// Genera data/mas-spots-ev.json: zonas alternativas para entrenar
// cada estadística, calculadas a partir de las tablas de encuentro
// reales de data/pokemon-gen3-evs.json.
//
// Uso (desde la raíz del proyecto):
//   node tools/generar-mas-spots.mjs
// ============================================================

import { readFileSync, writeFileSync } from 'node:fs';
import vm from 'node:vm';

// --- Reutiliza la traducción de lugares de script-practice.js ---
const fuente = readFileSync('script-practice.js', 'utf8');
const inicio = fuente.indexOf('const PROPER_ES');
const fin = fuente.indexOf('// ----', fuente.indexOf('function traducirLugar'));
const ctx = {};
vm.runInNewContext(`${fuente.slice(inicio, fin)}; this.traducirLugar = traducirLugar;`, ctx);
const { traducirLugar } = ctx;

const STATS = ['hp', 'attack', 'defense', 'special_attack', 'special_defense', 'speed'];

const GRUPOS = {
  rubi_zafiro_esmeralda: ['ruby', 'sapphire', 'emerald'],
  rojo_fuego_verde_hoja: ['firered', 'leafgreen'],
};

const JUEGO_ES = {
  ruby: 'Rubí', sapphire: 'Zafiro', emerald: 'Esmeralda',
  firered: 'Rojo Fuego', leafgreen: 'Verde Hoja',
};

// Solo métodos repetibles; se descartan estáticos, errantes, etc.
const METODO_ES = {
  walk: 'encuentro a pie',
  surf: 'surf',
  'old-rod': 'caña vieja',
  'good-rod': 'caña buena',
  'super-rod': 'caña super',
  'rock-smash': 'golpe roca',
  seaweed: 'buceo',
};

const NOMBRES_ESPECIALES = {
  'nidoran-f': 'Nidoran♀', 'nidoran-m': 'Nidoran♂', 'mr-mime': 'Mr. Mime',
  farfetchd: "Farfetch'd", 'ho-oh': 'Ho-Oh',
};

const MIN_PORCENTAJE = 20;   // % mínimo de encuentros que dan el EV
const MAX_POR_LISTA = 8;
const MAX_POR_ESPECIE = 2;
const MAX_LUGARES = 5;      // lugares listados por tarjeta antes de "y N más"

const nombrePokemon = id =>
  NOMBRES_ESPECIALES[id] || id.charAt(0).toUpperCase() + id.slice(1);

const lugarBase = nombre => nombre.replace(/\s*\(.*\)$/, '');

const especies = JSON.parse(readFileSync('data/pokemon-gen3-evs.json', 'utf8'));
const curados = JSON.parse(readFileSync('data/mejores-spots-ev.json', 'utf8'));

// tablas[juego]["lugar|metodo"] = { total, porPokemon: { id: pct } }
const tablas = {};
for (const p of especies) {
  for (const [juego, entradas] of Object.entries(p.ubicaciones || {})) {
    for (const e of entradas) {
      if (!METODO_ES[e.metodo]) continue;
      // Cueva Cambiante (b-g) solo se activaba con eventos de Regalo Misterioso
      if (/altering-cave \([b-i]\)$/.test(e.lugar)) continue;
      const clave = `${e.lugar}|${e.metodo}`;
      const t = ((tablas[juego] ||= {})[clave] ||= { total: 0, porPokemon: {} });
      t.total += e['rareza_%'];
      t.porPokemon[p.name] = (t.porPokemon[p.name] || 0) + e['rareza_%'];
    }
  }
}
const evsDe = Object.fromEntries(especies.map(p => [p.name, p.evs_given]));

// ¿Ya aparece esta zona + pokémon en la lista curada?
function yaCurado(stat, grupo, lugar, pokemons) {
  const lista = (curados[stat] && curados[stat][grupo]) || [];
  return lista.some(c =>
    c.tipo === 'salvaje' &&
    c.lugar && c.lugar.includes(lugarBase(lugar)) &&
    pokemons.some(n => c.pokemon.includes(n)));
}

const salida = {};
for (const stat of STATS) {
  salida[stat] = {};
  for (const [grupo, juegos] of Object.entries(GRUPOS)) {
    // candidatos["lugar|metodo"] = { porJuego: { juego: { pct, esperado } }, pokemons, evs }
    const candidatos = {};
    for (const juego of juegos) {
      for (const [clave, t] of Object.entries(tablas[juego] || {})) {
        let pct = 0, esperado = 0;
        const aportan = [];
        for (const [id, prob] of Object.entries(t.porPokemon)) {
          const ev = evsDe[id][stat];
          if (ev > 0) {
            pct += prob;
            esperado += prob * ev;
            aportan.push({ id, prob, ev });
          }
        }
        pct = Math.round((pct / t.total) * 100);
        if (pct < MIN_PORCENTAJE) continue;
        const c = (candidatos[clave] ||= { porJuego: {}, aportan: {} });
        c.porJuego[juego] = { pct, esperado: esperado / t.total };
        aportan.forEach(a => {
          c.aportan[a.id] = { ev: a.ev, prob: Math.max(c.aportan[a.id]?.prob || 0, a.prob) };
        });
      }
    }

    // Construye entradas, colapsando plantas/zonas de un mismo lugar
    const porLugar = {};
    for (const [clave, c] of Object.entries(candidatos)) {
      const [slug, metodo] = clave.split('|');
      const lugar = traducirLugar(slug);
      const mejor = Math.max(...Object.values(c.porJuego).map(j => j.esperado));
      const agrupar = `${lugarBase(lugar)}|${metodo}`;
      if (porLugar[agrupar] && porLugar[agrupar].mejor >= mejor) continue;
      porLugar[agrupar] = { lugar, metodo, mejor, c };
    }

    const entradas = [];
    for (const { lugar, metodo, mejor, c } of Object.values(porLugar)) {
      const aportan = Object.entries(c.aportan).sort((a, b) => b[1].prob - a[1].prob);
      const nombres = aportan.map(([id]) => nombrePokemon(id));
      if (yaCurado(stat, grupo, lugar, nombres)) continue;

      const evs = [...new Set(aportan.map(([, a]) => a.ev))].sort();
      const presentes = juegos.filter(j => c.porJuego[j]);
      const pcts = presentes.map(j => c.porJuego[j].pct);
      const iguales = pcts.every(p => p === pcts[0]);

      const entrada = {
        tipo: 'salvaje',
        pokemon: nombres.slice(0, 3).join(' / ') + (nombres.length > 3 ? ' y más' : ''),
        lugar,
        metodo: METODO_ES[metodo],
        ev: evs.length > 1 ? `${evs[0]}-${evs[evs.length - 1]}` : evs[0],
        porcentaje: Math.max(...pcts),
        ev_por_combate: Math.round(mejor * 100) / 100,
      };
      if (presentes.length < juegos.length) {
        entrada.solo_juego = presentes.map(j => JUEGO_ES[j]).join(' y ');
      }
      if (!iguales) {
        entrada.nota = presentes.map(j => `${JUEGO_ES[j]} ${c.porJuego[j].pct}%`).join(' · ');
      }
      entradas.push(entrada);
    }

    // Une en una sola tarjeta los lugares con el mismo encuentro
    const unidas = {};
    for (const e of entradas) {
      const clave = [e.pokemon, e.metodo, e.ev, e.porcentaje, e.solo_juego, e.nota].join('|');
      if (unidas[clave]) unidas[clave].lugares.push(e.lugar);
      else unidas[clave] = { ...e, lugares: [e.lugar] };
    }
    const final = Object.values(unidas).map(({ lugares, ...e }) => {
      lugares.sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));
      const visibles = lugares.slice(0, MAX_LUGARES);
      const resto = lugares.length - visibles.length;
      e.lugar = resto > 0
        ? `${visibles.join(', ')} y ${resto} más`
        : visibles.length > 1
          ? `${visibles.slice(0, -1).join(', ')} y ${visibles[visibles.length - 1]}`
          : visibles[0];
      return e;
    });

    final.sort((a, b) => b.ev_por_combate - a.ev_por_combate || b.porcentaje - a.porcentaje);

    // Variedad: como mucho MAX_POR_ESPECIE tarjetas con los mismos pokémon
    const vistos = {};
    salida[stat][grupo] = final
      .filter(e => (vistos[e.pokemon] = (vistos[e.pokemon] || 0) + 1) <= MAX_POR_ESPECIE)
      .slice(0, MAX_POR_LISTA);
  }
}

writeFileSync('data/mas-spots-ev.json', JSON.stringify(salida, null, 2) + '\n');
for (const stat of STATS) {
  console.log(stat, Object.values(salida[stat]).map(l => l.length).join(' / '));
}
