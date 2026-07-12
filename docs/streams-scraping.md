# Scraping de Streams — Guía de Mantenimiento

Documenta cómo se scrapean canales en `api/streams.js` y `proxy/streams-proxy.js`, y cómo agregar una fuente nueva.

## Arquitectura

```
streams response = [
  ...lacancha (LC)        // scrape HTML/RSC de lacancha.tv (match-specific embedindia.st URLs)
  ...futbol-libre (FL)     // scrape agenda de futbol-libres.su
  ...futbollibrex (FX)     // scrape home de futbollibrex.net
]
```

Cada bloque es independiente. Si una fuente falla (timeout, geo-block, error de parseo), las demás siguen funcionando.

## Funciones scraper

Todas viven en `api/streams.js` (Vercel) y `proxy/streams-proxy.js` (local dev). Mantener ambos sincronizados.

| Función | Fuente | Salida |
|---------|--------|--------|
| `fetchRSC()` + `parseRSCStreams()` | `lacancha.tv/es/en-vivo?_rsc=...` | Hasta 40 streams, 1 por embed_url del RSC + 7 canales lazy de `embedindia.st` |
| `fetchMatchPageHTML()` + `parseMatchPageStreams()` | `lacancha.tv/es/partido/{id}` | Streams adicionales por matchId (pocos) |
| `scrapeFutbolLibresEvents()` | `futbol-libres.su/agenda/` | Canales per-evento con URLs de `esvidzypro.sbs`/`vidzenvivo.cc`/`esvidzy99.co` |
| `scrapeFutbollibrexEvents()` | `futbollibrex.net/` | Canales per-evento con URLs de `la16hd.com`/`la20hd.com`/`tarjetarojita.xyz` |

Las funciones scrapean HTML/JSON público, **sin auth**. Todas tienen timeout 4-5s para no bloquear el endpoint.

## Patrón de URL encontrado

| Fuente | Patrón URL | Decodificación |
|--------|-----------|----------------|
| futbollibrex | `/embed/eventos.php?r={base64}` | doble base64 → `https://laXXhd.com/...` |
| futbol-libres | `/eventos.html?r={base64}` | doble base64 → `https://esvidzypro.sbs/...` |
| lacancha RSC | `embed_url` en JSON serializado | ya viene como URL final (`embedindia.st`) |
| lacancha lazy | `https://embedindia.st/embed/{slug}` | directo, sin encoding |

Cuando una URL viene encoded, **siempre doble base64** (lvl1 = wrapper HTML, lvl2 = URL final del player).

## Deduplicación

Deduplicamos por `embed_name.toLowerCase()` después de normalizar sufijos `(FL|LC|FX)` en el front (`channel-selector.ts:42`). Si una fuente ya tiene "Telemundo", otra con "Telemundo" se descarta. Esto evita confusión visual pero **oculta streams alternativos** del mismo canal desde fuentes distintas.

## Frontend (player)

`src/app/features/streaming/iframe-player/iframe-player.ts` detecta el tipo de URL:

| Patrón embed_url | Render |
|------------------|--------|
| `*.m3u8` (HLS) | `<video>` + HLS.js desde CDN (`cdn.jsdelivr.net/npm/hls.js`) |
| Otro | `<iframe>` directo |

Resolver la12hd client-side está como fallback (`resolveLa12hdClient`) por si un futuro dominio bloquea framing.

`effectiveTab` en `channel-selector.ts:223-227` siempre arranca en Opción 1 (futbollibrex). Stream service auto-selecciona primer HD stream como activo, pero ya NO fuerza el tab.

## Agregar una fuente nueva

### 1. Investigar la fuente

```bash
curl -sLk --max-time 8 -A "Mozilla/5.0" "https://nueva-url/" > /tmp/nueva.html
```

Buscar patrones:
- HTML estático: `<iframe src="...">`, links con base64, JSON embebido
- React/Next: payload RSC con `?_rsc=...` y header `RSC: 1`
- API JSON: `/api/...` que devuelve array de objetos con `embed_url`/`embed_name`

Probar cada URL descubierta:
```bash
curl -sIk --max-time 5 "https://url-del-stream" | head -1
# HTTP/2 200 = ok
# 404/403/Sin SSL = muerto o geo-bloqueado
```

### 2. Verificar que el iframe funcione

Si el embed va dentro de un `<iframe>`, el dominio del stream debe tener:
- SSL válido para su propio hostname (cert CN matchea)
- Sin `X-Frame-Options: DENY` ni `Content-Security-Policy: frame-ancestors 'none'`

```bash
curl -sIk --max-time 5 "https://stream-url" | grep -iE "x-frame|content-security|frame-ancestors"
curl -v --max-time 5 "https://stream-url" 2>&1 | grep -iE "subject:|SSL certificate verify"
```

Si falla, opciones:
- **HLS directo**: scrapear la página para extraer `.m3u8`, reproducir con `hls.js` en `<video>` (no iframe)
- **Proxy**: routear via `/api/embed` que reescribe headers, pero añade latencia
- **window.open**: abrir en tab nueva desde el botón del canal

