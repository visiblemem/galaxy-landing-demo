const canvas=document.getElementById('museumCanvas');
const loading=document.getElementById('loading');
const progressBar=document.getElementById('progressBar');
const walkCue=document.getElementById('walkCue');
const motionToggle=document.getElementById('motionToggle');
const chapters=[...document.querySelectorAll('.chapter')];
let motion=true,target=0,progress=0,pointerX=0,pointerY=0,frozenTime=0;

motionToggle?.addEventListener('click',()=>{motion=!motion;motionToggle.textContent=motion?'MOTION ON':'MOTION OFF'});
function updateScroll(){const max=Math.max(1,document.documentElement.scrollHeight-innerHeight);target=scrollY/max;progressBar.style.transform=`scaleX(${target})`;walkCue.classList.toggle('is-hidden',scrollY>50)}
addEventListener('scroll',updateScroll,{passive:true});
addEventListener('pointermove',e=>{pointerX=e.clientX/innerWidth-.5;pointerY=e.clientY/innerHeight-.5},{passive:true});
updateScroll();

function fallback(){
 const ctx=canvas.getContext('2d');if(!ctx)return;
 function draw(){const d=devicePixelRatio||1,w=innerWidth,h=innerHeight;canvas.width=Math.round(w*d);canvas.height=Math.round(h*d);canvas.style.width=w+'px';canvas.style.height=h+'px';ctx.setTransform(d,0,0,d,0,0);const g=ctx.createLinearGradient(0,0,w,h);g.addColorStop(0,'#d8eef1');g.addColorStop(.45,'#a7c8cf');g.addColorStop(1,'#657b91');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);ctx.globalAlpha=.28;ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(w*.52,h*.48,w*.29,h*.22,-.2,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;}
 draw();addEventListener('resize',draw,{passive:true});loading?.classList.add('is-hidden');
}

