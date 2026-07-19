const canvas = document.getElementById('museumCanvas');
const loading = document.getElementById('loading');
const progressBar = document.getElementById('progressBar');
const walkCue = document.getElementById('walkCue');
const motionToggle = document.getElementById('motionToggle');
const chapters = [...document.querySelectorAll('.chapter')];

let motion = true;
let scrollProgress = 0;
let targetDistance = 0;
let distance = 0;
let pointerX = 0;
let pointerY = 0;

motionToggle?.addEventListener('click', () => {
  motion = !motion;
  motionToggle.textContent = motion ? 'MOTION ON' : 'MOTION OFF';
});

function updateScrollState() {
  const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
  scrollProgress = scrollY / max;
  targetDistance = scrollProgress * 240;
  if (progressBar) progressBar.style.transform = `scaleX(${scrollProgress})`;
  walkCue?.classList.toggle('is-hidden', scrollY > 60);
}

addEventListener('scroll', updateScrollState, { passive: true });
addEventListener('pointermove', (event) => {
  pointerX = event.clientX / innerWidth - 0.5;
  pointerY = event.clientY / innerHeight - 0.5;
}, { passive: true });
updateScrollState();

function showScene() {
  loading?.classList.add('is-hidden');
}
setTimeout(showScene, 3600);

