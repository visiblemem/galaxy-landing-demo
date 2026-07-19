import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';

const canvas=document.getElementById('museumCanvas');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.05;

const scene=new THREE.Scene();
scene.background=new THREE.Color(0xaaa69c);
scene.fog=new THREE.FogExp2(0xb1ada3,.018);

const camera=new THREE.PerspectiveCamera(52,innerWidth/innerHeight,.1,260);
scene.add(camera);

const makeConcreteTexture=()=>{
  const c=document.createElement('canvas');c.width=c.height=512;
  const x=c.getContext('2d');
  x.fillStyle='#aaa69c';x.fillRect(0,0,512,512);
  const img=x.getImageData(0,0,512,512);
  for(let i=0;i<img.data.length;i+=4){const n=(Math.random()-.5)*24;img.data[i]+=n;img.data[i+1]+=n;img.data[i+2]+=n}
  x.putImageData(img,0,0);
  for(let i=0;i<55;i++){x.strokeStyle=`rgba(40,40,36,${Math.random()*.055})`;x.lineWidth=Math.random()*1.3;x.beginPath();x.moveTo(Math.random()*512,0);x.lineTo(Math.random()*512,512);x.stroke()}
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(2,2);t.colorSpace=THREE.SRGBColorSpace;return t;
};

const concreteTex=makeConcreteTexture();
const concrete=new THREE.MeshStandardMaterial({color:0xa9a59b,map:concreteTex,roughness:.94,metalness:.02});
const darkConcrete=new THREE.MeshStandardMaterial({color:0x565653,map:concreteTex,roughness:.96});
const blackStone=new THREE.MeshStandardMaterial({color:0x131515,roughness:.2,metalness:.08});
const glass=new THREE.MeshPhysicalMaterial({color:0x9da8a9,transmission:.45,transparent:true,opacity:.32,roughness:.08,metalness:.05});
const glowMat=new THREE.MeshBasicMaterial({color:0xfff2cf});
const artMaterials=[0x5e655f,0x8d6f56,0x2b3336,0xb4afa4].map(c=>new THREE.MeshStandardMaterial({color:c,roughness:.72}));

const addBox=(size,pos,mat=concrete,cast=true,receive=true)=>{
  const m=new THREE.Mesh(new THREE.BoxGeometry(...size),mat);m.position.set(...pos);m.castShadow=cast;m.receiveShadow=receive;scene.add(m);return m;
};

addBox([18,.35,180],[0,-3.15,-68],darkConcrete,false,true);
addBox([.45,8,180],[-9.2,.7,-68]);
addBox([.45,8,180],[9.2,.7,-68]);
addBox([18,.45,180],[0,5.05,-68]);

const ribs=[];
for(let z=8;z>-160;z-=12){
  const offset=Math.sin(z*.08)*.28;
  const left=addBox([.62,8,.55],[-7.9+offset,.7,z],concrete);
  const right=addBox([.62,8,.55],[7.9+offset,.7,z],concrete);
  const top=addBox([16.4,.55,.55],[offset,4.45,z],concrete);
  ribs.push(left,right,top);
}

const openings=[-8,-42,-78,-116,-146];
const sunLights=[];
openings.forEach((z,i)=>{
  const x=i%2===0?-3.2:3.1;
  addBox([4.7,.08,7],[x,4.79,z],glowMat,false,false);
  const spot=new THREE.SpotLight(0xffe5b4,i===0?150:110,32,.48,.72,1.2);
  spot.position.set(x,4.5,z+1.5);spot.target.position.set(x+(i%2? -1.8:1.8),-3,z-7);spot.castShadow=true;spot.shadow.mapSize.set(1024,1024);spot.shadow.bias=-.0004;
  scene.add(spot,spot.target);sunLights.push(spot);
});

const ambient=new THREE.HemisphereLight(0xe8edf0,0x4d4942,1.4);scene.add(ambient);
const fill=new THREE.DirectionalLight(0xbad1df,.75);fill.position.set(-8,9,5);scene.add(fill);

