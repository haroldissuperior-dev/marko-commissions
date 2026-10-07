/* ui.matt — background: slow monochrome fbm fog, fixed canvas.
   Renders a single frame when motion is off; drifts with the mouse and
   scroll when it's on. */

const canvas = document.getElementById("bg");
if (canvas && !canvas.getContext("webgl2", { alpha: false })) {
  canvas.remove(); // body background already matches; nothing else to do
} else if (canvas) {
  init(canvas.getContext("webgl2", { alpha: false }));
}

function init(gl) {
  const VERT = `#version 300 es
  layout(location=0) in vec2 p;
  void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;

  const FRAG = `#version 300 es
  precision highp float;
  uniform vec2  uRes;
  uniform float uTime;
  uniform vec2  uMouse;
  uniform float uScroll;
  out vec4 outColor;

  float hash(vec2 p){
    p = fract(p * vec2(234.34, 435.345));
    p += dot(p, p + 34.23);
    return fract(p.x * p.y);
  }
  float noise(vec2 p){
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1, 0)), u.x),
      mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  mat2 m2 = mat2(0.86, 0.5, -0.5, 0.86);
  float fbm(vec2 p){
    float v = 0.0, a = 0.55;
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p = m2 * p * 2.02;
      a *= 0.5;
    }
    return v;
  }

  void main(){
    vec2 frag = gl_FragCoord.xy;
    vec2 uv = frag / uRes;
    vec2 p = (frag - 0.5 * uRes) / uRes.y;

    float t = uTime * 0.045;
    vec2 drift = vec2(t * 0.6, -t * 0.25) + uMouse * 0.06;
    drift.y += uScroll * 0.00012;

    vec2 q = vec2(fbm(p * 1.4 + drift), fbm(p * 1.4 + drift + vec2(5.2, 1.3)));
    float f = fbm(p * 1.7 + 1.9 * q + drift * 0.7);

    float v = pow(clamp(f, 0.0, 1.0), 2.4) * 0.16;

    // slow diagonal beam for a hint of structure
    float beam = exp(-abs(dot(p, normalize(vec2(0.8, 0.45))) + 0.22 + sin(t * 0.7) * 0.12) * 3.0);
    v += beam * 0.028;

    // vignette
    v *= 1.0 - 0.5 * length(uv - 0.5);

    outColor = vec4(vec3(v), 1.0);
  }`;

  const compile = (type, src) => {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.error("[bg] shader:", gl.getShaderInfoLog(sh));
      return null;
    }
    return sh;
  };
  const vs = compile(gl.VERTEX_SHADER, VERT);
  const fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) { canvas.remove(); return; }

  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { canvas.remove(); return; }
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  const U = {
    res: gl.getUniformLocation(prog, "uRes"),
    time: gl.getUniformLocation(prog, "uTime"),
    mouse: gl.getUniformLocation(prog, "uMouse"),
    scroll: gl.getUniformLocation(prog, "uScroll"),
  };

  let mx = 0, my = 0, smx = 0, smy = 0, scroll = 0;
  let motion = document.documentElement.classList.contains("motion-on");
  window.addEventListener("pointermove", (e) => {
    if (e.pointerType === "touch") return;
    mx = (e.clientX / window.innerWidth) * 2 - 1;
    my = (e.clientY / window.innerHeight) * 2 - 1;
  });
  window.addEventListener("uim-scroll", (e) => { scroll = e.detail.y; });
  window.addEventListener("uim-motion", (e) => {
    motion = e.detail.on;
    staticDrawn = false;
  });

  let staticDrawn = false;

  function resize() {
    const dpr = 1;
    const w = Math.round(window.innerWidth * dpr);
    const h = Math.round(window.innerHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
      staticDrawn = false;
    }
  }

  function frame(tSec) {
    if (document.hidden) return;
    resize();
    if (!motion) {
      if (staticDrawn) return;
      staticDrawn = true;
    }
    if (motion) {
      smx += (mx - smx) * 0.03;
      smy += (my - smy) * 0.03;
    } else { smx = 0; smy = 0; }
    gl.uniform2f(U.res, canvas.width, canvas.height);
    gl.uniform1f(U.time, tSec);
    gl.uniform2f(U.mouse, smx, smy);
    gl.uniform1f(U.scroll, scroll);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  const t0 = performance.now();
  function loop() {
    frame((performance.now() - t0) / 1000);
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
}
