import * as THREE from 'three';

const canvas = document.getElementById('museumCanvas');
const loading = document.getElementById('loading');
const progressBar = document.getElementById('progressBar');
const walkCue = document.getElementById('walkCue');
const motionToggle = document.getElementById('motionToggle');
const chapters = [...document.querySelectorAll('.chapter')];

let motion = true;
let target = 0;
let progress = 0;
let pointerX = 0;
let pointerY = 0;

motionToggle?.addEventListener('click', () => {
  motion = !motion;
  motionToggle.textContent = motion ? 'MOTION ON' : 'MOTION OFF';
});

function updateScroll() {
  const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
  target = scrollY / max;
  progressBar.style.transform = `scaleX(${target})`;
  walkCue.classList.toggle('is-hidden', scrollY > 50);
}

addEventListener('scroll', updateScroll, { passive: true });
addEventListener('pointermove', (event) => {
  pointerX = event.clientX / innerWidth - 0.5;
  pointerY = event.clientY / innerHeight - 0.5;
}, { passive: true });
updateScroll();

try {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
    precision: 'highp'
  });
  renderer.setPixelRatio(window.devicePixelRatio || 1);
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x7797a0);
  scene.fog = new THREE.FogExp2(0x6f8f97, 0.0085);

  const camera = new THREE.PerspectiveCamera(46, innerWidth / innerHeight, 0.1, 650);
  camera.position.set(0, 4.8, 0);

  const uniforms = {
    uTime: { value: 0 },
    uCameraZ: { value: 0 },
    uSunDir: { value: new THREE.Vector3(-0.42, 0.34, -0.84).normalize() },
    uDeep: { value: new THREE.Color(0x062735) },
    uShallow: { value: new THREE.Color(0x2c6771) },
    uHorizon: { value: new THREE.Color(0x91aeb2) },
    uZenith: { value: new THREE.Color(0x18323d) }
  };

  const vertexShader = `
    precision highp float;
    uniform float uTime;
    uniform float uCameraZ;
    varying vec3 vWorldPos;
    varying vec3 vNormal;
    varying float vWake;

    const float PI2 = 6.28318530718;

    float dirWave(vec2 p, vec2 dir, float length, float speed, float amplitude, float phase) {
      float k = PI2 / length;
      return sin(dot(p, normalize(dir)) * k + uTime * speed + phase) * amplitude;
    }

    float wakeHeight(vec2 local, out float wakeMask) {
      float aft = max(0.0, local.y);
      float edgeX = 0.62 + aft * 0.205;
      float edge = abs(abs(local.x) - edgeX);
      float fade = smoothstep(0.0, 2.0, aft) * exp(-aft * 0.014);
      float edgeBand = exp(-edge * edge * 7.5) * fade;
      float diverging = sin(aft * 2.15 - abs(local.x) * 0.82 - uTime * 2.05) * 0.10 * edgeBand;
      float centerBand = exp(-local.x * local.x * 0.72) * fade * exp(-aft * 0.025);
      float transverse = sin(aft * 3.35 - uTime * 2.45) * 0.038 * centerBand;
      wakeMask = clamp(edgeBand * 0.82 + centerBand * 0.24, 0.0, 1.0);
      return diverging + transverse;
    }

    float surfaceHeight(vec2 p, out float wakeMask) {
      float h = 0.0;
      h += dirWave(p, vec2(1.0, 0.24), 18.0, 0.42, 0.105, 0.0);
      h += dirWave(p, vec2(-0.42, 1.0), 11.5, -0.51, 0.060, 1.3);
      h += dirWave(p, vec2(0.28, 1.0), 6.8, 0.67, 0.030, 2.1);
      h += dirWave(p, vec2(0.86, -0.52), 3.6, 0.92, 0.014, 0.7);
      h += dirWave(p, vec2(-0.72, -0.69), 1.85, -1.18, 0.006, 2.8);
      vec2 local = vec2(p.x, uCameraZ - p.y);
      h += wakeHeight(local, wakeMask);
      return h;
    }

    void main() {
      vec3 p = position;
      float wakeMask;
      float h = surfaceHeight(p.xz, wakeMask);
      float eps = 0.055;
      float wx;
      float wz;
      float hx = surfaceHeight(p.xz + vec2(eps, 0.0), wx);
      float hz = surfaceHeight(p.xz + vec2(0.0, eps), wz);
      vec3 localNormal = normalize(vec3(h - hx, eps, h - hz));
      p.y += h;
      vec4 world = modelMatrix * vec4(p, 1.0);
      vWorldPos = world.xyz;
      vNormal = normalize(mat3(modelMatrix) * localNormal);
      vWake = wakeMask;
      gl_Position = projectionMatrix * viewMatrix * world;
    }
  `;

  const fragmentShader = `
    precision highp float;
    uniform vec3 uSunDir;
    uniform vec3 uDeep;
    uniform vec3 uShallow;
    uniform vec3 uHorizon;
    uniform vec3 uZenith;
    varying vec3 vWorldPos;
    varying vec3 vNormal;
    varying float vWake;

    vec3 sky(vec3 direction) {
      float y = clamp(direction.y * 0.5 + 0.5, 0.0, 1.0);
      vec3 col = mix(uHorizon, uZenith, pow(y, 0.62));
      float sunCore = pow(max(dot(direction, uSunDir), 0.0), 1400.0);
      float sunGlow = pow(max(dot(direction, uSunDir), 0.0), 24.0);
      col += vec3(7.0, 4.5, 2.1) * sunCore;
      col += vec3(0.72, 0.43, 0.22) * sunGlow * 0.34;
      return col;
    }

    void main() {
      vec3 N = normalize(vNormal);
      vec3 V = normalize(cameraPosition - vWorldPos);
      vec3 R = reflect(-V, N);

      float ndv = max(dot(N, V), 0.0);
      float fresnel = 0.02 + 0.98 * pow(1.0 - ndv, 5.0);
      vec3 reflection = sky(R);

      float facing = clamp(N.y, 0.0, 1.0);
      vec3 body = mix(uDeep, uShallow, facing * 0.62);
      vec3 color = mix(body, reflection, 0.32 + fresnel * 0.64);

      vec3 H = normalize(uSunDir + V);
      float specular = pow(max(dot(N, H), 0.0), 420.0);
      float glint = pow(max(dot(N, H), 0.0), 115.0);
      color += vec3(1.0, 0.82, 0.56) * (specular * 4.6 + glint * 0.22);

      float slope = 1.0 - N.y;
      float foam = smoothstep(0.12, 0.29, slope) * vWake;
      foam += smoothstep(0.62, 0.94, vWake) * 0.20;
      color = mix(color, vec3(0.77, 0.91, 0.92), clamp(foam, 0.0, 0.72));

      float distanceFog = 1.0 - exp(-length(vWorldPos.xz - cameraPosition.xz) * 0.010);
      color = mix(color, uHorizon, distanceFog * 0.62);
      gl_FragColor = vec4(color, 1.0);
    }
  `;

  const geometry = new THREE.PlaneGeometry(420, 420, 256, 256);
  geometry.rotateX(-Math.PI / 2);
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    side: THREE.DoubleSide,
    fog: false
  });
  const water = new THREE.Mesh(geometry, material);
  scene.add(water);

  const clock = new THREE.Clock();

  function resize() {
    const width = innerWidth;
    const height = innerHeight;
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function frame() {
    requestAnimationFrame(frame);
    progress += (target - progress) * 0.045;

    const elapsed = motion ? clock.getElapsedTime() : uniforms.uTime.value;
    const cameraZ = progress * 118.0 + (motion ? elapsed * 0.34 : 0.0);
    uniforms.uTime.value = elapsed;
    uniforms.uCameraZ.value = cameraZ;

    camera.position.x += ((pointerX * 0.85) - camera.position.x) * 0.025;
    camera.position.y += ((4.8 - pointerY * 0.32) - camera.position.y) * 0.025;
    camera.position.z = cameraZ;
    camera.lookAt(camera.position.x * 0.35, 0.42, cameraZ - 46.0);

    water.position.z = cameraZ;
    renderer.render(scene, camera);

    chapters.forEach((chapter) => {
      const bounds = chapter.getBoundingClientRect();
      chapter.classList.toggle('is-active', bounds.top < innerHeight * 0.68 && bounds.bottom > innerHeight * 0.32);
    });
  }

  addEventListener('resize', resize, { passive: true });
  resize();
  loading?.classList.add('is-hidden');
  frame();
} catch (error) {
  console.error(error);
  loading?.classList.add('is-hidden');
  document.body.style.background = 'linear-gradient(#86a4ab 0 48%, #163c48 49%, #061720 100%)';
}
