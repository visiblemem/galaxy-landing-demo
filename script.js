const canvas=document.getElementById('museumCanvas');
const loading=document.getElementById('loading');
const progressBar=document.getElementById('progressBar');
const walkCue=document.getElementById('walkCue');
const motionToggle=document.getElementById('motionToggle');
const chapters=[...document.querySelectorAll('.chapter')];

let motion=true,target=0,progress=0,pointerX=0,pointerY=0;
motionToggle?.addEventListener('click',()=>{motion=!motion;motionToggle.textContent=motion?'MOTION ON':'MOTION OFF'});

function updateScroll(){
  const max=Math.max(1,document.documentElement.scrollHeight-innerHeight);
  target=scrollY/max;
  progressBar.style.transform=`scaleX(${target})`;
  walkCue.classList.toggle('is-hidden',scrollY>50);
}
addEventListener('scroll',updateScroll,{passive:true});
addEventListener('pointermove',e=>{pointerX=e.clientX/innerWidth-.5;pointerY=e.clientY/innerHeight-.5},{passive:true});
updateScroll();
setTimeout(()=>loading?.classList.add('is-hidden'),3200);

function fallback(){
  const ctx=canvas.getContext('2d'); if(!ctx)return;
  function draw(){
    const d=Math.min(devicePixelRatio||1,1.5),w=innerWidth,h=innerHeight;
    canvas.width=w*d;canvas.height=h*d;ctx.setTransform(d,0,0,d,0,0);
    const g=ctx.createLinearGradient(0,0,0,h);g.addColorStop(0,'#eee7d8');g.addColorStop(.55,'#b8d1d4');g.addColorStop(1,'#746c63');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
    ctx.globalCompositeOperation='screen';
    for(let i=0;i<5;i++){const x=w*(.12+i*.2),beam=ctx.createLinearGradient(x,0,x+80,h);beam.addColorStop(0,'rgba(255,255,255,.85)');beam.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=beam;ctx.fillRect(x-30,0,110,h)}
    ctx.globalCompositeOperation='source-over';
  }
  draw();addEventListener('resize',draw,{passive:true});loading?.classList.add('is-hidden');
}

