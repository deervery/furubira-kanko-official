import EmblaCarousel from "./vendor/embla-carousel.mjs"
import Autoplay from "./vendor/embla-carousel-autoplay.mjs"
import { initFlame } from "./flame.mjs"
const langMatch = location.pathname.match(/^\/(ja|en)(?:\/|$)/)
if (langMatch) {
  const lang = langMatch[1]; document.documentElement.lang = lang
  document.cookie = "lang=" + lang + "; path=/; SameSite=Lax"
  for (const a of document.querySelectorAll("a")) if (["JA","EN"].includes(a.textContent.trim())) a.search = location.search
}
for (const img of document.images) {
  const fallback = () => {
    if (img.dataset.fallbackUsed) return
    img.dataset.fallbackUsed = "true"; img.src = "/no_photo.jpg?height=300&width=400"
  }
  img.addEventListener("error",fallback)
  if(img.complete&&img.naturalWidth===0)fallback()
}
for (const header of document.querySelectorAll("[data-site-header]")) {
  const solid = header.classList.contains("bg-black/90")
  let everVisible = false
  const sentinel = header.previousElementSibling
  if (sentinel) new IntersectionObserver(entries => {
    const visible = entries[0].isIntersecting
    if (visible) everVisible = true
    header.classList.toggle("opacity-100", solid || everVisible); header.classList.toggle("opacity-0", !(solid || everVisible))
    for (const cls of ["bg-black/90","backdrop-blur-sm","border-none"]) header.classList.toggle(cls, solid || !visible)
  }, { threshold:0.2 }).observe(sentinel)
}
const toggle = document.querySelector("[data-menu-toggle]")
if (toggle) {
  let portal, panel, previousStyle, inertElements = [], closing = false
  const header = toggle.closest("header")
  const baseButton = "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0"
  const ghost = baseButton.replace(" justify-center","") + " hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
  const outline = baseButton + " text-sm border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
  function el(tag,cls,text) { const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n }
  function close() {
    if (!portal || closing) return
    closing = true; panel.dataset.state = "closed"; portal.firstElementChild.dataset.state = "closed"
    document.removeEventListener("keydown", keyboard)
    for (const [node,wasInert] of inertElements) node.inert = wasInert
    document.body.style.overflow = previousStyle.overflow; document.body.style.paddingRight = previousStyle.paddingRight
    toggle.setAttribute("aria-expanded","false"); toggle.dataset.state = "closed"; toggle.focus()
    const old=portal; portal=null;panel=null;setTimeout(()=>{old.remove();closing=false},300)
  }
  function keyboard(event) {
    if(event.key==="Escape"){event.preventDefault();close();return}
    if(event.key!=="Tab"||!panel)return
    const focusable=[...panel.querySelectorAll("a[href],button:not([disabled]),input:not([disabled]),[tabindex='0']")]
    if(event.shiftKey&&document.activeElement===focusable[0]){event.preventDefault();focusable.at(-1).focus()}
    else if(!event.shiftKey&&document.activeElement===focusable.at(-1)){event.preventDefault();focusable[0].focus()}
  }
  toggle.addEventListener("click",()=>{
    if(portal){close();return}
    if(closing)return
    portal=el("div");portal.dataset.mobilePortal=""
    const overlay=el("div","fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0")
    overlay.dataset.state="open";overlay.addEventListener("click",close)
    panel=el("div","fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500 inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm")
    panel.id="mobile-menu";panel.dataset.state="open";panel.setAttribute("role","dialog");panel.setAttribute("aria-modal","true");panel.setAttribute("aria-labelledby","mobile-menu-title");panel.tabIndex=-1
    const heading=el("div","flex flex-col space-y-2 text-center sm:text-left")
    const title=el("h2","font-semibold text-foreground text-2xl",header.dataset.menuTitle || (langMatch?.[1]==="en"?"Tourist Information":"観光案内"));title.id="mobile-menu-title";heading.append(title);panel.append(heading)
    const links=el("div","py-4 space-y-2")
    for(const link of header.querySelector("nav").children) {
      if(!link.matches("a"))continue
      const a=el("a");a.href=link.href;a.append(el("button",ghost+" w-full justify-start text-lg",link.textContent.trim()));a.querySelector("button").type="button";a.addEventListener("click",close);links.append(a)
    }
    const languages=el("div","pt-4 mt-4 border-t"),row=el("div","flex items-center gap-2")
    for(const lang of ["ja","en"]) {
      const original=[...header.querySelectorAll("a")].find(a=>a.textContent.trim()===lang.toUpperCase())
      const a=el("a","flex-1");a.href=original.href
      const button=el("button",(langMatch?.[1]===lang?outline.replace("font-medium","font-bold"):outline)+" w-full",lang.toUpperCase());button.type="button";a.append(button);row.append(a)
    }
    languages.append(row);links.append(languages);panel.append(links)
    const exit=el("button","absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary");exit.type="button"
    exit.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x h-4 w-4"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg><span class="sr-only">Close</span>';exit.addEventListener("click",close);panel.append(exit)
    const scrollbar = window.innerWidth - document.documentElement.clientWidth
    previousStyle={overflow:document.body.style.overflow,paddingRight:document.body.style.paddingRight}
    inertElements=[...document.body.children].map(n=>[n,n.inert]);for(const [n] of inertElements)n.inert=true
    document.body.style.overflow="hidden";if(scrollbar)document.body.style.paddingRight=scrollbar+"px"
    portal.append(overlay,panel);document.body.append(portal);toggle.setAttribute("aria-expanded","true");toggle.dataset.state="open"
    document.addEventListener("keydown",keyboard);panel.querySelector("a").focus()
  })
}
for (const root of document.querySelectorAll("[data-carousel]")) {
  const viewport=root.querySelector(".overflow-hidden"),slides=root.querySelectorAll('[aria-roledescription="slide"]')
  const api=EmblaCarousel(viewport,{startIndex:Math.floor(Math.random()*slides.length),loop:true,axis:"x"},[Autoplay({delay:5000})])
  const buttons=root.querySelectorAll("button"),previous=[...buttons].find(b=>b.textContent.includes("Previous slide")),next=[...buttons].find(b=>b.textContent.includes("Next slide"))
  const refresh=()=>{if(previous)previous.disabled=!api.canScrollPrev();if(next)next.disabled=!api.canScrollNext()}
  previous?.addEventListener("click",()=>api.scrollPrev());next?.addEventListener("click",()=>api.scrollNext())
  root.addEventListener("keydown",event=>{if(event.key==="ArrowLeft"){event.preventDefault();api.scrollPrev()}if(event.key==="ArrowRight"){event.preventDefault();api.scrollNext()}},true)
  api.on("select",refresh);api.on("reInit",refresh);refresh()
}
const hero=document.querySelector("[data-hero]")
if(hero) {
  const host=hero.querySelector("[data-hero-image]"),caption=hero.querySelector("[data-hero-caption]"),header=document.querySelector("[data-home-header]")
  const image=document.createElement("img")
  image.alt="獅子舞の火渡り";image.decoding="async";image.fetchPriority="high"
  image.className="object-cover transition-opacity duration-1000 opacity-0";image.style.cssText="position:absolute;height:100%;width:100%;left:0;top:0;right:0;bottom:0;color:transparent"
  let captionVisible=false,heroVisible=false,bannerVisible=true,banner
  function showBanner() {
    banner?.remove();banner=null
    if(!captionVisible||!heroVisible||!bannerVisible)return
    banner=document.createElement("div");banner.className="fixed rounded bottom-4 left-0 z-30 transition-opacity duration-300 group opacity-100"
    banner.innerHTML='<a href="https://www.furubira-tarakomuseum.com/" target="_blank" rel="noopener noreferrer"><div class="relative bg-white/90 rounded-tr-lg shadow-lg hover:bg-white transition-colors flex items-center gap-4"><button class="absolute -top-3 -right-3 bg-white rounded-full p-1 shadow-md hover:bg-gray-100 z-40 opacity-0 group-hover:opacity-100 transition-opacity duration-300" type="button"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x h-4 w-4 text-gray-600"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg></button><div data-banner-size style="position:relative"><img alt="道の駅ふるびら たらこミュージアム" decoding="async" class="object-cover" style="position:absolute;height:100%;width:100%;left:0;top:0;right:0;bottom:0;color:transparent" src="/banner.png"></div></div></a>'
    banner.querySelector("button").addEventListener("click",event=>{event.preventDefault();bannerVisible=false;showBanner()})
    document.querySelector("canvas[data-flame]").before(banner);sizeBanner()
  }
  function sizeBanner() { const container=banner?.querySelector("[data-banner-size]");if(container){const width=Math.min(innerWidth,360);container.style.width=width+"px";container.style.height=width*(96/360)+"px"} }
  image.addEventListener("load",()=>{
    image.classList.replace("opacity-0","opacity-100")
    setTimeout(()=>{caption.classList.replace("opacity-0","opacity-100");captionVisible=true;showBanner()},1000)
  })
  image.addEventListener("error",()=>{if(!image.src.includes("/no_photo.jpg"))image.src="/no_photo.jpg?height=1080&width=1920"})
  host.append(image)
  const updateImage=()=>{const path=innerWidth<1000?"/hiwatari_sp.jpg":"/hiwatari_cross.jpg";if(new URL(image.src||location.href).pathname!==path)image.src=path;header?.classList.replace("opacity-0","opacity-100")}
  updateImage();window.addEventListener("resize",()=>{updateImage();sizeBanner()})
  new IntersectionObserver(entries=>{heroVisible=entries[0].isIntersecting;showBanner()},{threshold:0.5}).observe(hero)
  const intro=document.querySelector("[data-introduction]")
  if(intro){const observer=new IntersectionObserver(entries=>{if(entries[0].isIntersecting){setTimeout(()=>{for(const n of intro.querySelectorAll(".opacity-0"))n.classList.replace("opacity-0","opacity-100")},500);observer.disconnect()}},{threshold:0.2});observer.observe(intro)}
}
const updateDividers=()=>{for(const n of document.querySelectorAll("[data-divider]"))n.style.backgroundImage="url("+(innerWidth<768?"/hiwatari_sp.jpg":"/hiwatari_cross.jpg")+")"}
updateDividers();window.addEventListener("resize",updateDividers)
const canvas=document.querySelector("[data-flame]");if(canvas)initFlame(canvas)
