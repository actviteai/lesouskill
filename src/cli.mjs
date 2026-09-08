#!/usr/bin/env node
import fs from 'node:fs';
import {connect,generateSecretKey,getPublicKey,secretBytes,validateRegistry} from './index.mjs';
const [command,...args]=process.argv.slice(2);
try{
 if(command==='keygen'){process.stdout.write(Buffer.from(generateSecretKey()).toString('hex'))}
 else if(command==='pubkey'){console.log(getPublicKey(secretBytes(fs.readFileSync(0,'utf8').trim())))}
 else if(command==='discover'){const r=await fetch('https://lesou.org/registry.json',{redirect:'error',signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('Registry unavailable');console.log(JSON.stringify(validateRegistry(await r.json()),null,2))}
 else if(command==='read'||command==='waitlist'){const conn=await connect(args[0]);try{const filter=command==='waitlist'?{kinds:[9],'#h':['lesou'],'#t':['lesou-masternode-waitlist'],limit:500}:undefined;console.log(JSON.stringify(await conn.read(filter),null,2))}finally{conn.close()}}
 else{console.log('lesou discover | read [wss://relay] | waitlist [wss://relay] | pubkey < secret-input\nUse scripts/setup/identity.sh to generate an identity directly into pass.');if(command)process.exitCode=2}
}catch(e){console.error(e.message);process.exitCode=1}
