# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Personas en México (y usuarios de habla hispana con preferencia de unidades EE.UU.) evaluando qué vehículo comprar o cuál llevar en un viaje específico: comparan hasta 3 vehículos —eléctricos, híbridos, híbridos enchufables o de gasolina— lado a lado antes de decidir. Es un producto público, no una herramienta interna de una sola persona.

## Product Purpose

Syntergy AC compara autonomía, tiempo y costo de viaje entre vehículos de distinta motorización (BEV, HEV, PHEV, ICE) para rutas mexicanas, de ida o redondo, con datos de consumo calibrados a condiciones reales de carretera en México (no solo la cifra oficial NEDC/CLTC/EPA del fabricante). Éxito = que el usuario tome una decisión de compra o de viaje con una expectativa realista de autonomía y gasto, en vez de la sobreestimación típica de las fichas técnicas oficiales.

## Positioning

Ningún comparador existente (ABRP, Google Maps, comparadores de agencia) hace las tres cosas a la vez: (1) compara motorizaciones distintas —eléctrico, híbrido, híbrido enchufable y gasolina— en la misma tabla con métricas unificadas ($/km, factibilidad sin parada, tiempo), (2) aplica un factor de realismo calibrado específicamente a manejo en carretera mexicana en vez de usar la cifra oficial del fabricante tal cual, y (3) lo hace en una interfaz en español pensada para el contexto MX (rutas precargadas de ciudades mexicanas, MXN, red de carga VEMO/Evergo como referencia). ABRP y Google Maps enrutan; no comparan motorizaciones ni corrigen por realismo MX.

## Operating Context

- Flujo típico: elegir ruta (precargada MX, agregada manualmente, o vía Google/ABRP), elegir hasta 3 vehículos por modelo→versión, ajustar estilo de manejo (eco/normal/agresivo) y precios de energía ($/kWh, $/L), y comparar resultados lado a lado en modo "solo ida" o "redondo".
- Fuentes de ruta: presets curados de rutas mexicanas comunes, rutas custom guardadas en `localStorage`, Google Distance Matrix (opcional, requiere API key propia del usuario) y ABRP (opcional, requiere API key de partner pagada — ver `src/lib/providers/abrp.ts`).
- Sin backend ni autenticación: todo corre en el cliente; preferencias (unidades, API keys, rutas custom) viven en `localStorage` del navegador.

## Capabilities and Constraints

- Catálogo de vehículos hardcodeado en el código (`src/data/vehicles*.ts`), no editable por el usuario final; specs aproximadas de fuentes públicas, documentadas como tal en comentarios.
- Cálculo puro y testeado (`src/lib/calc*.ts`, Vitest) para BEV, ICE/HEV y PHEV; PHEV usa un modelo simple v1 (eléctrico primero hasta agotar rango, luego combustible; sin recarga asumida en redondo salvo que el usuario lo indique).
- Sin mapa visual ni ruta turno-a-turno; la distancia/duración es un número, no una polilínea.
- Sin cuentas de usuario ni persistencia server-side.
- Precios de energía y combustible son constantes/inputs editables por el usuario, no APIs de precio en vivo (salvo el hint opcional de ABRP, que nunca sobreescribe el precio manual automáticamente).
- Undecided: si/cuándo se integrará un catálogo de vehículos editable o dinámico; si habrá cuentas de usuario en el futuro.

## Brand Commitments

- Nombre de producto y marca visible en UI: **Syntergy AC** exclusivamente. "AC" internamente significa "Autonomy Compare", pero ese nombre completo nunca debe aparecer en la interfaz, título o branding visible.
- "Syntergy" es una marca/empresa real; el dominio de despliegue planeado es `ac.syntergy.app`.
- Copy de interfaz siempre en español (México), incluso cuando el usuario elige unidades imperiales — el cambio de unidades no cambia el idioma.

## Evidence on Hand

- Sin testimonios, casos de estudio, ni datos de uso real todavía — no inventar ninguno en trabajo futuro.
- Specs de vehículos son aproximaciones públicas (hojas de datos de fabricante/prensa), marcadas como tal en comentarios de código; no son mediciones propias verificadas.

## Product Principles

1. La cifra oficial de consumo/autonomía no es la verdad de carretera en México — todo cálculo aplica un factor de realismo explícito y visible, nunca la cifra del fabricante sin ajustar.
2. Comparar motorizaciones distintas en la misma tabla con métricas unificadas ($/km, factibilidad, tiempo) es el diferenciador central; no degradar esto a "modo eléctrico con extras".
3. Cero fricción de cuenta: todo funciona sin login; las integraciones opcionales (Google, ABRP) requieren que el usuario traiga su propia API key, nunca una key compartida del producto.
4. Cuando una fuente de datos opcional falla o no está configurada, el producto sigue funcionando con lo disponible (presets, cálculo manual) — nunca bloquea al usuario.
5. Español siempre, ajuste de unidades aparte — nunca acoplar idioma y sistema de unidades.
