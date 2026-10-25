import {test} from "node:test"
import assert from "node:assert/strict"
import {readFileSync} from "node:fs"
import {newsCollection} from "../assets/news.mjs"
const cases=JSON.parse(readFileSync(new URL("./news-contract.json",import.meta.url),"utf8"))
for(const c of cases)test("news contract: "+c.name,()=>assert.equal(newsCollection.safeParse(c.value).success,c.valid))
