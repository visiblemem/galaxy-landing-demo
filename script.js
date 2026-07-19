const root=document.documentElement,canvas=document.getElementById('nebulaCanvas');
let pointer={x:0,y:0,tx:0,ty:0};

function initNebula(){
  const gl=canvas.getContext('webgl',{alpha:false,antialias:false,powerPreference:'high-performance'});
  if(!gl){canvas.style.background='radial-gradient(circle at 68% 20%,#d6ffff 0 1%,#5dd9df 4%,transparent 12%),radial-gradient(ellipse at 28% 36%,#3ac3c9,transparent 42%),linear-gradient(180deg,#03101c,#071825 58%,#230b19)';return;}
  const vertex=`attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;
  const fragment=`precision highp float;
uniform vec2 r;uniform float t;uniform vec2 m;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.55;mat2 q=mat2(1.63,1.21,-1.21,1.63);for(int i=0;i<6;i++){v+=a*noise(p);p=q*p+2.31;a*=.5;}return v;}
float ridge(float x){return 1.-abs(2.*x-1.);}
void main(){
 vec2 uv=(gl_FragCoord.xy-.5*r)/r.y;uv.y*=-1.;
 vec2 drift=vec2(m.x*.11,m.y*.07);
 vec2 p=uv*1.48+vec2(-.05,.05)+drift;
 float tm=t*.052;
 float warp1=fbm(p*1.16+vec2(tm,-tm*.42));
 float warp2=fbm(p*2.28+vec2(-tm*.3,tm*.68)+warp1*1.4);
 vec2 wp=p+vec2(warp1-.5,warp2-.5)*.76;
 float n1=fbm(wp*1.62+vec2(tm*.27,0.));
 float n2=fbm(wp*3.28-vec2(tm*.18,tm*.11));
 float folds=pow(ridge(n1*.68+n2*.32),2.15);
 float leftMask=smoothstep(.78,-.58,uv.x)*smoothstep(.82,-.44,abs(uv.y+.02));
 float rightMask=smoothstep(-.82,.25,uv.x)*smoothstep(.82,-.48,abs(uv.y-.02));
 float canyon=1.-smoothstep(.02,.43,abs(uv.x+sin(uv.y*2.8+warp1*2.)*.28));
 float cloud=(folds*.82+n1*.42)*(.58*leftMask+.72*rightMask);
 cloud*=.72+.38*canyon;
 float fine=pow(max(0.,fbm(wp*6.1+tm*.1)-.36),1.8);
 cloud+=fine*.42*(leftMask+rightMask);
 vec3 deep=vec3(.006,.025,.052),teal=vec3(.055,.54,.61),cyan=vec3(.32,.93,.91),ice=vec3(.82,1.,.98);
 vec3 col=deep;
 col+=teal*cloud*.72;col+=cyan*pow(cloud,1.8)*.72;col+=ice*pow(max(cloud-.62,0.),3.)*2.3;
 float core=exp(-18.*length(uv-vec2(.29,-.13)+vec2(warp1-.5,warp2-.5)*.09));
 col+=vec3(.72,.95,1.)*core*1.35;
 float redBand=exp(-pow((uv.y-.52-warp1*.11)*8.5,2.))*smoothstep(.95,-.7,abs(uv.x));
 col+=vec3(.72,.025,.16)*redBand*(.45+.55*n2);
 float stars=step(.9965,hash(floor((uv+2.)*210.)));float stars2=step(.9982,hash(floor((uv+2.7)*330.)));
 col+=vec3(1.)*(stars*.65+stars2*.42);
 float vign=1.-smoothstep(.55,1.12,length(uv*vec2(.72,1.05)));col*=.42+.78*vign;
 col=pow(col,vec3(.78));gl_FragColor=vec4(col,1.);
}`;
  const compile=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;};
  const program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);gl.useProgram(program);
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  const loc=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
  const ur=gl.getUniformLocation(program,'r'),ut=gl.getUniformLocation(program,'t'),um=gl.getUniformLocation(program,'m');
  const resize=()=>{const d=Math.min(devicePixelRatio||1,1.5),w=Math.max(1,Math.floor(innerWidth*d)),h=Math.max(1,Math.floor(innerHeight*d));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h);}};
  const start=performance.now();
  function frame(now){resize();pointer.x+=(pointer.tx-pointer.x)*.035;pointer.y+=(pointer.ty-pointer.y)*.035;gl.uniform2f(ur,canvas.width,canvas.height);gl.uniform1f(ut,(now-start)/1000);gl.uniform2f(um,pointer.x,pointer.y);gl.drawArrays(gl.TRIANGLES,0,6);requestAnimationFrame(frame)}requestAnimationFrame(frame);
}

window.addEventListener('pointermove',e=>{const x=e.clientX/innerWidth,y=e.clientY/innerHeight;root.style.setProperty('--mx',`${x*100}%`);root.style.setProperty('--my',`${y*100}%`);pointer.tx=(x-.5)*2;pointer.ty=(y-.5)*2;});
window.addEventListener('deviceorientation',e=>{if(e.gamma==null||e.beta==null)return;pointer.tx=Math.max(-1,Math.min(1,e.gamma/28));pointer.ty=Math.max(-1,Math.min(1,(e.beta-45)/36));},{passive:true});

document.querySelectorAll('.reveal').forEach((el,i)=>setTimeout(()=>el.classList.add('is-visible'),90+i*70));
document.querySelectorAll('.tilt').forEach(card=>{card.addEventListener('pointermove',e=>{const b=card.getBoundingClientRect(),x=(e.clientX-b.left)/b.width-.5,y=(e.clientY-b.top)/b.height-.5;card.style.transform=`perspective(900px) rotateX(${y*-5}deg) rotateY(${x*6}deg) translateY(-2px)`});card.addEventListener('pointerleave',()=>card.style.transform='')});

document.querySelectorAll('[data-count]').forEach(el=>{const target=Number(el.dataset.count),start=performance.now(),duration=1300;function tick(now){const p=Math.min(1,(now-start)/duration),v=target*(1-Math.pow(1-p,3));el.textContent=target%1?v.toFixed(1):Math.round(v);if(p<1)requestAnimationFrame(tick)}requestAnimationFrame(tick)});

const demoButton=document.getElementById('demoButton'),demoModal=document.getElementById('demoModal'),modalClose=document.getElementById('modalClose');
demoButton?.addEventListener('click',()=>demoModal.showModal());modalClose?.addEventListener('click',()=>demoModal.close());demoModal?.addEventListener('click',e=>{const r=demoModal.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)demoModal.close()});

initNebula();