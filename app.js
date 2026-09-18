
window.addEventListener('error',e=>{try{const b=document.getElementById('jsError');if(b){const loc=e.filename?` (${e.filename.split('/').pop()}:${e.lineno}:${e.colno})`:' (abre esta página con un servidor local, no con doble clic, para ver el detalle)';b.textContent='Error de JavaScript: '+e.message+loc;b.style.display='block';}}catch(_){} });

const safeStorage={
 get(k,f=null){try{const v=localStorage.getItem(k);return v===null?f:v}catch(e){return f}},
 set(k,v){try{localStorage.setItem(k,v)}catch(e){}}
};
function safeJSON(k,f){try{const v=safeStorage.get(k,null);return v?JSON.parse(v):f}catch(e){return f}}
const BASE_ITEMS=[
 {id:'coin',name:'Ficha VIP',icon:'🪙',value:100,price:100,rarity:'common'},
 {id:'dice',name:'Dado de Oro',icon:'🎲',value:250,price:250,rarity:'common'},
 {id:'crown',name:'Corona Real',icon:'👑',value:500,price:500,rarity:'common'},
 {id:'ruby',name:'Gema Rubí',icon:'♦️',value:900,price:900,rarity:'rare'},
 {id:'ring',name:'Anillo Diamante',icon:'💍',value:1500,price:1500,rarity:'rare'},
 {id:'trophy',name:'Trofeo Royale',icon:'🏆',value:2500,price:2500,rarity:'epic'},
 {id:'imperial',name:'Corona Imperial',icon:'👑',value:4000,price:4000,rarity:'epic'},
 {id:'jackpot',name:'Jackpot Dorado',icon:'💰',value:7500,price:7500,rarity:'legendary'},
 {id:'sapphire',name:'Sapphire Core',icon:'🔷',value:12000,price:12000,rarity:'legendary'},
 {id:'dragon',name:'Dragon Relic',icon:'🐉',value:25000,price:25000,rarity:'legendary'},
 {id:'phantom',name:'Phantom Gem',icon:'🟣',value:50000,price:50000,rarity:'mythic'},
 {id:'void',name:'Void Crown',icon:'🪐',value:100000,price:100000,rarity:'mythic'},
 {id:'celestial',name:'Celestial Knife',icon:'✨',value:250000,price:250000,rarity:'mythic'},
 {id:'sovereign',name:'Sovereign Dragon',icon:'🌌',value:600000,price:600000,rarity:'mythic'},
 {id:'eternal',name:'Eternal Artifact',icon:'💠',value:1500000,price:1500000,rarity:'legendary'}
];
let ALL_ITEMS=BASE_ITEMS.slice();
const DAILY_SPECIAL_ITEM={id:'daily-phantom',name:'Daily Phantom',icon:'👻',value:15000,price:0,rarity:'mythic',special:true};
if(!ALL_ITEMS.some(x=>x.id===DAILY_SPECIAL_ITEM.id))ALL_ITEMS.push(DAILY_SPECIAL_ITEM);

// GLOBAL ECONOMY RESET: reset existing balances once for the new season.
// Change the version string whenever you want to force another full balance reset.
const ECONOMY_RESET_VERSION='2026-09-18-final-balance-02';
if(safeStorage.get('royalEconomyResetVersion')!==ECONOMY_RESET_VERSION){
  safeStorage.set('royalCoins','0');
  safeStorage.set('royalEconomyResetVersion',ECONOMY_RESET_VERSION);
}
let coins=Number(safeStorage.get('royalCoins','0')||0);
let inv=safeJSON('royalInventory',{});
let spinning=false, chipValue=5, activeBets=[], wheelRotation=0, history=safeJSON('royalHistory',[]), lastResolvedBets=[];
// Estado de la ruleta por rondas. Debe existir antes de cualquier función que lo consulte.
let rouletteRoundOpen=false, rouletteRoundSkipped=false, rouletteRoundSeconds=15, rouletteRoundEndsAt=0, rouletteRoundId=0, rouletteRoundTimer=null;
let rouletteProbNumbers=[], rouletteMegaNumbers=[], rouletteBonusMeta={mega:false,fills:0};
const WHEEL_ORDER=[0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];
const RED_NUMBERS=new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
function colorOf(n){return n===0?'green':RED_NUMBERS.has(n)?'red':'black';}
function hexOf(c){return c==='red'?'#b6293c':c==='black'?'#11151e':'#1f8f63';}
function save(){safeStorage.set('royalCoins',String(coins));safeStorage.set('royalInventory',JSON.stringify(inv));}
function toast(t){const x=document.getElementById('toast');if(!x)return;x.textContent=t;x.classList.add('show');clearTimeout(window.__toast);window.__toast=setTimeout(()=>x.classList.remove('show'),2000);}
function update(){document.querySelectorAll('#coins,#farmCoins,#crashCoins,#slotsCoins').forEach(e=>e.textContent=Math.floor(coins).toLocaleString());renderInventory();renderShop();renderFarm();renderCrash();}
function addItem(id,n=1){inv[id]=(inv[id]||0)+n;}
function removeItem(id,n=1){inv[id]=Math.max(0,(inv[id]||0)-n);if(!inv[id])delete inv[id];}
function buildWheel(){
 const wheelEl=document.getElementById('wheel');if(!wheelEl)return;
 const d=360/37,c=215;
 const polar=(r,a)=>[c+r*Math.cos(a*Math.PI/180),c+r*Math.sin(a*Math.PI/180)];
 let pockets='',labels='';
 WHEEL_ORDER.forEach((n,i)=>{
  const a0=-90+i*d+.6,a1=-90+(i+1)*d-.6,mid=-90+(i+.5)*d;
  const p0=polar(86,a0),p1=polar(86,a1),q0=polar(191,a0),q1=polar(191,a1);
  const path=`M ${p0[0]} ${p0[1]} L ${q0[0]} ${q0[1]} A 191 191 0 0 1 ${q1[0]} ${q1[1]} L ${p1[0]} ${p1[1]} A 86 86 0 0 0 ${p0[0]} ${p0[1]} Z`;
  const tp=polar(164,mid);
  const rot=mid+90;
  pockets+=`<path class="pocket ${colorOf(n)}" data-pocket="${n}" d="${path}"></path>`;
  labels+=`<text class="num ${n===0?'zero':''}" x="${tp[0]}" y="${tp[1]}" text-anchor="middle" dominant-baseline="middle" transform="rotate(${rot} ${tp[0]} ${tp[1]})">${n}</text>`;
 });
 const bolts=[0,60,120,180,240,300].map(a=>{const p=polar(49,a);return `<circle cx="${p[0]}" cy="${p[1]}" r="4" fill="#737981" stroke="#d5b257" stroke-width="1.2"/>`;}).join('');
 const svg=`<svg class="wheelSvg" viewBox="0 0 430 430">
 <defs>
  <radialGradient id="metal"><stop stop-color="#5c6067"/><stop offset=".55" stop-color="#292e36"/><stop offset="1" stop-color="#0e1116"/></radialGradient>
  <radialGradient id="wood"><stop stop-color="#8a6425"/><stop offset=".5" stop-color="#4b3210"/><stop offset="1" stop-color="#1e1306"/></radialGradient>
  <radialGradient id="hub"><stop stop-color="#efd77e"/><stop offset=".45" stop-color="#aa7c2b"/><stop offset="1" stop-color="#40300f"/></radialGradient>
  <radialGradient id="silver"><stop stop-color="#eef3f6"/><stop offset=".55" stop-color="#aeb5bd"/><stop offset="1" stop-color="#565c64"/></radialGradient>
  <linearGradient id="redPocket" x1="0" x2="1"><stop stop-color="#d7485a"/><stop offset=".6" stop-color="#a51e34"/><stop offset="1" stop-color="#65131f"/></linearGradient>
  <linearGradient id="blackPocket" x1="0" x2="1"><stop stop-color="#39404b"/><stop offset=".55" stop-color="#151921"/><stop offset="1" stop-color="#080a0e"/></linearGradient>
  <linearGradient id="greenPocket" x1="0" x2="1"><stop stop-color="#2baa7f"/><stop offset=".5" stop-color="#176b4d"/><stop offset="1" stop-color="#073b2b"/></linearGradient>
  <filter id="glowFire"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <filter id="glowMega"><feGaussianBlur stdDeviation="2.8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <filter id="glowWin"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
 </defs>
 <circle class="outer" cx="215" cy="215" r="208"/>
 <circle class="wood" cx="215" cy="215" r="198"/>
 <circle class="track" cx="215" cy="215" r="192"/>
 ${pockets}
 <circle cx="215" cy="215" r="87" fill="#090c11" stroke="#d1a43e" stroke-width="5"/>
 <circle class="hub1" cx="215" cy="215" r="68"/>
 <circle class="hub2" cx="215" cy="215" r="55"/>
 ${bolts}
 <circle class="hub3" cx="215" cy="215" r="15"/>
 ${labels}
 <circle cx="215" cy="215" r="184" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="2"/>
 </svg>`;
 const fx=document.getElementById('wheelFx'),tag=document.getElementById('wheelTag');
 const ball=document.getElementById('rouletteBall'); // capturar la bola ANTES de sobreescribir el HTML de la rueda, o se pierde
 wheelEl.innerHTML=svg+(fx?fx.outerHTML:'<div class="wheelFx" id="wheelFx"></div>')+(tag?tag.outerHTML:'<div class="wheelTag" id="wheelTag"></div>');
 wheelEl.style.background='';
 if(ball){wheelEl.parentElement.appendChild(ball);} // la sacamos de #wheel para que gire de forma independiente de la rotación de la rueda
 else{const b=document.createElement('div');b.className='rouletteBall';b.id='rouletteBall';wheelEl.parentElement.appendChild(b);}
 requestAnimationFrame(ballRestPosition); // colocarla ya en su sitio de reposo, bajo el puntero
}
function updateRouletteRoundUI(){
 const panel=byId('rouletteRoundPanel'),timer=byId('rouletteRoundTimer'),status=byId('rouletteRoundStatus'),hint=byId('rouletteRoundHint'),bar=byId('rouletteRoundProgress'),spin=byId('spin');
 if(!panel)return;
 const left=Math.max(0,Math.ceil((rouletteRoundEndsAt-Date.now())/1000));
 if(timer)timer.textContent=rouletteRoundOpen?left+'s':'GIRO';
 if(bar)bar.style.transform=`scaleX(${rouletteRoundOpen?Math.max(0,left/rouletteRoundSeconds):0})`;
 if(rouletteRoundOpen){panel.classList.remove('locked');if(status)status.textContent=rouletteRoundSkipped?'RONDA SALTADA':'APUESTAS ABIERTAS';if(hint)hint.textContent=rouletteRoundSkipped?'No entrarás en esta ronda. La ruleta seguirá cuando termine el contador.':'Elige tus apuestas. Puedes pintar y guardar los Fire Numbers antes del giro.';if(spin){spin.disabled=true;spin.textContent='ESPERANDO FIN DE RONDA...';}}
 else {panel.classList.add('locked');if(status)status.textContent='RULETA GIRANDO';if(hint)hint.textContent='Apuestas cerradas. La bola está entrando en la ronda...';if(spin){spin.disabled=true;spin.textContent='RULETA EN MARCHA...';}}
 updateRouletteBetActionButtons();
}
function persistFirePreview(){
 safeStorage.set('royalFirePreview',JSON.stringify({roundId:rouletteRoundId,numbers:rouletteProbNumbers,mega:rouletteMegaNumbers,savedAt:Date.now()}));
 clearFireNumbersOnBoard();
 const h=byId('rouletteRoundHint');if(h){h.textContent='Fire Numbers pintados y guardados para esta ronda.';h.classList.add('firePreviewSaved');}
 toast('🔥 Fire Numbers guardados.');
}
function skipRouletteRound(){
 if(!rouletteRoundOpen)return;
 rouletteRoundSkipped=true;activeBets=[];renderActiveBets();renderBoardBadges();updateRouletteRoundUI();saveRouletteRoundState();
 toast('Ronda saltada. No se realizará ninguna apuesta.');
}
function updateRouletteBetActionButtons(){
 const preBtn=byId('preBetRoulette'),enterBtn=byId('enterRouletteRound');
 const hasBets=activeBets.length>0;
 if(preBtn)preBtn.disabled=!hasBets;
 if(enterBtn)enterBtn.disabled=!(rouletteRoundOpen&&!rouletteRoundSkipped&&hasBets);
}
function savePreRouletteBet(){
 if(!activeBets.length)return toast('Pinta primero una apuesta en el tablero para guardarla como preapuesta.');
 safeStorage.set('royalPreBet',JSON.stringify(activeBets));
 toast('📌 Preapuesta guardada. Se aplicará automáticamente al empezar la próxima ronda.');
}
function applyPreRouletteBet(){
 const pre=safeJSON('royalPreBet',null);
 if(Array.isArray(pre)&&pre.length){
  const total=pre.reduce((s,b)=>s+Number(b.amount||0),0);
  if(total>0&&total<=coins){
   activeBets=pre.map(b=>({...b}));
   toast('📌 Preapuesta aplicada a esta ronda.');
  }else if(total>coins){
   toast('No se pudo aplicar la preapuesta: monedas insuficientes.');
  }
  safeStorage.set('royalPreBet','null');
  renderActiveBets();
  renderBoardBadges();
 }
}
function enterRouletteRound(){
 if(spinning)return;
 if(!rouletteRoundOpen||rouletteRoundSkipped)return toast('No hay una ronda abierta para entrar ahora mismo.');
 if(!activeBets.length)return toast('Añade al menos una apuesta antes de entrar en la ronda.');
 clearInterval(rouletteRoundTimer);
 closeRouletteBetting();
 toast('✅ Apuesta confirmada. Entrando en la ronda...');
}
function beginRouletteRound(){
 clearWheelSpecials();
 clearFireNumbersOnBoard();
 clearInterval(rouletteRoundTimer);
 rouletteRoundOpen=true;rouletteRoundSkipped=false;rouletteRoundSeconds=15;rouletteRoundEndsAt=Date.now()+rouletteRoundSeconds*1000;
 rouletteRoundId=Date.now();
 applyPreRouletteBet();
 prepareRouletteBonus();
 clearFireNumbersOnBoard();
 persistFirePreview();
 saveRouletteRoundState();
 updateRouletteRoundUI();
 rouletteRoundTimer=setInterval(()=>{
  if(!rouletteRoundOpen){clearInterval(rouletteRoundTimer);return;}
  updateRouletteRoundUI();
  if(Date.now()>=rouletteRoundEndsAt){clearInterval(rouletteRoundTimer);closeRouletteBetting();}
 },250);
}
function closeRouletteBetting(){
 if(!rouletteRoundOpen)return;rouletteRoundOpen=false;updateRouletteRoundUI();saveRouletteRoundState();
 const bets=rouletteRoundSkipped?[]:activeBets;
 setTimeout(()=>spinRoulette(bets,true),450);
}
function restoreRouletteRound(){
 const saved=safeJSON('royalRouletteRound',null);
 if(saved&&saved.open&&saved.endsAt>Date.now()&&Array.isArray(saved.fire)){
  rouletteRoundId=Number(saved.id||Date.now());rouletteRoundOpen=true;rouletteRoundSkipped=!!saved.skipped;rouletteRoundEndsAt=Number(saved.endsAt);rouletteRoundSeconds=Math.max(15,Math.ceil((rouletteRoundEndsAt-(Date.now()-15000))/1000));rouletteProbNumbers=saved.fire.map(Number);rouletteMegaNumbers=Array.isArray(saved.mega)?saved.mega.map(Number):[];renderRouletteProb();clearFireNumbersOnBoard();updateRouletteRoundUI();rouletteRoundTimer=setInterval(()=>{updateRouletteRoundUI();if(Date.now()>=rouletteRoundEndsAt){clearInterval(rouletteRoundTimer);closeRouletteBetting();}},250);return true;
 }
 return false;
}

