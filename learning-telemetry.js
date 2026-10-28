/* Phase 5B: learning telemetry for Loki. Does not touch game progress.
   Events are associated with the currently authenticated JWT subject. */
(()=>{
  'use strict';
  const API=String(window.LOKI_API_BASE||'').replace(/\/$/,'');
  const QUEUE_PREFIX='loki-learning-queue-v1:';
  const MAX_QUEUE=500;
  let sending=false;
  function token(){return sessionStorage.getItem('loki_cloud_token')||'';}
  function subject(jwt){
    try {
      const part=jwt.split('.')[1];
      const payload=JSON.parse(atob(part.replace(/-/g,'+').replace(/_/g,'/')));
      const id=payload.sub||payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'];
      return typeof id==='string'&&/^[a-f0-9-]{36}$/i.test(id)?id:null;
    }catch{return null;}
  }
  function keyFor(jwt){const id=subject(jwt);return id?QUEUE_PREFIX+id:null;}
  function read(key){try{const a=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(a)?a:[];}catch{return [];}}
  function write(key,arr){try{localStorage.setItem(key,JSON.stringify(arr));return true;}catch(e){console.warn('Learning queue storage unavailable',e);return false;}}
  function skillOf(raw){
    const x=String(raw).trim().toLowerCase();
    if(/^(english|grammar|writing)/.test(x))return 'english';
    if(/^(reading|logic)/.test(x))return 'reading';
    if(/^(math|algebra|geometry)/.test(x))return 'math';
    if(/^(science|data)/.test(x))return 'science';
    return null;
  }
  const levels={apprentice:1,investigator:2,challenge:3};
  function record(detail){
    const jwt=token(),key=keyFor(jwt);
    if(!key||!API||!crypto.randomUUID)return; // never assign anonymous events to another account
    const skillId=skillOf(detail.skill),difficulty=levels[detail.difficulty];
    if(!skillId||!difficulty){console.warn('Learning attempt skipped: unrecognized skill/difficulty',detail);return;}
    const questionId=String(detail.questionId||'');
    if(!/^[a-zA-Z0-9._-]{1,120}$/.test(questionId)){
      console.warn('Learning attempt skipped: invalid question ID',questionId);return;
    }
    const queue=read(key);
    if(queue.length>=MAX_QUEUE){console.warn('Learning queue full; attempt not recorded');return;}
    queue.push({attemptId:crypto.randomUUID(),adventureId:'loki',questionId,
      skillId,difficulty,isCorrect:Boolean(detail.isCorrect),usedHint:Boolean(detail.usedHint),durationSeconds:null});
    if(write(key,queue))void flush();
  }
  async function flush(){
    if(sending||!API)return;
    const jwt=token(),key=keyFor(jwt);
    if(!key)return;
    sending=true;
    try{
      // Read current queue on each iteration so newly added events aren't discarded.
      for(let i=0;i<MAX_QUEUE;i++){
        if(token()!==jwt)break;
        const queue=read(key);
        if(!queue.length)break;
        const attempt=queue[0];
        let response;
        try{
          response=await fetch(API+'/api/learning/attempts',{
            method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+jwt},
            body:JSON.stringify(attempt),cache:'no-store'
          });
        }catch{break;} // offline: retain queue
        if(!response.ok){
          console.warn('Learning telemetry paused: HTTP',response.status);
          break; // retain for retry; investigate persistent 400/401 errors
        }
        // Only remove the exact acknowledged event, preserving concurrent additions.
        const latest=read(key);
        const index=latest.findIndex(x=>x.attemptId===attempt.attemptId);
        if(index>=0){latest.splice(index,1);write(key,latest);}
      }
    }finally{sending=false;}
  }
  window.addEventListener('loki:learning-attempt',e=>record(e.detail||{}));
  window.addEventListener('online',()=>void flush());
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)void flush();});
  setInterval(()=>void flush(),15000);
  void flush();
})();