(async function init(){
  try{
    const THREE=await import('https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js');
    const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
    renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.35));
    renderer.setSize(innerWidth,innerHeight);
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure=1.15;
    renderer.shadowMap.enabled=true;
    renderer.shadowMap.type=THREE.PCFSoftShadowMap;

    const scene=new THREE.Scene();
    scene.background=new THREE.Color(0xd7d2c8);
    scene.fog=new THREE.Fog(0xc8c4bc,20,105);
    const camera=new THREE.PerspectiveCamera(46,innerWidth/innerHeight,.1,220);

    const white=new THREE.MeshStandardMaterial({color:0xd7d4cb,roughness:.88,metalness:.01});
    const warmWhite=new THREE.MeshStandardMaterial({color:0xe2d7c2,roughness:.82});
    const dark=new THREE.MeshStandardMaterial({color:0x222526,roughness:.42,metalness:.15});
    const water=new THREE.MeshPhysicalMaterial({color:0x81979c,roughness:.06,metalness:.05,transmission:.35,transparent:true,opacity:.58});
    const glowWarm=new THREE.MeshBasicMaterial({color:0xffd49d,transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false});
    const glowCool=new THREE.MeshBasicMaterial({color:0x8ddcff,transparent:true,opacity:.75,blending:THREE.AdditiveBlending,depthWrite:false});
    const glowRose=new THREE.MeshBasicMaterial({color:0xff8db8,transparent:true,opacity:.55,blending:THREE.AdditiveBlending,depthWrite:false});

    const world=new THREE.Group();scene.add(world);
    const boxGeo=new THREE.BoxGeometry(1,1,1);
    const planeGeo=new THREE.PlaneGeometry(1,1);
    const addBox=(s,p,m,parent=world)=>{const o=new THREE.Mesh(boxGeo,m);o.scale.set(...s);o.position.set(...p);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o};
    const addPlane=(s,p,r,m,parent=world)=>{const o=new THREE.Mesh(planeGeo,m);o.scale.set(...s,1);o.position.set(...p);o.rotation.set(...r);parent.add(o);return o};

    const SEG=22,COUNT=11,segments=[];
    function buildSegment(i){
      const g=new THREE.Group(),v=i%4;
      addBox([18,.22,SEG],[0,-3.1,-SEG/2],v===2?dark:white,g);
      addBox([.35,7.4,SEG],[-8.8,.6,-SEG/2],white,g);
      addBox([.35,7.4,SEG],[8.8,.6,-SEG/2],white,g);

      if(v===0){
        addBox([5.2,.3,SEG],[-6.4,4.2,-SEG/2],white,g);addBox([5.2,.3,SEG],[6.4,4.2,-SEG/2],white,g);
        addPlane([5.2,SEG*.92],[0,4.02,-SEG/2],[Math.PI/2,0,0],glowWarm,g);
        addPlane([2.6,SEG*.75],[-2.3,1.3,-SEG/2],[0,0,-.22],glowWarm,g);
      }else if(v===1){
        addBox([18,.3,SEG],[0,4.2,-SEG/2],white,g);
        addBox([.5,7.2,6.4],[-2.9,.5,-11],warmWhite,g);
        addPlane([3.4,6.5],[-2.55,.5,-11],[0,-Math.PI/2,0],glowCool,g);
        addPlane([3.2,5.4],[3.8,.2,-10],[0,Math.PI/2,0],glowRose,g);
      }else if(v===2){
        addBox([18,.3,SEG],[0,4.2,-SEG/2],white,g);
        addBox([11,.08,12],[0,-2.88,-11],water,g);
        addPlane([8.5,5.8],[0,1,-17],[0,0,0],glowCool,g);
      }else{
        addBox([6.7,.3,SEG],[-5.7,4.2,-SEG/2],white,g);addBox([6.7,.3,SEG],[5.7,4.2,-SEG/2],white,g);
        addPlane([4.8,SEG*.88],[0,4.03,-SEG/2],[Math.PI/2,0,0],glowCool,g);
        addBox([4.8,5.8,.28],[0,.5,-13],warmWhite,g);
        addPlane([4.2,4.9],[0,.5,-12.82],[0,0,0],glowWarm,g);
      }

      for(let z=-3;z>-SEG;z-=6.5){addBox([.34,7,.34],[-7.4,.5,z],warmWhite,g);addBox([.34,7,.34],[7.4,.5,z],warmWhite,g)}
      g.position.z=-i*SEG;world.add(g);return g;
    }
    for(let i=0;i<COUNT;i++)segments.push(buildSegment(i));

    scene.add(new THREE.HemisphereLight(0xf4f7ff,0x5a5148,1.8));
    const sun=new THREE.DirectionalLight(0xffddb1,3.4);sun.position.set(-10,12,4);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-16;sun.shadow.camera.right=16;sun.shadow.camera.top=14;sun.shadow.camera.bottom=-14;scene.add(sun);
    const cyan=new THREE.PointLight(0x77d7ff,22,36,2);cyan.position.set(4,1,-18);scene.add(cyan);
    const rose=new THREE.PointLight(0xff8ab6,13,26,2);rose.position.set(-4,1,-42);scene.add(rose);

    const dustGeo=new THREE.BufferGeometry(),count=700,pos=new Float32Array(count*3);
    for(let i=0;i<count;i++){pos[i*3]=(Math.random()-.5)*16;pos[i*3+1]=Math.random()*7-2.7;pos[i*3+2]=-Math.random()*95+5}
    dustGeo.setAttribute('position',new THREE.BufferAttribute(pos,3));
    const dust=new THREE.Points(dustGeo,new THREE.PointsMaterial({color:0xfff4d9,size:.023,transparent:true,opacity:.38,depthWrite:false}));scene.add(dust);

    const clock=new THREE.Clock();
    function animate(){
      const t=clock.getElapsedTime();progress+=(target-progress)*.045;
      const distance=progress*245,baseZ=5-distance,bend=Math.sin(distance*.03)*.62,bob=motion?Math.sin(t*.55)*.025:0;
      camera.position.set(bend+pointerX*.18,.1+bob-pointerY*.1,baseZ);
      camera.lookAt(bend*.35,.1,baseZ-12);
      camera.rotation.z=pointerX*-.0035;

      const cycle=COUNT*SEG;
      segments.forEach((s,i)=>{const local=((i*SEG-distance)%cycle+cycle)%cycle;s.position.z=baseZ-local-SEG*.3;s.position.x=Math.sin((distance+i*SEG)*.026)*.36});
      sun.position.x=-10+Math.sin(t*.12)*8;sun.position.z=baseZ-8;
      cyan.position.z=baseZ-20;cyan.position.x=4+Math.sin(t*.28)*2;
      rose.position.z=baseZ-42;rose.position.x=-4+Math.sin(t*.22)*2.5;
      glowWarm.opacity=.72+(motion?Math.sin(t*.45)*.12:0);
      glowCool.opacity=.62+(motion?Math.sin(t*.38+1)*.11:0);
      glowRose.opacity=.48+(motion?Math.sin(t*.33+2)*.09:0);
      dust.position.z=-((distance*.1)%11);

      chapters.forEach(c=>{const r=c.getBoundingClientRect();c.classList.toggle('is-active',r.top<innerHeight*.68&&r.bottom>innerHeight*.32)});
      renderer.render(scene,camera);requestAnimationFrame(animate);
    }

    addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.35))},{passive:true});
    loading?.classList.add('is-hidden');animate();
  }catch(error){console.error(error);fallback()}
})();