function prepareRouletteBonus(){
 // Fire Numbers: menos frecuentes para que la ronda sea más chill.
 const count=Math.random()<0.84?1:2; // 1-2 especiales, normalmente solo 1
 const pool=[...Array(37).keys()];
 rouletteProbNumbers=[];while(rouletteProbNumbers.length<count){const n=pool[Math.floor(Math.random()*pool.length)];if(!rouletteProbNumbers.includes(n))rouletteProbNumbers.push(n);}
 // Mega Fire: evento raro, no debe aparecer continuamente.
 const megaChance=Math.random()<0.03;
 rouletteMegaNumbers=megaChance?pool.sort(()=>Math.random()-.5).slice(0,3):[];
 rouletteBonusMeta={mega:megaChance,fills:0};
 renderRouletteProb();
 clearFireNumbersOnBoard();
}
function renderRouletteProb(){
 const box=document.getElementById('probNumbers'),label=document.getElementById('probChanceLabel'),status=document.getElementById('megaStatus'); if(!box)return;
 box.innerHTML='';
 rouletteProbNumbers.forEach((n,i)=>{const x=document.createElement('span');x.className=`probNum ${colorOf(n)}`;x.textContent=n;x.style.animationDelay=i*55+'ms';box.appendChild(x);});
 if(rouletteMegaNumbers.length){rouletteMegaNumbers.forEach((n,i)=>{const x=document.createElement('span');x.className=`probNum ${colorOf(n)} mega`;x.textContent=n;x.style.animationDelay=(rouletteProbNumbers.length+i)*35+'ms';box.appendChild(x);});label.textContent='MEGA ACTIVADA · 3 numeros';status.className='megaStatus hot';status.textContent='🔥 Si la bola cae en uno de los 3 numeros MEGA, se activa el bonus especial.';}
 else {label.textContent=`${rouletteProbNumbers.length} numeros especiales`;status.className='megaStatus';status.textContent='En cada ronda aparece una cantidad pequeña de números especiales.';}
}
function showFireReveal(){
 const ov=document.getElementById('fireReveal'),box=document.getElementById('fireNums'),title=document.getElementById('fireTitle'),sub=document.getElementById('fireSub'),blast=document.getElementById('fireBlast');
 if(!ov||!box)return Promise.resolve();
 const nums=rouletteMegaNumbers.length?rouletteMegaNumbers:rouletteProbNumbers;
 title.textContent=rouletteMegaNumbers.length?'FIRE BLAST':'FIRE NUMBERS';
 sub.textContent=rouletteMegaNumbers.length?'Números especiales · mira cómo se encienden antes del giro':'Números especiales de esta tirada · ¡recuerda sus posiciones!';
 blast.textContent=rouletteMegaNumbers.length?'🔥 MEGA FIRE · BONIFICACIÓN ESPECIAL':'🔥 FIRE NUMBERS ACTIVADOS';
 box.innerHTML=nums.map((n,i)=>`<span class="fireNum ${colorOf(n)} ${rouletteMegaNumbers.length?'mega':''}" style="animation-delay:${i*120}ms">${n}</span>`).join('');
 ov.classList.add('show');
 // Más tiempo para identificar los Fire Numbers, sin bloquear el giro.
 const ms=rouletteMegaNumbers.length?5600:4800;
 return new Promise(resolve=>setTimeout(()=>{ov.classList.remove('show');setTimeout(resolve,100);},ms));
}
function clearFireNumbersOnBoard(){
 document.querySelectorAll('#rouletteTable .rtCell.fireMarked,#rouletteTable .rtCell.fireMegaMarked,.numBtn.fireMarked,.numBtn.fireMegaMarked').forEach(el=>{
  el.classList.remove('fireMarked','fireMegaMarked');
 });
}
function markFireNumbersOnBoard(){
 const nodes=document.querySelectorAll('.numBtn, #rouletteTable .rtCell[data-bet="straight"]');
 nodes.forEach(btn=>{
  const n=Number(btn.dataset.number ?? btn.dataset.numbers);
  btn.classList.remove('fireMarked','fireMegaMarked');
  if(rouletteMegaNumbers.includes(n)) btn.classList.add('fireMegaMarked');
  else if(rouletteProbNumbers.includes(n)) btn.classList.add('fireMarked');
 });
}
/* ===== Tablero de apuestas: helpers, render y persistencia (antes faltaban en el archivo) ===== */
const BET_LABELS={straight:'Pleno',split:'Caballo',corner:'Cuadro',street:'Calle',line:'Seisena',dozen:'Docena',column:'Columna',red:'Rojo',black:'Negro',even:'Par',odd:'Impar',low:'Falta (1-18)',high:'Pasa (19-36)'};
function betKey(el){return el.dataset.bet+'|'+el.dataset.numbers+'|'+(el.dataset.value||'');}
function betLabel(b){
 const name=BET_LABELS[b.type]||b.type;
 if(b.type==='straight')return name+' '+b.numbers[0];
 if(b.type==='dozen'||b.type==='column')return name+' '+b.value;
 if(b.type==='split'||b.type==='corner'||b.type==='street'||b.type==='line')return name+' '+b.numbers.join('/');
 return name;
}
function saveRouletteRoundState(){
 safeStorage.set('royalRouletteRound',JSON.stringify({
  id:rouletteRoundId,
  open:rouletteRoundOpen,
  skipped:rouletteRoundSkipped,
  endsAt:rouletteRoundEndsAt,
  fire:rouletteProbNumbers,
  mega:rouletteMegaNumbers
 }));
}
function initBoardEvents(){
 document.querySelectorAll('#rouletteTable [data-bet]').forEach(el=>{
  el.addEventListener('click',()=>{
   if(spinning)return;
   if(!rouletteRoundOpen||rouletteRoundSkipped)return toast('Las apuestas están cerradas para esta ronda.');
   const staked=activeBets.reduce((s,b)=>s+b.amount,0);
   if(staked+chipValue>coins)return toast('No tienes suficientes monedas.');
   const key=betKey(el);
   const existing=activeBets.find(b=>b.key===key);
   if(existing){existing.amount+=chipValue;}
   else{
    activeBets.push({
     key,
     type:el.dataset.bet,
     numbers:el.dataset.numbers.split(',').map(Number),
     payout:Number(el.dataset.payout),
     value:el.dataset.value||'',
     amount:chipValue
    });
   }
   renderActiveBets();
   renderBoardBadges();
  });
 });
}
function renderActiveBets(){
 const list=byId('activeBetsList');
 if(list){
  if(!activeBets.length){
   list.innerHTML='<span class="muted">Sin apuestas. Elige una ficha y toca una zona del tablero.</span>';
  }else{
   list.innerHTML=activeBets.map(b=>`<span class="betPill">${betLabel(b)} · ${b.amount.toLocaleString()} 🪙<button class="betRemove" data-remove-bet="${b.key}" title="Quitar apuesta">✕</button></span>`).join('');
   list.querySelectorAll('[data-remove-bet]').forEach(btn=>{
    btn.onclick=()=>{
     if(spinning)return;
     activeBets=activeBets.filter(b=>b.key!==btn.dataset.removeBet);
     renderActiveBets();
     renderBoardBadges();
    };
   });
  }
 }
 const total=activeBets.reduce((s,b)=>s+b.amount,0);
 const totalLabel=byId('totalStakeLabel');
 if(totalLabel)totalLabel.textContent='Total apostado: '+total.toLocaleString()+' 🪙';
 updateRouletteBetActionButtons();
}
function renderBoardBadges(){
 document.querySelectorAll('#rouletteTable [data-bet]').forEach(el=>{
  const bet=activeBets.find(b=>b.key===betKey(el));
  const badge=el.querySelector('.rtChipBadge');
  if(bet){
   el.classList.add('staked');
   if(badge)badge.textContent=bet.amount;
   else{
    const span=document.createElement('span');
    span.className='rtChipBadge';
    span.textContent=bet.amount;
    el.appendChild(span);
   }
  }else{
   el.classList.remove('staked');
   if(badge)badge.remove();
  }
 });
}
function renderHistory(){
 const row=byId('historyRow');
 if(!row)return;
 if(!history.length){row.innerHTML='<span class="muted">Sin tiradas todavía.</span>';return;}
 row.innerHTML=history.map(h=>`<span class="histBadge ${h.c}">${h.n}</span>`).join('');
}

