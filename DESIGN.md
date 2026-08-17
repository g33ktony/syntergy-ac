---
name: Syntergy AC
description: Compara viajes en México entre BEV, HEV, PHEV e ICE con un lenguaje visual de ticket de gasolina impreso.
colors:
  mostrador: "#ece4d1"
  papel-ticket: "#fbf8f1"
  tinta: "#1c1a16"
  tinta-atenuada: "#6b6152"
  linea: "rgba(28, 26, 22, 0.16)"
  linea-fuerte: "rgba(28, 26, 22, 0.32)"
  acento-rojo-ticket: "#a93420"
  verde-factible: "#3f6b4f"
typography:
  masthead:
    fontFamily: "ui-monospace, 'SF Mono', 'SFMono-Regular', Menlo, Consolas, 'Liberation Mono', monospace"
    fontSize: "clamp(2rem, 6vw, 3.1rem)"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.02em"
  label:
    fontFamily: "ui-monospace, 'SF Mono', 'SFMono-Regular', Menlo, Consolas, 'Liberation Mono', monospace"
    fontSize: "0.72rem"
    fontWeight: 600
    letterSpacing: "0.08em"
  data:
    fontFamily: "ui-monospace, 'SF Mono', 'SFMono-Regular', Menlo, Consolas, 'Liberation Mono', monospace"
    fontSize: "0.88rem"
    fontWeight: 600
  total:
    fontFamily: "ui-monospace, 'SF Mono', 'SFMono-Regular', Menlo, Consolas, 'Liberation Mono', monospace"
    fontSize: "1.5rem"
    fontWeight: 700
    letterSpacing: "-0.01em"
  body:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  none: "0px"
spacing:
  xs: "0.4rem"
  sm: "0.6rem"
  md: "1.1rem"
  lg: "1.75rem"
  xl: "2.75rem"
components:
  button-primary:
    backgroundColor: "{colors.tinta}"
    textColor: "{colors.papel-ticket}"
    rounded: "{rounded.none}"
    padding: "0.6rem 1rem"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.tinta}"
    rounded: "{rounded.none}"
    padding: "0.6rem 1rem"
  segment-active:
    backgroundColor: "{colors.tinta}"
    textColor: "{colors.papel-ticket}"
    rounded: "{rounded.none}"
---

# Design System: Syntergy AC

## Overview

**Creative North Star: "El Ticket de Gasolina"**

Syntergy AC se imprime como el ticket que cualquier persona en México ya conoce del despachador de gasolina: papel claro, tinta oscura, líneas de datos con separador punteado, y un total que domina la tarjeta al final. No es un dashboard SaaS de comparación EV — se rechazó deliberadamente el fondo oscuro con acentos neón verde/azul y las tarjetas con sombra/glass que domina esa categoría (ver el "estándar de categoría" descartado en la ronda de dirección, seed `ea5b5344`).

Cada vehículo comparado es un ticket físico independiente, apoyado sobre un mostrador (fondo ligeramente más oscuro que el papel del ticket), con un borde perforado real en la parte superior — no una sombra decorativa. La honestidad del ticket ("esto es lo que realmente vas a pagar, línea por línea") es la promesa central del producto: comparar el costo real de un viaje entre BEV/HEV/PHEV/ICE, no la cifra optimista del fabricante.

**Key Characteristics:**
- Papel claro, tinta oscura — nunca modo oscuro (el mundo del ticket impreso lo exige; ver Elevation & Depth)
- Tipografía monoespaciada de sistema para todo dato/cifra/etiqueta; sans de sistema solo para prosa
- Un acento rojo-ticket, usado con moderación (total de costo, estados de alerta, enlaces)
- Sin bordes redondeados en ningún componente — el ticket no tiene esquinas curvas
- Botones con esquina cortada (clip-path), no rectángulos SaaS ni pills

## Colors

Paleta restringida: neutros de papel + un acento. El rojo se ajustó en revisión de contraste de #C23B22 a #A93420 para pasar 4.5:1 sobre ambos fondos de papel.

