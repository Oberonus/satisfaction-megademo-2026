// Minimal WebGL2 helpers: context, programs, render targets, textures and a
// fullscreen triangle.

export const VERT_FS = `#version 300 es
layout(location=0) in vec2 p;
out vec2 vUv;
void main(){ vUv = p*0.5+0.5; gl_Position = vec4(p,0.,1.); }`;

// `preserve` keeps the drawing buffer after compositing. Only the still/record
// modes need it; leaving it off saves bandwidth, mostly on mobile GPUs.
export function createGL(canvas, { preserve = false } = {}) {
  const gl = canvas.getContext('webgl2', {
    antialias: false, alpha: false, premultipliedAlpha: false,
    powerPreference: 'high-performance', preserveDrawingBuffer: preserve,
  });
  if (!gl) throw new Error('WebGL2 is not available in this browser.');

  const float32 = gl.getExtension('EXT_color_buffer_float');
  gl.float32 = !!float32;                                    // RGBA32F render targets
  gl.hdr = !!(float32 || gl.getExtension('EXT_color_buffer_half_float'));
  gl.getExtension('OES_texture_float_linear');
  gl.parallel = gl.getExtension('KHR_parallel_shader_compile');
  gl.programs = [];

  gl.fsVao = gl.createVertexArray();
  gl.bindVertexArray(gl.fsVao);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  return gl;
}

// ------------------------------------------------------------------ programs --
// program() only queues compilation. Status checks and uniform lookups happen in
// finalize(), after the driver had time to compile in parallel (see programsReady).

function shader(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  return s;
}

export function program(gl, frag, vert = VERT_FS, name = 'shader') {
  const p = gl.createProgram();
  const vs = shader(gl, gl.VERTEX_SHADER, vert), fs = shader(gl, gl.FRAGMENT_SHADER, frag);
  gl.attachShader(p, vs);
  gl.attachShader(p, fs);
  gl.linkProgram(p);
  const prog = { p, loc: null, name, pending: { vs, fs, vert, frag } };
  gl.programs.push(prog);
  return prog;
}

function shaderError(gl, s, src, name) {
  if (gl.getShaderParameter(s, gl.COMPILE_STATUS)) return null;
  const log = gl.getShaderInfoLog(s) || '';
  const lines = src.split('\n').map((l, i) => `${String(i + 1).padStart(4)}: ${l}`);
  const m = /0:(\d+)/.exec(log);
  const ctx = m ? lines.slice(Math.max(0, +m[1] - 4), +m[1] + 2).join('\n') : '';
  return `Shader "${name}" failed:\n${log}\n${ctx}`;
}

export function finalize(gl, prog) {
  if (prog.loc) return prog;
  const { vs, fs, vert, frag } = prog.pending;
  if (!gl.getProgramParameter(prog.p, gl.LINK_STATUS)) {
    throw new Error(shaderError(gl, vs, vert, prog.name + ':vs') || shaderError(gl, fs, frag, prog.name + ':fs')
      || `Link "${prog.name}": ${gl.getProgramInfoLog(prog.p)}`);
  }
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  prog.pending = null;
  prog.loc = {};
  const n = gl.getProgramParameter(prog.p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) {
    const info = gl.getActiveUniform(prog.p, i);
    prog.loc[info.name.replace(/\[0\]$/, '')] = gl.getUniformLocation(prog.p, info.name);
  }
  return prog;
}

// Resolves once every queued program has compiled (without blocking the page
// when KHR_parallel_shader_compile is available), then checks them all.
export async function programsReady(gl, { wait = true } = {}) {
  const todo = () => gl.programs.filter((pr) => !pr.loc);
  if (gl.parallel && wait) {
    while (todo().some((pr) => !gl.getProgramParameter(pr.p, gl.parallel.COMPLETION_STATUS_KHR))) {
      await new Promise((r) => setTimeout(r, 16));
    }
  }
  for (const pr of todo()) finalize(gl, pr);
}

// Bind a program and set uniforms, inferring the type from the JS value.
// Textures are passed as {tex, unit}.
export function use(gl, prog, uniforms = {}) {
  if (!prog.loc) finalize(gl, prog);
  gl.useProgram(prog.p);
  for (const k in uniforms) {
    const l = prog.loc[k];
    if (l == null) continue;
    const v = uniforms[k];
    if (typeof v === 'number') gl.uniform1f(l, v);
    else if (typeof v === 'boolean') gl.uniform1i(l, v ? 1 : 0);
    else if (v.tex !== undefined) {
      gl.activeTexture(gl.TEXTURE0 + v.unit);
      gl.bindTexture(gl.TEXTURE_2D, v.tex);
      gl.uniform1i(l, v.unit);
    }
    else if (v.length === 2) gl.uniform2fv(l, v);
    else if (v.length === 3) gl.uniform3fv(l, v);
    else if (v.length === 4) gl.uniform4fv(l, v);
    else gl.uniform1fv(l, v);
  }
}

export function drawFS(gl) {
  gl.bindVertexArray(gl.fsVao);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

// ------------------------------------------------------- targets and textures --

function params(gl, filter, wrap = gl.CLAMP_TO_EDGE) {
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
}

// Render target. Formats: 'hdr' (RGBA16F when supported, else RGBA8),
// 'f32' (RGBA32F, needs gl.float32), 'rgba8'.
export function target(gl, w, h, { format = 'hdr', filter = gl.LINEAR } = {}) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  if (format === 'f32') gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, w, h, 0, gl.RGBA, gl.FLOAT, null);
  else if (format === 'hdr' && gl.hdr) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
  else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  params(gl, filter);
  const fb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return { tex, fb, w, h };
}

export function freeTarget(gl, t) {
  if (!t) return;
  gl.deleteTexture(t.tex);
  gl.deleteFramebuffer(t.fb);
}

export function bindTarget(gl, t) {
  gl.bindFramebuffer(gl.FRAMEBUFFER, t ? t.fb : null);
  gl.viewport(0, 0, t ? t.w : gl.drawingBufferWidth, t ? t.h : gl.drawingBufferHeight);
}

export function texture(gl, source, { filter = gl.NEAREST } = {}) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  params(gl, filter);
  return tex;
}

export function dataTexture(gl, w, h, bytes) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, w, h, 0, gl.RED, gl.UNSIGNED_BYTE, bytes);
  params(gl, gl.NEAREST);
  return tex;
}
