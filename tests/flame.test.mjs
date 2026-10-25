import {test} from "node:test"
import assert from "node:assert/strict"
import {initFlame} from "../assets/flame.mjs"
test("the preserved particle algorithm initializes, draws five particles and cleans up",()=>{
 const old={window:globalThis.window,requestAnimationFrame:globalThis.requestAnimationFrame,cancelAnimationFrame:globalThis.cancelAnimationFrame}
 const listeners=new Map();let next,arcs=0
 globalThis.window={innerWidth:390,innerHeight:844,addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:name=>listeners.delete(name)}
 globalThis.requestAnimationFrame=fn=>{next=fn;return 1};globalThis.cancelAnimationFrame=()=>{}
 const context={clearRect(){},createRadialGradient(){return {addColorStop(){}}},beginPath(){},arc(){arcs++},fill(){}}
 const canvas={getContext:()=>context,getBoundingClientRect:()=>({left:0,top:0})}
 try{
  const cleanup=initFlame(canvas);assert.equal(canvas.width,390);assert.equal(canvas.height,844)
  listeners.get("mousemove")({clientX:10,clientY:20});next();assert.equal(arcs,5)
  cleanup();assert.equal(listeners.size,0)
 }finally{
  for(const [key,value] of Object.entries(old)){if(value===undefined)delete globalThis[key];else globalThis[key]=value}
 }
})
