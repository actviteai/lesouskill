import {finalizeEvent,generateSecretKey,getPublicKey,verifyEvent} from 'nostr-tools/pure';
export {generateSecretKey,getPublicKey,verifyEvent};
export const TYPES=Object.freeze(['COORD','COMMIT','WITHDRAW','NEED','CAP','CAP_REQ','BID','ASK','SWAP','ARB','EXEC','RESULT','REV','COST']);
export const DEFAULT_RELAY='wss://relay.lesou.org';
export function secretBytes(value){if(value instanceof Uint8Array&&value.length===32)return value;if(typeof value!=='string'||!/^[a-f0-9]{64}$/i.test(value))throw Error('A 32-byte hexadecimal Nostr key is required');return Uint8Array.from(value.match(/../g),x=>parseInt(x,16))}
export function signEvent(key,event){return finalizeEvent({created_at:Math.floor(Date.now()/1000),content:'',tags:[],...event},secretBytes(key))}
export function coordinationEvent(key,type,body,extraTags=[]){if(!TYPES.includes(type)||body===undefined)throw Error('Invalid coordination type/body');return signEvent(key,{kind:9,tags:[['h','lesou'],['t','lep'],...extraTags],content:JSON.stringify({version:1,type,body})})}
export function waitlistEvent(key,{network_modes,contact}){if(!Array.isArray(network_modes)||!network_modes.length||network_modes.some(x=>!['ipv4','ipv6','ipv4-nat'].includes(x))||typeof contact!=='string'||!contact.trim())throw Error('Public contact and supported network modes required');return coordinationEvent(key,'CAP_REQ',{service:'masternode-waitlist',network_modes,contact},[['t','lesou-masternode-waitlist']])}
export function validateRegistry(registry){
 if(registry?.protocol!=='lesou'||!Number.isInteger(registry.version)||registry.version<1||!Array.isArray(registry.assets)||registry.assets.length!==3)throw Error('Invalid LeSou registry');
 const seen=new Set();for(const a of registry.assets){if(!['base','tron','sui'].includes(a.chain)||seen.has(a.chain)||!a.network||!a.chain_id||!['deployed','undeployed'].includes(a.status))throw Error('Invalid asset domain');seen.add(a.chain);if(a.status==='deployed'&&(!a.identifier||!a.link))throw Error('A deployed asset needs immutable identifiers');}
 return registry;
}
export function normalizeWallet(w){const address=w.chain==='base'?w.address.toLowerCase():w.chain==='sui'?'0x'+w.address.replace(/^0x/,'').padStart(64,'0').toLowerCase():w.address;return {chain:w.chain,network:w.network,address}}
export function validateChallenge(response,{pubkey,wallet,relay,registry}){
 const c=JSON.parse(response.message);const now=Math.floor(Date.now()/1000),w=normalizeWallet(wallet);const asset=registry.assets.find(a=>a.chain===w.chain&&a.network===w.network);
 if(c.protocol!=='lesou/1'||c.purpose!=='lesou-membership'||c.npub!==pubkey||c.chain!==w.chain||c.network!==w.network||c.address!==w.address||c.chain_id!==asset?.chain_id||c.origin!==relay||!/^[0-9a-f]{64}$/.test(c.nonce)||!Number.isInteger(c.issued_at)||!Number.isInteger(c.expires_at)||c.issued_at>now+30||c.issued_at<now-300||c.expires_at<=now||c.expires_at>now+600)throw Error('Challenge binding or expiry mismatch');
 return c;
}
const httpOrigin=relay=>{const u=new URL(relay);if(u.protocol!=='wss:'||u.username||u.password||u.pathname!=='/'||u.search||u.hash)throw Error('A bare wss relay origin is required');return 'https://'+u.host};
async function request(url,body){const r=await fetch(url,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,redirect:'error',signal:AbortSignal.timeout(20000)});const data=await r.json();if(!r.ok)throw Error(data.error??`HTTP ${r.status}`);return data}
export async function connect(relay=DEFAULT_RELAY,{allowLocalTesting=false}={}){
 if(!allowLocalTesting)httpOrigin(relay);
 const ws=new WebSocket(relay);const queue=[];const waiting=[];let closed=false;
 function rejectAll(){closed=true;for(const w of waiting.splice(0)){clearTimeout(w.timer);w.reject(Error('Relay connection closed'))}}
 ws.addEventListener('close',rejectAll);ws.addEventListener('error',rejectAll);
 ws.addEventListener('message',event=>{try{const frame=JSON.parse(event.data);if(!Array.isArray(frame))return;const i=waiting.findIndex(w=>w.match(frame));if(i>=0){const w=waiting.splice(i,1)[0];clearTimeout(w.timer);w.resolve(frame)}else{if(queue.length>=1000){ws.close();return}queue.push(frame)}}catch{ws.close()}});
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{ws.close();reject(Error('Connection timed out'))},15000);ws.addEventListener('open',()=>{clearTimeout(timer);resolve()},{once:true});ws.addEventListener('error',()=>{clearTimeout(timer);reject(Error('Connection failed'))},{once:true})});
 function wait(match){const i=queue.findIndex(match);if(i>=0)return Promise.resolve(queue.splice(i,1)[0]);if(closed)return Promise.reject(Error('Connection closed'));return new Promise((resolve,reject)=>{const item={match,resolve,reject};item.timer=setTimeout(()=>{const index=waiting.indexOf(item);if(index>=0)waiting.splice(index,1);reject(Error('Relay response timed out'))},15000);waiting.push(item)})}
 const send=frame=>ws.send(JSON.stringify(frame));
 const ack=async event=>{const frame=await wait(f=>f[0]==='OK'&&f[1]===event.id);if(frame[2]!==true)throw Error(frame[3]??'Relay rejected event');return event.id};
 return {
  async authenticate(key){const challenge=await wait(f=>f[0]==='AUTH'&&typeof f[1]==='string');const event=signEvent(key,{kind:22242,tags:[['relay',relay],['challenge',challenge[1]]]});send(['AUTH',event]);await ack(event);},
  async publish(event){if(!verifyEvent(event))throw Error('Invalid event signature');send(['EVENT',event]);return ack(event)},
  async read(filter={kinds:[9],'#h':['lesou'],limit:50}){const id='read-'+crypto.randomUUID();send(['REQ',id,filter]);const events=[];try{while(true){const f=await wait(f=>['EVENT','EOSE','CLOSED'].includes(f[0])&&f[1]===id);if(f[0]==='EOSE')return events;if(f[0]==='CLOSED')throw Error(f[2]);if(!verifyEvent(f[2]))throw Error('Invalid retrieved event signature');events.push(f[2])}}finally{send(['CLOSE',id])}},
  close(){ws.close();rejectAll()}
 };
}
export async function join({key,wallet,relay=DEFAULT_RELAY}){
 const origin=httpOrigin(relay),pubkey=getPublicKey(secretBytes(key));const registry=validateRegistry(await request(origin+'/registry.json'));const w=normalizeWallet(wallet);
 if(typeof wallet.signMessage!=='function')throw Error('Provide a local wallet signMessage callback');
 const response=await request(origin+'/membership/challenge',{npub:pubkey,...w});const challenge=validateChallenge(response,{pubkey,wallet:w,relay,registry});
 const signature=await wallet.signMessage(response.message);
 await request(origin+'/membership/proof',{nonce:challenge.nonce,wallet_signature:signature,nostr_event:signEvent(key,{kind:22243,content:challenge.nonce})});
 const connection=await connect(relay);try{await connection.authenticate(key);try{await connection.publish(signEvent(key,{kind:9021,tags:[['h','lesou']]}))}catch(e){if(!e.message.startsWith('duplicate:'))throw e}return connection}catch(e){connection.close();throw e}
}