window.addEventListener('resize',()=>{if(!spinning)ballRestPosition();});

async function spinRoulette(bets,autoRound=false){
 if(spinning)return;
 if(rouletteRoundOpen&&!autoRound)return toast('La ronda todavía está abierta. Espera a que cierre para lanzar la bola.');
 const safeBets=Array.isArray(bets)?bets:[];const total=safeBets.reduce((s,b)=>s+b.amount,0);
 if(!safeBets.length&&!autoRound)return toast('Añade al menos una apuesta.');
 if(total>coins)return toast('No tienes suficientes monedas.');
 spinning=true;rouletteLastStake=total;const snapshot=safeBets.map(b=>({...b}));coins-=total;save();const rr=byId('rouletteRoundPanel');if(rr)rr.classList.add('locked');const rs=byId('spin');if(rs){rs.disabled=true;rs.textContent='RULETA GIRANDO...';}byId('rouletteResult')?.replaceChildren();
 const winNumber=Math.floor(Math.random()*37),winColor=colorOf(winNumber),d=360/37,idx=WHEEL_ORDER.indexOf(winNumber),center=(idx+.5)*d,target=(360-center)%360,current=((wheelRotation%360)+360)%360,delta=(target-current+360)%360;
 const wheelStart=wheelRotation;wheelRotation+=delta+(9+Math.floor(Math.random()*3))*360;const wheelEnd=wheelRotation;
 clearFireNumbersOnBoard();
 try{
  // Esperamos al reveal antes de pintar el tablero. Las luces quedan fijadas durante TODO el giro.
  await showFireReveal();
 }catch(err){console.error('Fire reveal',err);}
 markFireNumbersOnBoard();
 showWheelSpecials();
 runRouletteSpin({winNumber,winColor,center,wheelStart,wheelEnd,snapshot,total});
}

/* --- Easing idéntico al cubic-bezier(.07,.84,.14,1) de la rueda, resuelto en JS --- */
function cubicBezierEase(x1,y1,x2,y2){
 const cx=t=>((1-3*x2+3*x1)*t+(3*x2-6*x1))*t*t+3*x1*t;
 const cy=t=>((1-3*y2+3*y1)*t+(3*y2-6*y1))*t*t+3*y1*t;
 return x=>{if(x<=0)return 0;if(x>=1)return 1;let lo=0,hi=1,t=x;for(let i=0;i<28;i++){t=(lo+hi)/2;if(cx(t)<x)lo=t;else hi=t;}return cy((lo+hi)/2);};
}


const EASE_SPIN=cubicBezierEase(.10,.72,.16,1);
const SPIN_MS=10500,BALL_TURNS=9.5,BALL_R_START=188,BALL_R_END=146;

function ballRestPosition(){
 // Coloca la bola en reposo justo bajo el puntero (arriba de la rueda), a escala real
 const wheel=document.getElementById('wheel'),ball=document.getElementById('rouletteBall');
 if(!wheel||!ball)return;
 const wrap=wheel.parentElement;
 const wr=wrap.getBoundingClientRect(),rr=wheel.getBoundingClientRect();
 if(!rr.width)return; // la rueda todavía no tiene layout (p.ej. página oculta); reintentar en el próximo frame
 const cx=rr.left-wr.left+rr.width/2,cy=rr.top-wr.top+rr.height/2;
 const scale=rr.width/430;
 ball.style.left=(cx+Math.cos(-Math.PI/2)*146*scale)+'px';
 ball.style.top=(cy+Math.sin(-Math.PI/2)*146*scale)+'px';
}
function runRouletteSpin(o){
 const wheel=document.getElementById('wheel'),ball=document.getElementById('rouletteBall');
 if(!wheel||!ball)return;
 const wrap=wheel.parentElement;
 const wr=wrap.getBoundingClientRect(),rr=wheel.getBoundingClientRect();
 const cx=rr.left-wr.left+rr.width/2,cy=rr.top-wr.top+rr.height/2;
 const scale=rr.width/430; // la rueda se dibuja en un SVG de 430x430 pero en móvil se muestra más pequeña (ver @media): escalamos el radio de la bola a su tamaño real
 const t0=performance.now(),duration=10500;
 const sweep=o.wheelEnd-o.wheelStart;
 const startA=-Math.PI/2+Math.PI*.78;
 const finalA=-Math.PI/2;
 const turns=9; // vueltas completas de más antes de posarse en el ángulo final
 const totalA=(finalA-startA)-Math.PI*2*turns; // ángulo total a recorrer en UN solo sentido, sin saltos ni cambios de dirección
 const angleEase=p=>1-Math.pow(1-p,2.4); // arranca muy rápido y frena de forma continua hasta pararse justo en p=1 (como una bola real perdiendo impulso por fricción)
 const put=(a,r)=>{
   ball.style.left=(cx+Math.cos(a)*r*scale)+'px';
   ball.style.top=(cy+Math.sin(a)*r*scale)+'px';
 };
 wheel.style.transition='none';
 ball.classList.add('active');
 const frame=now=>{
   const p=Math.min(1,(now-t0)/duration);
   const ew=EASE_SPIN(p);
   wheel.style.transform=`rotate(${o.wheelStart+sweep*ew}deg)`;

   const a=startA+totalA*angleEase(p); // ángulo: una única curva continua, siempre en el mismo sentido
   let r;
   if(p<.80){
     const q=p/.80;
     r=188+Math.sin(q*Math.PI*6)*1.2*(1-q); // temblor en la pista exterior
   }else{
     const q=(p-.80)/.20;
     const e=q*q*(3-2*q);
     r=188+(146-188)*e+Math.sin(q*Math.PI*7)*4*Math.pow(1-q,1.4); // caída en espiral hacia el aro de números
   }
   put(a,r);
   if(p<1){requestAnimationFrame(frame);return;}
   wheel.style.transform=`rotate(${o.wheelEnd}deg)`;
   wheel.style.transition='';
   put(finalA,146);
   ball.classList.remove('active');
   finishSpin(o.winNumber,o.winColor,o.snapshot,o.total);
 };
 requestAnimationFrame(frame);
}

/* --- Especiales / MEGA pintados sobre los sectores reales de WHEEL_ORDER --- */
function wheelSpecialsGradient(){
 const d=360/37,stops=[];
 for(let i=0;i<37;i++){
  const n=WHEEL_ORDER[i];
  const col=rouletteMegaNumbers.includes(n)?'rgba(255,62,165,.25)':rouletteProbNumbers.includes(n)?'rgba(245,196,81,.22)':'rgba(0,0,0,0)';
  stops.push(`${col} ${i*d}deg ${(i+1)*d}deg`);
 }
 return `conic-gradient(${stops.join(',')})`;
}
function clearWheelSpecials(){
 const fx=document.getElementById('wheelFx'),tag=document.getElementById('wheelTag');
 if(fx){fx.className='wheelFx';fx.style.background='';}
 if(tag){tag.className='wheelTag';tag.textContent='';}
 document.querySelectorAll('#wheel .pocket').forEach(p=>p.classList.remove('fireMarked','megaMarked'));
}
function showWheelSpecials(){
 clearWheelSpecials();
 const fx=document.getElementById('wheelFx'),tag=document.getElementById('wheelTag');
 const isMega=rouletteMegaNumbers.length>0;
 rouletteProbNumbers.forEach(n=>document.querySelector(`#wheel .pocket[data-pocket="${n}"]`)?.classList.add('fireMarked'));
 rouletteMegaNumbers.forEach(n=>document.querySelector(`#wheel .pocket[data-pocket="${n}"]`)?.classList.add('megaMarked'));
 if(fx){fx.style.background=wheelSpecialsGradient();fx.className='wheelFx on '+(isMega?'fxMega':'fxSpecial');}
 if(isMega&&tag){tag.textContent='MEGA FIRE';tag.className='wheelTag show';}
 // No limpiar aquí: los Fire/Mega deben permanecer visibles durante TODO el giro.
 // Se limpian al comenzar la siguiente ronda.
}
function markMegaNumbersOnBoard(){
 document.querySelectorAll('.rtCell[data-bet="straight"]').forEach(el=>{
  el.classList.toggle('megaResultHit',rouletteMegaNumbers.includes(Number(el.dataset.numbers)));
 });
}
function clearMegaNumbersOnBoard(){
 document.querySelectorAll('.rtCell.megaResultHit').forEach(el=>el.classList.remove('megaResultHit'));
}function markWinningNumberOnBoard(n){
 document.querySelectorAll('#rouletteTable .rtCell[data-bet="straight"]').forEach(el=>{
  el.classList.toggle('winningResult',Number(el.dataset.numbers)===Number(n));
 });
}
function clearWinningNumberOnBoard(){
 document.querySelectorAll('#rouletteTable .rtCell.winningResult').forEach(el=>el.classList.remove('winningResult'));
}

