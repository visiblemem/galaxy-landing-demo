const root=document.documentElement,hero=document.querySelector('.hero'),glow=document.querySelector('.cursor-glow'),nebulae=[...document.querySelectorAll('.nebula')],stars=[...document.querySelectorAll('.star-layer')];
let px=.5,py=.5,tx=.5,ty=.5;
const setPointer=(x,y)=>{tx=x/window.innerWidth;ty=y/window.innerHeight;root.style.setProperty('--mx',`${tx*100}%`);root.style.setProperty('--my',`${ty*100}%`)};
window.addEventListener('pointermove',e=>setPointer(e.clientX,e.clientY),{passive:true});
window.addEventListener('touchmove',e=>{const t=e.touches[0];if(t)setPointer(t.clientX,t.clientY)},{passive:true});
function motionLoop(){px+=(tx-px)*.07;py+=(ty-py)*.07;if(glow)glow.style.transform=`translate(${px*innerWidth-140}px,${py*innerHeight-140}px)`;nebulae.forEach((n,i)=>n.style.translate=`${(px-.5)*(i+1)*22}px ${(py-.5)*(i+1)*16}px`);stars.forEach((s,i)=>{s.style.marginLeft=`${(px-.5)*(i+1)*-14}px`;s.style.marginTop=`${(py-.5)*(i+1)*-10}px`});requestAnimationFrame(motionLoop)}motionLoop();

hero.addEventListener('pointermove',e=>{if(innerWidth<800)return;const r=hero.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;hero.style.transform=`perspective(1400px) rotateX(${y*-1.8}deg) rotateY(${x*1.8}deg)`});
hero.addEventListener('pointerleave',()=>hero.style.transform='perspective(1400px) rotateX(0) rotateY(0)');

document.querySelectorAll('.tilt').forEach(el=>{el.addEventListener('pointermove',e=>{if(innerWidth<800)return;const r=el.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;el.style.transform=`perspective(900px) rotateX(${y*-5}deg) rotateY(${x*6}deg) translateY(-3px)`});el.addEventListener('pointerleave',()=>el.style.transform='')});

document.querySelectorAll('.magnetic').forEach(el=>{el.addEventListener('pointermove',e=>{const r=el.getBoundingClientRect();el.style.transform=`translate(${(e.clientX-r.left-r.width/2)*.12}px,${(e.clientY-r.top-r.height/2)*.18}px)`});el.addEventListener('pointerleave',()=>el.style.transform='')});

const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('in');observer.unobserve(entry.target)}}),{threshold:.12});document.querySelectorAll('.reveal').forEach((el,i)=>{el.style.transitionDelay=`${Math.min(i%5,4)*90}ms`;observer.observe(el)});

const counters=[...document.querySelectorAll('[data-count]')];const counterObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(!entry.isIntersecting)return;const el=entry.target,target=Number(el.dataset.count),start=performance.now(),duration=1300;function tick(now){const p=Math.min((now-start)/duration,1),ease=1-Math.pow(1-p,3),v=target*ease;el.textContent=target%1?v.toFixed(1):Math.floor(v);if(p<1)requestAnimationFrame(tick)}requestAnimationFrame(tick);counterObserver.unobserve(el)}),{threshold:.5});counters.forEach(c=>counterObserver.observe(c));

const canvas=document.getElementById('spaceCanvas'),ctx=canvas.getContext('2d');let particles=[],dpr=Math.min(devicePixelRatio||1,2);function resize(){canvas.width=innerWidth*dpr;canvas.height=innerHeight*dpr;canvas.style.width=innerWidth+'px';canvas.style.height=innerHeight+'px';ctx.setTransform(dpr,0,0,dpr,0,0);const count=Math.min(150,Math.floor(innerWidth*innerHeight/9000));particles=Array.from({length:count},()=>({x:Math.random()*innerWidth,y:Math.random()*innerHeight,z:Math.random()*1+.2,r:Math.random()*1.5+.25,v:Math.random()*.18+.04,a:Math.random()*.65+.2}))}window.addEventListener('resize',resize);resize();
function draw(){ctx.clearRect(0,0,innerWidth,innerHeight);for(const p of particles){p.y-=p.v*p.z;p.x+=(px-.5)*p.z*.08;if(p.y<-5){p.y=innerHeight+5;p.x=Math.random()*innerWidth}if(p.x<-5)p.x=innerWidth+5;if(p.x>innerWidth+5)p.x=-5;ctx.beginPath();ctx.fillStyle=`rgba(220,250,255,${p.a})`;ctx.arc(p.x,p.y,p.r*p.z,0,Math.PI*2);ctx.fill()}requestAnimationFrame(draw)}draw();

window.addEventListener('scroll',()=>{root.style.setProperty('--scroll',scrollY);const p=Math.min(scrollY/innerHeight,1);hero.querySelector('.hero-content').style.transform=`translateY(${p*34}px) scale(${1-p*.025})`;hero.querySelector('.aurora').style.transform=`translateY(${p*45}px) scale(${1+p*.04})`},{passive:true});

if(window.DeviceOrientationEvent){window.addEventListener('deviceorientation',e=>{if(e.gamma==null||e.beta==null)return;tx=Math.max(0,Math.min(1,.5+e.gamma/90));ty=Math.max(0,Math.min(1,.5+(e.beta-45)/120))},{passive:true})}

const demoButton=document.getElementById('demoButton'),demoModal=document.getElementById('demoModal'),modalClose=document.getElementById('modalClose');demoButton.addEventListener('click',()=>demoModal.showModal());modalClose.addEventListener('click',()=>demoModal.close());demoModal.addEventListener('click',e=>{const r=demoModal.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)demoModal.close()});