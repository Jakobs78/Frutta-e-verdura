import {createGame,amountText,WORLD,ZONES,PRISON,SOLIDS,RESOURCE_NAMES,RESOURCE_UNLOCK,xpNeeded,maxHealth,punchDamage,distance,clamp} from './engine.js';
import {createWorldView} from './scene3d.js';
const $=id=>document.getElementById(id),canvas=$('game');
const icons={seeds:'🌱',drops:'💧',wood:'🪵',stone:'🪨',ore:'⛏',planks:'▤',blocks:'▦',ingots:'◆'};
let toastTimer,view,storage,selectedStation='taglialegna',expanded=false,joystickPointer=null,lastTime=0,hudTime=0,renderTime=0,gamepadButtons=[];
const keys=new Set(),stick={x:0,y:0};
try{storage=window.localStorage;}catch{}
function notify(text){$('toast').textContent=text;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),4000);}
const game=createGame({storage,notify,onStation:openWorkshop}),{state}=game;
function anyDialog(){return [...document.querySelectorAll('dialog')].some(d=>d.open);}
function clearInput(){keys.clear();stick.x=0;stick.y=0;joystickPointer=null;$('joystick-knob').style.transform='translate(0,0)';}
function openDialog(id){clearInput();document.querySelectorAll('dialog[open]').forEach(d=>{if(d.id!==id)d.close();});if(!$(id).open)$(id).showModal();}
function pause(value){state.paused=value;clearInput();$('pause').textContent=value?'▷':'Ⅱ';$('pause').setAttribute('aria-label',value?'Riprendi il gioco':'Metti in pausa');if(value)openDialog('menu');else if($('menu').open)$('menu').close();}
function closeDialog(id){$(id).close();clearInput();canvas.focus({preventScroll:true});}
function resourceRows(target){$(target).innerHTML=Object.keys(RESOURCE_NAMES).map(k=>`<div class="inventory-item"><span class="resource-icon">${icons[k]}</span><div><strong data-resource="${k}">0</strong><small>${RESOURCE_NAMES[k]}</small></div></div>`).join('');}
resourceRows('inventory');resourceRows('bag-items');
$('unlock-roadmap').innerHTML=[[1,'Bosco e Falegnameria'],[3,'Cava e Spaccapietre'],[5,'Ferro, Fucina e castello']].map(([level,name])=>`<div class="roadmap-step" data-unlock="${level}"><strong>LV.${level}</strong><span>${name}</span></div>`).join('');
$('station-tabs').innerHTML=state.stations.map(s=>`<button type="button" id="tab-${s.id}" role="tab" aria-controls="station-panel" aria-selected="false" tabindex="-1" data-station="${s.id}">${s.icon} ${s.name}</button>`).join('');
function station(){return state.stations.find(s=>s.id===selectedStation);}
function openWorkshop(id){if(state.paused)return;if(id)selectedStation=id;openDialog('workshop');renderWorkshop();$('tab-'+selectedStation).focus();}
function renderWorkshop(){
  const s=station(),p=state.player,locked=p.level<s.required,atHome=game.safe(),nextLevel=s.level+1,cost=game.upgradeCost(s),requirement=game.stationRequirement(s);
  document.querySelectorAll('[data-station]').forEach(button=>{const item=state.stations.find(s=>s.id===button.dataset.station),selected=item.id===s.id;button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;button.classList.toggle('locked-tab',p.level<item.required);});
  $('station-panel').setAttribute('aria-labelledby','tab-'+s.id);
  $('workshop-location').textContent=atHome?'Al sicuro, ogni progetto prende forma.':'Puoi consultare le schede. Torna al frigorifero per costruire e produrre.';
  $('station-icon').textContent=locked?'🔒':s.icon;$('station-name').textContent=s.name;
  $('station-status').textContent=locked?`BLOCCATA · FRAGOLINA LV.${s.required}`:s.level?`COSTRUITA · LIVELLO ${s.level} / 5`:'SBLOCCATA · DA COSTRUIRE';
  $('station-description').textContent=s.description;
  $('station-stats').innerHTML=s.input?`<span>3 ${RESOURCE_NAMES[s.input]} per ciclo</span><span>${s.level?game.jobDuration(s):12} secondi</span><span>${amountText(s.output,s.level?game.jobYield(s):1)} per ciclo</span>`:s.id==='vivaio'?`<span>+${Math.max(1,s.level)} semi ogni 30 s</span>`:`<span>Recupero: ${8+Math.max(1,s.level)*7} freschezza / s</span>`;
  $('station-recipe').textContent=s.input?`Lavorazione: 3 ${RESOURCE_NAMES[s.input]} → ${amountText(s.output,s.level?game.jobYield(s):1)}`:'';
  $('process').hidden=!s.input||!s.level;$('process').textContent=s.job?'Lavorazione in corso…':`Lavora 3 ${RESOURCE_NAMES[s.input]}`;
  $('process').disabled=!atHome||!!s.job||state.bag[s.input]<3;
  $('upgrade-label').textContent=!s.level?'COSTRUISCI LA STAZIONE':s.level===5?'LIVELLO MASSIMO':'POTENZIA AL LIVELLO '+nextLevel;
  $('station-cost').innerHTML=s.level===5?'':Object.entries(cost).map(([k,v])=>`<span class="${state.bag[k]<v?'missing':''}">${icons[k]} ${state.bag[k]} / ${v} ${RESOURCE_NAMES[k]}</span>`).join('');
  $('station-requirement').textContent=s.level===5?'Questa stazione è al massimo della crescita.':p.level<requirement?`🔒 Serve Fragolina al livello ${requirement}. Lo sblocco non costruisce automaticamente la stazione.`:!atHome?'Raggiungi il frigorifero per costruire.':s.job?'Termina la lavorazione prima di potenziare.':game.canAfford(cost)?'Hai tutti i materiali necessari.':'Raccogli i materiali mancanti nello zaino.';
  $('station-requirement').classList.toggle('locked',p.level<requirement);
  $('upgrade').textContent=s.level===5?'Livello massimo':locked?`Si sblocca al livello ${s.required}`:s.level?'Potenzia al livello '+nextLevel:'Costruisci '+s.name;
  $('upgrade').disabled=s.level>=5||p.level<requirement||!atHome||!game.canAfford(cost)||!!s.job;
  $('saw-section').hidden=s.id!=='fucina'||!s.level;
  $('saw-recipe').textContent=state.tools.hacksaw?'✓ Seghetto per metallo nello zaino.':`Seghetto per metallo: ${game.costText(game.sawCost)} · 15 s`;
  $('craft-saw').disabled=state.tools.hacksaw||!!s.job||!atHome||p.level<5||!game.canAfford(game.sawCost);
  $('craft-saw').textContent=state.tools.hacksaw?'Seghetto già costruito':'Costruisci Seghetto per metallo';
  updateJob();
}
function updateJob(){const s=station();$('station-job').hidden=!s.job;if(s.job){$('job-seconds').textContent=Math.ceil(s.job.remaining)+' s';$('job-progress').style.width=(1-s.job.remaining/s.job.duration)*100+'%';}}
function mission(){
  const p=state.player;
  if(!p.level)return {title:'I primi passi',desc:'Raccogli semi e gocce, oppure sconfiggi una muffa, per raggiungere il livello 1.',label:'Esperienza',value:p.xp,goal:xpNeeded(0),hint:'Al livello 1: bosco, alberi e Falegnameria.'};
  if(p.level<5&&!state.stations.find(s=>s.id==='taglialegna').level)return {title:'Il primo laboratorio',desc:'Entra nel bosco, raccogli legno dagli alberi e costruisci la Falegnameria.',label:'Legno raccolto',value:state.bag.wood,goal:6,hint:'Servono 6 legno e 3 semi. Apri Officina per costruire.'};
  if(p.level<5)return {title:p.level<3?'Verso la cava':'Il sentiero del ferro',desc:p.level<3?'Raccogli, produci e difenditi per arrivare al livello 3 e aprire la cava.':'Costruisci lo Spaccapietre e raggiungi il livello 5 per aprire la Valle del ferro.',label:'Livello di Fragolina',value:p.level,goal:p.level<3?3:5,hint:'Le officine migliorano usando i materiali lavorati.'};
  if(state.rescued)return {title:'Una squadra speciale',desc:'Carota è libero ed è il tuo aiutante. Apri la sua scheda per assegnargli un lavoro fisso.',label:'Missione principale',value:1,goal:1,hint:state.carrotStatus||'Carota è al tuo fianco.'};
  const guards=state.enemies.filter(e=>e.guard&&e.defeats>0).length;
  return {title:'Salva Carota!',desc:!game.guardsDefeated()?'Carota è nella prigione del castello del ferro. Entra dalla porta a sud e sconfiggi le due guardie.':!state.tools.hacksaw?'Le guardie sono sconfitte! Produci il Seghetto per metallo nella Fucina.':'Raggiungi le sbarre della prigione e premi Usa per liberare Carota.',label:'Guardie sconfitte',value:guards,goal:2,hint:state.rescuing?`Taglio delle sbarre: ${Math.floor(state.rescueProgress)} / 5 s`:'Seghetto: 3 lingotti, 2 assi e 1 blocco.'};
}
let workshopSignature='';
function updateHUD(){
  const p=state.player,max=maxHealth(p.level),isSafe=game.safe(),zone=ZONES.find(z=>p.x>=z.min&&p.x<z.max)||ZONES[0];
  document.querySelectorAll('[data-resource]').forEach(el=>{el.textContent=state.bag[el.dataset.resource];});
  $('bag-total').textContent=Object.values(state.bag).reduce((a,b)=>a+b,0);
  $('profile-level').textContent=$('level-text').textContent='LV.'+p.level;
  $('player-stats').textContent=`${max} freschezza · ${punchDamage(p.level).toFixed(1)} forza`;
  $('xp-text').textContent=p.level===20?'MAX':`${p.xp} / ${xpNeeded(p.level)} XP`;$('xp-bar').style.width=(p.level===20?100:p.xp/xpNeeded(p.level)*100)+'%';
  $('health-text').textContent=`${Math.ceil(p.health)} / ${max}`;$('health-bar').style.width=p.health/max*100+'%';$('health-bar').style.background=p.health/max>.5?'#91ae77':p.health/max>.25?'#c9a36b':'#cc8264';
  $('zone-title').textContent=isSafe?'Il frigorifero':zone.name;$('zone-caption').textContent=isSafe?'Casa, dolce casa.':`Zona livello ${zone.level}`;
  $('zone-badge').classList.toggle('danger',!isSafe);$('zone-symbol').textContent=isSafe?'❄':'☀';$('status-title').textContent=isSafe?'Al sicuro':zone.name;$('status-detail').textContent=isSafe?'Il tuo piccolo rifugio':'La freschezza diminuisce';
  $('save-note').textContent=state.storageAvailable?'Salvataggio sul dispositivo':'Progressi solo per questa sessione';
  document.querySelectorAll('[data-unlock]').forEach(el=>el.classList.toggle('unlocked',p.level>=Number(el.dataset.unlock)));
  const m=mission();$('mission-title').textContent=m.title;$('mission-desc').textContent=m.desc;$('mission-label').textContent=m.label;$('mission-count').textContent=`${Math.min(m.value,m.goal)} / ${m.goal}`;$('mission-progress').style.width=Math.min(100,m.value/m.goal*100)+'%';$('mission-hint').textContent=m.hint;
  $('quest-pill').textContent=p.level>=5?(state.rescued?'🥕 Carota è nella squadra':'★ Missione: salva Carota'):'Prossima zona: '+(p.level<1?'bosco · LV.1':p.level<3?'cava · LV.3':'ferro · LV.5');
  $('carrot-open').hidden=!state.rescued;$('tool-indicator').hidden=!state.tools.hacksaw;
  const nearby=isSafe&&game.nearestStation(),node=game.nearestNode(),prison=!state.rescued&&distance(p,{x:PRISON.x,y:735})<150;
  $('interact').hidden=!nearby&&!node&&!prison;
  if(nearby)$('interact').lastElementChild.textContent=`Apri ${nearby.name}${p.level<nearby.required?' · bloccata LV.'+nearby.required:''}`;
  else if(prison)$('interact').lastElementChild.textContent=state.rescuing?'Taglio sbarre in corso…':'Libera Carota';
  else if(node)$('interact').lastElementChild.textContent=p.level<RESOURCE_UNLOCK[node.type]?`Sblocca al livello ${RESOURCE_UNLOCK[node.type]}`:`Raccogli ${RESOURCE_NAMES[node.type]}`;
  $('touch-interact').classList.toggle('available',!!nearby||!!node||prison);
  $('interaction-hint').hidden=true;
  if($('workshop').open){const signature=JSON.stringify({level:p.level,bag:state.bag,stations:state.stations.map(s=>[s.level,s.job?.output||null]),safe:isSafe,tool:state.tools.hacksaw,id:selectedStation});if(signature!==workshopSignature){workshopSignature=signature;renderWorkshop();}updateJob();}
  if($('carrot-dialog').open)updateCarrot();
  renderMap();
}
function renderMap(){
  const c=$('minimap'),ctx=c.getContext('2d'),sx=c.width/WORLD.w,sy=c.height/WORLD.h;
  ctx.clearRect(0,0,c.width,c.height);ZONES.forEach(z=>{ctx.fillStyle=state.player.level>=z.level?z.color:'#d0d2c4';ctx.fillRect(z.min*sx,0,(z.max-z.min)*sx,c.height);if(state.player.level<z.level){ctx.fillStyle='#808b77';ctx.font='7px sans-serif';ctx.textAlign='center';ctx.fillText('LV.'+z.level,(z.min+z.max)/2*sx,c.height/2);}});
  ctx.fillStyle='#bdd5bb';ctx.fillRect(140*sx,170*sy,660*sx,790*sy);ctx.strokeStyle='#8da887';ctx.lineWidth=1;ctx.strokeRect(140*sx,170*sy,660*sx,790*sy);
  ctx.fillStyle='#899c92';ctx.fillRect(4250*sx,350*sy,770*sx,900*sy);
  ctx.fillStyle='#a77355';state.enemies.filter(e=>e.health>0).forEach(e=>{ctx.beginPath();ctx.arc(e.x*sx,e.y*sy,e.guard?1.7:1,0,Math.PI*2);ctx.fill();});
  if(state.player.level>=5&&!state.rescued){ctx.fillStyle='#e4a75e';ctx.fillRect(PRISON.x*sx-2,PRISON.y*sy-2,4,4);}
  ctx.beginPath();ctx.arc(state.player.x*sx,state.player.y*sy,3,0,Math.PI*2);ctx.fillStyle='#e16c56';ctx.fill();ctx.strokeStyle='#fff5de';ctx.stroke();
}
function updateCarrot(){
  $('carrot-status').textContent=state.carrotStatus||'Al tuo fianco';
  document.querySelectorAll('[data-carrot-job]').forEach(button=>{const job=button.dataset.carrotJob,station=state.stations.find(s=>s.id===job);button.disabled=!state.rescued||(station?!station.level:RESOURCE_UNLOCK[job]!==undefined&&state.player.level<RESOURCE_UNLOCK[job]);button.setAttribute('aria-pressed',String(state.carrotJob===job));});
}
$('station-tabs').addEventListener('click',e=>{const tab=e.target.closest('[data-station]');if(tab){selectedStation=tab.dataset.station;renderWorkshop();}});
$('station-tabs').addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const tabs=[...$('station-tabs').querySelectorAll('button')];let index=tabs.findIndex(t=>t.dataset.station===selectedStation);index=e.key==='Home'?0:e.key==='End'?tabs.length-1:(index+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;selectedStation=tabs[index].dataset.station;renderWorkshop();tabs[index].focus();});
$('upgrade').onclick=()=>{game.upgrade(selectedStation);renderWorkshop();updateHUD();};$('process').onclick=()=>{game.process(selectedStation);renderWorkshop();};$('craft-saw').onclick=()=>{game.craftSaw();renderWorkshop();};
$('workshop-open').onclick=()=>openWorkshop();$('close-workshop').onclick=()=>closeDialog('workshop');
$('bag-open').onclick=()=>{if(!state.paused){openDialog('bag-dialog');updateHUD();}};$('close-bag').onclick=()=>closeDialog('bag-dialog');
$('quest-pill').onclick=()=>{const m=mission();$('quest-current-title').textContent=m.title;$('quest-current-description').textContent=m.desc;$('quest-current-hint').textContent=m.hint;openDialog('quest-dialog');};$('close-quest').onclick=()=>closeDialog('quest-dialog');
$('carrot-open').onclick=()=>{openDialog('carrot-dialog');updateCarrot();};$('close-carrot').onclick=()=>closeDialog('carrot-dialog');
$('carrot-jobs').addEventListener('click',e=>{const b=e.target.closest('[data-carrot-job]');if(b){game.assignCarrot(b.dataset.carrotJob);updateCarrot();}});
$('help').onclick=()=>pause(true);$('pause').onclick=()=>pause(!state.paused);$('resume').onclick=$('close-menu').onclick=()=>pause(false);
$('menu').addEventListener('cancel',e=>{e.preventDefault();pause(false);});$('menu').addEventListener('close',()=>{state.paused=false;clearInput();$('pause').textContent='Ⅱ';});
$('home').onclick=()=>{game.home();updateHUD();};$('interact').onclick=()=>game.interact();
$('reset').onclick=()=>{$('reset-confirm').hidden=false;$('confirm-reset').focus();};$('cancel-reset').onclick=()=>{$('reset-confirm').hidden=true;};
$('confirm-reset').onclick=()=>{game.reset();$('reset-confirm').hidden=true;pause(false);updateHUD();};
$('expand').onclick=()=>{expanded=!expanded;document.body.classList.toggle('play-mode',expanded);$('expand').textContent=expanded?'⛶ Riduci':'⛶ Espandi';$('expand').setAttribute('aria-pressed',String(expanded));requestAnimationFrame(()=>view?.resize());};
canvas.addEventListener('pointerdown',e=>{if(state.paused||anyDialog()||!view||e.button>0)return;canvas.focus({preventScroll:true});const point=view.pick(e.clientX,e.clientY);if(point)game.navigate(point.x,point.y);});
window.addEventListener('keydown',e=>{
  if(e.ctrlKey||e.metaKey||e.altKey||e.target.closest?.('input,select,textarea,[contenteditable=true]'))return;
  const k=e.key.toLowerCase();
  if(k==='escape'){if(anyDialog()&&!$('menu').open)return;e.preventDefault();pause(!state.paused);return;}
  if(anyDialog()||state.paused)return;
  if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright',' '].includes(k)){if(k===' '&&e.target.tagName==='BUTTON')return;e.preventDefault();keys.add(k);if(k===' '&&!e.repeat)game.jump();}
  if(k==='q'){e.preventDefault();if(!e.repeat)game.punch();}if(k==='e'&&!e.repeat)game.interact();
});
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
window.addEventListener('blur',()=>{game.save();pause(true);});document.addEventListener('visibilitychange',()=>{if(document.hidden){game.save();pause(true);}});window.addEventListener('pagehide',()=>game.save());
const joystick=$('joystick');
function updateStick(e){const r=joystick.getBoundingClientRect(),max=r.width*.31,dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2,length=Math.hypot(dx,dy),scale=length>max?max/length:1;stick.x=dx*scale/max;stick.y=dy*scale/max;if(length<6){stick.x=0;stick.y=0;}$('joystick-knob').style.transform=`translate(${dx*scale}px,${dy*scale}px)`;}
joystick.addEventListener('pointerdown',e=>{e.preventDefault();if(joystickPointer!==null||state.paused||anyDialog())return;joystickPointer=e.pointerId;joystick.setPointerCapture(e.pointerId);updateStick(e);});
joystick.addEventListener('pointermove',e=>{if(e.pointerId===joystickPointer){e.preventDefault();updateStick(e);}});
function releaseStick(e){if(e.pointerId===joystickPointer){joystickPointer=null;stick.x=0;stick.y=0;$('joystick-knob').style.transform='translate(0,0)';}}
['pointerup','pointercancel','lostpointercapture'].forEach(type=>joystick.addEventListener(type,releaseStick));
for(const [id,action] of [['touch-punch',()=>game.punch()],['touch-jump',()=>game.jump()],['touch-interact',()=>game.interact()]])$(id).addEventListener('pointerdown',e=>{e.preventDefault();if(!anyDialog()&&!state.paused)action();});
function pollGamepad(){
  const pads=navigator.getGamepads?.()||[],pad=[...pads].find(p=>p?.connected&&p.mapping==='standard');$('controller-badge').hidden=!pad;
  if(!pad){gamepadButtons=[];return{x:0,y:0};}
  const pressed=pad.buttons.map(b=>b.pressed),edge=i=>pressed[i]&&!gamepadButtons[i];
  if(edge(9))pause(!state.paused);
  if(edge(1)&&anyDialog()){const dialog=document.querySelector('dialog[open]');if(dialog.id==='menu')pause(false);else closeDialog(dialog.id);}
  if(!anyDialog()&&!state.paused){if(edge(0))game.jump();if(edge(2))game.punch();if(edge(3))game.interact();}
  gamepadButtons=pressed;
  let x=(pad.axes[0]||0)+(pressed[15]?1:0)-(pressed[14]?1:0),y=(pad.axes[1]||0)+(pressed[13]?1:0)-(pressed[12]?1:0);const len=Math.hypot(x,y);
  if(len<.18)return{x:0,y:0};const value=clamp((len-.18)/.82,0,1);return{x:x/len*value,y:y/len*value};
}
$('retry-graphics').onclick=()=>location.reload();
try{view=createWorldView(canvas,game);}catch(error){console.error('Grafica 3D non disponibile:',error);$('graphics-error').hidden=false;state.paused=true;}
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();state.paused=true;game.save();$('graphics-error').hidden=false;});
new ResizeObserver(()=>view?.resize()).observe(canvas);
function frame(time){
  const dt=Math.min((time-lastTime)/1000,.05);lastTime=time;const pad=pollGamepad();
  let x=stick.x+pad.x+(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0),y=stick.y+pad.y+(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0);
  if(anyDialog())x=y=0;
  const input=view?view.direction(x,y):{x:0,y:0};game.update(dt,input);
  renderTime+=dt;hudTime+=dt;
  if(view&&renderTime>=1/45){view.render(renderTime);renderTime=0;}
  if(hudTime>=.12){updateHUD();hudTime=0;}
  requestAnimationFrame(frame);
}
updateHUD();requestAnimationFrame(frame);setTimeout(()=>notify('Ciao Fragolina! Parti dal livello 0. Raccogli e difenditi per aprire il bosco.'),900);
