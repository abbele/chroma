#version 300 es

// SHADER: Vertex shader per il quad full-screen della heatmap pigmento.
// Disegna un rettangolo che copre l'intero canvas WebGL usando 6 vertici (2 triangoli).
//
// a_pos: posizione vertice in NDC (Normalized Device Coordinates) [-1,1] × [-1,1]
// v_uv:  coordinate texture [0,1] × [0,1] — passate al fragment shader

in vec2 a_pos;
out vec2 v_uv;

void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);

  // COLOR: converti NDC [-1,1] → coordinate texture [0,1]
  // SHADER: Y è invertita perché Float32Array (dall'analisi colorMath.ts) usa
  // l'origine in alto a sinistra (row-major, riga 0 = riga superiore),
  // mentre WebGL ha origine in basso a sinistra.
  // Senza questa inversione l'heatmap appare capovolta verticalmente.
  v_uv = vec2(
    (a_pos.x + 1.0) * 0.5,
    (1.0 - a_pos.y) * 0.5
  );
}