### Primary
- **Rojo-ticket** (`#a93420`): el total de costo (cifra monumental por tarjeta), enlaces de texto, estados de error/alerta. Nunca más del acento — es la única nota de color saturado en toda la interfaz.

### Neutral
- **Mostrador** (`#ece4d1`): fondo de página completa — el "counter" sobre el que se apoyan los tickets.
- **Papel de ticket** (`#fbf8f1`): fondo de cada tarjeta de vehículo y del panel de ajustes/settings — más claro que el mostrador para que la perforación se lea como un corte real.
- **Tinta** (`#1c1a16`): texto principal, encabezados, bordes de botones.
- **Tinta atenuada** (`#6b6152`): etiquetas, texto secundario, líneas punteadas guía. Nunca gris puro — siempre este café-gris cálido de la familia de la tinta.
- **Verde de factibilidad** (`#3f6b4f`): estado "alcanza"/badge BEV. Color semántico, no cuenta contra el presupuesto de "un acento".

### Named Rules
**The One Ink Rule.** El acento rojo-ticket es la única nota de color saturado del sistema. El verde de factibilidad es semántico (alcanza/no alcanza), nunca decorativo.

## Typography

**Masthead/Data/Label Font:** monoespaciada de sistema (`ui-monospace, 'SF Mono', 'SFMono-Regular', Menlo, Consolas, 'Liberation Mono', monospace`)
**Body Font:** sans de sistema (`system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`)

**Character:** todo lo que es dato, cifra, etiqueta o control se pone en monoespaciada — la voz de la impresora térmica. Solo la prosa explicativa (tagline, section-lead, hints) usa la sans de sistema. Esto no es una costura "tech" — es literal: los tickets reales se imprimen en fuente de paso fijo.

### Hierarchy
- **Masthead** (700, `clamp(2rem, 6vw, 3.1rem)`, line-height 1): el título "SYNTERGY AC", mayúsculas, mono.
- **Label** (600, 0.72–0.8rem, letter-spacing 0.06–0.08em, mayúsculas): leyendas de sección, etiquetas de campo, headers de tarjeta.
- **Data** (600, 0.88rem, tabular-nums): valores de línea de ticket (distancia, tiempo, energía).
- **Total** (700, 1.5rem, acento rojo): el costo — la única cifra que rompe la escala de datos normales, con doble regla superior (`border-top: 3px double`) como un subtotal de recibo.
- **Body** (400, 1rem, sans): tagline, texto explicativo, section-lead.

### Named Rules
**The Register Rule.** Cualquier valor que un despachador de gasolina imprimiría en un ticket (cifras, unidades, códigos de conector) va en mono. Cualquier cosa que un humano escribiría a mano en la parte de atrás del ticket (explicaciones, ayuda) va en sans.

## Layout

Grid de 3 columnas (`repeat(3, minmax(0, 1fr))`) para los tickets de vehículo, colapsando a 1 columna bajo 900px. Cada nivel de grid anidado (`.vehicle-slot`, `.result-card`, `.metrics dl`) declara `grid-template-columns: minmax(0, 1fr)` explícito — un grid implícito de una sola columna sin este valor se auto-dimensiona al contenido más ancho (p. ej. un `<select>` con opciones largas) y rompe el layout; esto se descubrió y corrigió durante la revisión de acabado de esta build.

Controles de viaje/ajustes en una sola columna fluida (`repeat(auto-fit, minmax(12rem, 1fr))`). Separadores de sección son líneas discontinuas (`border-top: 1px dashed`), no sólidas — refuerzan el lenguaje de "perforación para separar" del mundo del ticket.

## Elevation & Depth

Sin modo oscuro — el mundo del ticket lo prohíbe: un ticket digital que se ve como un ticket real tiene que ser de papel claro. Profundidad viene de dos fuentes, nunca de sombras decorativas puras:

1. **Contraste de dos papeles**: mostrador (`#ece4d1`) más oscuro que el papel de ticket (`#fbf8f1`) — la tarjeta "flota" sobre el mostrador por diferencia de tono, no por sombra.
2. **Perforación real**: el borde superior de cada tarjeta usa un `radial-gradient` repetido que corta semicírculos hacia el color del mostrador — un efecto de "arrancado del rollo", no una sombra ni un borde decorativo.

