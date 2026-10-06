import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root=join(dirname(fileURLToPath(import.meta.url)),"..");
const source=join(root,"src","frontend");
const output=join(root,"public");
const appOutput=join(output,"app");

await mkdir(output,{recursive:true});
await rm(appOutput,{recursive:true,force:true});
await mkdir(appOutput,{recursive:true});

await cp(source,appOutput,{
  recursive:true,
  filter:(src)=>{
    const normalized=src.replaceAll("\\","/");
    return !normalized.endsWith("/index.html")
      && !normalized.endsWith("/README.md")
      && !normalized.includes("/views/README.md")
      && !normalized.includes("/components/README.md");
  }
});

const index=await readFile(join(source,"index.html"),"utf8");
await writeFile(join(output,"index.html"),index,"utf8");
