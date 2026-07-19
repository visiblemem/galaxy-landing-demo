const root=document.documentElement;
const canvas=document.getElementById('metalCanvas');
const ctx=canvas.getContext('2d',{alpha:false});

let pointer={x:.5,y:.35};
let scrollY=window.scrollY;
let lastScroll=scrollY;
let scrollVelocity=0;
let targetVelocity=0;
let tiles=[];
let cols=0,rows=0,tileSize=72,gap=7,dpr=1;

function seededRandom(n){
  const x=Math.sin(n*12.9898+78.233)*43758.5453;
  return x-Math.floor(x);
}

function rebuildGrid(){
  dpr=Math.min(window.devicePixelRatio||1,1.5);
  canvas.width=Math.max(1,Math.floor(innerWidth*dpr));
  canvas.height=Math.max(1,Math.floor(innerHeight*dpr));
  canvas.style.width=`${innerWidth}px`;
  canvas.style.height=`${innerHeight}px`;
  ctx.setTransform(dpr,0,0,dpr,0,0);

  tileSize=innerWidth<600?54:76;
  gap=innerWidth<600?5:7;
  cols=Math.ceil(innerWidth/(tileSize+gap))+3;
  rows=Math.ceil(innerHeight/(tileSize+gap))+4;
  tiles=[];

  for(let r=0;r<rows;r++){
    for(let c=0;c<cols;c++){
      const id=r*cols+c;
      tiles.push({
        c,r,
        seed:seededRandom(id+11),
        speed:.24+seededRandom(id+71)*1.05,
        phase:seededRandom(id+151)*Math.PI*2,
        offset:0,
        target:0,
        tone:seededRandom(id+231),
        shine:seededRandom(id+311)
      });
    }
  }
}

function roundedRect(x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);
  ctx.arcTo(x,y,x+w,y,r);
  ctx.closePath();
}

function drawTile(tile,time){
  const pitch=tileSize+gap;
  const baseX=tile.c*pitch-tileSize*1.2;
  const baseY=tile.r*pitch-tileSize*1.5;

  const wave=Math.sin(time*.00042+tile.phase+scrollY*.0018*tile.speed)*3.2;
  tile.target=scrollVelocity*tile.speed*.82+wave;
  tile.offset+=(tile.target-tile.offset)*.085;

  const x=baseX;
  const y=baseY+tile.offset;
  const lift=Math.max(-18,Math.min(22,tile.offset));
  const shadowY=10+Math.abs(lift)*.35;
  const radius=3;

  ctx.save();
  ctx.shadowColor='rgba(0,0,0,.62)';
  ctx.shadowBlur=18+Math.abs(lift)*.45;
  ctx.shadowOffsetY=shadowY;
  roundedRect(x,y,tileSize,tileSize,radius);
  ctx.fillStyle='#16191b';
  ctx.fill();
  ctx.restore();

  const cx=x+tileSize*.5;
  const cy=y+tileSize*.5;
  const dx=pointer.x*innerWidth-cx;
  const dy=pointer.y*innerHeight-cy;
  const distance=Math.hypot(dx,dy);
  const light=Math.max(0,1-distance/(innerWidth*.65));
  const base=42+tile.tone*38;
  const hi=Math.min(220,base+60+light*80);
  const lo=Math.max(16,base-27);
  const angle=Math.atan2(dy,dx);
  const gx=.5-Math.cos(angle)*.45;
  const gy=.5-Math.sin(angle)*.45;
  const grad=ctx.createLinearGradient(x+tileSize*gx,y+tileSize*gy,x+tileSize*(1-gx),y+tileSize*(1-gy));
  grad.addColorStop(0,`rgb(${hi},${hi+2},${hi+4})`);
  grad.addColorStop(.18,`rgb(${base+20},${base+23},${base+25})`);
  grad.addColorStop(.52,`rgb(${base},${base+2},${base+3})`);
  grad.addColorStop(.78,`rgb(${lo+15},${lo+17},${lo+18})`);
  grad.addColorStop(1,`rgb(${lo},${lo+1},${lo+2})`);

  roundedRect(x,y,tileSize,tileSize,radius);
  ctx.fillStyle=grad;
  ctx.fill();

  const bevel=5;
  ctx.beginPath();
  ctx.moveTo(x,y);
  ctx.lineTo(x+tileSize,y);
  ctx.lineTo(x+tileSize-bevel,y+bevel);
  ctx.lineTo(x+bevel,y+bevel);
  ctx.closePath();
  ctx.fillStyle=`rgba(255,255,255,${.12+light*.2})`;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(x,y);
  ctx.lineTo(x+bevel,y+bevel);
  ctx.lineTo(x+bevel,y+tileSize-bevel);
  ctx.lineTo(x,y+tileSize);
  ctx.closePath();
  ctx.fillStyle='rgba(255,255,255,.065)';
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(x+tileSize,y);
  ctx.lineTo(x+tileSize,y+tileSize);
  ctx.lineTo(x+tileSize-bevel,y+tileSize-bevel);
  ctx.lineTo(x+tileSize-bevel,y+bevel);
  ctx.closePath();
  ctx.fillStyle='rgba(0,0,0,.34)';
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(x,y+tileSize);
  ctx.lineTo(x+tileSize,y+tileSize);
  ctx.lineTo(x+tileSize-bevel,y+tileSize-bevel);
  ctx.lineTo(x+bevel,y+tileSize-bevel);
  ctx.closePath();
  ctx.fillStyle='rgba(0,0,0,.48)';
  ctx.fill();

  ctx.strokeStyle='rgba(255,255,255,.08)';
  ctx.lineWidth=1;
  roundedRect(x+.5,y+.5,tileSize-1,tileSize-1,radius);
  ctx.stroke();

  const brushAlpha=.025+tile.shine*.035;
  ctx.strokeStyle=`rgba(255,255,255,${brushAlpha})`;
  ctx.lineWidth=.6;
  for(let i=8;i<tileSize;i+=7){
    ctx.beginPath();
    ctx.moveTo(x+5,y+i);
    ctx.lineTo(x+tileSize-5,y+i+(tile.shine-.5)*2);
    ctx.stroke();
  }
}

