const canvas = document.getElementById('museumCanvas');
const loading = document.getElementById('loading');
const progressBar = document.getElementById('progressBar');
const walkCue = document.getElementById('walkCue');
const motionToggle = document.getElementById('motionToggle');
const chapters = [...document.querySelectorAll('.chapter')];

let targetProgress = 0;
let progress = 0;
let motion = true;
let pointerX = 0;
let pointerY = 0;

function updateScroll() {
  const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
  targetProgress = Math.min(1, Math.max(0, scrollY / max));
  progressBar.style.transform = `scaleX(${targetProgress})`;
  walkCue.classList.toggle('is-hidden', scrollY > 60);
}

addEventListener('scroll', updateScroll, { passive: true });
addEventListener('pointermove', (event) => {
  pointerX = event.clientX / innerWidth - 0.5;
  pointerY = event.clientY / innerHeight - 0.5;
}, { passive: true });
addEventListener('resize', updateScroll, { passive: true });

motionToggle?.addEventListener('click', () => {
  motion = !motion;
  motionToggle.textContent = motion ? 'MOTION ON' : 'MOTION OFF';
});

function updateChapters() {
  chapters.forEach((chapter) => {
    const rect = chapter.getBoundingClientRect();
    chapter.classList.toggle('is-active', rect.top < innerHeight * 0.66 && rect.bottom > innerHeight * 0.34);
  });
}

function hideLoading() {
  loading?.classList.add('is-hidden');
}