const sculpture=new THREE.Group();
const sculptMat=new THREE.MeshStandardMaterial({color:0x242727,roughness:.18,metalness:.78});
for(let i=0;i<8;i++){const m=new THREE.Mesh(new THREE.BoxGeometry(.45,3.8,.45),sculptMat);m.position.set(Math.sin(i*.9)*1.4,-1.05, -63+Math.cos(i*.9)*1.4);m.rotation.y=i*.7;m.castShadow=true;sculpture.add(m)}
scene.add(sculpture);

const artZ=[-25,-48,-88,-108,-136];
artZ.forEach((z,i)=>{
  const side=i%2===0?-1:1;
  const frame=addBox([.22,3.7,5.4],[side*8.82,.3,z],blackStone);
  frame.rotation.y=Math.PI/2;
  const art=addBox([.16,3.2,4.7],[side*8.68,.3,z],artMaterials[i%artMaterials.length],false,false);
  art.rotation.y=Math.PI/2;
});

const water=addBox([12,.08,16],[0,-2.92,-148],glass,false,true);
water.material.transparent=true;water.material.opacity=.48;

const dustGeo=new THREE.BufferGeometry();
const dustCount=1200;const dustPos=new Float32Array(dustCount*3);
for(let i=0;i<dustCount;i++){dustPos[i*3]=(Math.random()-.5)*17;dustPos[i*3+1]=Math.random()*7-2.7;dustPos[i*3+2]=-Math.random()*175+12}
dustGeo.setAttribute('position',new THREE.BufferAttribute(dustPos,3));
const dust=new THREE.Points(dustGeo,new THREE.PointsMaterial({color:0xfff3d5,size:.025,transparent:true,opacity:.42,depthWrite:false}));scene.add(dust);

let targetProgress=0,progress=0,motion=true,pointerX=0,pointerY=0;
const chapters=[...document.querySelectorAll('.chapter')];
const progressBar=document.getElementById('progressBar');
const walkCue=document.getElementById('walkCue');
const motionToggle=document.getElementById('motionToggle');

const updateScroll=()=>{
  const max=document.documentElement.scrollHeight-innerHeight;
  targetProgress=max>0?scrollY/max:0;
  progressBar.style.transform=`scaleX(${targetProgress})`;
  walkCue.classList.toggle('is-hidden',scrollY>60);
};
addEventListener('scroll',updateScroll,{passive:true});updateScroll();
addEventListener('pointermove',e=>{pointerX=(e.clientX/innerWidth-.5);pointerY=(e.clientY/innerHeight-.5)},{passive:true});

motionToggle.addEventListener('click',()=>{motion=!motion;motionToggle.textContent=motion?'MOTION ON':'MOTION OFF'});

const clock=new THREE.Clock();
function render(){
  const t=clock.getElapsedTime();
  progress+=(targetProgress-progress)*.045;
  const z=8-progress*156;
  const bend=Math.sin((z+12)*.035)*.62;
  const bob=motion?Math.sin(t*.72)*.025:0;
  camera.position.set(bend+pointerX*.18,bob+pointerY*-.11,z);
  camera.lookAt(bend*.35,0,z-12);
  camera.rotation.z=pointerX*-.004;
  sculpture.rotation.y=t*.09;
  dust.position.z=(t*.08)%2;
  sunLights.forEach((l,i)=>{l.position.x+=(Math.sin(t*.17+i)*.002);l.intensity=(i===0?145:105)+(motion?Math.sin(t*.32+i)*12:0)});
  const positions=dust.geometry.attributes.position.array;
  for(let i=1;i<positions.length;i+=3){positions[i]+=Math.sin(t*.25+i)*.00035;if(positions[i]>4.5)positions[i]=-2.6}
  dust.geometry.attributes.position.needsUpdate=true;

  chapters.forEach((chapter,i)=>{
    const r=chapter.getBoundingClientRect();
    const active=r.top<innerHeight*.65&&r.bottom>innerHeight*.35;
    chapter.classList.toggle('is-active',active);
  });
  renderer.render(scene,camera);
  requestAnimationFrame(render);
}

addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.5))},{passive:true});

setTimeout(()=>document.getElementById('loading').classList.add('is-hidden'),900);
render();