(function init(){
 const gl=canvas.getContext('webgl',{antialias:true,alpha:false,powerPreference:'high-performance',depth:false,stencil:false,preserveDrawingBuffer:false});
 if(!gl){fallback();return}
 const vertex=`attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;
 const fragment=`precision highp float;
uniform vec2 r;uniform float t;uniform float travel;uniform vec2 mouse;
#define PI 3.14159265359
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
float sdCircle(vec2 p,vec2 c,float radius){return length(p-c)-radius;}
float smin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}
float glassField(vec2 p,float tm){
 float scroll=travel*PI*1.8;
 vec2 drift=vec2(mouse.x*.13,-mouse.y*.08);
 float d=sdCircle(p,vec2(-.18+.12*sin(tm*.23+scroll),.04+.08*cos(tm*.19))+drift,.34+.025*sin(tm*.31));
 d=smin(d,sdCircle(p,vec2(.23+.09*cos(tm*.17-scroll*.7),-.08+.11*sin(tm*.21))+drift*.55,.26+.03*cos(tm*.27)),.23);
 d=smin(d,sdCircle(p,vec2(.02+.18*sin(tm*.11+1.7),.25+.06*cos(tm*.29+scroll))+drift*.3,.18),.19);
 d=smin(d,sdCircle(p,vec2(-.34+.07*cos(tm*.16),-.25+.09*sin(tm*.14-scroll))+drift*.7,.15),.16);
 float warp=(noise(p*3.1+vec2(tm*.045,-tm*.032))-.5)*.055;
 warp+=(noise(p*7.4-vec2(tm*.03,tm*.02))-.5)*.018;
 return d+warp;
}
vec3 background(vec2 uv){
 vec2 p=uv;
 float y=clamp(p.y*.5+.5,0.,1.);
 vec3 col=mix(vec3(.18,.28,.36),vec3(.84,.93,.94),pow(y,.72));
 float sun=exp(-length(p-vec2(-.42,.34))*5.8);col+=vec3(1.,.83,.63)*sun*.72;
 float glow=exp(-length(p-vec2(.34,-.12))*3.4);col+=vec3(.36,.55,.72)*glow*.38;
 float bands=.5+.5*sin((p.x*.72+p.y)*8.+noise(p*2.4)*1.8);col+=vec3(.05,.08,.10)*bands*.12;
 float cloud=noise(p*2.6+vec2(.7,-.2));col+=vec3(.14,.16,.18)*smoothstep(.5,.82,cloud)*.24;
 return col;
}
void main(){
 vec2 uv=(gl_FragCoord.xy-.5*r)/r.y;
 float tm=t;
 float d=glassField(uv,tm);
 float e=1.5/r.y;
 vec2 grad=vec2(glassField(uv+vec2(e,0.),tm)-glassField(uv-vec2(e,0.),tm),glassField(uv+vec2(0.,e),tm)-glassField(uv-vec2(0.,e),tm));
 vec2 n=normalize(grad+1e-6);
 float inside=1.-smoothstep(-.012,.018,d);
 float rim=exp(-abs(d)*42.);
 float innerRim=exp(-abs(d+.045)*28.);
 float thickness=smoothstep(.12,-.22,d);
 float lens=inside*(.018+.045*thickness);
 vec2 refr=n*lens;
 vec3 base=background(uv);
 float dispersion=.0065*inside*(.35+.65*rim);
 vec3 refracted;
 refracted.r=background(uv-refr-n*dispersion).r;
 refracted.g=background(uv-refr).g;
 refracted.b=background(uv-refr+n*dispersion).b;
 float fres=pow(clamp(1.-sqrt(max(0.,1.-dot(grad,grad)*38.)),0.,1.),2.2);
 vec3 col=mix(base,refracted,inside*.94);
 col+=vec3(.68,.87,.94)*rim*(.22+.58*fres);
 col+=vec3(1.)*innerRim*.055;
 float caustic=pow(max(0.,dot(n,normalize(vec2(-.55,.83)))),12.)*inside;
 col+=vec3(.78,.93,1.)*caustic*.52;
 float shadow=smoothstep(.03,-.14,d)*(1.-smoothstep(-.24,-.48,d));
 col*=1.-shadow*.07;
 float spec=pow(max(0.,dot(n,normalize(vec2(-.72,.69)))),34.)*rim;
 col+=vec3(1.)*spec*.85;
 float vign=1.-smoothstep(.48,1.08,length(uv*vec2(.72,1.05)));col*=.68+.36*vign;
 col=1.-exp(-col*1.18);
 col=pow(col,vec3(.92));
 gl_FragColor=vec4(col,1.);
}`;
 function compile(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s}
 try{
  const program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));gl.useProgram(program);
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const loc=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
  const ur=gl.getUniformLocation(program,'r'),ut=gl.getUniformLocation(program,'t'),up=gl.getUniformLocation(program,'travel'),um=gl.getUniformLocation(program,'mouse');const start=performance.now();
  function resize(){const d=devicePixelRatio||1,w=Math.round(innerWidth*d),h=Math.round(innerHeight*d);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;canvas.style.width=innerWidth+'px';canvas.style.height=innerHeight+'px';gl.viewport(0,0,w,h)}}
  function frame(now){resize();progress+=(target-progress)*.045;if(motion)frozenTime=(now-start)/1000;gl.uniform2f(ur,canvas.width,canvas.height);gl.uniform1f(ut,frozenTime);gl.uniform1f(up,progress);gl.uniform2f(um,pointerX,pointerY);gl.drawArrays(gl.TRIANGLES,0,6);chapters.forEach(c=>{const b=c.getBoundingClientRect();c.classList.toggle('is-active',b.top<innerHeight*.68&&b.bottom>innerHeight*.32)});requestAnimationFrame(frame)}
  loading?.classList.add('is-hidden');requestAnimationFrame(frame);
 }catch(error){console.error(error);fallback()}
})();