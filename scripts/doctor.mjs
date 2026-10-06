import { spawnSync } from 'node:child_process';
let failed = false;
for (const [name,args] of [['node',['--version']],['compact',['compile','--version']],['docker',['info','--format','{{.ServerVersion}}']]]) {
 const result=spawnSync(name,args,{encoding:'utf8'});
 const ok=result.status===0; failed ||= !ok;
 console.log(`${ok?'PASS':'BLOCKED'} ${name}: ${ok?result.stdout.trim():(result.error?.message ?? result.stderr.trim())}`);
}
process.exitCode=failed?1:0;
