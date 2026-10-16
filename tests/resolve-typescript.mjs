import {registerHooks} from 'node:module';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

// Match Vite's extensionless TypeScript imports when exercising legacy modules in Node.
registerHooks({resolve(specifier,context,nextResolve){
  if(specifier.startsWith('.')&&!/\.[a-z]+$/i.test(specifier)&&context.parentURL){
    const candidate=new URL(specifier+'.ts',context.parentURL);
    if(candidate.protocol==='file:'&&existsSync(fileURLToPath(candidate)))return nextResolve(candidate.href,context);
  }
  return nextResolve(specifier,context);
}});
