import { defineConfig } from "@playwright/test"
import path from "node:path"
const root=path.resolve(import.meta.dirname,"../..")
const reference=process.env.REFERENCE_DIR
const candidate=process.env.CANDIDATE_URL
const proxy=process.env.BROWSER_PROXY||(process.env.VPS_ORIGIN_IP?"http://127.0.0.1:4175":undefined)
if(!reference)throw new Error("REFERENCE_DIR must point to the pinned pre-migration worktree")
export default defineConfig({
 testDir:".",testMatch:"regression.spec.mjs",timeout:120000,fullyParallel:false,workers:1,retries:0,
 outputDir:path.join(root,"test-results"),
 reporter:[["list"],["html",{outputFolder:path.join(root,"playwright-report"),open:"never"}]],
 use:{locale:"ja-JP",timezoneId:"Asia/Tokyo",headless:true,trace:"retain-on-failure",screenshot:"only-on-failure",...(proxy?{proxy:{server:proxy,bypass:"127.0.0.1,localhost"}}:{})},
 projects:["chromium","firefox","webkit"].map(browserName=>({name:browserName,use:{browserName}})),
 webServer:[
  {command:"node scripts/serve-static.mjs",cwd:reference,env:{PORT:"4173"},port:4173,reuseExistingServer:false},
  ...(candidate?[]:[{command:"node scripts/serve-static.mjs",cwd:root,env:{PORT:"4174"},port:4174,reuseExistingServer:false}]),
  ...(process.env.VPS_ORIGIN_IP?[{command:"node scripts/tls-connect-proxy.mjs",cwd:root,url:"http://127.0.0.1:4175/healthz",reuseExistingServer:false}]:[]),
 ],
})