function showMegaFireResultFx(){
 const box=document.getElementById('rouletteResult');
 if(!box)return;
 box.classList.add('fireResultActive');
 const glyphs=['🔥','✨','⚡'],sparks=[];
 for(let i=0;i<9;i++){
  const s=document.createElement('span');
  s.className='fireResultSpark';
  s.textContent=glyphs[Math.floor(Math.random()*glyphs.length)];
  s.style.left=(6+Math.random()*86)+'%';
  s.style.setProperty('--sx',(Math.random()*44-22)+'px');
  s.style.animationDelay=(Math.random()*380)+'ms';
  box.appendChild(s);sparks.push(s);
 }
 setTimeout(()=>{box.classList.remove('fireResultActive');sparks.forEach(s=>s.remove());},3000);
}
async function finishSpin(n,c,bets,total){
 let payout=0,winTxt=[],loseTxt=[];
 bets.forEach(b=>{
  if(b.numbers.includes(n)){const ret=b.amount*(1+Number(b.payout));payout+=ret;winTxt.push(`${betLabel(b)} +${ret}`);}
  else loseTxt.push(`${betLabel(b)} -${b.amount}`);
 });
 coins+=payout;
 const special=rouletteProbNumbers.includes(n),mega=rouletteMegaNumbers.includes(n);
 markWinningNumberOnBoard(n);
 setTimeout(clearWinningNumberOnBoard,4200);
 if(special){document.querySelector('.rouletteWrap')?.classList.add('mega-hit');setTimeout(()=>document.querySelector('.rouletteWrap')?.classList.remove('mega-hit'),3000);}
 const net=payout-total;
 history.unshift({n,c});history=history.slice(0,20);safeStorage.set('royalHistory',JSON.stringify(history));lastResolvedBets=bets.map(b=>({...b}));activeBets=[];

 // If Mega Fire hits, the round stays locked until the COMPLETE bonus animation ends.
 if(mega){
  const ms=byId('megaStatus');if(ms)ms.textContent='🔥 MEGA FIRE · BONUS EN CURSO';
  markMegaNumbersOnBoard();
  showMegaFireResultFx();
  await runMegaAnimation(n,total);
  clearMegaNumbersOnBoard();
 }

 spinning=false;
 byId('rouletteResult')&&(byId('rouletteResult').innerHTML=`<b>${n} · ${c.toUpperCase()}</b><div class="betLine">${winTxt.length?'Ganadoras: '+winTxt.join(' · '):'Sin apuestas ganadoras'}</div><div class="betLine">${loseTxt.join(' · ')}</div>${special?'<div class="betLine" style="color:#f5c451">✨ Numero de probabilidad activado</div>':''}${mega?'<div class="betLine" style="color:#f5c451">🔥 MEGA FIRE COMPLETADA</div>':''}<div class="netLine">Balance: ${net>=0?'+':''}${net}</div>`);
 byId('repeatBet')&&(byId('repeatBet').disabled=!lastResolvedBets.length);
 renderHistory();renderActiveBets();renderBoardBadges();save();update();
 setTimeout(beginRouletteRound,mega?900:1200);
}
function buildMegaStars(){
 const host=byId('megaStars');if(!host)return;
 host.innerHTML='';
 for(let i=0;i<48;i++){
  const s=document.createElement('i');s.className='megaStar'+(i%10===0?' big':'')+(i%8===0?' cross':'');
  s.style.left=(Math.random()*100)+'%';
  s.style.setProperty('--fall',(3.6+Math.random()*4.4).toFixed(2)+'s');
  s.style.setProperty('--delay',(-Math.random()*4.8).toFixed(2)+'s');
  s.style.setProperty('--drift',(Math.random()*150-75).toFixed(0)+'px');
  host.appendChild(s);
 }
}
function buildMegaMeter(){
 const grid=byId('megaBonusGrid');if(!grid)return;
 grid.innerHTML='';
 for(let i=0;i<30;i++){
  const cell=document.createElement('div');cell.className='megaBonusCell empty';cell.dataset.index=i;
  grid.appendChild(cell);
 }
}
function runMegaAnimation(winNumber,totalStake){
 return new Promise(resolve=>{
  const overlay=byId('megaOverlay'),nums=byId('megaHitNums'),mult=byId('megaMultiplier'),sub=byId('megaSub'),spins=byId('megaSpinsLeft');
  if(!overlay||!nums||!mult||!sub){resolve();return;}
  buildMegaStars();buildMegaMeter();
  nums.innerHTML=rouletteMegaNumbers.map(n=>`<span class="hit">${n}</span>`).join('');
  mult.textContent='×0';sub.textContent='3 giros bonus disponibles';if(spins)spins.textContent='3';
  overlay.style.setProperty('display','grid','important');
  overlay.style.setProperty('visibility','visible','important');
  overlay.style.setProperty('opacity','1','important');
  overlay.style.setProperty('z-index','2147483647','important');
  overlay.classList.add('show');

  const hits=[...nums.querySelectorAll('.hit')];
  hits.forEach((el,i)=>setTimeout(()=>el.classList.add('fireNow'),150+i*75));
  const cells=[...document.querySelectorAll('#megaBonusGrid .megaBonusCell')];
  // Multiplicadores más bajos son mucho más habituales. x400 queda como jackpot raro.
  const prizePool=[
    {value:20,weight:70},
    {value:30,weight:18},
    {value:50,weight:7},
    {value:80,weight:3.5},
    {value:120,weight:1},
    {value:200,weight:0.4},
    {value:400,weight:0.1}
  ];
  const pickMegaPrize=()=>{
    const total=prizePool.reduce((s,p)=>s+p.weight,0);
    let r=Math.random()*total;
    for(const p of prizePool){r-=p.weight;if(r<=0)return p.value;}
    return 20;
  };
  let currentMultiplier=0;
  let megaCoinsWon=0;

  const shuffledEmpty=()=>[...cells].filter(c=>c.classList.contains('empty')).sort(()=>Math.random()-.5);

  // Cada premio cae lentamente sobre una casilla. Al aterrizar puede quedarse o desaparecer.
  // Si desaparece, la casilla vuelve a estar vacía y el multiplicador no suma ese premio.
  const dropPrize=(cell,val,delay,stayChance=.68)=>{
    setTimeout(()=>{
      if(!cell.classList.contains('empty'))return;
      cell.classList.remove('empty','filled','star','miss','land','shine');
      cell.classList.add('falling');
      cell.textContent=val==='star'?'★':'×'+val;

      setTimeout(()=>{
        const stays=Math.random()<stayChance;
        cell.classList.remove('falling');
        if(stays){
          cell.classList.add('filled','land','shine');
          if(val==='star')cell.classList.add('star');
          if(val!=='star')currentMultiplier+=Number(val)||0;
          mult.textContent='×'+Math.max(1,currentMultiplier);
          sub.textContent='✓ PREMIO CONSERVADO · cae otro...';
          setTimeout(()=>cell.classList.remove('land','shine'),850);
        }else{
          cell.classList.add('miss');
          sub.textContent='✕ PREMIO PERDIDO · la casilla queda vacía';
          setTimeout(()=>{
            cell.classList.remove('miss');
            cell.classList.add('empty');
            cell.textContent='';
          },620);
        }
      },1400);
    },delay);
  };

  const fillSpin=(spinNo)=>{
    const empty=shuffledEmpty();
    const amount=Math.min(9,empty.length);
    if(!amount){
      if(spins)spins.textContent=String(Math.max(0,3-spinNo));
      sub.textContent=`GIRO ${spinNo} · TABLERO LLENO`;
      return 0;
    }
    empty.slice(0,amount).forEach((cell,j)=>{
      const value=Math.random()<.015?'star':pickMegaPrize();
      // Los premios tienen más posibilidades de desaparecer, evitando multiplicadores enormes.
      dropPrize(cell,value,j*720,.46);
    });
    if(spins)spins.textContent=String(Math.max(0,3-spinNo));
    sub.textContent=`GIRO ${spinNo} · LOS PREMIOS ESTÁN CAYENDO...`;
    return amount;
  };

  // La secuencia es deliberadamente lenta: cada giro deja tiempo para ver cada premio caer,
  // quedarse o desaparecer. No se fuerza que las 36 casillas terminen llenas.
  setTimeout(()=>{
    fillSpin(1);
    setTimeout(()=>{
      fillSpin(2);
      setTimeout(()=>{
        fillSpin(3);
        setTimeout(()=>{
          megaCoinsWon=Math.max(0,Math.floor(Number(currentMultiplier||0)*Number(totalStake||0)));
          if(megaCoinsWon>0){coins+=megaCoinsWon;save();update();}
          sub.textContent=megaCoinsWon>0
            ? `DINERO GANADO · +${megaCoinsWon.toLocaleString()} 🪙 · multiplicador ×${currentMultiplier}`
            : 'BONUS COMPLETADO · SIN DINERO EXTRA';
          const money=document.createElement('div');
          money.className='megaMoneyWon';
          money.innerHTML=megaCoinsWon>0?`+${megaCoinsWon.toLocaleString()} <span>🪙</span>`:`+0 <span>🪙</span>`;
          const content=overlay.querySelector('.megaContent');
          if(content)content.appendChild(money);
          setTimeout(()=>{
            overlay.classList.remove('show');
            overlay.style.removeProperty('display');
            overlay.style.removeProperty('visibility');
            overlay.style.removeProperty('opacity');
            overlay.style.removeProperty('z-index');
            if(money.parentNode)money.remove();
            setTimeout(()=>{const st=byId('megaStars');if(st)st.innerHTML='';resolve();},500);
          },2600);
        },9800);
      },9800);
    },9800);
  },900);
 });
}

on('megaClose','click',()=>{});

document.querySelectorAll('.bet[data-chip]').forEach(b=>b.onclick=()=>{if(spinning)return;document.querySelectorAll('.bet[data-chip]').forEach(x=>x.classList.remove('active'));b.classList.add('active');chipValue=Number(b.dataset.chip);document.getElementById('chipLabel').textContent='Ficha seleccionada: '+chipValue+' 🪙';});
on('clearBets','click',()=>{if(spinning)return;activeBets=[];renderActiveBets();renderBoardBadges();});
on('spin','click',()=>spinRoulette(activeBets,false));
on('skipRouletteRound','click',skipRouletteRound);
on('preBetRoulette','click',savePreRouletteBet);
on('enterRouletteRound','click',enterRouletteRound);
on('repeatBet','click',()=>{if(spinning||!lastResolvedBets.length)return;const can=lastResolvedBets.reduce((s,b)=>s+b.amount,0);if(can>coins)return toast('No tienes monedas para repetir la apuesta.');activeBets=lastResolvedBets.map(b=>({...b}));renderActiveBets();renderBoardBadges();toast('Apuesta repetida.');});

