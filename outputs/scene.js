/* A folded, animated coordinate surface. No render loop or document listeners. */
class MatterScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = null;
    this.lost = false;
    this.width = 1;
    this.height = 1;
    this.dpr = 1;
    this.pointer = { x: 0, y: 0 };
    this.time = 0;
    this.onContextLost = (event) => {
      event.preventDefault();
      this.lost = true;
      canvas.dataset.scene = 'fallback';
      canvas.parentElement?.setAttribute('data-scene', 'fallback');
    };
    this.onContextRestored = () => {
      this.lost = false;
      this.initialize();
      this.resize(this.width, this.height, this.dpr);
    };
    canvas.addEventListener('webglcontextlost', this.onContextLost, false);
    canvas.addEventListener('webglcontextrestored', this.onContextRestored, false);
    try {
      this.initialize();
    } catch (error) {
      this.useFallback(error);
    }
  }

  useFallback(error) {
    this.canvas.dataset.scene = 'fallback';
    this.canvas.parentElement?.setAttribute('data-scene', 'fallback');
    if (error) console.warn('The coordinate surface could not start:', error.message);
  }

  initialize() {
    const gl = this.canvas.getContext('webgl', {
      alpha: true,
      antialias: true,
      depth: true,
      stencil: false,
      powerPreference: 'high-performance',
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
    });
    if (!gl) {
      this.useFallback();
      return;
    }
    this.gl = gl;
    const derivatives = !!gl.getExtension('OES_standard_derivatives');
    const vertexSource = `
      precision highp float;
      attribute vec2 aUv;
      uniform float uTime;
      uniform float uScroll;
      uniform vec2 uPointer;
      uniform float uAspect;
      uniform float uDpr;
      uniform float uPass;
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vPosition;
      varying float vDepth;

      mat3 rotateX(float a) {
        float c = cos(a), s = sin(a);
        return mat3(1.,0.,0., 0.,c,s, 0.,-s,c);
      }
      mat3 rotateY(float a) {
        float c = cos(a), s = sin(a);
        return mat3(c,0.,-s, 0.,1.,0., s,0.,c);
      }
      mat3 rotateZ(float a) {
        float c = cos(a), s = sin(a);
        return mat3(c,s,0., -s,c,0., 0.,0.,1.);
      }

      vec3 surface(vec2 uv) {
        float t = (uv.x * 2.0 - 1.0) * 2.88;
        float w = (uv.y * 2.0 - 1.0);
        float beat = uTime * .16;
        float twist = t * .58 + .36 + sin(beat) * .12;
        float radius = 1.38 + .12 * sin(t * 2.0 + beat);
        // A broad open band turns over itself, exposing both sides of the grid.
        vec3 p = vec3(
          (radius + w * .76 * cos(twist)) * cos(t),
          (radius + w * .76 * cos(twist)) * sin(t),
          w * .94 * sin(twist) + .22 * sin(t * 2.0 + beat)
        );
        p.z += sin(t * 3.0 + w * 2.5 - beat * 1.4) * .065;
        p.y += sin(t * 1.4 + beat) * .13;
        float influence = exp(-pow(t - uPointer.x * 2.6, 2.0) * .85);
        p.z += influence * uPointer.y * .21;
        mat3 rotation = rotateZ(-.29 + uScroll * .17) *
          rotateX(.72 + sin(beat * .5) * .045 + uPointer.y * .05) *
          rotateY(-.48 + uPointer.x * .07 + uScroll * .28);
        return rotation * p;
      }

      void main() {
        vec3 p = surface(aUv);
        float e = .001;
        vec3 tangent = surface(aUv + vec2(e, 0.)) - p;
        vec3 bitangent = surface(aUv + vec2(0., e)) - p;
        vNormal = normalize(cross(tangent, bitangent));
        vPosition = p;
        vUv = aUv;
        float camera = 5.2;
        float depth = camera - p.z;
        float scale = 2.65;
        gl_Position = vec4(p.x * scale / uAspect, p.y * scale, depth * 1.002 - .2002, depth);
        gl_PointSize = (uPass > .5 ? 4.5 : 1.0) * uDpr * (5.0 / depth);
        vDepth = depth;
      }
    `;
    const fragmentSource = `${derivatives ? '#extension GL_OES_standard_derivatives : enable' : ''}
      precision highp float;
      uniform float uPass;
      uniform float uDpr;
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vPosition;
      varying float vDepth;

      float grid(vec2 uv, vec2 count, float thickness) {
        vec2 q = uv * count;
        vec2 d = abs(fract(q - .5) - .5);
        ${derivatives
          ? 'vec2 aa = max(fwidth(q), vec2(.0005));'
          : 'vec2 aa = vec2(.045, .025) / uDpr;'}
        vec2 line = 1.0 - smoothstep(aa * thickness * .25, aa * thickness, d);
        return max(line.x, line.y);
      }

      void main() {
        vec3 pearl = vec3(.945, .910, .855);
        vec3 accent = vec3(.796, .694, .541);
        if (uPass > .5) {
          float d = length(gl_PointCoord - .5) * 2.;
          float a = 1.0 - smoothstep(.65, 1.0, d);
          if (a < .02) discard;
          gl_FragColor = vec4(accent, a * .95);
          return;
        }
        vec3 n = normalize(vNormal);
        if (!gl_FrontFacing) n *= -1.;
        vec3 light = normalize(vec3(-.6, 1., 1.6));
        float diffuse = max(dot(n, light), 0.);
        vec3 view = normalize(vec3(0., 0., 5.2) - vPosition);
        float edge = pow(1.0 - abs(dot(n, view)), 2.0);
        float fine = grid(vUv, vec2(88., 28.), 1.05);
        float major = grid(vUv, vec2(22., 7.), 1.2);
        float border = 1.0 - smoothstep(0., .009, min(min(vUv.x, 1.0-vUv.x), min(vUv.y, 1.0-vUv.y)));
        float lightness = .16 + diffuse * .46 + edge * .26;
        float lines = max(fine * lightness, major * (lightness + .12));
        lines = max(lines, border * .75);
        // The nearly black body gives overlapping folds an actual silhouette.
        vec3 body = vec3(.045, .033, .024) + diffuse * vec3(.014, .012, .009);
        vec3 color = mix(body, pearl, clamp(lines, 0., .88));
        float fade = (1.0 - smoothstep(3.8, 6.9, vDepth));
        color *= .7 + fade * .3;
        gl_FragColor = vec4(color, .985);
      }
    `;

    const compile = (type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const reason = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error(reason || 'Shader compilation failed');
      }
      return shader;
    };
    let vertex, fragment;
    try {
      vertex = compile(gl.VERTEX_SHADER, vertexSource);
      fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
      const program = gl.createProgram();
      gl.attachShader(program, vertex);
      gl.attachShader(program, fragment);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const reason = gl.getProgramInfoLog(program);
        gl.deleteProgram(program);
        throw new Error(reason || 'Shader linking failed');
      }
      this.program = program;
    } catch (error) {
      this.useFallback(error);
      return;
    } finally {
      if (vertex) gl.deleteShader(vertex);
      if (fragment) gl.deleteShader(fragment);
    }

    const columns = 132;
    const rows = 56;
    const vertices = new Float32Array((columns + 1) * (rows + 1) * 2);
    let offset = 0;
    for (let y = 0; y <= rows; y++) {
      for (let x = 0; x <= columns; x++) {
        vertices[offset++] = x / columns;
        vertices[offset++] = y / rows;
      }
    }
    const indices = new Uint16Array(columns * rows * 6);
    offset = 0;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < columns; x++) {
        const a = y * (columns + 1) + x;
        const b = a + columns + 1;
        indices[offset++] = a;
        indices[offset++] = b;
        indices[offset++] = a + 1;
        indices[offset++] = a + 1;
        indices[offset++] = b;
        indices[offset++] = b + 1;
      }
    }
    this.vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    this.indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
    this.indexCount = indices.length;

    const nodes = new Float32Array([
      14/88, 4/28,
      29/88, 20/28,
      44/88, 12/28,
      65/88, 24/28,
      78/88, 8/28,
    ]);
    this.pointBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.pointBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, nodes, gl.STATIC_DRAW);
    this.pointCount = nodes.length / 2;
    this.attribute = gl.getAttribLocation(this.program, 'aUv');
    this.uniforms = Object.fromEntries(['uTime', 'uScroll', 'uPointer', 'uAspect', 'uDpr', 'uPass']
      .map((name) => [name, gl.getUniformLocation(this.program, name)]));
    gl.clearColor(0, 0, 0, 0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.disable(gl.CULL_FACE);
    this.canvas.dataset.scene = 'ready';
    this.canvas.parentElement?.setAttribute('data-scene', 'ready');
  }

  resize(width, height, dpr = 1) {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    this.dpr = Math.max(.65, Math.min(dpr, 2));
    const w = Math.round(this.width * this.dpr);
    const h = Math.round(this.height * this.dpr);
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    this.gl?.viewport(0, 0, w, h);
  }

  update(dt, elapsed, pointerNormalized = { x: 0, y: 0 }, scrollProgress = 0, reducedOrPaused = false) {
    const gl = this.gl;
    if (!gl || !this.program || this.lost) return;
    const settle = 1 - Math.exp(-Math.min(dt || .016, .1) * 3.2);
    const targetX = reducedOrPaused ? 0 : Math.max(-1, Math.min(1, pointerNormalized.x || 0));
    const targetY = reducedOrPaused ? 0 : Math.max(-1, Math.min(1, pointerNormalized.y || 0));
    this.pointer.x += (targetX - this.pointer.x) * settle;
    this.pointer.y += (targetY - this.pointer.y) * settle;
    this.time = elapsed;
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(this.program);
    gl.uniform1f(this.uniforms.uTime, this.time);
    gl.uniform1f(this.uniforms.uScroll, Math.max(0, Math.min(scrollProgress, 1)));
    gl.uniform2f(this.uniforms.uPointer, this.pointer.x, this.pointer.y);
    gl.uniform1f(this.uniforms.uAspect, this.width / this.height);
    gl.uniform1f(this.uniforms.uDpr, this.dpr);
    gl.uniform1f(this.uniforms.uPass, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.enableVertexAttribArray(this.attribute);
    gl.vertexAttribPointer(this.attribute, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.disable(gl.BLEND);
    gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_SHORT, 0);
    gl.uniform1f(this.uniforms.uPass, 1);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.pointBuffer);
    gl.vertexAttribPointer(this.attribute, 2, gl.FLOAT, false, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);
    gl.drawArrays(gl.POINTS, 0, this.pointCount);
    gl.depthMask(true);
  }
}

export default MatterScene;
