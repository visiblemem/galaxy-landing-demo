const canvas=document.getElementById('museumCanvas');
const loading=document.getElementById('loading');
const progressBar=document.getElementById('progressBar');
const walkCue=document.getElementById('walkCue');
const motionToggle=document.getElementById('motionToggle');
const chapters=[...document.querySelectorAll('.chapter')];
let motion=true,target=0,progress=0,pointerX=0,pointerY=0;

motionToggle?.addEventListener('click',()=>{motion=!motion;motionToggle.textContent=motion?'MOTION ON':'MOTION OFF'});
function updateScroll(){const max=Math.max(1,document.documentElement.scrollHeight-innerHeight);target=scrollY/max;progressBar.style.transform=`scaleX(${target})`;walkCue.classList.toggle('is-hidden',scrollY>50)}
addEventListener('scroll',updateScroll,{passive:true});
addEventListener('pointermove',e=>{pointerX=e.clientX/innerWidth-.5;pointerY=e.clientY/innerHeight-.5},{passive:true});
updateScroll();
setTimeout(()=>loading?.classList.add('is-hidden'),3000);

function fallback(){
 const ctx=canvas.getContext('2d');if(!ctx)return;
 function draw(){const d=devicePixelRatio||1,w=innerWidth,h=innerHeight;canvas.width=Math.round(w*d);canvas.height=Math.round(h*d);canvas.style.width=w+'px';canvas.style.height=h+'px';ctx.setTransform(d,0,0,d,0,0);const sky=ctx.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#a9cbd2');sky.addColorStop(.43,'#628793');sky.addColorStop(.44,'#466c79');sky.addColorStop(1,'#07151d');ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);const y=h*.56;ctx.strokeStyle='rgba(224,247,250,.28)';for(let i=0;i<22;i++){ctx.lineWidth=.7+i*.08;ctx.beginPath();ctx.moveTo(w*.5,y+i*10);ctx.quadraticCurveTo(w*.5-(65+i*13),y+i*18,0,h*.8+i*2);ctx.stroke();ctx.beginPath();ctx.moveTo(w*.5,y+i*10);ctx.quadraticCurveTo(w*.5+(65+i*13),y+i*18,w,h*.8+i*2);ctx.stroke()}}
 draw();addEventListener('resize',draw,{passive:true});loading?.classList.add('is-hidden');
}

(function init(){
 const gl=canvas.getContext('webgl',{antialias:true,alpha:false,powerPreference:'high-performance',depth:false,stencil:false});
 if(!gl){fallback();return}
 const vertex=`attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;
 const fragment=`precision highp float;
uniform vec2 r;uniform float t;uniform float travel;uniform vec2 mouse;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;mat2 m=mat2(1.6,1.2,-1.2,1.6);for(int i=0;i<5;i++){v+=a*noise(p);p=m*p+2.1;a*=.5;}return v;}
float dirWave(vec2 p,vec2 d,float wavelength,float speed,float amp,float tm){float k=6.2831853/wavelength;return sin(dot(p,d)*k+tm*speed)*amp;}
float wakeWave(vec2 p,float tm){
 float aft=max(0.,-p.y);
 float halfWidth=.72+aft*.19;
 float edge=abs(abs(p.x)-halfWidth);
 float envelope=exp(-edge*edge*7.2)*smoothstep(.15,1.8,aft)*exp(-aft*.012);
 float phase=aft*2.15-abs(p.x)*.7-tm*2.1;
 float diverging=sin(phase)*.095*envelope;
 float center=exp(-p.x*p.x*.82)*smoothstep(.1,1.2,aft)*exp(-aft*.028);
 float centerRipples=sin(aft*3.05-tm*2.55)*.032*center;
 return diverging+centerRipples;
}
float waveHeight(vec2 p,float tm){
 vec2 d1=normalize(vec2(.94,.34));
 vec2 d2=normalize(vec2(-.55,.83));
 vec2 d3=normalize(vec2(.18,1.));
 float h=0.;
 h+=dirWave(p,d1,11.5, .52,.050,tm);
 h+=dirWave(p,d2, 7.8,-.43,.031,tm);
 h+=dirWave(p,d3, 4.2, .67,.018,tm);
 h+=dirWave(p,normalize(vec2(.72,-.69)),2.3,.95,.008,tm);
 h+=(fbm(p*.34+vec2(tm*.035,-tm*.022))-.5)*.030;
 h+=(fbm(p*1.7+vec2(-tm*.08,tm*.06))-.5)*.008;
 h+=wakeWave(p,tm);
 return h;
}
vec3 getNormal(vec2 p,float tm){float e=.022;float hx=waveHeight(p+vec2(e,0.),tm)-waveHeight(p-vec2(e,0.),tm);float hz=waveHeight(p+vec2(0.,e),tm)-waveHeight(p-vec2(0.,e),tm);return normalize(vec3(-hx,2.*e,-hz));}
vec3 skyColor(vec3 rd){
 float y=max(rd.y,0.);vec3 horizon=vec3(.38,.57,.62);vec3 zenith=vec3(.08,.19,.25);vec3 col=mix(horizon,zenith,pow(y,.55));
 vec3 sunDir=normalize(vec3(-.38,.42,.82));float sun=pow(max(dot(rd,sunDir),0.),720.);float glow=pow(max(dot(rd,sunDir),0.),22.);
 col+=vec3(1.,.82,.56)*sun*3.8+vec3(.9,.62,.38)*glow*.3;
 float cloud=fbm(rd.xz*3.2+rd.y*1.7);col+=vec3(.22,.27,.28)*smoothstep(.57,.78,cloud)*(1.-y)*.34;return col;
}
void main(){
 vec2 uv=(gl_FragCoord.xy-.5*r)/r.y;
 uv.x+=mouse.x*.018;uv.y-=mouse.y*.01;
 float tm=t;
 vec3 ro=vec3(0.,1.18,2.4+travel*58.);
 vec3 rd=normalize(vec3(uv.x,uv.y-.12,1.15));
 rd.xz*=mat2(cos(mouse.x*.012),-sin(mouse.x*.012),sin(mouse.x*.012),cos(mouse.x*.012));
 vec3 col;
 if(rd.y>=-.018){col=skyColor(rd);}else{
  float planeT=-ro.y/rd.y;vec3 pos=ro+rd*planeT;vec2 wp=vec2(pos.x,pos.z-ro.z);
  float h=waveHeight(wp,tm);planeT=-(ro.y-h)/rd.y;pos=ro+rd*planeT;wp=vec2(pos.x,pos.z-ro.z);
  vec3 n=getNormal(wp,tm);vec3 refl=reflect(rd,n);vec3 sky=skyColor(refl);
  float fres=pow(1.-max(dot(-rd,n),0.),4.2);
  vec3 deep=vec3(.015,.085,.115);vec3 shallow=vec3(.055,.19,.23);
  col=mix(deep,shallow,.28+.34*n.y);col=mix(col,sky,.42+fres*.52);
  float dist=length(pos.xz-ro.xz);col=mix(col,vec3(.24,.39,.42),smoothstep(35.,115.,dist)*.55);
  float aft=max(0.,-wp.y);float edge=abs(abs(wp.x)-(.72+aft*.19));
  float foam=exp(-edge*edge*13.)*smoothstep(.7,2.2,aft)*exp(-aft*.014);
  foam*=.45+.28*sin(aft*3.2-tm*2.5);
  float churn=exp(-wp.x*wp.x*1.25)*smoothstep(.4,1.8,aft)*exp(-aft*.045);
  churn*=.16+.14*noise(vec2(wp.x*2.2,aft*.7-tm*.5));
  foam=clamp(foam+churn,0.,1.);
  col=mix(col,vec3(.77,.9,.91),foam*.5);
  float sparkle=pow(max(dot(reflect(normalize(vec3(.32,-.8,-.45)),n),-rd),0.),96.);col+=vec3(1.,.86,.62)*sparkle*1.05;
  float micro=step(.997,hash(floor((wp+tm*.08)*30.)));col+=micro*vec3(.8,.95,1.)*.1;
 }
 float vign=1.-smoothstep(.45,1.1,length(uv*vec2(.72,1.05)));col*=.48+.62*vign;col=pow(col,vec3(.82));gl_FragColor=vec4(col,1.);
}`;
 function compile(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s}
 try{
  const program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));gl.useProgram(program);
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const loc=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
  const ur=gl.getUniformLocation(program,'r'),ut=gl.getUniformLocation(program,'t'),up=gl.getUniformLocation(program,'travel'),um=gl.getUniformLocation(program,'mouse');const start=performance.now();
  function resize(){const d=devicePixelRatio||1,w=Math.round(innerWidth*d),h=Math.round(innerHeight*d);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;canvas.style.width=innerWidth+'px';canvas.style.height=innerHeight+'px';gl.viewport(0,0,w,h)}}
  function frame(now){resize();progress+=(target-progress)*.045;gl.uniform2f(ur,canvas.width,canvas.height);gl.uniform1f(ut,motion?(now-start)/1000:0);gl.uniform1f(up,progress);gl.uniform2f(um,pointerX,pointerY);gl.drawArrays(gl.TRIANGLES,0,6);chapters.forEach(c=>{const b=c.getBoundingClientRect();c.classList.toggle('is-active',b.top<innerHeight*.68&&b.bottom>innerHeight*.32)});requestAnimationFrame(frame)}
  loading?.classList.add('is-hidden');requestAnimationFrame(frame);
 }catch(error){console.error(error);fallback()}
})();