// Farm
const FARM_BALANCE_VERSION='2026-09-18-farm-chill-02';
if(safeStorage.get('royalFarmBalanceVersion')!==FARM_BALANCE_VERSION){safeStorage.set('royalFarmState',JSON.stringify({power:0.25,crit:0,powerLevel:0,critLevel:0,autoLevel:0,autoOwned:false}));safeStorage.set('royalFarmBalanceVersion',FARM_BALANCE_VERSION);}
let fs=safeJSON('royalFarmState',{});let farmPower=Number(fs.power||0.25),farmCrit=Number(fs.crit||0),farmPowerLevel=Number(fs.powerLevel||0),farmCritLevel=Number(fs.critLevel||0),farmAutoLevel=Math.min(4,Number(fs.autoLevel||0)),farmAutoOwned=!!fs.autoOwned,farmAutoOn=false,farmAutoTimer=null;
function saveFarm(){safeStorage.set('royalFarmState',JSON.stringify({power:farmPower,crit:farmCrit,powerLevel:farmPowerLevel,critLevel:farmCritLevel,autoLevel:Math.min(4,farmAutoLevel),autoOwned:farmAutoOwned}));}
function farmPowerCost(){return Math.round(45*Math.pow(1.5,farmPowerLevel));}function farmCritCost(){return Math.round(180*Math.pow(1.65,farmCritLevel));}function farmAutoCost(){return Math.round(450*Math.pow(1.9,Math.max(0,farmAutoLevel-1)));}
function renderFarm(){
 const f=document.getElementById('farmCoins');if(!f)return;
 document.getElementById('farmPowerLabel').textContent=farmPower.toFixed(1)+'x';
 document.getElementById('farmClickValue').textContent=farmPower.toFixed(1);
 document.getElementById('farmLevel').textContent='LVL '+(farmPowerLevel+farmCritLevel);
 document.getElementById('powerNext').textContent=(farmPower+.05).toFixed(2)+'x por click';
 document.getElementById('critNext').textContent='+1% de probabilidad de x2';
 document.getElementById('buyPower').textContent=farmPowerCost().toLocaleString()+' 🪙';
 document.getElementById('buyCrit').textContent=farmCritCost().toLocaleString()+' 🪙';
 document.getElementById('farmProgressBar').style.width=Math.min(100,(farmPowerLevel+farmCritLevel)*8+8)+'%';
 const autoMax=farmAutoLevel>=4;
 const autoCost=farmAutoCost();
 const autoBtn=document.getElementById('buyAutoFarm');
 if(autoBtn){
   autoBtn.textContent=autoMax?'NIVEL MÁXIMO · 4':(farmAutoOwned?'MEJORAR · ':'ACTIVAR · ')+autoCost.toLocaleString()+' 🪙';
   autoBtn.disabled=autoMax;
 }
 document.getElementById('toggleAutoFarm').textContent=farmAutoOn?'APAGAR':'ENCENDER';
 document.getElementById('farmAutoState').textContent=farmAutoOn?'ACTIVO':'INACTIVO';
 document.getElementById('farmAutoSpeed').textContent='1 click / '+(8/Math.pow(1.15,Math.max(0,farmAutoLevel))).toFixed(1)+'s';
 document.getElementById('farmAutoLevel').textContent='Nivel '+farmAutoLevel+(autoMax?' · MÁX':'');
}
function buyFarmUpgrade(kind){
 const cfg={power:[farmPowerCost(),()=>farmPower=Number((farmPower+.05).toFixed(2)),'powerLevel'],crit:[farmCritCost(),()=>farmCrit+=1,'critLevel']}[kind];
 if(!cfg)return;
 if(coins<cfg[0])return toast('No tienes monedas.');
 coins-=cfg[0];cfg[1]();
 if(kind==='power')farmPowerLevel++;
 if(kind==='crit')farmCritLevel++;
 save();saveFarm();toast('Mejora aplicada.');update();
}
on('buyPower','click',()=>buyFarmUpgrade('power'));
on('buyCrit','click',()=>buyFarmUpgrade('crit'));
function performFarmClick(){
 const crit=Math.random()*100<Math.min(farmCrit,15);
 // Multiplicador de ritmo reducido: también afecta a partidas antiguas con mucho progreso.
 const farmRate=0.40;
 const amount=farmPower*farmRate*(crit?2:1);
 coins=Number((coins+amount).toFixed(1));
 const drop=document.getElementById('farmDrop');if(drop)drop.textContent='';
 save();update();
}
on('farmButton','click',performFarmClick);
on('buyAutoFarm','click',()=>{
 if(farmAutoLevel>=4)return toast('Auto Farm ya está en el nivel máximo (4).');
 const cost=farmAutoCost();
 if(coins<cost)return toast('No tienes monedas.');
 coins-=cost;farmAutoOwned=true;farmAutoLevel=Math.min(4,farmAutoLevel+1);
 save();saveFarm();update();toast('Auto Farm '+farmAutoLevel+(farmAutoLevel===4?' · NIVEL MÁXIMO':'')+' comprado.');
});
on('toggleAutoFarm','click',()=>{
 if(!farmAutoOwned)return toast('Compra primero Auto Farm.');
 farmAutoOn=!farmAutoOn;renderFarm();farmAutoOn?startAutoFarm():stopAutoFarm();
});
function startAutoFarm(){
 stopAutoFarm();
 const tick=()=>{
   if(!farmAutoOn)return;
   performFarmClick();
   farmAutoTimer=setTimeout(tick,8000/Math.pow(1.15,Math.max(0,farmAutoLevel)));
 };
 tick();
}
function stopAutoFarm(){
 if(farmAutoTimer){clearTimeout(farmAutoTimer);farmAutoTimer=null;}
 const m=document.getElementById('farmAutoMeter');if(m)m.style.width='0%';
}

// ===== RULETA DIARIA · 1 GIRO CADA 24 HORAS =====
const DAILY_COOLDOWN=24*60*60*1000;
const DAILY_REWARDS=[
 {label:'100 🪙',coins:100,weight:34},
 {label:'250 🪙',coins:250,weight:28},
 {label:'500 🪙',coins:500,weight:20},
 {label:'750 🪙',coins:750,weight:12},
 {label:'1000 🪙',coins:1000,weight:5.5},
 {label:'👻 DAILY PHANTOM',item:true,weight:.5}
];
let dailyBusy=false,dailyRotation=0;
function getDailyLast(){return Number(safeStorage.get('royalDailyLast','0')||0);}
function dailyRemaining(){
 const left=Math.max(0,DAILY_COOLDOWN-(Date.now()-getDailyLast()));
 return left;
}
function formatDailyTime(ms){
 const s=Math.ceil(ms/1000),h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sec=s%60;
 return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}
function updateDailyUI(){
 const btn=byId('dailySpin'),timer=byId('dailyTimer'),status=byId('dailyStatus'),last=byId('dailyLast');
 if(!btn)return;
 const left=dailyRemaining(),ready=left<=0&&!dailyBusy;
 btn.disabled=!ready;
 btn.textContent=dailyBusy?'GIRANDO...':ready?'TIRAR RULETA':'DISPONIBLE EN '+formatDailyTime(left);
 if(timer)timer.textContent=ready?'LISTA PARA GIRAR':formatDailyTime(left);
 if(status&&!dailyBusy)status.textContent=ready?'Tienes un giro disponible.': 'La ruleta vuelve a estar disponible en 24 horas.';
 if(last)last.textContent=getDailyLast()?new Date(getDailyLast()).toLocaleString():'Nunca';
}
function pickDailyReward(){
 const total=DAILY_REWARDS.reduce((s,r)=>s+r.weight,0);let r=Math.random()*total;
 for(const reward of DAILY_REWARDS){r-=reward.weight;if(r<0)return reward;}
 return DAILY_REWARDS[0];
}
function renderDailyWheel(){
 const w=byId('dailyWheel');if(!w)return;
 const labels=['100','250','500','750','1000','SPECIAL'];
 w.innerHTML=labels.map((x,i)=>`<div class="dailySlice" style="--i:${i}"><span>${x==='SPECIAL'?'👻':x+' 🪙'}</span></div>`).join('');
}
async function spinDailyWheel(){
 if(dailyBusy)return;
 const left=dailyRemaining();
 if(left>0)return toast('La ruleta diaria aún no está disponible.');
 const reward=pickDailyReward();
 dailyBusy=true;updateDailyUI();
 const wheel=byId('dailyWheel');
 const index=DAILY_REWARDS.indexOf(reward);
 const segment=360/DAILY_REWARDS.length;
 const target=360-index*segment-segment/2;
 const extra=360*(5+Math.floor(Math.random()*3));
 dailyRotation+=extra+((target-(dailyRotation%360)+360)%360);
 if(wheel){
   wheel.style.setProperty('--rotation',dailyRotation+'deg');
   wheel.classList.add('spinning');
 }
 await new Promise(r=>setTimeout(r,5200));
 safeStorage.set('royalDailyLast',String(Date.now()));
 if(reward.item){
   addItem(DAILY_SPECIAL_ITEM.id,1);
   if(byId('dailyPrize'))byId('dailyPrize').innerHTML=`👻 <b>${DAILY_SPECIAL_ITEM.name}</b><small>Objeto especial añadido al inventario · ${DAILY_SPECIAL_ITEM.value.toLocaleString()} 🪙</small>`;
   toast('¡PREMIO ESPECIAL! Daily Phantom añadido al inventario.');
 }else{
   coins=Number((coins+reward.coins).toFixed(1));save();
   if(byId('dailyPrize'))byId('dailyPrize').innerHTML=`🪙 <b>+${reward.coins.toLocaleString()} monedas</b><small>Premio de la Ruleta Diaria</small>`;
   toast('Ruleta diaria: +'+reward.coins.toLocaleString()+' 🪙');
 }
 if(wheel)wheel.classList.remove('spinning');
 dailyBusy=false;save();updateDailyUI();update();
}
on('dailySpin','click',spinDailyWheel);
// Inventory / shop
function sellItem(id,qty){const it=ALL_ITEMS.find(x=>x.id===id),count=Number(inv[id]||0);if(!it||count<=0)return;qty=Math.max(1,Math.min(count,Math.floor(qty)));const payout=Math.floor(it.value*.82)*qty;removeItem(id,qty);coins+=payout;save();update();toast('Vendiste '+qty+'× '+it.name+' por '+payout.toLocaleString()+' 🪙');}
function renderInventory(){const g=document.getElementById('inventoryGrid');if(!g)return;const entries=Object.entries(inv),total=entries.reduce((sum,[id,count])=>sum+(ALL_ITEMS.find(x=>x.id===id)?.value||0)*count,0);document.getElementById('inventoryTotalValue').textContent=total.toLocaleString();g.innerHTML=entries.length?entries.map(([id,count])=>{const it=ALL_ITEMS.find(x=>x.id===id);return it?`<div class="item rarity-${it.rarity}"><div class="icon">${it.icon}</div><b>${it.name}</b><span class="count">x${count}</span><div class="value">${it.value.toLocaleString()} 🪙</div><button class="secondaryAction sellBtn" data-sell-one="${it.id}">VENDER 1 · ${Math.floor(it.value*.82).toLocaleString()} 🪙</button><button class="primary shopBtn" data-sell-all="${it.id}">VENDER TODO · ${(Math.floor(it.value*.82)*count).toLocaleString()} 🪙</button></div>`:''}).join(''):'<p class="muted">Tu inventario está vacío.</p>';g.querySelectorAll('[data-sell-one]').forEach(b=>b.onclick=()=>sellItem(b.dataset.sellOne,1));g.querySelectorAll('[data-sell-all]').forEach(b=>b.onclick=()=>sellItem(b.dataset.sellAll,inv[b.dataset.sellAll]||1));}
function renderShop(){const g=document.getElementById('shopGrid');if(!g)return;g.innerHTML=ALL_ITEMS.filter(it=>!it.special).map(it=>`<div class="item rarity-${it.rarity}"><div class="icon">${it.icon}</div><b>${it.name}</b><div class="value">${it.value.toLocaleString()} 🪙</div><button class="primary shopBtn" data-buy="${it.id}">COMPRAR ${it.price.toLocaleString()} 🪙</button></div>`).join('');g.querySelectorAll('[data-buy]').forEach(b=>b.onclick=()=>{const it=ALL_ITEMS.find(x=>x.id===b.dataset.buy);if(coins<it.price)return toast('No tienes monedas.');coins-=it.price;addItem(it.id,1);save();update();toast('Comprado: '+it.name);});}