### 3. Escribir el scraper

Patrón mínimo:
```js
async function scrapeNuevaSource() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch('https://nueva-url/', {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
        'Accept': 'text/html',
      },
    });
    const html = await res.text();
    // ... parsear html ...
    return [{ name, url }, ...];
  } catch {
    return [];
  } finally {
    clearTimeout(timeoutId);
  }
}
```

Tips de parseo:
- **Base64 doble**: `Buffer.from(s, 'base64').toString()` dos veces, buscar `r=...` en cada nivel
- **HTML malformado**: usar regexes tolerantes, no parser estricto
- **Deduplicar**: `Set` por URL o nombre normalizado

### 4. Integrar en el handler

En `api/streams.js` y `proxy/streams-proxy.js`, dentro del `try` principal:
```js
const newChannels = await scrapeNuevaSource();
const existing = new Set(streams.map(s => s.embed_name.toLowerCase()));
for (const ch of newChannels) {
  if (existing.has(ch.name.toLowerCase())) continue;
  streams.push({
    id: `new-${streams.length}`,
    match_id: matchId,
    channel_id: null,
    embed_name: ch.name,
    embed_url: ch.url,
    source: 'nueva-fuente',          // kebab-case, lowercase
    stream_param: null,
    created_at: new Date().toISOString(),
  });
}
```

### 5. Front: agregar la fuente al selector

En `channel-selector.ts`:
- `sourceLabel(stream)` → label corto (ej. "NF")
- `sourceBadgeClasses(stream)` → colores Tailwind de la badge (no chocar con FL=rojo, LC=esmeralda, FX=ámbar)
- `sectionBorderClass(sourceKey)` → color del border de la sección
- `sourceTextColor(sourceKey)` → color del texto del tab
- `sourceMonogramClasses(stream)` → fondo del monograma
- `sourceBgFill(sourceKey)` → dot del tab activo
- `cleanStreamName(name)` → añadir `(NF)` al regex si usás sufijo
- `groupStreamsBySource` ORDER → añadir la clave en la posición deseada

### 6. Test local

```bash
npm run dev
curl 'http://localhost:3001/api/streams?matchId=test' | jq '.streams | map(.source) | group_by(.) | map({(.[0]): length}) | add'
```

Verificar:
- Aparece la fuente en el output
- Los streams hacen embed (iframe carga o HLS.js reproduce)
- Deduplicación funciona con otras fuentes

### 7. Deploy

```bash
git add api/streams.js proxy/streams-proxy.js src/app/features/streaming/channel-selector/channel-selector.ts
git commit -m "feat(streams): agregar fuente {nombre}"
git push
```

## Problemas comunes

| Síntoma | Causa | Fix |
|---------|-------|-----|
| Iframe en blanco con error genérico de Chrome | SSL cert mismatch / X-Frame-Options | Usar HLS directo o proxy |
| `fetch failed` desde el server | Geo-block / IP bloqueada | Caer a fallback iframe directo o CORS proxy client-side |
| Canales duplicados entre fuentes | Deduplicación solo por nombre normalizado | Normalizar sufijos en front antes de comparar |
| Scraper devuelve [] siempre | Token expirado (RSC) / endpoint cambió | Re-investigar, ver logs |
| `embedindia.st/embed/{slug}` 404 para algunos slugs | Slug específico del partido | Quitar de la lista lazy o usar match-specific URL del RSC |

## Debug rápido

```bash
# Ver streams actuales
curl 'http://localhost:3001/api/streams?matchId=test' | jq

# Test scraper aislado
node -e "
const html = require('fs').readFileSync('/tmp/source.html', 'utf-8');
const re = /patron/g;
[...html.matchAll(re)].slice(0, 5).forEach(m => console.log(m[1]));
"

# Ver headers de un embed
curl -sIk "https://embed-url" | grep -iE "HTTP|x-frame|content-security"
```

## Historial de cambios

- **LC**: 10 canales RSC + 7 canales lazy (DSports, TUDN, TyC, ESPN Argentina, Disney+) — agregados tras notar que lacancha solo expone 10 de 17 en su RSC. Estos son los canales match-specific que SÍ funcionan (URLs del estilo `embedindia.st/embed/wc/{date}/{match-slug}/{channel}`).
- **FL**: 14 canales per-evento (reemplazó lista hardcoded de 8)
- **FX**: 10-14 canales per-evento (reemplazó lista hardcoded de 15)
- **SSL/X-Frame**: la12hd.com tiene cert para la16hd.com → iframe bloqueado en browser. Solución: scrapear eventos directamente a `la16hd.com`/`la20hd.com`/`tarjetarojita.xyz` que sí tienen certs válidos
- **BD eliminado**: balondeportes.com dejó de funcionar y un reemplazo con embedindia.st genérico (`/embed/{slug}`) tampoco — solo `/embed/wc/{date}/{match-slug}/{channel}` responde, y la lista de canales válidos por partido viene del RSC de lacancha.