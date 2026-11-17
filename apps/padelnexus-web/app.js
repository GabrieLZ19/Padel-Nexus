'use strict';
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const menu = document.querySelector('.menu-button');
const nav = document.getElementById('navigation');
function closeMenu(){nav.classList.remove('open');menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','Abrir menú');}
menu.addEventListener('click',()=>{const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Cerrar menú':'Abrir menú');});
nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&nav.classList.contains('open')){closeMenu();menu.focus();}});
const preview = document.getElementById('product-preview');
const content = {
  "federations": {
    "label": "PADEL NEXUS / FEDERACIONES NACIONALES",
    "title": "La visión nacional.<br>Una red conectada.",
    "description": "Un espacio específico para las entidades rectoras del deporte. La gestión federativa se vincula con las Asociaciones Provinciales, los Clubes y los Jugadores en un mismo ecosistema.",
    "features": [
      "Vinculación con asociaciones y comunidad deportiva",
      "Afiliaciones, licencias y carnets federativos",
      "Competencias de alcance nacional y rankings",
      "Información conectada entre todos los niveles"
    ],
    "preview": "<div class=\"preview-top\"><span>NEXUS / FEDERACIONES</span><span class=\"sample-tag\">VISTA CONCEPTUAL</span></div><h4 class=\"preview-main-title\">El deporte, a escala nacional.</h4><p class=\"preview-subtitle\">Gestión institucional conectada</p><div class=\"institution\"><div class=\"institution-row\"><span>Vinculación</span><span>Asociaciones Provinciales</span></div><div class=\"institution-row\"><span>Afiliaciones</span><span>Jugadores y entidades</span></div><div class=\"institution-row\"><span>Licencias</span><span>Carnets federativos</span></div><div class=\"institution-row\"><span>Competencias</span><span>Circuito nacional</span></div><div class=\"institution-row\"><span>Información</span><span>Resultados y rankings</span></div></div><div class=\"preview-bottom\"><span>Una entidad rectora. Todo un ecosistema.</span><span aria-hidden=\"true\"><svg class=\"nexus-arrow\" aria-hidden=\"true\" focusable=\"false\" viewBox=\"0 0 24 24\" fill=\"none\"><path d=\"M5 19 19 5M5 5h14v14\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg></span></div>",
    "previewLabel": "Vista conceptual del espacio para Federaciones Nacionales"
  },
  "associations": {
    "label": "PADEL NEXUS / ASOCIACIONES PROVINCIALES",
    "title": "Cada provincia,<br>parte de la misma red.",
    "description": "Un espacio propio para cada Asociación Provincial, conectado con las Federaciones Nacionales, los clubes y sus jugadores. La actividad local y provincial se integra a una visión más amplia del deporte.",
    "features": [
      "Vinculación con federaciones, clubes y jugadores",
      "Altas de asociados y renovación de carnets",
      "Inscripciones y competencias provinciales",
      "Resultados, rankings y seguimiento de la actividad"
    ],
    "preview": "<div class=\"preview-top\"><span>NEXUS / ASOCIACIONES</span><span class=\"sample-tag\">VISTA CONCEPTUAL</span></div><h4 class=\"preview-main-title\">Una provincia. Muchas conexiones.</h4><p class=\"preview-subtitle\">Gestión asociativa dentro del ecosistema</p><div class=\"institution\"><div class=\"institution-row\"><span>Ámbito nacional</span><span>Federaciones</span></div><div class=\"institution-row\"><span>Actividad local</span><span>Clubes y jugadores</span></div><div class=\"institution-row\"><span>Asociados</span><span>Vinculación y carnets</span></div><div class=\"institution-row\"><span>Circuito provincial</span><span>Torneos e inscripciones</span></div><div class=\"institution-row\"><span>Seguimiento</span><span>Resultados y rankings</span></div></div><div class=\"preview-bottom\"><span>La actividad provincial, conectada al país.</span><span aria-hidden=\"true\"><svg class=\"nexus-arrow\" aria-hidden=\"true\" focusable=\"false\" viewBox=\"0 0 24 24\" fill=\"none\"><path d=\"M5 19 19 5M5 5h14v14\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg></span></div>",
    "previewLabel": "Vista conceptual del espacio para Asociaciones Provinciales"
  },
  "club": {
    "label": "PADEL NEXUS / CLUBES",
    "title": "Tu club tiene su lugar.<br>Y conexión con todo el país.",
    "description": "La operación diaria del club se integra al ecosistema institucional y deportivo. Un jugador puede encontrarlo en su ciudad o descubrirlo mientras viaja por otra provincia.",
    "features": [
      "Ubicación del club mediante geolocalización",
      "Disponibilidad de canchas y reservas de turnos",
      "Torneos locales e inscripciones",
      "Vinculación con asociaciones, federaciones y jugadores"
    ],
    "preview": "<div class=\"preview-top\"><span>NEXUS / CLUBES</span><span class=\"sample-tag\">VISTA CONCEPTUAL</span></div><h4 class=\"preview-main-title\">De tu cancha al ecosistema.</h4><p class=\"preview-subtitle\">Gestión del club y acceso para jugadores</p><div class=\"institution\"><div class=\"institution-row\"><span>Descubrimiento</span><span>Ciudad y geolocalización</span></div><div class=\"institution-row\"><span>Canchas</span><span>Disponibilidad y reservas</span></div><div class=\"institution-row\"><span>Competencias</span><span>Torneos del club</span></div><div class=\"institution-row\"><span>Comunidad</span><span>Jugadores locales y visitantes</span></div><div class=\"institution-row\"><span>Vinculación</span><span>Asociaciones y federaciones</span></div></div><div class=\"preview-bottom\"><span>Tu club, accesible desde cualquier punto del país.</span><span aria-hidden=\"true\"><svg class=\"nexus-arrow\" aria-hidden=\"true\" focusable=\"false\" viewBox=\"0 0 24 24\" fill=\"none\"><path d=\"M5 19 19 5M5 5h14v14\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg></span></div>",
    "previewLabel": "Vista conceptual del espacio para Clubes"
  },
  "player": {
    "label": "PADEL NEXUS / JUGADORES",
    "title": "Un perfil.<br>Todo tu mundo de pádel.",
    "description": "Reservá donde estés, vinculáte a distintas entidades, renová tus licencias y elegí dónde competir. Tu identidad deportiva reúne tu actividad en el club, la provincia y el circuito nacional.",
    "features": [
      "Clubes y reservas por geolocalización en todo el país",
      "Afiliaciones y renovación de licencias o carnets",
      "Inscripciones y seguimiento de torneos en tiempo real",
      "Estadísticas, rankings y e-commerce dedicado"
    ],
    "preview": "\n<div class=\"preview-top\"><span>NEXUS / PLAYER</span><span class=\"sample-tag\">VISTA CONCEPTUAL</span></div>\n<div class=\"player-identity\"><div class=\"initials\">VP</div><div><small>TU IDENTIDAD DEPORTIVA</small><strong>Valentina Paz</strong><span>Neuquén, Argentina</span></div><span class=\"category\">4ª<br><small>CATEGORÍA</small></span></div>\n<div class=\"stats\"><div><strong>24</strong><span>Partidos</span></div><div><strong>18</strong><span>Victorias</span></div><div><strong>75<span>%</span></strong><span>Efectividad</span></div></div>\n<div class=\"evolution\"><div><span>Tu evolución</span><small>ÚLTIMAS 6 COMPETENCIAS</small></div><svg viewBox=\"0 0 420 106\" role=\"img\" aria-label=\"Ejemplo ilustrativo de evolución deportiva\"><path class=\"chart-grid\" d=\"M0 25H420M0 60H420M0 95H420\"/><path class=\"chart-area\" d=\"M0 90L84 75L168 80L252 45L336 54L420 10V106H0Z\"/><path class=\"chart-line\" d=\"M0 90L84 75L168 80L252 45L336 54L420 10\"/><circle cx=\"420\" cy=\"10\" r=\"4\" fill=\"#cbfe01\"/></svg></div>\n<div class=\"preview-bottom\"><span>Tu perfil, conectado a clubes y entidades.</span><span aria-hidden=\"true\"><svg class=\"nexus-arrow\" aria-hidden=\"true\" focusable=\"false\" viewBox=\"0 0 24 24\" fill=\"none\"><path d=\"M5 19 19 5M5 5h14v14\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg></span></div>",
    "previewLabel": "Vista conceptual del perfil personal con estadísticas ficticias"
  }
};
const tabs=[...document.querySelectorAll('[role="tab"]')];
function selectTab(tab){
 const data=content[tab.dataset.audience];
 tabs.forEach(t=>{const selected=t===tab;t.setAttribute('aria-selected',String(selected));t.tabIndex=selected?0:-1;});
 document.getElementById('audience-panel').setAttribute('aria-labelledby',tab.id);
 document.getElementById('audience-label').textContent=data.label;
 document.getElementById('audience-title').innerHTML=data.title;
 document.getElementById('audience-description').textContent=data.description;
 document.getElementById('audience-features').replaceChildren(...data.features.map(text=>{const li=document.createElement('li');li.textContent=text;return li;}));
 preview.innerHTML=data.preview;preview.setAttribute('aria-label',data.previewLabel);
 const tabbar=document.querySelector('.ecosystem-levels');
 if(tabbar.getBoundingClientRect().top>120 && document.getElementById('audience-panel').getBoundingClientRect().bottom>innerHeight) window.scrollTo({top:window.scrollY+document.getElementById('audience-panel').getBoundingClientRect().top-tabbar.offsetHeight-24,behavior:reducedMotion.matches?'auto':'smooth'});
}
tabs.forEach((tab,i)=>{tab.addEventListener('click',()=>selectTab(tab));tab.addEventListener('keydown',e=>{let n;if(e.key==='ArrowRight') n=(i+1)%tabs.length;if(e.key==='ArrowLeft') n=(i-1+tabs.length)%tabs.length;if(e.key==='Home') n=0;if(e.key==='End') n=tabs.length-1;if(n!==undefined){e.preventDefault();selectTab(tabs[n]);tabs[n].focus();}});});
if(!reducedMotion.matches&&'IntersectionObserver' in window){document.documentElement.classList.add('js-motion');const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.remove('pending');observer.unobserve(e.target);}}),{threshold:.08});document.querySelectorAll('.reveal').forEach(el=>{el.classList.add('pending');observer.observe(el);});}