// Upgrade — slow wheel, fixed line, win when % sector contains line
let upgradeSourceId='',upgradeTargetId='',upgradeBusy=false;
function getUpgradeableSourceItems(){return ALL_ITEMS.filter(it=>(inv[it.id]||0)>0);}
function getTargetItems(source){return ALL_ITEMS.filter(it=>it.value>source.value);}
function upgradeChance(s,t){return Math.max(.05,Math.min(100,(s.value/t.value)*100));}
function renderUpgrade(){const p=document.getElementById('upgradePicker'),tp=document.getElementById('upgradeTargetPicker');if(!p||!tp)return;const av=getUpgradeableSourceItems();if(!av.length){p.innerHTML='<div class="muted" style="grid-column:1/-1;text-align:center;padding:12px">Consigue un objeto para empezar.</div>';tp.innerHTML='';return;}if(!upgradeSourceId||!av.some(x=>x.id===upgradeSourceId))upgradeSourceId=av[0].id;const s=av.find(x=>x.id===upgradeSourceId),targets=getTargetItems(s);if(!upgradeTargetId||!targets.some(x=>x.id===upgradeTargetId))upgradeTargetId=targets[0]?.id||'';const t=targets.find(x=>x.id===upgradeTargetId);p.innerHTML=av.map(it=>`<button class="upgradePick ${it.id===upgradeSourceId?'active':''}" data-id="${it.id}"><div class="uIcon">${it.icon}</div><div class="uName">${it.name}</div><div class="uVal">${it.value.toLocaleString()}</div></button>`).join('');tp.innerHTML=targets.map(it=>`<button class="upgradeTargetPick ${it.id===upgradeTargetId?'active':''}" data-id="${it.id}"><div class="uIcon">${it.icon}</div><div class="uName">${it.name}</div><div class="uVal">${upgradeChance(s,it).toFixed(2)}%</div></button>`).join('');document.getElementById('upgradeSourceIcon').textContent=s.icon;document.getElementById('upgradeSourceName').textContent=s.name;document.getElementById('upgradeSourceValue').textContent=s.value.toLocaleString()+' 🪙';if(t){const ch=upgradeChance(s,t);document.getElementById('upgradeTargetIcon').textContent=t.icon;document.getElementById('upgradeTargetName').textContent=t.name;document.getElementById('upgradeTargetValue').textContent=t.value.toLocaleString()+' 🪙';document.getElementById('chance').textContent=ch.toFixed(2)+'%';document.getElementById('upgradeRing').style.setProperty('--arc',(ch*3.6)+'deg');document.getElementById('upgradeNextText').textContent=`Meta ${t.value.toLocaleString()} 🪙 · ${ch.toFixed(2)}%`;document.getElementById('upgradeButton').disabled=upgradeBusy;}p.querySelectorAll('.upgradePick').forEach(b=>b.onclick=()=>{upgradeSourceId=b.dataset.id;upgradeTargetId='';renderUpgrade();});tp.querySelectorAll('.upgradeTargetPick').forEach(b=>b.onclick=()=>{upgradeTargetId=b.dataset.id;renderUpgrade();});}
on('upgradeButton','click',()=>{if(upgradeBusy)return;const s=ALL_ITEMS.find(x=>x.id===upgradeSourceId),t=ALL_ITEMS.find(x=>x.id===upgradeTargetId);if(!s||!t||!inv[s.id])return toast('Selecciona objetos válidos.');upgradeBusy=true;const ch=upgradeChance(s,t),arc=ch*3.6,angle=Math.random()*360,finalRot=(7+Math.floor(Math.random()*3))*360-angle;const shell=byId('upgradeShell'),ring=byId('upgradeRing');if(!shell||!ring)return; shell.classList.add('rolling');text('upgradeResult','GIRANDO...');const btn=byId('upgradeButton');if(btn)btn.disabled=true;ring.style.transition='transform 11.5s cubic-bezier(.12,.82,.18,1)';ring.style.setProperty('--arc',arc+'deg');ring.style.setProperty('--rotation',finalRot+'deg');setTimeout(()=>{const success=angle<=arc;removeItem(s.id);if(success){addItem(t.id,1);toast('UPGRADE GANADO: '+t.name);}else toast('Upgrade fallido.');ring.style.transition='none';ring.style.setProperty('--rotation',((finalRot%360)+360)%360+'deg');shell.classList.remove('rolling');upgradeBusy=false;save();renderUpgrade();update();const rr=byId('upgradeResult');if(rr){rr.className='upgradeStatus '+(success?'success':'fail');rr.textContent=success?`¡ÉXITO! ${ch.toFixed(2)}% cayó en la línea.`:`FALLO · fuera del ${ch.toFixed(2)}%.`;}},11800);});

// Battles
const CASES=[
 {id:'neon',name:'Neon Case',icon:'🟪',price:80,accent:'#b477ff',odds:[.74,.17,.065,.019,.005,.001],items:[{id:'sticker',name:'Sticker Pixel',icon:'🏷️',value:40,rarity:'common'},{id:'cobalt',name:'Pistol Cobalt',icon:'🔹',value:120,rarity:'common'},{id:'pulse',name:'SMG Pulse',icon:'🟦',value:300,rarity:'rare'},{id:'night',name:'AWP Night',icon:'🌃',value:900,rarity:'epic'},{id:'prism',name:'Karambit Prism',icon:'🌈',value:4000,rarity:'legendary'},{id:'void',name:'Void Crown',icon:'🪐',value:20000,rarity:'mythic'}]},
 {id:'royal',name:'Royal Case',icon:'👑',price:150,accent:'#f5c451',odds:[.74,.17,.065,.019,.005,.001],items:[{id:'token',name:'Gold Token',icon:'🪙',value:75,rarity:'common'},{id:'pistol',name:'Crown Pistol',icon:'🔸',value:180,rarity:'common'},{id:'rifle',name:'Ruby Rifle',icon:'♦️',value:450,rarity:'rare'},{id:'dragon',name:'Royal Dragon',icon:'🐉',value:1200,rarity:'epic'},{id:'goldknife',name:'Golden Knife',icon:'🗡️',value:6500,rarity:'legendary'},{id:'celestial',name:'Celestial Relic',icon:'✨',value:30000,rarity:'mythic'}]},
 {id:'vault',name:'Vault Case',icon:'🧰',price:320,accent:'#23c483',odds:[.74,.17,.065,.019,.005,.001],items:[{id:'badge',name:'Vault Badge',icon:'🏅',value:160,rarity:'common'},{id:'circuit',name:'Circuit Gun',icon:'🔧',value:380,rarity:'common'},{id:'emerald',name:'Emerald Rifle',icon:'💚',value:1000,rarity:'rare'},{id:'sniper',name:'Cyber Sniper',icon:'🎯',value:2800,rarity:'epic'},{id:'blade',name:'Void Blade',icon:'⚔️',value:10000,rarity:'legendary'},{id:'eternal',name:'Eternal Artifact',icon:'💠',value:75000,rarity:'mythic'}]},
 {id:'eclipse',name:'Eclipse Case',icon:'🌑',price:550,accent:'#6f7cff',odds:[.76,.15,.065,.019,.005,.001],items:[{id:'eclipse-token',name:'Eclipse Token',icon:'🌘',value:280,rarity:'common'},{id:'shadow',name:'Shadow Core',icon:'🔹',value:650,rarity:'common'},{id:'nova',name:'Nova Blade',icon:'💫',value:1800,rarity:'rare'},{id:'eclipse-rifle',name:'Eclipse Rifle',icon:'🌑',value:5200,rarity:'epic'},{id:'black-prism',name:'Black Prism',icon:'🖤',value:18000,rarity:'legendary'},{id:'moon-void',name:'Moon Void',icon:'🌌',value:100000,rarity:'mythic'}]},
 {id:'inferno',name:'Inferno Case',icon:'🔥',price:900,accent:'#ff6b45',odds:[.77,.145,.06,.018,.006,.001],items:[{id:'ember',name:'Ember Chip',icon:'🔥',value:450,rarity:'common'},{id:'flare',name:'Flare Core',icon:'🟠',value:1000,rarity:'common'},{id:'inferno-gem',name:'Inferno Gem',icon:'🔶',value:3000,rarity:'rare'},{id:'fire-dragon',name:'Fire Dragon',icon:'🐲',value:8500,rarity:'epic'},{id:'molten',name:'Molten Blade',icon:'🗡️',value:30000,rarity:'legendary'},{id:'sun-crown',name:'Sun Crown',icon:'☀️',value:160000,rarity:'mythic'}]},
 {id:'aurora',name:'Aurora Case',icon:'🌌',price:1500,accent:'#64d8ff',odds:[.78,.14,.06,.014,.005,.001],items:[{id:'aurora-chip',name:'Aurora Chip',icon:'💠',value:700,rarity:'common'},{id:'ice-core',name:'Ice Core',icon:'🧊',value:1600,rarity:'common'},{id:'aurora-gem',name:'Aurora Gem',icon:'🔷',value:5000,rarity:'rare'},{id:'polar',name:'Polar Relic',icon:'❄️',value:14000,rarity:'epic'},{id:'starfall',name:'Starfall Blade',icon:'🌠',value:50000,rarity:'legendary'},{id:'aurora-void',name:'Aurora Void',icon:'🌌',value:250000,rarity:'mythic'}]}
];
CASES.flatMap(c=>c.items).forEach(it=>{if(!ALL_ITEMS.some(x=>x.id===it.id))ALL_ITEMS.push({...it,price:it.value});});
const BOTS=[{id:'nova',name:'Nova',avatar:'🤖',skill:'Calm'},{id:'vex',name:'Vex',avatar:'👾',skill:'Aggressive'},{id:'rune',name:'Rune',avatar:'🦂',skill:'Lucky'},{id:'byte',name:'Byte',avatar:'🧠',skill:'Tactical'},{id:'hex',name:'Hex',avatar:'🕶️',skill:'Risky'},{id:'echo',name:'Echo',avatar:'🦾',skill:'Elite'}];
let selectedCase='royal',selectedBots=new Set(['nova']),battleCaseCount=1,battleRunning=false;
function initBattles(){const cc=document.getElementById('caseChoices'),bg=document.getElementById('botGrid');if(!cc||!bg)return;cc.innerHTML=CASES.map(c=>`<div class="caseChoice ${c.id===selectedCase?'active':''}" data-case="${c.id}"><div class="caseIcon">${c.icon}</div><div class="caseName">${c.name}</div><div class="casePrice">${c.price.toLocaleString()} 🪙</div><button type="button" class="caseViewBtn" data-view-case="${c.id}">VER CONTENIDO</button></div>`).join('');cc.querySelectorAll('.caseChoice').forEach(el=>el.onclick=()=>{selectedCase=el.dataset.case;initBattles();updateBattleCost();});cc.querySelectorAll('[data-view-case]').forEach(b=>b.onclick=e=>{e.stopPropagation();openCaseModal(b.dataset.viewCase);});bg.innerHTML=BOTS.map(b=>`<button class="botCard ${selectedBots.has(b.id)?'active':''}" data-bot="${b.id}"><div class="botAvatar">${b.avatar}</div><div class="botMeta"><div class="botName">${b.name}</div><div class="botSkill">${b.skill}</div></div><span class="botTick">✓</span></button>`).join('');bg.querySelectorAll('.botCard').forEach(b=>b.onclick=()=>{const id=b.dataset.bot;if(selectedBots.has(id)){if(selectedBots.size===1)return toast('Deja al menos 1 bot.');selectedBots.delete(id);}else{if(selectedBots.size>=4)return toast('Máximo 4 bots.');selectedBots.add(id);}initBattles();updateBattleCost();});document.getElementById('botCount').textContent=selectedBots.size;document.getElementById('battleCaseCount').textContent=battleCaseCount;document.getElementById('caseDots').innerHTML=[1,2,3,4,5,6].map(i=>`<i class="${i<=battleCaseCount?'active':''}"></i>`).join('');document.getElementById('battleContinue').disabled=!selectedBots.size;}
function openCaseModal(id){const c=CASES.find(x=>x.id===id);if(!c)return;document.getElementById('caseModalTitle').textContent=c.name+' · '+c.price.toLocaleString()+' 🪙';document.getElementById('caseContents').innerHTML=c.items.map((it,i)=>`<div class="caseContent rarity-${it.rarity}"><div class="icon">${it.icon}</div><b>${it.name}</b><small>${it.value.toLocaleString()} 🪙</small><em>${((c.odds?.[i]||0)*100).toFixed(2)}%</em></div>`).join('');document.getElementById('caseModal').classList.add('show');}
function updateBattleCost(){const c=CASES.find(x=>x.id===selectedCase);document.getElementById('battleCost').innerHTML=`Tu coste: <b>${(c.price*battleCaseCount).toLocaleString()} 🪙</b><span>Los bots juegan gratis · sus cajas no se cobran.</span>`;}
function weightedDrop(c){
 const weights=(Array.isArray(c.odds)?c.odds:[.74,.17,.065,.019,.005,.001]).slice(0,c.items.length);
 const total=weights.reduce((a,b)=>a+b,0);
 let r=Math.random()*total;
 for(let i=0;i<c.items.length;i++){r-=weights[i]??0;if(r<=0)return c.items[i];}
 return c.items[0];}
