const {chromium}=require('playwright');
const PROJ='family-hub-e8690',EMU='http://127.0.0.1:8085';
const path=require('path'),OLD=path.join(__dirname,'..','Family-Hub-v38.25-backup.html'),NEW=path.join(__dirname,'..','Family-Hub.html');
const UID={'parent@fam':'wL2GTwTYn7Ngjtnyy0NkQ5IKlsZ2','kids@fam':'RhyyWQhemQefhVkPQt2EfAhgxDw1','dad@g':'P1','wall@fam':'W1'};
const b64=o=>Buffer.from(JSON.stringify(o)).toString('base64url');
function jwt(uid){const n=Math.floor(Date.now()/1000);return b64({alg:'none',typ:'JWT'})+'.'+b64({iss:'https://securetoken.google.com/'+PROJ,aud:PROJ,auth_time:n,user_id:uid,sub:uid,iat:n,exp:n+3600,firebase:{sign_in_provider:'password',identities:{}}})+'.';}
async function admin(path,method,body){const r=await fetch(EMU+'/v1/projects/'+PROJ+'/databases/(default)/documents/'+path,{method,headers:{Authorization:'Bearer owner','Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});return r.json();}
async function list(coll){const j=await admin('households/family/'+coll+'?pageSize=300','GET');return (j.documents||[]).map(d=>({id:d.name.split('/').pop(),json:d.fields.json.stringValue,deleted:d.fields.deleted&&d.fields.deleted.booleanValue,aud:d.fields.aud&&d.fields.aud.stringValue,own:d.fields.own&&d.fields.own.stringValue,st:d.fields.st&&d.fields.st.stringValue}));}
async function ctxFor(b,state){
  const ctx=await b.newContext(state?{storageState:state}:{});
  await ctx.route(/googleapis\.com|gstatic/,async r=>{const u=r.request().url();
    if(u.includes('signInWithPassword')){const em=JSON.parse(r.request().postData()).email;return r.fulfill({json:{idToken:jwt(UID[em]),expiresIn:'3600',refreshToken:UID[em],localId:UID[em],email:em}});}
    if(u.includes('securetoken')){const rt=new URLSearchParams(r.request().postData()).get('refresh_token');return r.fulfill({json:{id_token:jwt(rt),expires_in:'3600',refresh_token:rt,user_id:rt}});}
    if(u.includes('firestore.googleapis.com')){const res=await fetch(u.replace('https://firestore.googleapis.com',EMU),{method:r.request().method(),headers:{'Content-Type':'application/json',Authorization:r.request().headers()['authorization']||''},body:r.request().postData()||undefined});return r.fulfill({status:res.status,body:await res.text(),contentType:'application/json'});}
    return r.abort();});
  return ctx;
}
async function page(ctx,file){await ctx.unroute('http://fh.test/**').catch(()=>{});await ctx.route('http://fh.test/**',r=>r.fulfill({path:file,contentType:'text/html'}));const pg=await ctx.newPage();pg.on('pageerror',e=>console.log('  PAGE ERROR',e.message));pg.on('dialog',d=>d.accept());await pg.addInitScript(()=>{window.FH_POLL_MS=700;});await pg.goto('http://fh.test/Family-Hub.html');await pg.waitForTimeout(700);return pg;}
async function signIn(pg,email){await pg.evaluate(em=>{sync.on=true;syncStore();syncStart();return sync.adapter.signIn(em,'pw');},email);await pg.waitForTimeout(4000);}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const b=await chromium.launch();
 await admin('users/P1?','PATCH',{fields:{role:{stringValue:'parent'},personId:{stringValue:'dad'}}});
 await admin('users/W1?','PATCH',{fields:{role:{stringValue:'display'},personId:{stringValue:'none'}}});
 console.log('1) Old v38.25 parent phone puts care data in the cloud the old way');
 let A=await ctxFor(b),pa=await page(A,OLD);
 await pa.evaluate(()=>{var ds=today();
   S.household=[{id:'mdad',type:'medicine',title:'Dad blood pressure pill',date:ds,time:'08:00',repeat:'daily',people:['dad'],notes:'PRIVATE parent note'},
                {id:'mjul',type:'medicine',title:'Julian allergy spray',date:ds,repeat:'daily',people:['julian']},
                {id:'bill1',type:'bill',title:'Electric bill',date:ds,amount:'80'}];
   S.events.push({id:'e1',d:ds,m:'10:00',end:'',t:'Monica therapist',repeat:'none',days:[],people:['monica'],p:'monica',kind:'doctor'});
   S.events.push({id:'e2',d:ds,m:'15:00',end:'',t:'Emilio dentist',repeat:'none',days:[],people:['emilio'],p:'emilio',kind:'doctor'});
   S.events.push({id:'e3',d:ds,m:'16:00',end:'',t:'Soccer',repeat:'none',days:[],people:['julian'],p:'julian',kind:'sports'});
   S.reminderLog={};S.reminderLog['mdad|'+ds]={at:new Date().toISOString()};save();});
 await signIn(pa,'parent@fam');await pa.evaluate(()=>syncSchedule(10));await pa.waitForTimeout(3000);
 let hh=(await list('items')).find(d=>d.id==='cfg__blob_household');console.log('   cloud household blob has the parent medicine:',hh.json.includes('blood pressure'));
 console.log('2) Wall tablet (old kids login, v38.25) picks it up, as today');
 let T=await ctxFor(b),pt=await page(T,OLD);await pt.evaluate(()=>{dev.role='wall';devSave();});await signIn(pt,'kids@fam');await pt.waitForTimeout(2000);
 console.log('   tablet sees parent medicine:',await pt.evaluate(()=>JSON.stringify(S.household).includes('blood pressure')),'| therapist appt:',await pt.evaluate(()=>JSON.stringify(S.events).includes('therapist')));
 const tState=await T.storageState();await T.close();
 console.log('3) Dad\'s phone on v39.2 (new parent account) migrates');
 let A2=await ctxFor(b),pp=await page(A2,NEW);await signIn(pp,'dad@g');await pp.evaluate(()=>syncSchedule(10));await pp.waitForTimeout(6000);
 console.log('   careOk:',await pp.evaluate(()=>sync.careOk),'role:',await pp.evaluate(()=>acctRole()),'state:',await pp.evaluate(()=>sync.state));
 const cp=await list('careParent'),ck=await list('careKid'),items=await list('items');
 console.log('   careParent:',cp.map(d=>d.id+'('+d.own+')').join(', '));
 console.log('   careKid:   ',ck.map(d=>d.id+'('+d.own+')').join(', '));
 const e1=items.find(d=>d.id==='events__e1'),e2=items.find(d=>d.id==='events__e2');hh=items.find(d=>d.id==='cfg__blob_household');
 console.log('   old appointment docs now deleted & empty:',e1.deleted&&e1.json==='',e2.deleted&&e2.json==='','| household blob still has medicine:',/medicine/.test(hh.json),'| bill still there:',hh.json.includes('Electric'));
 console.log('   Dad\'s phone still shows everything:',await pp.evaluate(()=>[S.household.filter(x=>x.type==='medicine').length,S.events.filter(e=>e.kind==='doctor').length,Object.keys(S.reminderLog).length].join('/')));
 console.log('3b) The old parent phone (shared login) updates to v39.2');
 const aState=await A.storageState();await A.close();A=await ctxFor(b,aState);pa=await page(A,NEW);await pa.waitForTimeout(5000);
 console.log('   careParent now:',(await list('careParent')).map(d=>d.id+(d.st?'['+d.st+']':'')).join(', '));
 if(process.env.OLDRULES){const it=await list('items');console.log('   OLD RULES: careOk',await pa.evaluate(()=>sync.careOk),'| blob keeps meds:',/medicine/.test(it.find(d=>d.id==='cfg__blob_household').json),'| appt docs intact:',!it.find(d=>d.id==='events__e1').deleted,!it.find(d=>d.id==='events__e2').deleted,'| new phone meds/appts:',await pp.evaluate(()=>[S.household.filter(x=>x.type==='medicine').length,S.events.filter(e=>e.kind==='doctor').length].join('/')));await b.close();return;}
 console.log('4) Tablet updates to v39.2');
 T=await ctxFor(b,tState);pt=await page(T,NEW);await pt.waitForTimeout(6000);
 console.log('   tablet role:',await pt.evaluate(()=>devRole()),'| parent medicine gone:',await pt.evaluate(()=>!JSON.stringify(S.household).includes('blood pressure')),'| therapist gone:',await pt.evaluate(()=>!JSON.stringify(S.events).includes('therapist')),
   '| Julian med kept:',await pt.evaluate(()=>JSON.stringify(S.household).includes('allergy')),'| Emilio dentist kept:',await pt.evaluate(()=>JSON.stringify(S.events).includes('dentist')),'| soccer kept:',await pt.evaluate(()=>JSON.stringify(S.events).includes('Soccer')));
 console.log('   saved copy on the tablet mentions parent care:',await pt.evaluate(()=>{var r=localStorage.getItem('familyhub-v1');return /blood pressure|therapist|PRIVATE/.test(r);}));
 const probe=async(pg)=>pg.evaluate(()=>sync.adapter.token().then(t=>Promise.all([
   fetch(FS_ROOT+'/households/family/careParent/med_mdad',{headers:{Authorization:'Bearer '+t}}).then(r=>r.status),
   fetch(FS_ROOT+'/households/family/careParent?pageSize=50',{headers:{Authorization:'Bearer '+t}}).then(r=>r.status),
   fetch(FS_ROOT.replace(/\/documents$/,'/documents/households/family')+':runQuery',{method:'POST',headers:{Authorization:'Bearer '+t,'Content-Type':'application/json'},body:JSON.stringify({structuredQuery:{from:[{collectionId:'careParent'}]}})}).then(r=>r.status),
   fetch(FS_ROOT+'/households/family/careKid?pageSize=50',{headers:{Authorization:'Bearer '+t}}).then(r=>r.status)])));
 console.log('   console probe (old kids login): careParent doc/list/query, careKid list =',(await probe(pt)).join(' / '));
 console.log('5) New wall display account on v39.2');
 let W=await ctxFor(b),pw=await page(W,NEW);await signIn(pw,'wall@fam');await pw.waitForTimeout(3000);
 console.log('   role:',await pw.evaluate(()=>devRole()),'| parent medicine:',await pw.evaluate(()=>JSON.stringify(S.household).includes('blood pressure')),'| therapist:',await pw.evaluate(()=>JSON.stringify(S.events).includes('therapist')),'| Julian med:',await pw.evaluate(()=>JSON.stringify(S.household).includes('allergy')));
 console.log('   console probe (display): careParent doc/list/query, careKid list =',(await probe(pw)).join(' / '));
 console.log('6) Status history');
 const k=await pw.evaluate(()=>{var t=S.tasks.julian[0];var k=today()+'|julian|'+t.id;S.done[k]='p';save();return k;});await pw.waitForTimeout(2500);
 await pp.waitForTimeout(2500);
 console.log('   tablet logged:',await pw.evaluate(k=>JSON.stringify((S.statusLog||[]).filter(e=>e.k===k).map(e=>e.from+'>'+e.to+' by '+e.by)),k));
 await pp.evaluate(k=>{statusSet(k,'excused','sick');save();},k);await pp.waitForTimeout(3000);
 const sl=(await list('items')).filter(d=>d.id.startsWith('slog__')||d.id.startsWith('stat__'));
 console.log('   cloud history/status docs:',sl.map(d=>d.id.slice(0,5)+':'+d.st).join(', '));
 console.log('   Dad sees status:',await pp.evaluate(k=>statusOf(k),k),'| tablet sees status:',await pw.evaluate(k=>statusOf(k),k));
 console.log('7) Stage 3: Care section');
 await pt.evaluate(()=>{view='care';render();});
 console.log('   tablet Care shows:',await pt.evaluate(()=>[...document.querySelectorAll('.care-person .ch')].map(x=>x.textContent.trim()).join(', ')),'| has add buttons:',await pt.evaluate(()=>!!document.querySelector('[data-a=nxcaremed]')));
 await pt.screenshot({path:'care-tablet.png'});
 await pt.evaluate(()=>{document.querySelector('[data-a=hhcomplete]').click();});await pt.waitForTimeout(3500);
 const dk=(await list('careKid')).filter(d=>d.id.startsWith('dose_mjul'));console.log('   kid dose in database:',dk.map(d=>d.id+' st='+d.st+' aud='+d.aud+' own='+d.own).join('; '));
 console.log('   tablet shows it as taken at once:',await pt.evaluate(()=>/Taken/.test(document.querySelector('.care-person').textContent)));
 await pp.waitForTimeout(3500);await pp.evaluate(()=>{view='care';render();});
 console.log('   Dad\'s phone Care shows:',await pp.evaluate(()=>[...document.querySelectorAll('.care-person .ch')].map(x=>x.textContent.trim()).join(', ')));
 console.log('   Julian row on Dad\'s phone:',await pp.evaluate(()=>{var r=[...document.querySelectorAll('.care-row')].find(x=>/allergy/i.test(x.textContent));return r?r.textContent.replace(/\s+/g,' ').trim():'(none)';}));
 console.log('   medicine moved on to:',await pp.evaluate(()=>S.household.find(x=>x.id==='mjul').date),'(today',await pp.evaluate(()=>today()),')');
 await pp.screenshot({path:'care-parent.png',fullPage:true});
 await pp.evaluate(()=>{var b=document.querySelector('[data-a=nxcarereview]');if(b)b.click();});await pp.waitForTimeout(3000);
 const dk2=(await list('careKid')).filter(d=>d.id.startsWith('dose_mjul'));console.log('   after "Looks good": st=',dk2.map(d=>d.st).join(','),'review flag:',/"review":true/.test(dk2[0]&&dk2[0].json||''));
 await pt.waitForTimeout(2500);await pt.evaluate(()=>{view='home';render();});
 console.log('   tablet wall Care box:',await pt.evaluate(()=>{var b=[...document.querySelectorAll('.w-box')].find(x=>/Care today/.test(x.textContent));return b?b.textContent.replace(/\s+/g,' ').trim():'(no box)';}));
 await pp.evaluate(()=>{view='home';render();});
 console.log('   Dad\'s Home Care card:',await pp.evaluate(()=>{var c=[...document.querySelectorAll('.cd')].find(x=>/Care today/.test(x.textContent));return c?c.textContent.replace(/\s+/g,' ').trim().slice(0,200):'(no card)';}));
 console.log('8) Stage 4: statuses across devices');
 const tk=await pt.evaluate(()=>{var t=S.tasks.emilio[1];return today()+'|emilio|'+t.id;});
 await pt.evaluate(k=>statusCant(k,'sick'),tk);await pt.waitForTimeout(3000);
 console.log('   "I couldn\'t do this" from tablet in database:',(await list('items')).filter(d=>d.id.startsWith('cant__')).length,'| slog c:',(await list('items')).filter(d=>d.id.startsWith('slog__')&&d.st==='c').length);
 await pp.waitForTimeout(3000);console.log('   Dad\'s phone has the request:',await pp.evaluate(()=>(S.cantReq||[]).length));
 await pp.evaluate(k=>statusParentSet(k,'excused','sick'),tk);await pp.waitForTimeout(3000);
 const it=await list('items');console.log('   status doc:',it.filter(d=>d.id.startsWith('stat__')&&d.id.includes('emilio')).map(d=>d.st).join(','),'| request cleared in database:',it.filter(d=>d.id.startsWith('cant__')).every(d=>d.deleted));
 await pt.waitForTimeout(3000);console.log('   tablet shows:',await pt.evaluate(k=>statusOf(k),tk),'| tablet requests left:',await pt.evaluate(()=>(S.cantReq||[]).length));
 await b.close();})().catch(e=>{console.error(e);process.exit(1);});
