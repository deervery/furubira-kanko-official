import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import {fileURLToPath} from "node:url"
import {spawnSync} from "node:child_process"
import xlsx from "xlsx"
const repo=fileURLToPath(new URL("../../",import.meta.url))
for(const name of ["prune-messages-by-excel-ja","sync-translations-from-excel"]){
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),"translation-parity-"))
 try{
  fs.mkdirSync(path.join(folder,"locales"));fs.mkdirSync(path.join(folder,"templates"))
  fs.writeFileSync(path.join(folder,"locales/messages.json"),JSON.stringify({ja:{home:{protected:"公開中の文言",excel:"Excel記載",unused:"未使用"}},en:{home:{protected:"live",excel:"in workbook",unused:"unused"}}}))
  fs.writeFileSync(path.join(folder,"templates/page.gohtml"),'{{t $.Lang "home.protected"}}')
  const book=xlsx.utils.book_new();xlsx.utils.book_append_sheet(book,xlsx.utils.aoa_to_sheet([["key","日本語"],["home.excel","Excel記載"]]),"translations")
  xlsx.writeFile(book,path.join(folder,"英語対応_translationPj.xlsx"))
  const run=spawnSync(process.execPath,[path.join(repo,"scripts",name+".mjs")],{cwd:folder,encoding:"utf8"})
  assert.equal(run.status,0,run.stderr)
  const result=JSON.parse(fs.readFileSync(path.join(folder,"locales/messages.json"),"utf8"))
  assert.equal(result.ja.home.excel,"Excel記載");assert.equal(result.en.home.excel,"in workbook")
  assert.equal(result.ja.home.unused,undefined);assert.equal(result.en.home.unused,undefined)
  if(name.startsWith("prune")){assert.equal(result.ja.home.protected,"公開中の文言");assert.equal(result.en.home.protected,"live")}
  else assert.equal(result.ja.home.protected,undefined)
  assert.equal(fs.readdirSync(path.join(folder,"locales")).filter(n=>n.startsWith("messages.json.bak.")).length,1)
  console.log(name+": pass (isolated workbook, original CLI entry and backup)")
 }finally{
  assert.ok(folder.startsWith(path.join(os.tmpdir(),"translation-parity-")));fs.rmSync(folder,{recursive:true,force:true})
 }
}