function makePlayerLanes(players){const host=document.getElementById('battlePlayers');host.className='battlePlayers battleLanes';host.innerHTML=players.map(p=>`<div class="battleLane ${p.user?'user':''}" id="lane-${p.id}"><div class="laneHead"><div class="playerAvatar">${p.avatar}</div><div><b>${p.name}</b><small>${p.user?'TUS CAJAS':'BOT'}</small></div><strong id="score-${p.id}">0 🪙</strong></div><div class="reelWindow"><div class="reelStrip" id="reel-${p.id}"></div><div class="reelCenterLine"></div></div><div class="laneDrops" id="drops-${p.id}"></div></div>`).join('');}
function battlePlayers(){return [{id:'you',name:'TÚ',avatar:'😎',user:true},...BOTS.filter(b=>selectedBots.has(b.id)).map(b=>({...b,user:false}))];}
function reelSpin(lane,c,target,round){const strip=document.getElementById('reel-'+lane.id);const pool=[];for(let i=0;i<18;i++)pool.push(weightedDrop(c));pool.push(target);strip.innerHTML=pool.map(it=>`<div class="reelItem rarity-${it.rarity}"><span>${it.icon}</span><b>${it.name}</b><small>${it.value.toLocaleString()} 🪙</small></div>`).join('');strip.style.transition='none';strip.style.transform='translateY(0)';void strip.offsetWidth;const distance=-((pool.length-1)*126);strip.style.transition='transform 3.8s cubic-bezier(.08,.88,.16,1)';strip.style.transform=`translateY(${distance}px)`;return new Promise(res=>setTimeout(()=>res(),3900));}
async function runBattle(){if(battleRunning)return;const c=CASES.find(x=>x.id===selectedCase),players=battlePlayers(),userCost=c.price*battleCaseCount;if(coins<userCost)return toast(`Necesitas ${userCost.toLocaleString()} 🪙.`);battleRunning=true;coins-=userCost;save();document.getElementById('battleSetupScreen').classList.add('hidden');document.getElementById('battleArenaScreen').classList.remove('hidden');makePlayerLanes(players);document.getElementById('battleResult').innerHTML='';document.getElementById('battleTimer').textContent='ROLLING';const totals=Object.fromEntries(players.map(p=>[p.id,0]));for(let r=1;r<=battleCaseCount;r++){document.getElementById('battleRoundTitle').textContent=`CAJA ${r} / ${battleCaseCount}`;const draws=players.map(p=>({p,item:weightedDrop(c)}));await Promise.all(draws.map(d=>reelSpin(d.p,c,d.item,r)));draws.forEach(d=>{totals[d.p.id]+=d.item.value;const drops=document.getElementById('drops-'+d.p.id);drops.insertAdjacentHTML('beforeend',`<span class="dropChip rarity-${d.item.rarity}">${d.item.icon} ${d.item.name} <b>${d.item.value.toLocaleString()}</b></span>`);document.getElementById('score-'+d.p.id).textContent=totals[d.p.id].toLocaleString()+' 🪙';if(d.p.user)addItem(d.item.id,1);});document.getElementById('battleProgressBar').style.width=(r/battleCaseCount*100)+'%';await new Promise(res=>setTimeout(res,520));}
const ranking=players.map(p=>({...p,total:totals[p.id]})).sort((a,b)=>b.total-a.total);const winner=ranking[0];if(winner.user){players.filter(p=>!p.user).forEach(p=>{const botDrops=document.querySelectorAll(`#drops-${p.id} .dropChip`);botDrops.forEach(()=>{});}); // transfer exact bot objects by replaying their DOM data is not safe, so use battle log arrays below
}
// We need the actual bot objects. Read them from drop chips' data was not stored; rebuild deterministically impossible, so collect from totals by keeping hidden result array.
// The detailed result transfer is handled by battleLoot below.
if(winner.user){for(const p of battleLoot.filter(x=>!x.p.user))addItem(x.item.id,1);coins=Number((coins+Math.max(50,Math.round(winner.total*.2))).toFixed(1));save();}
ranking.forEach((p,i)=>document.getElementById('lane-'+p.id)?.classList.toggle('leader',i===0));document.getElementById('battleResult').innerHTML=`<div class="battleWin"><div><b>${winner.user?'🏆 HAS GANADO · TE QUEDAS TODO':'💥 '+winner.name+' GANA'}</b><div class="muted">Tus cajas cobradas: ${battleCaseCount} · Cajas de bots: gratis${winner.user?' · drops de bots transferidos a tu inventario':''}</div></div><strong>${winner.total.toLocaleString()} 🪙</strong></div><div class="battleLog">${ranking.map((p,i)=>`<div class="battleLogRow"><span>${i+1}. <strong>${p.name}</strong></span><span>${p.total.toLocaleString()} 🪙</span></div>`).join('')}</div>`;document.getElementById('battleTimer').textContent='READY';document.getElementById('battleRoundTitle').textContent='BATALLA TERMINADA';battleRunning=false;update();}
let battleLoot=[];
// Wrap runBattle to retain exact drops without charging bots
const __runBattle=runBattle;
runBattle=async function(){battleLoot=[];const orig=weightedDrop;window.__battleCollect=true;const old=weightedDrop;try{ // recreate with collection by temporarily replacing the function
 const wrapper=function(c){const it=old(c);return it;};
 // use a dedicated implementation because lexical function lookup is mutable in JS bindings
 battleLoot=[];
 if(battleRunning)return;const c=CASES.find(x=>x.id===selectedCase),players=battlePlayers(),userCost=c.price*battleCaseCount;if(coins<userCost)return toast(`Necesitas ${userCost.toLocaleString()} 🪙.`);battleRunning=true;coins-=userCost;save();document.getElementById('battleSetupScreen').classList.add('hidden');document.getElementById('battleArenaScreen').classList.remove('hidden');makePlayerLanes(players);document.getElementById('battleResult').innerHTML='';document.getElementById('battleTimer').textContent='ROLLING';const totals=Object.fromEntries(players.map(p=>[p.id,0]));for(let r=1;r<=battleCaseCount;r++){document.getElementById('battleRoundTitle').textContent=`CAJA ${r} / ${battleCaseCount}`;const draws=players.map(p=>{const item=old(c);battleLoot.push({p,item});return {p,item};});await Promise.all(draws.map(d=>reelSpin(d.p,c,d.item,r)));draws.forEach(d=>{totals[d.p.id]+=d.item.value;document.getElementById('drops-'+d.p.id).insertAdjacentHTML('beforeend',`<span class="dropChip rarity-${d.item.rarity}">${d.item.icon} ${d.item.name} <b>${d.item.value.toLocaleString()}</b></span>`);document.getElementById('score-'+d.p.id).textContent=totals[d.p.id].toLocaleString()+' 🪙';if(d.p.user)addItem(d.item.id,1);});document.getElementById('battleProgressBar').style.width=(r/battleCaseCount*100)+'%';await new Promise(res=>setTimeout(res,520));}const ranking=players.map(p=>({...p,total:totals[p.id]})).sort((a,b)=>b.total-a.total),winner=ranking[0];ranking.forEach((p,i)=>document.getElementById('lane-'+p.id)?.classList.toggle('leader',i===0));if(winner.user){battleLoot.filter(x=>!x.p.user).forEach(x=>addItem(x.item.id,1));coins=Number((coins+Math.max(50,Math.round(winner.total*.2))).toFixed(1));save();}document.getElementById('battleResult').innerHTML=`<div class="battleWin"><div><b>${winner.user?'🏆 HAS GANADO · TE QUEDAS TODOS LOS DROPS':'💥 '+winner.name+' GANA'}</b><div class="muted">Tu coste: ${(c.price*battleCaseCount).toLocaleString()} 🪙 · Bots: gratis · ${winner.user?'los objetos de los bots pasan a tu inventario':''}</div></div><strong>${winner.total.toLocaleString()} 🪙</strong></div><div class="battleLog">${ranking.map((p,i)=>`<div class="battleLogRow"><span>${i+1}. <strong>${p.name}</strong></span><span>${p.total.toLocaleString()} 🪙</span></div>`).join('')}</div>`;document.getElementById('battleTimer').textContent='READY';document.getElementById('battleRoundTitle').textContent=winner.user?'¡VICTORIA!':'BATALLA TERMINADA';battleRunning=false;update();}finally{window.__battleCollect=false;}};
