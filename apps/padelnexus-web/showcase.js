/* PADEL NEXUS: deterministic illustrative scenes. No orders, bookings or payments are sent. */
'use strict';
(() => {
 const DURATION=31.74675, CYCLE=31.74675, lime='#cbfe01', white='#f6f7f2', muted='#a7afa0';
 const photos=['hero.webp','hero-woman.webp','hero-man.webp'].map(name=>{const i=new Image();i.src='assets/'+name;return i;});
 const loadImage=name=>{const i=new Image();i.src='assets/'+name;return i;};
 const court=loadImage('nexus-court.webp'),balls=loadImage('nexus-balls.webp'),rackets=loadImage('nexus-rackets.webp'),logo=loadImage('logo.png');
 const provinces=['Neuquén','La Pampa','Córdoba','Buenos Aires','Tucumán','Chaco','Chubut','Río Negro','San Luis','Santa Fe','Mendoza','San Juan','Salta','Entre Ríos','Misiones','Santa Cruz'];
 const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
 const mix=(a,b,t)=>a+(b-a)*clamp(t);
 function round(c,x,y,w,h,r=14){c.beginPath();c.roundRect(x,y,w,h,r);}
 function box(c,x,y,w,h,fill='#141a14',stroke='#35402e',r=14){round(c,x,y,w,h,r);c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=1;c.stroke();}}
 function text(c,s,x,y,size=18,color=white,weight=500,align='left'){c.fillStyle=color;c.font=`${weight} ${size}px Manrope,Arial,sans-serif`;c.textAlign=align;c.fillText(s,x,y);}
 function line(c,x,y,x2,y2,col=lime){c.beginPath();c.moveTo(x,y);c.lineTo(x2,y2);c.strokeStyle=col;c.lineWidth=2;c.stroke();}
 function badge(c,s,x,y,w=170){box(c,x,y,w,27,'#243014',null,13);text(c,s,x+w/2,y+18,11,lime,700,'center');}
 function cursor(c,x,y,click){c.save();c.translate(x,y);if(click){c.beginPath();c.arc(0,0,12+click*18,0,Math.PI*2);c.strokeStyle=`rgba(203,254,1,${1-click})`;c.lineWidth=3;c.stroke();}c.beginPath();c.moveTo(0,0);c.lineTo(0,24);c.lineTo(7,18);c.lineTo(13,29);c.lineTo(19,26);c.lineTo(13,15);c.lineTo(24,15);c.closePath();c.fillStyle=white;c.fill();c.strokeStyle='#10170e';c.lineWidth=2;c.stroke();c.restore();}
 function pointer(c,t,steps){let a=steps[0],b=a;for(let i=1;i<steps.length;i++){if(t<steps[i][0]){b=steps[i];break;}a=steps[i];b=a;}const f=a===b?0:clamp((t-a[0])/(b[0]-a[0]));const q=f*f*(3-2*f);cursor(c,mix(a[1],b[1],q),mix(a[2],b[2],q),t-a[0]<.6?(t-a[0])/.6:0);}
 function header(c,w,k,title,sub){text(c,'PADEL NEXUS',24,30,13,lime,800);text(c,k,w-24,30,11,muted,600,'right');text(c,title,24,73,w<600?27:34,white,700);text(c,sub,24,101,w<600?12:15,muted);}
 function match(c,x,y,w,h,a,b,reveal,scored){box(c,x,y,w,h,'#161d16',scored?'#779536':'#394335',9);if(reveal){text(c,a,x+13,y+h*.37,Math.min(16,w/13),white,600);text(c,b,x+13,y+h*.78,Math.min(16,w/13),muted,500);}else{text(c,'Asignando provincias…',x+13,y+h*.55,12,muted);}line(c,x+10,y+h/2,x+w-10,y+h/2,'#2b3426');if(scored){text(c,'6  6',x+w-12,y+h*.37,14,lime,800,'right');text(c,'3  4',x+w-12,y+h*.78,14,muted,500,'right');}}
 function zone(c,w,h,t){
 box(c,0,0,900,445,'rgba(14,18,14,.94)','#3d4831',20);
 box(c,22,22,52,52,lime,null,17);text(c,'A',48,57,24,'#0b1008',800,'center');
 text(c,'ZONA A',96,43,23,white,800);badge(c,t>3.6?'COMPLETA':'EN JUEGO',220,22,155);
 text(c,'3 PAREJAS   ·   2 CLASIFICAN   ·   '+(t>3.6?'3/3':'0/3')+' PARTIDOS',96,71,15,muted,650);
 line(c,20,95,880,95,'#30382b');text(c,'POSICIONES',24,132,19,white,750);
 text(c,'PARTICIPANTES / PAREJA',30,182,15,muted,700);['PTS','PJ','PG'].forEach((v,j)=>text(c,v,700+j*70,182,15,j===0?lime:muted,750,'center'));
 const rows=[['Neuquén · Castro / Villar',4,2,2],['La Pampa · Escobar / Ledesma',3,2,1],['Mendoza · Domínguez / Herrera',2,2,0]];
 rows.forEach((r,i)=>{const f=clamp((t-.25-i*.35)*5);c.save();c.globalAlpha=f;const y=203+i*62;box(c,20,y,860,55,t>3.6&&i<2?'#222c0e':'#121712',null,5);badge(c,String(i+1),30,y+14,30);text(c,r[0],76,y+35,18,white,650);r.slice(1).forEach((v,j)=>text(c,t>1.6+i*.4?String(v):'–',700+j*70,y+35,18,j===0?lime:white,750,'center'));if(t>3.8&&i<2)text(c,'✓',635,y+35,21,lime,800);c.restore();});
 if(t>4.3){c.save();c.globalAlpha=clamp((t-4.3)*4);text(c,'NEUQUÉN Y LA PAMPA AVANZAN A LA LLAVE',450,422,17,lime,750,'center');c.restore();}
 }
 function bracket(c,w,h,t){
 const names=['Neuquén','Córdoba','La Pampa','Buenos Aires','Tucumán','Chaco','Chubut','Río Negro'];
 const cw=245,ch=78,xs=[0,320,640],ys=[[80,180,280,380],[130,330],[230]];
 ['CUARTOS','SEMIFINALES','FINAL'].forEach((v,i)=>{text(c,v,xs[i]+8,48,17,white,750);line(c,xs[i],35,xs[i],50);});
 function connect(x,y,target,progress){c.save();c.strokeStyle=lime;c.lineWidth=2.5;c.shadowColor=lime;c.shadowBlur=10;c.beginPath();c.moveTo(x+cw,y+ch/2);c.lineTo(x+cw+37,y+ch/2);c.lineTo(x+cw+37,target+ch/2);c.lineTo(x+320,target+ch/2);c.setLineDash([400]);c.lineDashOffset=400*(1-clamp(progress));c.stroke();c.restore();}
 ys[0].forEach((y,i)=>connect(0,y,ys[1][Math.floor(i/2)],(t-1.4-i*.12)*3));
 ys[1].forEach((y,i)=>connect(320,y,230,(t-3.1-i*.1)*3));
 for(let r=0;r<3;r++)ys[r].forEach((y,i)=>{const begin=r===0?i*.15:r===1?2+i*.2:3.6;const f=clamp((t-begin)*6);c.save();c.globalAlpha=f;c.translate(0,(1-f)*12);const ix=i*2*(2**r);match(c,xs[r],y,cw,ch,names[ix],names[ix+2**r],t>begin+.1,t>begin+.5);c.restore();});
 if(t>4.6){c.save();c.globalAlpha=clamp((t-4.6)*4);badge(c,'NEUQUÉN · CAMPEÓN',640,335,245);c.restore();}
 }
 function product(c,x,y,w,h,type){const img=type==='balls'?balls:rackets;if(!img.complete||!img.naturalWidth)return;const sz=Math.min(w,h);c.drawImage(img,x+(w-sz)/2,y+(h-sz)/2,sz,sz);}
 function shop(c,w,h,t){const mobile=w<600;header(c,w,'02 / MARKETPLACE','Todo para tu juego.','Elegí tus accesorios dentro del ecosistema.');
  const gap=16,cw=(w-48-gap)/2,top=128,ph=mobile?267:250;const n=t>=8?2:t>=4?1:0;
  ['Tubo de pelotas','Paleta de pádel'].forEach((name,i)=>{const x=24+i*(cw+gap);box(c,x,top,cw,ph);product(c,x,top+6,cw,130,i?'racket':'balls');text(c,name,x+14,top+158,mobile?15:22,white,650);text(c,i?'$ 120.000':'$ 12.000',x+14,top+185,17,lime,650);box(c,x+12,top+204,cw-24,40,n>i?'#354525':lime,null,7);text(c,n>i?'Agregado al carrito':'Agregar al carrito',x+cw/2,top+230,mobile?11:16,n>i?lime:'#101600',750,'center');});
  const by=top+ph+18;box(c,24,by,w-48,55,'#1c2517');text(c,`Carrito · ${n} ${n===1?'producto':'productos'}`,40,by+33,mobile?14:19,white,650);text(c,n===2?'$ 132.000':n?'$ 12.000':'$ 0',w-40,by+33,18,lime,700,'right');
  if(t>=10){box(c,w/2-95,by+68,190,42,lime,null,8);text(c,'Comprar',w/2,by+95,17,'#101600',800,'center');}
  if(t>=13){box(c,24,top+80,w-48,160,'#10190f',lime);text(c,'Compra confirmada',w/2,top+140,mobile?22:31,lime,750,'center');text(c,'Tu pedido ya está en marcha.',w/2,top+181,mobile?13:18,white,500,'center');}
  if(t<13)pointer(c,t,[[0,w-65,110],[3,24+cw/2,top+223],[4,24+cw/2,top+223],[7,w-24-cw/2,top+223],[8,w-24-cw/2,top+223],[11,w/2,by+87],[12,w/2,by+87]]);
  text(c,'Demostración ilustrativa · sin transacciones reales',24,h-15,11,muted);
 }
 function booking(c,w,h,t){const mobile=w<600;header(c,w,'03 / RESERVAS','Tu próxima cancha.','Encontrá un club. Elegí tu horario. Reservá.');
 const top=127, cw=w-48;const selected=t>=3, time=t>=7,done=t>=12;
 badge(c,'NEUQUÉN · CERCA TUYO',24,top,215);
 ['Club Nexus Centro','Club Nexus Parque'].forEach((name,i)=>{const y=top+44+i*64;box(c,24,y,cw,54,i===0&&selected?'#2a381a':'#151c14',i===0&&selected?lime:'#394335');text(c,name,42,y+24,mobile?16:21,white,650);text(c,i?'A 2,4 km · 2 canchas':'A 850 m · 4 canchas',42,y+43,11,muted);text(c,i===0&&selected?'Seleccionado':'Ver turnos',w-40,y+32,mobile?11:16,lime,650,'right');});
 const sy=top+187;text(c,'SÁBADO · CANCHA 02 · 90 MIN',24,sy,12,muted,700);
 ['18:00','19:30','21:00'].forEach((v,i)=>{const ww=(cw-20)/3,x=24+i*(ww+10);box(c,x,sy+17,ww,49,time&&i===1?lime:'#151c14',time&&i===1?lime:'#394335');text(c,v,x+ww/2,sy+48,20,time&&i===1?'#101600':white,700,'center');});
 box(c,24,sy+86,cw,49,time?lime:'#36412c',null,8);text(c,'Reservar cancha',w/2,sy+117,18,time?'#101600':muted,750,'center');
 if(done){box(c,24,top+80,cw,194,'#10190f',lime);text(c,'¡Cancha reservada!',w/2,top+134,mobile?24:34,lime,750,'center');text(c,'Club Nexus Centro · Cancha 02',w/2,top+176,mobile?14:21,white,600,'center');text(c,'Sábado · 19:30 a 21:00',w/2,top+210,mobile?16:23,white,500,'center');}
 else pointer(c,t,[[0,w-60,112],[2,w-70,top+70],[3,w-70,top+70],[6,w/2,sy+40],[7,w/2,sy+40],[10,w/2,sy+108],[11,w/2,sy+108]]);
 text(c,'Clubes, horarios y confirmaciones de ejemplo',24,h-15,11,muted);
 }
 function cover(c,img,w,h,alpha=1){if(!img.complete||!img.naturalWidth)return;c.save();c.globalAlpha=alpha;const s=Math.max(w/img.width,h/img.height);c.drawImage(img,(w-img.width*s)/2,(h-img.height*s)/2,img.width*s,img.height*s);c.restore();}
 function athlete(c,img,w,h,alpha=1,intro=false){
 if(w/h>=1.1){cover(c,img,w,h,alpha);return;}
 if(!img.complete||!img.naturalWidth)return;
 // The athletes occupy the right-hand part of the landscape originals.
 // Fit that region without cropping head, racket or feet in portrait layouts.
 c.save();c.globalAlpha=alpha;
 const sx=img===photos[0]?img.width*.39:img.width*.45,sw=img.width-sx;
 const areaH=intro?h:h*.51,scale=Math.min(w/sw,areaH/img.height);
 const dw=sw*scale,dh=img.height*scale,dy=intro?(h-dh)/2:h-dh-38;
 c.drawImage(img,sx,0,sw,img.height,(w-dw)/2,dy,dw,dh);
 c.restore();
 }
 function render(canvas,t,intro=false){
 const r=canvas.getBoundingClientRect();if(!r.width)return;const dpr=Math.min(devicePixelRatio||1,2),W=r.width,H=r.height,pw=Math.round(W*dpr),ph=Math.round(H*dpr);
 if(canvas.width!==pw||canvas.height!==ph){canvas.width=pw;canvas.height=ph;}const c=canvas.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,W,H);
 const elapsed=intro?Math.min(t,DURATION):t%CYCLE,mobile=W<600;
 // Shared Hero/Intro edit. Map each spoken chapter to the existing rapid demonstrations.
 const cues=[[0,7.38,0,6],[7.38,10.5,6,12],[10.5,15.46,12,18],[15.46,21.55,18,24],[21.55,27.27,24,30]];
 if(elapsed>=27.27){
 cover(c,court,W,H);c.fillStyle='rgba(0,5,1,.5)';c.fillRect(0,0,W,H);
 c.save();c.globalAlpha=clamp((elapsed-27.27)/.25)*(1-clamp((elapsed-30.17)/(DURATION-30.17)));
 const cx=intro?W/2:mobile?W/2:W*.74,cy=intro?H*.48:mobile?H*.73:H*.45;
 const lw=intro?W*.5:mobile?W*.7:W*.33;
 if(logo.complete&&logo.naturalWidth)c.drawImage(logo,cx-lw/2,cy-lw*logo.height/logo.width/2,lw,lw*logo.height/logo.width);
 text(c,'EL JUEGO EVOLUCIONA',cx,cy+lw*.22,Math.max(12,lw*.045),lime,700,'center');c.restore();return;
 }
 const cue=cues.find(v=>elapsed<v[1]);
 const phase=cue[2]+(elapsed-cue[0])/(cue[1]-cue[0])*(cue[3]-cue[2]);
 if(phase<6){const i=Math.floor(phase/2),f=phase%2;cover(c,court,W,H);athlete(c,photos[i],W,H,1,intro);if(f<.55&&i)athlete(c,photos[i-1],W,H,1-f/.55,intro);return;}
 cover(c,court,W,H);if(phase<6.5)athlete(c,photos[2],W,H,1-(phase-6)/.5,intro);
 c.fillStyle='rgba(0,5,1,.12)';c.fillRect(0,0,W,H);
 const local=phase<12?phase-6:phase<18?phase-12:phase<24?phase-18:phase-24;c.save();c.globalAlpha=clamp(local*5)*clamp((6-local)*5);
 if(phase<18){const width=intro?W*.90:mobile?W*.88:W*.44;const scale=width/930;const x=intro?(W-width)/2:mobile?W*.05:W*.51;const y=intro?(H-500*scale)/2:mobile?H*.60:H*.27;c.translate(x,y+12*(1-clamp(local*4)));c.scale(scale,scale);if(phase<12)zone(c,900,500,local);else bracket(c,900,500,local);}
 else{const ph=Math.min(intro?H*.92:mobile?H*.45:H*.86,(intro?W*.8:W*.34)*940/464);const scale=ph/940;const x=intro?(W-464*scale)/2:W*.92-454*scale;const y=intro?(H-ph)/2:mobile?H*.51:H*.065;c.translate(x,y+10*(1-clamp(local*4)));c.scale(scale,scale);
 c.shadowColor='#000';c.shadowBlur=35;box(c,-10,-18,464,940,'#060806','#92988e',52);c.shadowBlur=0;c.save();round(c,0,0,440,900,44);c.clip();c.fillStyle='#090e09';c.fillRect(0,0,440,900);
 text(c,'9:41',25,32,15,white,700);text(c,'▰ ▰',407,32,15,white,650,'right');c.save();c.translate(0,68);
 if(phase<24)shop(c,440,720,local*3.25);else booking(c,440,720,local*3.25);c.restore();
 line(c,22,812,418,812,'#30382b');['Inicio','Actividad','Perfil'].forEach((v,i)=>{box(c,65+i*145,834,20,17,i===0?lime:'#58614e',null,5);text(c,v,75+i*145,878,13,i===0?lime:muted,600,'center');});
 c.restore();box(c,120,-1,200,30,'#020302',null,16);box(c,182,9,68,5,'#222722',null,3);box(c,165,899,110,5,'#c2c7be',null,3);}
 c.restore();}
 window.NexusShowcase={render,DURATION};
 const hero=document.querySelector('.hero'),stage=document.getElementById('hero-demo'),heroCanvas=document.getElementById('hero-demo-canvas');
 const slides=[...document.querySelectorAll('.hero-slide')],reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const dialog=document.getElementById('film-dialog'),opener=document.getElementById('open-film'),film=document.getElementById('intro-canvas'),audio=document.getElementById('intro-audio'),play=document.getElementById('intro-play'),seek=document.getElementById('intro-seek');
 let ht=0,last=performance.now(),it=0,playing=false,hadAudio=false;
 function drawHero(){stage.hidden=false;hero.classList.remove('demo-active');slides.forEach((s,i)=>s.classList.toggle('is-active',i===0));render(heroCanvas,reduced.matches?2:ht);}
 function drawIntro(){render(film,it,true);seek.value=it;document.getElementById('intro-time').textContent=`${it.toFixed(1)} / ${DURATION.toFixed(2)} s`;const label=it<7.38?'Todo el pádel conectado':it<10.5?'Clasificación: posiciones y pase a la llave':it<15.46?'Competencias: cuadros, resultados, rankings y estadísticas':it<21.55?'Marketplace: selección, carrito y compra':it<27.27?'Reservas: club, horario y confirmación':'PADEL NEXUS. El juego evoluciona.';film.setAttribute('aria-label',label);document.getElementById('intro-scene').textContent=label;}
 function duration(){return Number.isFinite(audio.duration)&&audio.duration>0?audio.duration:DURATION;}
 function start(){if(it>=DURATION-.02){it=0;audio.currentTime=0;}playing=true;play.textContent='Pausar';audio.play().then(()=>{hadAudio=true;}).catch(()=>{pause();document.getElementById('intro-scene').textContent='No se pudo reproducir el audio. Pulsá Reproducir para reintentar.';});}
 function pause(){playing=false;audio.pause();play.textContent='Reproducir';}
 opener.addEventListener('click',()=>{dialog.showModal();it=0;audio.currentTime=0;drawIntro();start();});
 document.getElementById('close-film').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('close',()=>{pause();opener.focus();});
 dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
 play.addEventListener('click',()=>playing?pause():start());
 document.getElementById('intro-restart').addEventListener('click',()=>{it=0;audio.currentTime=0;drawIntro();start();});
 seek.addEventListener('input',()=>{it=Number(seek.value);if(audio.readyState)audio.currentTime=it;drawIntro();});
 audio.addEventListener('ended',()=>{it=DURATION;pause();drawIntro();});audio.addEventListener('error',()=>{hadAudio=false;});
 document.addEventListener('visibilitychange',()=>{last=performance.now();if(document.hidden&&dialog.open)pause();});
 reduced.addEventListener('change',()=>{if(reduced.matches)ht=5;drawHero();});
 document.fonts.ready.then(()=>{drawHero();if(dialog.open)drawIntro();});
 function tick(now){const dt=Math.max(0,(now-last)/1000);last=now;if(!document.hidden){if(dialog.open){if(playing){it=Math.min(DURATION,audio.currentTime);if(it>=DURATION)pause();}drawIntro();}else if(!reduced.matches){ht=(ht+dt)%CYCLE;drawHero();}}requestAnimationFrame(tick);}
 drawHero();requestAnimationFrame(tick);
})();
