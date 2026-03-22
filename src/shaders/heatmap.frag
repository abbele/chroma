#version 300 es
precision highp float;
precision highp sampler2D;

// SHADER: Fragment shader per la heatmap di un singolo pigmento.
// Il componente PigmentHeatmap.vue emette una draw call per ogni pigmento visibile.
// I layer si sovrappongono tramite alpha blending (SRC_ALPHA / ONE_MINUS_SRC_ALPHA).
//
// u_weightMap: texture R32F — ogni texel è il peso del pigmento in quel pixel [0.0–1.0]
//   L'origine è in alto a sinistra (coerente con ImageData / Float32Array row-major).
//   Prodotta da computeWeightMaps() in src/utils/colorMath.ts.
//
// u_color:     colore RGB del pigmento normalizzato [0,1]³
//   Passato come colorRGB[i]/255 dal componente Vue.
//
// u_opacity:   moltiplicatore globale dell'opacità (0–1), controllato dall'UI.
//   Permette all'utente di regolare la trasparenza dell'overlay senza
//   perdere le informazioni spaziali della weight map.
//
// u_threshold: soglia minima del peso sotto cui il pixel viene scartato.
//   Riduce il rumore visivo ai bordi dei cluster e negli overlap tra pigmenti.
//   Default: 0.15 (impostato in PigmentHeatmap.vue).

uniform sampler2D u_weightMap;
uniform vec3 u_color;
uniform float u_opacity;
uniform float u_threshold;

in vec2 v_uv;
out vec4 out_color;

void main() {
  float w = texture(u_weightMap, v_uv).r;

  // PERF: discard è più efficiente di alpha=0 su GPU con early-fragment test.
  // Evita scritture inutili nel framebuffer e riduce l'overdraw.
  if (w < u_threshold) discard;

  // SHADER: alpha = peso × opacità globale.
  // La GPU accumula i contributi di tutti i layer pigmento tramite alpha blending.
  // Il risultato visivo: zone ad alta concentrazione appaiono opache, bordi traslucidi.
  out_color = vec4(u_color, w * u_opacity);
}
