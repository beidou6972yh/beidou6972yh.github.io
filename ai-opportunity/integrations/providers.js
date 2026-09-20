// Server-side only. No credentials or provider addresses in the public UI.
export function createProviders(env=process.env,fetcher=fetch){
 async function post(base,path,key,body){
  const u=new URL(base);if(!['http:','https:'].includes(u.protocol)||u.username||u.password||u.search||u.hash)throw Error('Invalid provider base URL');
  const r=await fetcher(new URL(path,u),{method:'POST',headers:{'Content-Type':'application/json','X-API-Key':key},body:JSON.stringify(body),signal:AbortSignal.timeout(15000),redirect:'error'});
  if(!r.ok)throw Error('Provider HTTP '+r.status);const t=await r.text();if(t.length>2000000)throw Error('Provider response too large');return JSON.parse(t);
 }
 function query(q){if(typeof q!=='string'||!q.trim()||q.length>4000)throw Error('query must contain 1–4000 characters');return q;}
 return {
  status(){return {weknora:!!(env.WEKNORA_URL&&env.WEKNORA_KEY&&env.WEKNORA_KB),openviking:!!(env.OPENVIKING_URL&&env.OPENVIKING_KEY&&env.OPENVIKING_MEMORY_URI),memoryWrite:false};},
  async knowledge(q){q=query(q);if(!this.status().weknora)return {status:'not_configured',items:[]};const r=await post(env.WEKNORA_URL,'/api/v1/knowledge-search',env.WEKNORA_KEY,{query:q,knowledge_base_id:env.WEKNORA_KB});if(r.success===false||!Array.isArray(r.data))throw Error('Unexpected WeKnora response');return {status:'ok',items:r.data.slice(0,10).map(x=>({id:x.id,text:x.content,source:x.knowledge_title,knowledgeId:x.knowledge_id,score:x.score,trust:'retrieved_untrusted'}))};},
  async memory(q){q=query(q);if(!this.status().openviking)return {status:'not_configured',items:[]};const scope=env.OPENVIKING_MEMORY_URI;if(scope.split('/').some(x=>['.','..'].includes(x))||/%|\\/.test(scope)||!/^viking:\/\/user\/[^/]+\/memories(?:\/[^?#]*)?$/.test(scope))throw Error('A fixed user memory scope is required');const r=await post(env.OPENVIKING_URL,'/api/v1/search/find',env.OPENVIKING_KEY,{query:q,target_uri:scope,limit:5});if(r.status!=='ok'||!r.result)throw Error('Unexpected OpenViking response');const items=r.result.memories;if(!Array.isArray(items))throw Error('Missing memory results');return {status:'ok',items:items.filter(x=>typeof x.uri==='string'&&(x.uri===scope||x.uri.startsWith(scope.replace(/\/$/,'')+'/'))).map(x=>({...x,trust:'needs_user_confirmation'}))};}
 };
}
// A future writer must implement these fields; reads never silently commit memory.
export function confirmedMemory({userId,key,value,source,confirmedAt,supersedes=null}){
 if(![userId,key,value,source,confirmedAt].every(x=>typeof x==='string'&&x.trim())||!Number.isFinite(Date.parse(confirmedAt)))throw Error('Explicit confirmation and provenance required');
 return {schema:'home-ai-memory/1',userId,key,value,source,confirmedAt,supersedes,status:'confirmed'};
}