function frame(time){
  scrollVelocity+=(targetVelocity-scrollVelocity)*.12;
  targetVelocity*=.86;
  ctx.fillStyle='#101214';
  ctx.fillRect(0,0,innerWidth,innerHeight);

  const bg=ctx.createRadialGradient(pointer.x*innerWidth,pointer.y*innerHeight,20,pointer.x*innerWidth,pointer.y*innerHeight,innerWidth*.8);
  bg.addColorStop(0,'rgba(110,122,130,.18)');
  bg.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=bg;
  ctx.fillRect(0,0,innerWidth,innerHeight);

  tiles.forEach(tile=>drawTile(tile,time));
  requestAnimationFrame(frame);
}

window.addEventListener('scroll',()=>{
  scrollY=window.scrollY;
  const delta=scrollY-lastScroll;
  targetVelocity=Math.max(-35,Math.min(35,delta*1.35));
  lastScroll=scrollY;
},{passive:true});

window.addEventListener('wheel',event=>{
  targetVelocity=Math.max(-38,Math.min(38,event.deltaY*.11));
},{passive:true});

window.addEventListener('pointermove',event=>{
  pointer.x=event.clientX/innerWidth;
  pointer.y=event.clientY/innerHeight;
  root.style.setProperty('--mx',`${pointer.x*100}%`);
  root.style.setProperty('--my',`${pointer.y*100}%`);
},{passive:true});

window.addEventListener('resize',rebuildGrid,{passive:true});

const revealObserver=new IntersectionObserver(entries=>{
  entries.forEach(entry=>{if(entry.isIntersecting)entry.target.classList.add('is-visible')});
},{threshold:.12});
document.querySelectorAll('.reveal').forEach(el=>revealObserver.observe(el));

document.querySelectorAll('.tilt').forEach(card=>{
  card.addEventListener('pointermove',event=>{
    const b=card.getBoundingClientRect();
    const x=(event.clientX-b.left)/b.width-.5;
    const y=(event.clientY-b.top)/b.height-.5;
    card.style.transform=`perspective(900px) rotateX(${y*-4}deg) rotateY(${x*5}deg) translateY(-2px)`;
  });
  card.addEventListener('pointerleave',()=>card.style.transform='');
});

document.querySelectorAll('[data-count]').forEach(el=>{
  const target=Number(el.dataset.count),start=performance.now(),duration=1300;
  function tick(now){
    const p=Math.min(1,(now-start)/duration),v=target*(1-Math.pow(1-p,3));
    el.textContent=target%1?v.toFixed(1):Math.round(v);
    if(p<1)requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
});

const demoButton=document.getElementById('demoButton');
const demoModal=document.getElementById('demoModal');
const modalClose=document.getElementById('modalClose');
demoButton?.addEventListener('click',()=>demoModal.showModal());
modalClose?.addEventListener('click',()=>demoModal.close());
demoModal?.addEventListener('click',event=>{
  const r=demoModal.getBoundingClientRect();
  if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)demoModal.close();
});

rebuildGrid();
requestAnimationFrame(frame);