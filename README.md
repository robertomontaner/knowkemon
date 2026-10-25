# Knowkemon

Calculadora de puntos de esfuerzo (EVs) para Pokémon de 3ª generación: qué estadística sube cada especie al derrotarla y dónde encontrarla en Rojo Fuego, Verde Hoja, Rubí, Zafiro y Esmeralda.

**Web:** https://robertomontaner.github.io/knowkemon/

## Páginas

- **[Puntos de esfuerzo de Hoenn](https://robertomontaner.github.io/knowkemon/calculadora-entrenamiento-evs.html)**: buscador de especies con filtros por EV otorgado y tipo.
- **[Dónde entrenar EVs](https://robertomontaner.github.io/knowkemon/entrenamiento.html)**: mejores lugares para subir cada estadística en cada juego.
- **[Política de transparencia](https://robertomontaner.github.io/knowkemon/transparencia.html)**: de dónde salen los datos.

## Estructura

```
index.html                          Redirige a la calculadora
calculadora-entrenamiento-evs.html  Página principal
entrenamiento.html                  Mejores spots de entrenamiento
transparencia.html                  Fuentes y metodología
data/pokemon-gen3-evs.json          EVs, tipos y ubicaciones por especie
data/mejores-spots-ev.json          Spots de entrenamiento recomendados (a mano)
data/mas-spots-ev.json              Zonas alternativas (generado)
tools/generar-mas-spots.mjs         Genera mas-spots-ev.json desde las tablas de encuentro
```

Para regenerar las zonas alternativas tras tocar los datos o las traducciones de lugares:

```bash
node tools/generar-mas-spots.mjs
```

Sitio estático en HTML, CSS y JavaScript sin dependencias ni build.

## Desarrollo local

Los datos se cargan con `fetch()`, así que hay que servir la carpeta por HTTP (abrir el HTML con `file://` no funciona):

```bash
python3 -m http.server 8000
```

Y abrir http://localhost:8000.

## Fuentes

- [PokeAPI](https://pokeapi.co), contrastado con la [tabla de EVs de 3ª generación de Bulbapedia](https://bulbapedia.bulbagarden.net/wiki/List_of_Pok%C3%A9mon_by_effort_value_yield_in_Generation_III).
- Guías de EV training de [Marriland.com](https://marriland.com/guides/ev-training/).

## Aviso

Knowkemon es un proyecto de fan y no está afiliado a Nintendo, Game Freak ni The Pokémon Company. Pokémon y los nombres de personajes son marcas registradas de sus respectivos dueños.