function startCanvasFallback() {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    hideLoading();
    return;
  }

  let dpr = 1;
  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.floor(innerWidth * dpr);
    canvas.height = Math.floor(innerHeight * dpr);
    canvas.style.width = `${innerWidth}px`;
    canvas.style.height = `${innerHeight}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  addEventListener('resize', resize, { passive: true });
  resize();

  function draw(time) {
    progress += (targetProgress - progress) * 0.055;
    const w = innerWidth;
    const h = innerHeight;
    const horizon = h * 0.44 + pointerY * 18;
    const vanX = w * 0.5 + pointerX * 24 + Math.sin(progress * 8) * 7;

    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#d8d4c9');
    sky.addColorStop(0.48, '#aaa69c');
    sky.addColorStop(1, '#565653');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#77756f';
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(vanX, horizon);
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#a7a39a';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(vanX - w * 0.18, horizon);
    ctx.lineTo(vanX, horizon);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#908d85';
    ctx.beginPath();
    ctx.moveTo(w, 0);
    ctx.lineTo(vanX + w * 0.18, horizon);
    ctx.lineTo(vanX, horizon);
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();

    const travel = progress * 13;
    for (let i = 0; i < 18; i++) {
      const z = ((i - travel) % 18 + 18) % 18;
      const p = z / 18;
      const scale = 0.08 + p * p * 1.35;
      const y = horizon + (h - horizon) * p * p;
      const half = w * 0.44 * scale;
      ctx.strokeStyle = `rgba(43,42,39,${0.08 + p * 0.24})`;
      ctx.lineWidth = 1 + p * 2.5;
      ctx.beginPath();
      ctx.moveTo(vanX - half, y);
      ctx.lineTo(vanX + half, y);
      ctx.stroke();
    }

    const lightShift = Math.sin(time * 0.00018) * w * 0.08;
    const beam = ctx.createLinearGradient(vanX - 180 + lightShift, 0, vanX + 220 + lightShift, h);
    beam.addColorStop(0, 'rgba(255,248,218,0)');
    beam.addColorStop(0.5, 'rgba(255,244,204,0.26)');
    beam.addColorStop(1, 'rgba(255,244,204,0)');
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(vanX - 95 + lightShift, 0);
    ctx.lineTo(vanX + 34 + lightShift, 0);
    ctx.lineTo(vanX + w * 0.28 + lightShift, h);
    ctx.lineTo(vanX - w * 0.06 + lightShift, h);
    ctx.closePath();
    ctx.fill();

    updateChapters();
    requestAnimationFrame(draw);
  }

  hideLoading();
  requestAnimationFrame(draw);
}

async function startThreeMuseum() {
  const THREE = await import('https://unpkg.com/three@0.169.0/build/three.module.js');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xaaa69c);
  scene.fog = new THREE.FogExp2(0xb1ada3, 0.018);
  const camera = new THREE.PerspectiveCamera(52, innerWidth / innerHeight, 0.1, 260);
  scene.add(camera);

  const textureCanvas = document.createElement('canvas');
  textureCanvas.width = textureCanvas.height = 256;
  const tx = textureCanvas.getContext('2d');
  tx.fillStyle = '#aaa69c';
  tx.fillRect(0, 0, 256, 256);
  const image = tx.getImageData(0, 0, 256, 256);
  for (let i = 0; i < image.data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 22;
    image.data[i] += noise;
    image.data[i + 1] += noise;
    image.data[i + 2] += noise;
  }
  tx.putImageData(image, 0, 0);
  const concreteTexture = new THREE.CanvasTexture(textureCanvas);
  concreteTexture.wrapS = concreteTexture.wrapT = THREE.RepeatWrapping;
  concreteTexture.repeat.set(3, 3);
  concreteTexture.colorSpace = THREE.SRGBColorSpace;

  const concrete = new THREE.MeshStandardMaterial({ color: 0xaaa69c, map: concreteTexture, roughness: 0.95 });
  const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x555551, roughness: 0.82 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x202221, roughness: 0.34, metalness: 0.32 });
  const artMaterials = [0x5e655f, 0x8d6f56, 0x2b3336, 0xb4afa4].map((color) => new THREE.MeshStandardMaterial({ color, roughness: 0.72 }));

  const addBox = (size, position, material = concrete, cast = true, receive = true) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    mesh.position.set(...position);
    mesh.castShadow = cast;
    mesh.receiveShadow = receive;
    scene.add(mesh);
    return mesh;
  };

  addBox([18, 0.35, 180], [0, -3.15, -68], floorMaterial, false, true);
  addBox([0.45, 8, 180], [-9.2, 0.7, -68]);
  addBox([0.45, 8, 180], [9.2, 0.7, -68]);
  addBox([18, 0.45, 180], [0, 5.05, -68]);

  for (let z = 8; z > -160; z -= 12) {
    const offset = Math.sin(z * 0.08) * 0.28;
    addBox([0.62, 8, 0.55], [-7.9 + offset, 0.7, z]);
    addBox([0.62, 8, 0.55], [7.9 + offset, 0.7, z]);
    addBox([16.4, 0.55, 0.55], [offset, 4.45, z]);
  }

  const sunLights = [];
  [-8, -42, -78, -116, -146].forEach((z, index) => {
    const x = index % 2 === 0 ? -3.2 : 3.1;
    const glow = new THREE.MeshBasicMaterial({ color: 0xfff2cf });
    addBox([4.7, 0.08, 7], [x, 4.79, z], glow, false, false);
    const spot = new THREE.SpotLight(0xffe5b4, index === 0 ? 145 : 105, 34, 0.48, 0.72, 1.2);
    spot.position.set(x, 4.5, z + 1.5);
    spot.target.position.set(x + (index % 2 ? -1.8 : 1.8), -3, z - 7);
    spot.castShadow = true;
    spot.shadow.mapSize.set(512, 512);
    scene.add(spot, spot.target);
    sunLights.push(spot);
  });

  scene.add(new THREE.HemisphereLight(0xf2eee4, 0x4b4943, 1.55));
  const fill = new THREE.DirectionalLight(0xdbe8ee, 0.65);
  fill.position.set(-8, 9, 5);
  scene.add(fill);

  const sculpture = new THREE.Group();
  for (let i = 0; i < 8; i++) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.45, 3.8, 0.45), dark);
    mesh.position.set(Math.sin(i * 0.9) * 1.4, -1.05, -63 + Math.cos(i * 0.9) * 1.4);
    mesh.rotation.y = i * 0.7;
    mesh.castShadow = true;
    sculpture.add(mesh);
  }
  scene.add(sculpture);

  [-25, -48, -88, -108, -136].forEach((z, index) => {
    const side = index % 2 === 0 ? -1 : 1;
    const frame = addBox([0.22, 3.7, 5.4], [side * 8.82, 0.3, z], dark);
    frame.rotation.y = Math.PI / 2;
    const art = addBox([0.16, 3.2, 4.7], [side * 8.68, 0.3, z], artMaterials[index % artMaterials.length], false, false);
    art.rotation.y = Math.PI / 2;
  });

  const clock = new THREE.Clock();
  function render() {
    const time = clock.getElapsedTime();
    progress += (targetProgress - progress) * 0.05;
    const z = 8 - progress * 156;
    const bend = Math.sin((z + 12) * 0.035) * 0.62;
    const bob = motion ? Math.sin(time * 0.72) * 0.025 : 0;
    camera.position.set(bend + pointerX * 0.18, bob - pointerY * 0.11, z);
    camera.lookAt(bend * 0.35, 0, z - 12);
    camera.rotation.z = pointerX * -0.004;
    sculpture.rotation.y = time * 0.09;
    sunLights.forEach((light, index) => {
      light.intensity = (index === 0 ? 145 : 105) + (motion ? Math.sin(time * 0.32 + index) * 12 : 0);
    });
    updateChapters();
    renderer.render(scene, camera);
    requestAnimationFrame(render);
  }

  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  }, { passive: true });

  hideLoading();
  render();
}

updateScroll();
setTimeout(hideLoading, 3500);
startThreeMuseum().catch((error) => {
  console.error('Three.js museum failed, using canvas fallback:', error);
  startCanvasFallback();
});