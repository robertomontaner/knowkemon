# Cómo hacer un fetch a una API en JavaScript

Guía de referencia para completar `script-practice.js`. La función que tenés
que terminar es `loadData()`, y lo que falta es justamente el fetch al
archivo `data/pokemon-gen3-evs.json`.

## 1. La idea general

`fetch()` es una función global del navegador que pide un recurso (un
archivo, una URL de una API, lo que sea) y devuelve una **promesa**. Una
promesa es "algo que va a resolverse más adelante" — por eso casi siempre se
usa junto con `await` dentro de una función `async`.

```js
async function loadData() {
  const response = await fetch('./data/pokemon-gen3-evs.json');
}
```

`await` pausa la ejecución de la función hasta que la promesa se resuelve,
sin bloquear el resto de la página. Por eso `loadData` tiene que ser
`async` — no podés usar `await` fuera de una función marcada así.

## 2. `response` no es todavía tus datos

Esto es lo que más confunde al principio: `response` es un objeto que
describe la respuesta HTTP (código de estado, headers, etc.), **no** el
contenido. Para sacar el contenido como JSON hay que llamar a otro método,
que **también** devuelve una promesa:

```js
const datos = await response.json();
```

Recién ahí `datos` tiene el array/objeto real.

## 3. Comprobar que la respuesta salió bien

`fetch()` solo rechaza la promesa (es decir, entra al `catch`) si hay un
error de red — un 404 o un 500 no cuentan como error para `fetch`. Por eso
conviene comprobar `response.ok` a mano:

```js
if (!response.ok) {
  throw new Error(`HTTP ${response.status}`);
}
```

Si tirás un error acá, y todo esto está dentro de un `try`, el control salta
directo al `catch` — que en `script-practice.js` ya está armado para
mostrar un mensaje en pantalla.

## 4. Todo junto

```js
async function loadData() {
  try {
    const response = await fetch('./data/pokemon-gen3-evs.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const datos = await response.json();
    state.data = datos;
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
```

## 5. Por qué funciona `fetch('./data/...')` sin un servidor "de verdad"

Ojo con esto: si abrís `index.html` haciendo doble clic (protocolo
`file://`), `fetch()` va a fallar en la mayoría de los navegadores, porque
por seguridad no dejan leer archivos locales así. Necesitás servir la
carpeta con un servidor HTTP mínimo:

```bash
# Python (viene instalado en casi cualquier sistema)
python3 -m http.server 8000

# Node, si tenés npx
npx serve .
```

y después abrir `http://localhost:8000` en el navegador. Cuando lo subas a
GitHub Pages esto deja de ser un problema, porque GitHub Pages ya sirve todo
por HTTP.

## 6. Errores típicos al practicar esto

- **Olvidarte el `await`**: si hacés `const response = fetch(...)` sin
  `await`, `response` va a ser una promesa, no la respuesta — y
  `response.json` no va a existir donde esperás.
- **Llamar a `.json()` dos veces**: el cuerpo de la respuesta solo se puede
  leer una vez. Si necesitás el dato en dos lugares, guardalo en una
  variable la primera vez.
- **Rutas relativas mal armadas**: `fetch('data/pokemon-gen3-evs.json')` y
  `fetch('./data/pokemon-gen3-evs.json')` funcionan igual, pero
  `fetch('/data/pokemon-gen3-evs.json')` (con barra inicial) apunta a la
  raíz del dominio, no a la carpeta del proyecto — puede fallar en GitHub
  Pages si tu repo no está en la raíz.
- **Extra (opcional) para el buscador**: una vez que `state.data` esté
  poblado, si querés que el buscador encuentre por ruta y no solo por
  nombre, recorré cada pokemon y armá `p._buscable` con las ubicaciones ya
  traducidas — mirá cómo lo hace `script.js` como referencia si te
  trabás.

## 7. Para probarlo

Una vez que completes `loadData()` en `script-practice.js`:

1. Cambiá en `index.html` la línea `<script src="script.js">` por
   `<script src="script-practice.js">`.
2. Serví la carpeta con `python3 -m http.server 8000` (o similar).
3. Abrí la consola del navegador (F12) — ahí vas a ver cualquier error de
   JS antes que en cualquier otro lado.