Las tarjetas sí llevan una sombra suave (`0 1px 2px` + `0 16px 32px -16px`, offset y blur reales) para separarlas del mostrador — nunca `box-shadow` de offset duro tipo neobrutalista.

### Named Rules
**The No Dark Mode Rule.** El ticket de gasolina siempre es de papel claro. No hay variante oscura de este sistema — proponerla contradice el mundo elegido.

## Shapes

Sin esquinas redondeadas en ningún componente (`rounded: none` en todo el sistema) — un ticket impreso no tiene esquinas curvas. Los botones primario/secundario usan un `clip-path` que corta la esquina inferior-izquierda y superior-derecha, sugiriendo un "punch" de ticket en vez de un rectángulo o pill genérico.

## Components

### Buttons
- **Shape:** rectángulo con esquinas cortadas vía `clip-path` (no radius)
- **Primary:** fondo tinta (`#1c1a16`), texto papel, mono, mayúsculas, tracking 0.04em
- **Secondary:** transparente, borde y texto tinta
- **Text:** solo texto, acento rojo, subrayado punteado (nunca sólido — refuerza el lenguaje de línea punteada)

### Segmented controls (toggle ida/redondo, unidades, fuente de ruta)
- **Style:** fila sin gap con divisores internos de 1px, sin fondo en reposo
- **Active state:** fondo tinta sólido, texto papel — como un sello "cancelado" sobre la opción elegida

### Cards / tickets (`.vehicle-slot`)
- **Corner Style:** ninguno (0 radius)
- **Background:** papel de ticket (`#fbf8f1`)
- **Shadow Strategy:** ver Elevation & Depth — sombra suave + perforación radial, nunca sombra sola
- **Border:** ninguno; la separación viene del contraste de papel + sombra
- **Internal Padding:** `1.4rem 1.4rem 1.65rem`

### Inputs / Fields
- **Style:** sin caja — solo `border-bottom` de 1px, fondo transparente, mono
- **Focus:** el borde inferior cambia a acento rojo con una sombra de 1px del mismo color (no glow, no ring)
- **Labels:** mono, mayúsculas, 0.72rem, tracking 0.08em — como el nombre de campo impreso en un formulario

### Ticket line items (`.metrics dl`)
- **Style:** grid de 3 columnas explícitas por fila (etiqueta / línea punteada de relleno / valor), nunca flexbox anidado con pseudo-elementos — ver nota de Layout sobre por qué
- **Total row:** doble regla superior, tipografía a 1.5rem en acento rojo — la única fila que rompe la jerarquía de datos normal

## Do's and Don'ts

### Do:
- **Do** usar mono de sistema para toda cifra, unidad o etiqueta de control — nunca una fuente decorativa importada para esto.
- **Do** mantener el total de costo como la cifra visualmente dominante de cada tarjeta (1.5rem, acento, doble regla).
- **Do** declarar `grid-template-columns: minmax(0, 1fr)` explícito en cualquier grid de una sola columna anidado dentro de una tarjeta — de lo contrario el contenido más ancho (típicamente un `<select>`) fuerza overflow horizontal.
- **Do** verificar contraste real (≥4.5:1 texto normal, ≥3:1 texto grande) contra AMBOS fondos de papel (mostrador y papel de ticket) antes de fijar un valor de acento — no asumir que un color que pasa en un fondo pasa en el otro.

### Don't:
- **Don't** usar modo oscuro en ninguna superficie de este sistema — contradice el mundo del ticket impreso.
- **Don't** agregar esquinas redondeadas, sombras de glass, o gradientes decorativos — el mundo es papel plano con tinta, no un dashboard SaaS.
- **Don't** introducir un segundo color de acento saturado — el rojo-ticket es la única nota de color no semántica del sistema (The One Ink Rule).
- **Don't** usar `border-left`/`border-right` de color como acento decorativo en tarjetas o alertas — no pertenece a este lenguaje visual.
