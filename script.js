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
 function draw(){const d=Math.min(devicePixelRatio||1,1.4),w=innerWidth,h=innerHeight;canvas.width=w*d;canvas.height=h*d;ctx.setTransform(d,0,0,d,0,0);const g=ctx.createRadialGradient(w*.5,h*.48,20,w*.5,h*.48,Math.max(w,h)*.7);g.addColorStop(0,'#7bd8f5');g.addColorStop(.35,'#205f82');g.addColorStop(1,'#020b15');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);ctx.globalCompositeOperation='screen';for(let i=0;i<12;i++){ctx.strokeStyle=`rgba(174,232,255,${.03+Math.random()*.1})`;ctx.lineWidth=10+Math.random()*45;ctx.beginPath();ctx.arc(w*.5,h*.52,80+i*38,-2.7,-.35);ctx.stroke()}ctx.globalCompositeOperation='source-over'}
 draw();addEventListener('resize',draw,{passive:true});loading?.classList.add('is-hidden');
}

(function init(){
 const gl=canvas.getContext('webgl',{antialias:false,alpha:false,powerPreference:'high-performance'});
 if(!gl){fallback();return}
 const vertex=`attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;
 const fragment=`precision highp float;
uniform vec2 r;uniform float t;uniform float travel;uniform vec2 mouse;
#define MAX_STEPS 72
#define FAR 34.0
float hash(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){float v=0.,a=.5;mat3 m=mat3(.00,.80,.60,-.80,.36,-.48,-.60,-.48,.64);for(int i=0;i<5;i++){v+=a*noise(p);p=m*p*2.03+vec3(.7,1.2,.4);a*=.5;}return v;}
float cave(vec3 p){
 p.z+=travel*42.;
 float bend=sin(p.z*.075)*.55+sin(p.z*.031)*.35;
 p.x-=bend;
 float ang=atan(p.y,p.x);
 float detail=fbm(vec3(ang*1.8,p.z*.075,1.3));
 float fine=fbm(vec3(ang*4.2,p.z*.17,5.7));
 float radius=2.75+.42*sin(p.z*.105)+.28*sin(ang*3.+p.z*.045)+detail*.68+fine*.18;
 float floorCut=smoothstep(-2.2,-1.15,p.y)*.24;
 return radius-length(p.xy)+floorCut;
}
vec3 normalAt(vec3 p){float e=.008;return normalize(vec3(cave(p+vec3(e,0,0))-cave(p-vec3(e,0,0)),cave(p+vec3(0,e,0))-cave(p-vec3(0,e,0)),cave(p+vec3(0,0,e))-cave(p-vec3(0,0,e))));}
void main(){
 vec2 uv=(gl_FragCoord.xy-.5*r)/r.y;
 uv.x+=mouse.x*.035;uv.y-=mouse.y*.025;
 vec3 ro=vec3(sin(travel*5.)*.12,0.,0.);
 vec3 rd=normalize(vec3(uv.x,uv.y,1.32));
 rd.xy*=mat2(cos(mouse.x*.035),-sin(mouse.x*.035),sin(mouse.x*.035),cos(mouse.x*.035));
 float dist=0.,glow=0.;vec3 p=ro;
 for(int i=0;i<MAX_STEPS;i++){
  p=ro+rd*dist;float d=cave(p);glow+=exp(-abs(d)*5.)*.006;
  if(d<.004||dist>FAR)break;dist+=max(.018,d*.48);
 }
 vec3 col=vec3(.005,.025,.055);
 if(dist<FAR){
  vec3 n=-normalAt(p);vec3 v=-rd;
  vec3 lp=normalize(vec3(-.35,.82,-.28));
  float dif=max(dot(n,lp),0.);
  float rim=pow(1.-max(dot(n,v),0.),2.4);
  float veins=fbm(p*vec3(2.8,2.8,.42)+vec3(0,0,travel*4.));
  float cracks=pow(max(0.,1.-abs(veins-.52)*11.),2.);
  float deep=fbm(p*vec3(.7,.7,.18));
  vec3 ice=mix(vec3(.015,.12,.20),vec3(.18,.66,.82),deep);
  ice=mix(ice,vec3(.62,.92,1.),pow(max(veins-.57,0.)*2.3,2.));
  ice+=vec3(.38,.8,1.)*cracks*.58;
  float ceiling=smoothstep(-.1,1.8,p.y);
  float blueLight=exp(-length(p.xy-vec2(.25,1.4))*.78);
  col=ice*(.15+dif*.8)+rim*vec3(.16,.62,.9)*.8;
  col+=blueLight*vec3(.16,.72,1.)*(.22+ceiling*.65);
  float wet=smoothstep(-1.15,-2.0,p.y)*pow(max(dot(reflect(rd,n),normalize(vec3(.15,.75,-.4))),0.),18.);
  col+=wet*vec3(.55,.9,1.)*1.4;
  col*=exp(-dist*.028);
 }
 col+=vec3(.03,.35,.62)*glow;
 float mist=1.-exp(-dist*.035);col=mix(col,vec3(.025,.15,.25),mist*.46);
 vec2 q=gl_FragCoord.xy/r;float fleck=step(.9975,hash(vec3(floor(q*vec2(360.,220.)),floor(t*.7))));col+=fleck*vec3(.65,.9,1.)*.45;
 col*=1.-smoothstep(.45,1.05,length(uv*vec2(.72,1.05)))*.62;
 col=pow(col,vec3(.78));gl_FragColor=vec4(col,1.);
}`;
 function compile(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s}
 try{
  const program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));gl.useProgram(program);
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const loc=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
  const ur=gl.getUniformLocation(program,'r'),ut=gl.getUniformLocation(program,'t'),up=gl.getUniformLocation(program,'travel'),um=gl.getUniformLocation(program,'mouse');
  const start=performance.now();
  function resize(){const d=Math.min(devicePixelRatio||1,innerWidth<700?1:1.2),w=Math.floor(innerWidth*d),h=Math.floor(innerHeight*d);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;canvas.style.width=innerWidth+'px';canvas.style.height=innerHeight+'px';gl.viewport(0,0,w,h)}}
  function frame(now){resize();progress+=(target-progress)*.045;gl.uniform2f(ur,canvas.width,canvas.height);gl.uniform1f(ut,motion?(now-start)/1000:0);gl.uniform1f(up,progress);gl.uniform2f(um,pointerX,pointerY);gl.drawArrays(gl.TRIANGLES,0,6);chapters.forEach(c=>{const b=c.getBoundingClientRect();c.classList.toggle('is-active',b.top<innerHeight*.68&&b.bottom>innerHeight*.32)});requestAnimationFrame(frame)}
  loading?.classList.add('is-hidden');requestAnimationFrame(frame);
 }catch(error){console.error(error);fallback()}
})();