function makeFallback() {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const draw = () => {
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    const w = innerWidth;
    const h = innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#bcb7aa';
    ctx.fillRect(0, 0, w, h);
    const horizon = h * 0.43;
    const center = w * 0.5;
    ctx.fillStyle = '#737269';
    ctx.beginPath(); ctx.moveTo(0, h); ctx.lineTo(center - 70, horizon); ctx.lineTo(center + 70, horizon); ctx.lineTo(w, h); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#a6a298';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(center - 70, horizon); ctx.lineTo(0, h); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(w, 0); ctx.lineTo(center + 70, horizon); ctx.lineTo(w, h); ctx.closePath(); ctx.fill();
    const glow = ctx.createRadialGradient(center + w * .18, h * .12, 0, center + w * .18, h * .12, w * .5);
    glow.addColorStop(0, 'rgba(255,245,211,.92)'); glow.addColorStop(1, 'rgba(255,245,211,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h);
  };
  draw();
  addEventListener('resize', draw, { passive: true });
  showScene();
}

(async function init() {
  try {
    const THREE = await import('https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.35));
    renderer.setSize(innerWidth, innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xbdb8ab);
    scene.fog = new THREE.Fog(0xb8b2a6, 18, 92);

    const camera = new THREE.PerspectiveCamera(48, innerWidth / innerHeight, 0.08, 180);
    camera.position.set(0, 0.15, 5.5);

    const textureCanvas = document.createElement('canvas');
    textureCanvas.width = textureCanvas.height = 512;
    const tx = textureCanvas.getContext('2d');
    tx.fillStyle = '#a9a59b'; tx.fillRect(0, 0, 512, 512);
    const image = tx.getImageData(0, 0, 512, 512);
    for (let i = 0; i < image.data.length; i += 4) {
      const n = (Math.random() - .5) * 30;
      image.data[i] += n; image.data[i + 1] += n; image.data[i + 2] += n;
    }
    tx.putImageData(image, 0, 0);
    for (let i = 0; i < 70; i++) {
      tx.strokeStyle = `rgba(30,30,28,${Math.random() * .045})`;
      tx.lineWidth = .4 + Math.random() * 1.2;
      tx.beginPath();
      tx.moveTo(Math.random() * 512, 0);
      tx.lineTo(Math.random() * 512, 512);
      tx.stroke();
    }
    const concreteMap = new THREE.CanvasTexture(textureCanvas);
    concreteMap.wrapS = concreteMap.wrapT = THREE.RepeatWrapping;
    concreteMap.repeat.set(2.2, 2.2);
    concreteMap.colorSpace = THREE.SRGBColorSpace;

    const concrete = new THREE.MeshStandardMaterial({ color: 0xb1ada3, map: concreteMap, roughness: .94, metalness: .01 });
    const concreteDark = new THREE.MeshStandardMaterial({ color: 0x77766f, map: concreteMap, roughness: .96, metalness: .01 });
    const concreteWarm = new THREE.MeshStandardMaterial({ color: 0xc1b8a7, map: concreteMap, roughness: .93 });
    const blackStone = new THREE.MeshStandardMaterial({ color: 0x111313, roughness: .22, metalness: .08 });
    const steel = new THREE.MeshStandardMaterial({ color: 0x787c7c, roughness: .26, metalness: .82 });
    const glass = new THREE.MeshPhysicalMaterial({ color: 0xa9c0c4, roughness: .08, metalness: .02, transmission: .62, transparent: true, opacity: .42, thickness: .15 });
    const waterMat = new THREE.MeshPhysicalMaterial({ color: 0x87989b, roughness: .06, metalness: .05, transmission: .32, transparent: true, opacity: .62 });

    const world = new THREE.Group();
    scene.add(world);

    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    function box(size, pos, material, parent = world, cast = true, receive = true) {
      const mesh = new THREE.Mesh(boxGeo, material);
      mesh.scale.set(...size);
      mesh.position.set(...pos);
      mesh.castShadow = cast;
      mesh.receiveShadow = receive;
      parent.add(mesh);
      return mesh;
    }

    const SEGMENT = 18;
    const COUNT = 12;
    const segments = [];

    function buildSegment(index) {
      const group = new THREE.Group();
      group.userData.index = index;
      const variant = index % 5;
      const sideShift = Math.sin(index * 1.7) * 0.9;

      box([17.5, .28, SEGMENT], [0, -3.05, -SEGMENT / 2], concreteDark, group, false, true);
      box([.42, 7.6, SEGMENT], [-8.55, .55, -SEGMENT / 2], concrete, group);
      box([.42, 7.6, SEGMENT], [8.55, .55, -SEGMENT / 2], concrete, group);

      if (variant !== 2) {
        box([17.5, .36, SEGMENT], [0, 4.25, -SEGMENT / 2], concrete, group);
      } else {
        box([5.7, .35, SEGMENT], [-5.9, 4.25, -SEGMENT / 2], concrete, group);
        box([5.7, .35, SEGMENT], [5.9, 4.25, -SEGMENT / 2], concrete, group);
        box([5.2, .08, SEGMENT * .72], [0, 4.08, -SEGMENT / 2], glass, group, false, false);
      }

      for (let z = -2; z > -SEGMENT; z -= 5.7) {
        box([.48, 7.1, .48], [-7.35, .55, z], concreteWarm, group);
        box([.48, 7.1, .48], [7.35, .55, z], concreteWarm, group);
      }

      if (variant === 0 || variant === 3) {
        const panel = box([.16, 3.1, 4.6], [variant === 0 ? -8.28 : 8.28, .15, -8.5], variant === 0 ? blackStone : steel, group, false, false);
        panel.rotation.y = Math.PI / 2;
      }

      if (variant === 1) {
        box([3.4, .55, 1.05], [sideShift, -2.48, -8.5], blackStone, group);
        box([.5, 2.6, .5], [sideShift - .9, -1.1, -8.5], steel, group);
        box([.5, 3.7, .5], [sideShift + .1, -.55, -8.5], steel, group);
        box([.5, 2.9, .5], [sideShift + 1.1, -.95, -8.5], steel, group);
      }

      if (variant === 4) {
        box([10.5, .08, 8.5], [0, -2.82, -9], waterMat, group, false, true);
        box([1.4, 1.4, 1.4], [0, -2.1, -9], concreteWarm, group);
      }

      group.position.z = -index * SEGMENT;
      group.position.x = Math.sin(index * .52) * .42;
      world.add(group);
      return group;
    }

    for (let i = 0; i < COUNT; i++) segments.push(buildSegment(i));

    const hemisphere = new THREE.HemisphereLight(0xf2f4f0, 0x5a574f, 1.65);
    scene.add(hemisphere);
    const sun = new THREE.DirectionalLight(0xffe3ad, 3.6);
    sun.position.set(-10, 14, 6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1536, 1536);
    sun.shadow.camera.left = -16;
    sun.shadow.camera.right = 16;
    sun.shadow.camera.top = 14;
    sun.shadow.camera.bottom = -14;
    sun.shadow.camera.near = .5;
    sun.shadow.camera.far = 80;
    sun.shadow.bias = -.00035;
    scene.add(sun);

    const warmFill = new THREE.PointLight(0xffd7a3, 16, 32, 2);
    warmFill.position.set(4.5, 2.8, -18);
    scene.add(warmFill);

    const dustGeo = new THREE.BufferGeometry();
    const dustCount = 900;
    const dustPositions = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      dustPositions[i * 3] = (Math.random() - .5) * 16;
      dustPositions[i * 3 + 1] = Math.random() * 7 - 2.8;
      dustPositions[i * 3 + 2] = -Math.random() * 95 + 8;
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0xffedc9, size: .022, transparent: true, opacity: .38, depthWrite: false }));
    scene.add(dust);

    const clock = new THREE.Clock();
    function animate() {
      const t = clock.getElapsedTime();
      distance += (targetDistance - distance) * .055;
      const baseZ = 5.5 - distance;
      const bend = Math.sin(distance * .035) * .58;
      const breath = motion ? Math.sin(t * .7) * .025 : 0;

      camera.position.set(bend + pointerX * .2, .15 + breath - pointerY * .12, baseZ);
      camera.lookAt(bend * .4, .02, baseZ - 11);
      camera.rotation.z = pointerX * -.004;

      const cycle = COUNT * SEGMENT;
      segments.forEach((segment, i) => {
        const local = ((i * SEGMENT - distance) % cycle + cycle) % cycle;
        segment.position.z = baseZ - local - SEGMENT * .35;
        segment.position.x = Math.sin((distance + i * SEGMENT) * .028) * .42;
      });

      sun.position.x = -10 + Math.sin(t * .11) * 5.5;
      sun.position.z = baseZ - 10;
      sun.target?.position.set(0, 0, baseZ - 24);
      warmFill.position.z = baseZ - 19;
      warmFill.position.x = 4 + Math.sin(t * .18) * 2.5;

      const dustArray = dust.geometry.attributes.position.array;
      for (let i = 1; i < dustArray.length; i += 3) {
        dustArray[i] += Math.sin(t * .22 + i) * .00028;
        if (dustArray[i] > 4.2) dustArray[i] = -2.6;
      }
      dust.position.z = -((distance * .12) % 12);
      dust.geometry.attributes.position.needsUpdate = true;

      chapters.forEach(chapter => {
        const rect = chapter.getBoundingClientRect();
        chapter.classList.toggle('is-active', rect.top < innerHeight * .66 && rect.bottom > innerHeight * .34);
      });

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    }

    addEventListener('resize', () => {
      camera.aspect = innerWidth / innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(innerWidth, innerHeight);
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.35));
    }, { passive: true });

    showScene();
    animate();
  } catch (error) {
    console.error('Museum render failed:', error);
    makeFallback();
  }
})();