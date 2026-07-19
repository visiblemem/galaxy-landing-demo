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

function fallback(){
 const ctx=canvas.getContext('2d');if(!ctx)return;
 function draw(){const d=devicePixelRatio||1,w=innerWidth,h=innerHeight;canvas.width=Math.round(w*d);canvas.height=Math.round(h*d);canvas.style.width=w+'px';canvas.style.height=h+'px';ctx.setTransform(d,0,0,d,0,0);const g=ctx.createRadialGradient(w*.5,h*.48,10,w*.5,h*.48,Math.max(w,h)*.65);g.addColorStop(0,'#d9b9ff');g.addColorStop(.18,'#5944a5');g.addColorStop(.5,'#17122d');g.addColorStop(1,'#030207');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);ctx.globalCompositeOperation='screen';for(let i=0;i<18;i++){ctx.strokeStyle=`rgba(157,126,255,${.025+i*.004})`;ctx.lineWidth=1+i*.3;ctx.beginPath();ctx.ellipse(w*.5,h*.5,w*(.08+i*.035),h*(.04+i*.018),i*.23,0,Math.PI*2);ctx.stroke()}ctx.globalCompositeOperation='source-over'}
 draw();addEventListener('resize',draw,{passive:true});loading?.classList.add('is-hidden');
}

(function init(){
 const gl=canvas.getContext('webgl',{antialias:false,alpha:false,powerPreference:'high-performance',depth:false,stencil:false,preserveDrawingBuffer:false});
 if(!gl){fallback();return}
 const vertex=`attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;
 const fragment=`precision highp float;
uniform vec2 r;uniform float t;uniform float travel;uniform vec2 mouse;
#define STEPS 92
#define FAR 28.0
float hash(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){float v=0.,a=.5;mat3 m=mat3(.00,.80,.60,-.80,.36,-.48,-.60,-.48,.64);for(int i=0;i<5;i++){v+=a*noise(p);p=m*p*2.02+vec3(.7,1.1,.3);a*=.5;}return v;}
mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}
float field(vec3 p,float tm){
 p.z+=travel*18.;
 p.xy*=rot(.17*sin(p.z*.11+tm*.12));
 float bend=.55*sin(p.z*.17+tm*.19)+.28*sin(p.z*.43-tm*.13);
 p.x+=bend;
 float radial=length(p.xy);
 float shell=abs(radial-(1.72+.22*sin(p.z*.31+tm*.28)))-.16;
 float filament=abs(sin(atan(p.y,p.x)*5.0+p.z*.45+tm*.7))*.34;
 float turbulence=(fbm(p*1.25+tm*.08)-.5)*.55;
 return shell+filament+turbulence;
}
vec3 palette(float x){
 vec3 a=vec3(.13,.04,.24),b=vec3(.38,.26,.72),c=vec3(.58,.52,.90),d=vec3(.72,.36,.98);
 return a+b*cos(6.28318*(c*x+d));
}
void main(){
 vec2 uv=(gl_FragCoord.xy-.5*r)/r.y;
 uv.x+=mouse.x*.035;uv.y-=mouse.y*.022;
 vec3 ro=vec3(0.,0.,-3.8+travel*6.);
 vec3 rd=normalize(vec3(uv,1.22));
 rd.xy*=rot(mouse.x*.035);
 float dist=0.;vec3 col=vec3(.002,.001,.008);float acc=0.;
 for(int i=0;i<STEPS;i++){
  vec3 p=ro+rd*dist;
  float f=field(p,t);
  float density=exp(-abs(f)*7.5);
  float core=exp(-length(p.xy)*2.6)*(.4+.6*fbm(p*.9+t*.05));
  float pulse=.72+.28*sin(t*1.15+p.z*.42);
  vec3 hue=palette(.16+p.z*.035+fbm(p*.45)*.22);
  vec3 light=hue*(density*1.35+core*.32)*pulse;
  float fade=exp(-dist*.055);
  col+=light*fade*(1.-acc)*.075;
  acc+=density*.025*(1.-acc);
  dist+=.055+abs(f)*.075;
  if(dist>FAR||acc>.985)break;
 }
 float halo=pow(max(0.,1.-length(uv*.78)),3.4);
 col+=vec3(.20,.08,.46)*halo*.18;
 float streak=pow(max(dot(rd,normalize(vec3(-.18,.08,1.))),0.),120.);
 col+=vec3(.75,.45,1.0)*streak*.32;
 float grain=(hash(vec3(gl_FragCoord.xy,floor(t*30.)))-.5)/255.;col+=grain;
 col*=1.-smoothstep(.48,1.05,length(uv*vec2(.72,1.08)))*.62;
 col=1.-exp(-col*1.65);
 col=pow(col,vec3(.78));
 gl_FragColor=vec4(col,1.);
}`;
 function compile(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s}
 try{
  const program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));gl.useProgram(program);
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const loc=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
  const ur=gl.getUniformLocation(program,'r'),ut=gl.getUniformLocation(program,'t'),up=gl.getUniformLocation(program,'travel'),um=gl.getUniformLocation(program,'mouse');const start=performance.now();
  function resize(){const d=devicePixelRatio||1,w=Math.round(innerWidth*d),h=Math.round(innerHeight*d);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;canvas.style.width=innerWidth+'px';canvas.style.height=innerHeight+'px';gl.viewport(0,0,w,h)}}
  function frame(now){resize();progress+=(target-progress)*.045;const elapsed=motion?(now-start)/1000:0.;gl.uniform2f(ur,canvas.width,canvas.height);gl.uniform1f(ut,elapsed);gl.uniform1f(up,progress);gl.uniform2f(um,pointerX,pointerY);gl.drawArrays(gl.TRIANGLES,0,6);chapters.forEach(c=>{const b=c.getBoundingClientRect();c.classList.toggle('is-active',b.top<innerHeight*.68&&b.bottom>innerHeight*.32)});requestAnimationFrame(frame)}
  loading?.classList.add('is-hidden');requestAnimationFrame(frame);
 }catch(error){console.error(error);fallback()}
})();