on('battleContinue','click',()=>{if(!selectedBots.size)return toast('Elige al menos 1 bot.');runBattle();});
on('caseModalClose','click',()=>{const x=byId('caseModal');if(x)x.classList.remove('show');});on('caseModal','click',e=>{if(e.target.id==='caseModal')e.currentTarget.classList.remove('show')});
on('battleStart','click',()=>runBattle());
on('caseMinus','click',()=>{if(battleCaseCount>1){battleCaseCount--;initBattles();updateBattleCost();}});on('casePlus','click',()=>{if(battleCaseCount<6){battleCaseCount++;initBattles();updateBattleCost();}});

// Crash — rondas continuas: 7s de entrada y vuelo en bucle
let crashRunning=false,crashJoined=false,crashBet=50,crashMultiplier=1,crashCrashPoint=0,crashStartTime=0,crashRoundPhase='waiting',crashPrepEnd=0,crashRoundTimer=null;
function renderCrash(){const e=document.getElementById('crashCoins');if(!e)return;e.textContent=Math.floor(coins).toLocaleString();const b=document.getElementById('crashBet');if(b&&document.activeElement!==b)b.value=crashBet;document.getElementById('crashPotential').textContent=Math.floor(crashBet*crashMultiplier).toLocaleString();document.getElementById('crashCashout').textContent='COBRAR · '+crashMultiplier.toFixed(2)+'x';}
function crashTick(){if(!crashRunning)return;const elapsed=(performance.now()-crashStartTime)/1000;crashMultiplier=Math.min(100,Math.exp(elapsed*.29));document.getElementById('crashMultiplier').textContent=crashMultiplier.toFixed(2)+'x';document.getElementById('crashRocket').classList.add('trail');document.getElementById('crashRocket').style.transform=`translate(${Math.min(470,elapsed*58)}px,${-Math.min(260,elapsed*36)}px) rotate(10deg)`;renderCrash();if(crashMultiplier>=crashCrashPoint){crashRunning=false;document.getElementById('crashCashout').disabled=true;addCrashHistory(crashCrashPoint,false);document.getElementById('crashStatus').textContent='BOOM · '+crashCrashPoint.toFixed(2)+'x';document.getElementById('crashExplosion').classList.add('show');setTimeout(()=>document.getElementById('crashExplosion').classList.remove('show'),900);document.getElementById('crashRocket').style.transform='';document.getElementById('crashRocket').classList.remove('trail');crashJoined=false;setTimeout(startCrashPrep,900);return;}requestAnimationFrame(crashTick);}
function randomCrashPoint(){const u=Math.random();return Math.max(1.01,Math.min(50,Number((1/(1-u)).toFixed(2))));}
function addCrashHistory(value,good){const e=document.getElementById('crashHistory');if(!e)return;const x=document.createElement('span');x.className='crashPill '+(good?'good':'bad');x.textContent=value.toFixed(2)+'x';e.prepend(x);while(e.children.length>12)e.lastChild.remove();}
function startCrashPrep(){crashRoundPhase='waiting';crashPrepEnd=performance.now()+7000;crashJoined=false;document.getElementById('crashRoundState').textContent='Únete antes de que termine la cuenta atrás';document.getElementById('crashJoin').disabled=false;document.getElementById('crashCashout').disabled=true;document.getElementById('crashLiveBet').textContent='No estás dentro de la ronda.';clearInterval(crashRoundTimer);crashRoundTimer=setInterval(()=>{const left=Math.max(0,crashPrepEnd-performance.now());document.getElementById('crashCountdown').textContent=(left/1000).toFixed(1);if(left<=0){clearInterval(crashRoundTimer);startCrashRound();}},50);}
function startCrashRound(){crashRoundPhase='live';crashRunning=true;crashMultiplier=1;crashCrashPoint=randomCrashPoint();crashStartTime=performance.now();document.getElementById('crashRoundState').textContent='RONDA EN VUELO';document.getElementById('crashCountdown').textContent='LIVE';document.getElementById('crashJoin').disabled=true;document.getElementById('crashCashout').disabled=!crashJoined;document.getElementById('crashStatus').textContent=crashJoined?'VUELO ACTIVO · COBRA CUANDO QUIERAS':'OBSERVANDO · NO HAS ENTRADO';requestAnimationFrame(crashTick);}
on('crashBet','input',e=>crashBet=Math.max(1,Math.floor(Number(e.target.value)||1)));on('crashHalf','click',()=>{crashBet=Math.max(1,Math.floor(crashBet/2));renderCrash();});on('crashDouble','click',()=>{crashBet=Math.min(Math.floor(coins),Math.max(1,crashBet*2));renderCrash();});document.querySelectorAll('[data-crash-bet]').forEach(b=>b.onclick=()=>{crashBet=Number(b.dataset.crashBet);renderCrash();});
on('crashJoin','click',()=>{if(crashRoundPhase!=='waiting')return toast('La ronda ya ha empezado.');crashBet=Math.max(1,Math.floor(Number(byId('crashBet')?.value)||1));if(crashBet>coins)return toast('No tienes suficientes monedas.');coins-=crashBet;crashJoined=true;save();text('crashLiveBet','Dentro · '+crashBet.toLocaleString()+' 🪙');text('crashStatus','ENTRADA CONFIRMADA');update();});
on('crashCashout','click',()=>{if(!crashRunning||!crashJoined||crashRoundPhase!=='live')return;const win=Math.max(crashBet,Math.floor(crashBet*crashMultiplier));crashRunning=false;crashRoundPhase='cashed';coins+=win;save();addCrashHistory(crashMultiplier,true);toast('Cobrado: '+win.toLocaleString()+' 🪙');crashJoined=false;const cash=byId('crashCashout');if(cash)cash.disabled=true;text('crashStatus','COBRADO EN '+crashMultiplier.toFixed(2)+'x');const rocket=byId('crashRocket');if(rocket){rocket.style.transform='';rocket.classList.remove('trail');}setTimeout(startCrashPrep,1200);update();});
// Slots
const SLOT_SYMBOLS=[['🍒',2],['🍋',3],['🔔',5],['BAR',8],['💎',18],['7',40],['🎰',100]];let slotBusy=false;
function buildSlots(){const e=document.getElementById('slotReels');if(!e)return;e.innerHTML=[0,1,2].map(i=>`<div class="slotReel" id="slotReel${i}"><div class="slotStrip">${Array.from({length:18},(_,k)=>{const s=SLOT_SYMBOLS[k%SLOT_SYMBOLS.length][0];return `<div class="slotSymbol">${s}</div>`}).join('')}</div></div>`).join('');}
function spinSlotReel(i,finalSymbol){const reel=document.getElementById('slotReel'+i),strip=reel.querySelector('.slotStrip');const arr=[];for(let k=0;k<16;k++)arr.push(SLOT_SYMBOLS[Math.floor(Math.random()*SLOT_SYMBOLS.length)][0]);arr.push(finalSymbol);strip.innerHTML=arr.map(s=>`<div class="slotSymbol">${s}</div>`).join('');strip.style.transition='none';strip.style.transform='translateY(0)';void strip.offsetWidth;strip.style.transition=`transform ${2.6+i*.35}s cubic-bezier(.08,.88,.14,1)`;strip.style.transform=`translateY(-${(arr.length-1)*110+1}px)`;return new Promise(res=>setTimeout(res,2900+i*360));}
on('slotSpin','click',async()=>{if(slotBusy)return;let bet=Math.floor(Number(byId('slotBetInput')?.value)||1);bet=Math.max(1,bet);if(bet>coins)return toast('No tienes suficientes monedas.');coins-=bet;save();slotBusy=true;text('slotResult','LOS CARRETES ESTÁN GIRANDO...');const finals=[SLOT_SYMBOLS[Math.floor(Math.random()*SLOT_SYMBOLS.length)][0],SLOT_SYMBOLS[Math.floor(Math.random()*SLOT_SYMBOLS.length)][0],SLOT_SYMBOLS[Math.floor(Math.random()*SLOT_SYMBOLS.length)][0]];await Promise.all(finals.map((sym,i)=>spinSlotReel(i,sym)));const same=finals.every(x=>x===finals[0]);let mult=0;if(same){mult=SLOT_SYMBOLS.find(x=>x[0]===finals[0])[1];if(finals[0]==='🎰')mult=100;}else if(new Set(finals).size===2)mult=2;const win=bet*mult;if(win){coins+=win;const r=byId('slotResult');if(r)r.innerHTML=`<b>¡PREMIO! ${finals.join(' · ')}</b> · +${win.toLocaleString()} 🪙`;toast('Slots +'+win.toLocaleString());}else text('slotResult',`${finals.join(' · ')} · SIN PREMIO`);slotBusy=false;save();update();});
document.querySelectorAll('[data-slot-bet]').forEach(b=>b.onclick=()=>{document.getElementById('slotBetInput').value=b.dataset.slotBet;});

// ===== SPLIT MULTI-PAGE BOOTSTRAP =====
function byId(id){return document.getElementById(id)}
function on(id,event,handler){const el=byId(id);if(el)el['on'+event]=handler;return el}
function text(id,value){const el=byId(id);if(el)el.textContent=value;return el}

function showPage(id){
  const routes={casino:'casino.html',farm:'farm.html',daily:'ruleta.html',inventory:'inventario.html',upgrade:'upgrade.html',battles:'battles.html',crash:'crash.html',slots:'slots.html',shop:'tienda.html'};
  if(window.__ROYAL_SPA){ location.href='index.html#'+id; return; }
  if(routes[id] && location.pathname.endsWith(routes[id])===false){location.href=routes[id];return;}
  document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id===id));
  document.querySelectorAll('nav a[data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page===id));
}

// Re-bind same navigation behavior for both links and any original buttons.
document.querySelectorAll('nav [data-page]').forEach(b=>b.addEventListener('click',e=>{if(b.tagName==='A')return;showPage(b.dataset.page);}));

const currentPage=document.body.dataset.page||'home';

function initPage(){
  document.querySelectorAll('nav [data-page]').forEach(b=>{
    if(b.tagName==='A') return;
    b.addEventListener('click',e=>{e.preventDefault();showPage(b.dataset.page);});
  });
  if(currentPage==='casino'){buildWheel();initBoardEvents();renderActiveBets();renderBoardBadges();renderHistory();if(!restoreRouletteRound())beginRouletteRound();const r=byId('repeatBet');if(r)r.disabled=true;}

  if(currentPage==='farm')renderFarm();
  if(currentPage==='daily'){renderDailyWheel();updateDailyUI();window.__dailyTimer=setInterval(updateDailyUI,1000);}
  if(currentPage==='inventory')renderInventory();
  if(currentPage==='upgrade')renderUpgrade();
  if(currentPage==='battles'){initBattles();updateBattleCost();byId('battleArenaScreen')?.classList.add('hidden');}
  if(currentPage==='crash'){renderCrash();if(crashRoundPhase==='waiting')startCrashPrep();}
  if(currentPage==='slots')buildSlots();
  if(currentPage==='shop')renderShop();
  farmAutoLevel=Math.min(4,Math.max(0,farmAutoLevel));
  saveFarm();
  update();
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initPage,{once:true});else initPage();
