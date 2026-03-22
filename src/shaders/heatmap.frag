#version 300 es
precision highp float;
precision highp sampler2D;

// SHADER: Fragment shader per la heatmap di un singolo pigmento.
// Il componente PigmentHeatmap.vue emette una draw call per ogni pigmento visibile.
// I layer si sovrappongono tramite alpha blending (SRC_ALPHA / ONE_MINUS_SRC_ALPHA).
//
// u_weightMap: texture R32F — ogni texel è il peso del pigmento in quel pixel [0.0–1.0]
// u_color:     colore RGB del pigmento normalizzato [0,1]³
// u_opacity:   moltiplicatore globale dell'opacità (0–1)
// u_threshold: soglia minima del peso sotto cui il pixel viene scartato
// u_dimmed:    1.0 = layer non selezionato (darken mode attivo, altro pigmento in hover)
// u_contour:   1.0 = modalità contorno — mostra solo il bordo della regione pigmento
// u_texSize:   dimensioni texture in texel, usate per calcolare l'offset dei vicini

uniform sampler2D u_weightMap;
uniform vec3      u_color;
uniform float     u_opacity;
uniform float     u_threshold;
uniform float     u_dimmed;
uniform float     u_contour;
uniform vec2      u_texSize;

in vec2 v_uv;
out vec4 out_color;

void main() {
  float w = texture(u_weightMap, v_uv).r;

  if (u_contour > 0.5) {
    // SHADER: edge detection — un pixel è "bordo" se è sopra soglia
    // e almeno uno dei quattro vicini cardinali è sotto soglia.
    // u_texSize permette di calcolare l'offset di un texel in UV space.
    vec2 t = 1.0 / u_texSize;
    float wN = texture(u_weightMap, v_uv + vec2( 0.0, -t.y)).r;
    float wS = texture(u_weightMap, v_uv + vec2( 0.0,  t.y)).r;
    float wE = texture(u_weightMap, v_uv + vec2( t.x,  0.0)).r;
    float wW = texture(u_weightMap, v_uv + vec2(-t.x,  0.0)).r;
    bool isEdge = (w >= u_threshold) && (min(min(wN, wS), min(wE, wW)) < u_threshold);
    if (!isEdge) discard;
  } else {
    // PERF: discard è più efficiente di alpha=0 su GPU con early-fragment test.
    if (w < u_threshold) discard;
  }

  // SHADER: boost luminosità per garantire visibilità anche su pigmenti scuri.
  // Molti pigmenti storici (nero di carbone, terre d'ombra) hanno colorRGB molto scuro —
  // senza boost il layer si confonde con l'opera sottostante.
  // mix(u_color, vec3(1.0), 0.55): sposta il colore verso il bianco del 55%.
  vec3 displayColor = mix(u_color, vec3(1.0), 0.55);

  // Darken mode: i layer non selezionati vengono fortemente attenuati
  // così il pigmento in hover emerge chiaramente dal contesto.
  float effectiveOpacity = u_dimmed > 0.5 ? u_opacity * 0.12 : u_opacity;

  out_color = vec4(displayColor, w * effectiveOpacity);
}
