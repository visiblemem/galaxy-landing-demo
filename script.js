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
setTimeout(()=>loading?.classList.add('is-hidden'),3200);

function fallback(){
 const ctx=canvas.getContext('2d');if(!ctx)return;
 function draw(){const d=Math.min(devicePixelRatio||1,1.4),w=innerWidth,h=innerHeight;canvas.width=w*d;canvas.height=h*d;canvas.style.width=w+'px';canvas.style.height=h+'px';ctx.setTransform(d,0,0,d,0,0);const sky=ctx.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#6d8aa2');sky.addColorStop(.46,'#efb56f');sky.addColorStop(1,'#8d421f');ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);ctx.fillStyle='#be7138';for(let i=0;i<9;i++){ctx.beginPath();ctx.moveTo(0,h);for(let x=0;x<=w;x+=20){const y=h*(.55+i*.045)+Math.sin(x*.008+i)*25+i*9;ctx.lineTo(x,y)}ctx.lineTo(w,h);ctx.closePath();ctx.globalAlpha=.22+i*.07;ctx.fill()}ctx.globalAlpha=1;const sun=ctx.createRadialGradient(w*.75,h*.22,0,w*.75,h*.22,w*.22);sun.addColorStop(0,'rgba(255,245,195,.95)');sun.addColorStop(.08,'rgba(255,218,143,.48)');sun.addColorStop(1,'rgba(255,190,100,0)');ctx.fillStyle=sun;ctx.fillRect(0,0,w,h)}
 draw();addEventListener('resize',draw,{passive:true});loading?.classList.add('is-hidden');
}

(function init(){
 const gl=canvas.getContext('webgl',{antialias:false,alpha:false,powerPreference:'high-performance'});
 if(!gl){fallback();return}
 const vertex=`attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;
 const fragment=`precision highp float;
uniform vec2 r;uniform float t;uniform float travel;uniform vec2 mouse;
#define STEPS 104
#define FAR 125.0
float hash21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash21(i),hash21(i+vec2(1,0)),f.x),mix(hash21(i+vec2(0,1)),hash21(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;mat2 m=mat2(1.62,1.19,-1.19,1.62);for(int i=0;i<5;i++){v+=a*noise2(p);p=m*p+vec2(7.1,3.7);a*=.5;}return v;}
float terrain(vec2 p){
 p.x+=sin(p.y*.018)*6.;
 vec2 q=mat2(.87,-.49,.49,.87)*p;
 float broad=sin(q.x*.031)*1.1+sin(q.x*.016+q.y*.021)*.72;
 float swell=(fbm(p*.018)-.5)*3.5;
 float ridge=pow(.5+.5*sin(q.x*.071+fbm(p*.035)*3.2),2.4)*.68;
 float cross=pow(.5+.5*sin((q.x*.15-q.y*.025)+fbm(p*.08)*1.8),5.)*.18;
 return broad+swell+ridge+cross-1.1;
}
vec3 getNormal(vec3 p){float e=.075;float h=terrain(p.xz);return normalize(vec3(h-terrain(p.xz+vec2(e,0)),e,h-terrain(p.xz+vec2(0,e))));}
float softShadow(vec3 ro,vec3 rd){float res=1.,d=.35;for(int i=0;i<24;i++){vec3 p=ro+rd*d;float h=p.y-terrain(p.xz);res=min(res,10.*h/d);d+=clamp(h,.18,2.0);if(h<.015||d>32.)break;}return clamp(res,0.,1.);}
vec3 skyColor(vec3 rd,vec3 sunDir){
 float y=max(rd.y,-.2);vec3 zen=vec3(.22,.39,.55);vec3 hor=vec3(.93,.54,.28);vec3 col=mix(hor,zen,smoothstep(-.08,.62,y));
 float haze=pow(1.-max(rd.y,0.),5.);col+=vec3(.35,.12,.035)*haze*.5;
 float sd=max(dot(rd,sunDir),0.);col+=vec3(1.,.72,.32)*pow(sd,420.)*7.;col+=vec3(1.,.45,.13)*pow(sd,18.)*.42;
 return col;
}
void main(){
 vec2 uv=(gl_FragCoord.xy-.5*r)/r.y;
 float shimmer=sin(uv.y*90.+t*1.3+noise2(vec2(uv.x*8.,t*.08))*6.)*.0018*smoothstep(.22,-.08,abs(uv.y+.02));
 uv.x+=shimmer+mouse.x*.025;uv.y-=mouse.y*.018;
 vec3 sunDir=normalize(vec3(.58,.56,-.58));
 vec3 ro=vec3(sin(travel*5.1)*1.15,2.65,travel*155.);
 vec3 forward=normalize(vec3(sin(travel*3.2)*.035,-.09,1.));
 vec3 right=normalize(cross(forward,vec3(0,1,0)));vec3 up=cross(right,forward);
 vec3 rd=normalize(forward+uv.x*right+uv.y*up);
 vec3 col=skyColor(rd,sunDir);
 float dist=0.;vec3 p=ro;bool hit=false;
 for(int i=0;i<STEPS;i++){p=ro+rd*dist;float d=p.y-terrain(p.xz);if(d<.012){hit=true;break;}dist+=clamp(d*.42,.035,2.2);if(dist>FAR)break;}
 if(hit){
  vec3 n=getNormal(p);float dif=max(dot(n,sunDir),0.);float sh=softShadow(p+n*.08,sunDir);
  float ao=clamp(.58+n.y*.48,0.,1.);
  vec2 wind=mat2(.93,-.36,.36,.93)*p.xz;
  float micro=sin(wind.x*5.5+noise2(p.xz*.55)*3.)*.5+.5;
  float ripple=pow(micro,7.)*.16;
  float grain=noise2(p.xz*7.5)*.08;
  vec3 sand=mix(vec3(.36,.105,.035),vec3(.92,.52,.22),clamp(n.y*.72+.22,0.,1.));
  sand+=vec3(.34,.13,.035)*(ripple+grain);
  float back=pow(1.-max(dot(n,-rd),0.),2.2);
  col=sand*(.2+dif*sh*1.35)*ao;
  col+=vec3(.95,.38,.11)*back*.12;
  float fog=1.-exp(-dist*.018);col=mix(col,skyColor(rd,sunDir),fog*.78);
 }
 float dustNoise=noise2(vec2(gl_FragCoord.x*.22+t*17.,gl_FragCoord.y*.19-t*9.));
 float dust=step(.985,dustNoise)*smoothstep(.45,-.25,uv.y)*(.35+.65*noise2(vec2(t*.2,uv.x*3.)));
 col+=dust*vec3(1.,.62,.25)*.32;
 col*=1.-smoothstep(.5,1.18,length(uv*vec2(.72,1.05)))*.38;
 col=pow(max(col,0.),vec3(.82));gl_FragColor=vec4(col,1.);
}`;
 function compile(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s}
 try{
  const program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));gl.useProgram(program);
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const loc=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
  const ur=gl.getUniformLocation(program,'r'),ut=gl.getUniformLocation(program,'t'),up=gl.getUniformLocation(program,'travel'),um=gl.getUniformLocation(program,'mouse');const start=performance.now();
  function resize(){const d=Math.min(devicePixelRatio||1,innerWidth<700?.78:1.12),w=Math.max(1,Math.floor(innerWidth*d)),h=Math.max(1,Math.floor(innerHeight*d));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;canvas.style.width=innerWidth+'px';canvas.style.height=innerHeight+'px';gl.viewport(0,0,w,h)}}
  function frame(now){resize();progress+=(target-progress)*.045;gl.uniform2f(ur,canvas.width,canvas.height);gl.uniform1f(ut,motion?(now-start)/1000:0);gl.uniform1f(up,progress);gl.uniform2f(um,pointerX,pointerY);gl.drawArrays(gl.TRIANGLES,0,6);chapters.forEach(c=>{const b=c.getBoundingClientRect();c.classList.toggle('is-active',b.top<innerHeight*.68&&b.bottom>innerHeight*.32)});requestAnimationFrame(frame)}
  loading?.classList.add('is-hidden');requestAnimationFrame(frame);
 }catch(error){console.error(error);fallback()}
})();