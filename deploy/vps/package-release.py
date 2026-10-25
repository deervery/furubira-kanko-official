#!/usr/bin/env python3
"""Package prebuilt public files and compile the existing routing contract for nginx."""
import argparse, hashlib, json, pathlib, re, tarfile, tempfile, shutil
KINDS={"company":18099,"tourism":18098}
SUPPORTED_ROUTES={'company': 'b86ce6e2394e8aeb2c1b91277e865cec9314fe5b6d6e64a72d19a24413b88d80', 'tourism': '1d9f0789237a84a99d5e83419cb53450c945f7ceaf1738838afd29e5c3f40c64'}
def digest(p):
    with p.open("rb") as f:return hashlib.file_digest(f,"sha256").hexdigest()
def quote(value):
    return '"'+value.replace("\\","\\\\").replace('"','\\"')+'"'
def captures(pattern,prefix):
    i=0
    def replace(m):
        nonlocal i
        i+=1
        return "(?<"+prefix+str(i)+">"
    return re.sub(r"(?<!\\)\((?!\?)",replace,pattern)
def compile_nginx(kind,config,port):
    fingerprint=hashlib.sha256(json.dumps(config["routes"],sort_keys=True,separators=(",",":")).encode()).hexdigest()
    if fingerprint!=SUPPORTED_ROUTES[kind]:raise ValueError("Routing contract changed: review VPS adapter before packaging")
    prefix="vps_"+kind
    root="/opt/static-sites/"+kind
    maps=[f"map $request_method $"+prefix+"_read { default 0; GET 1; HEAD 1; }"]
    lines=["server {",f" listen 127.0.0.1:{port};"," server_name _;"," server_tokens off;",
           f" root {root}/current/site;"," charset utf-8;"," absolute_redirect off;",
           " add_header Cache-Control no-cache;"," error_page 404 =404 @missing;",
           ' location @missing { default_type text/html; add_header Cache-Control no-store always; try_files /404.html =404; }']
    if kind=="tourism":
        maps += [
          f'map $cookie_lang ${prefix}_cookie {{ default ""; ja ja; en en; }}',
          f'map "${prefix}_cookie:$http_accept_language" ${prefix}_lang {{ default ja; "~^ja:" ja; "~^en:" en; "~^:[eE][nN]" en; }}'
        ]
        read=f'if (${prefix}_read = 0) {{ return 405; }}'
        lines += [" location = / { "+read+f" return 307 /${prefix}_lang$is_args$args; }}",
          ' location ~ "^/(?<vps_tourism_path>spots|accommodations|dining|events|access|shopping|furusato|news(?:/.*)?)$" { '+read+f" return 307 /${prefix}_lang/$vps_tourism_path$is_args$args; }}",
          ' location ~ "^/api/cms/(?<vps_tourism_cms>spots|restaurants|accommodations|events|shops)$" { '+read+' default_type application/json; add_header Cache-Control no-store always; try_files /data/$vps_tourism_cms.json =404; }',
          " location = /api/news { "+read+" default_type application/json; add_header Cache-Control no-store always; try_files /data/news.json =404; }",
          ' error_page 410 =410 @tourism_retired;',
          ' location @tourism_retired { default_type application/json; add_header Cache-Control no-store always; try_files /retired-api.json =410; }',
          ' location ~ "^/api/(?:chat(?:/.*)?|embedding|system_message)$" { return 410; }']
    else:
        entries=[]
        for idx,route in enumerate(config["routes"]):
            if route.get("continue") or not route.get("src"):continue
            status=route.get("status")
            if status not in [307,308,410]:continue
            if route.get("has") and any(c["type"]!="host" for c in route["has"]):
                raise ValueError("Unsupported company condition")
            host=next((c["value"] for c in route.get("has",[]) if c["type"]=="host"),"[^:]+")
            method="(?:GET|HEAD)" if route.get("methods")==["GET","HEAD"] else "[^:]+"
            cap="vps_c"+str(idx)+"_"
            src=captures(route["src"],cap)
            target=route.get("headers",{}).get("Location",route.get("dest",""))
            target=re.sub(r"\$(\d+)",lambda m:"$"+cap+m[1],target)
            if route.get("dest","").startswith("https://"):
                target+="$is_args$args"
            if status==410:target=""
            entries.append(" "+quote("~^"+method+":"+"(?:"+host+")"+":(?:"+src+")$")+" "+quote(str(status)+"|"+target)+";")
        maps += ['map "$request_method:$host:$uri" $vps_company_decision {\n default "";\n'+"\n".join(entries)+"\n}",
          'map $vps_company_decision $vps_company_308 { default ""; "~^308[|](?<vps_company_target308>.*)$" $vps_company_target308; }',
          'map $vps_company_decision $vps_company_307 { default ""; "~^307[|](?<vps_company_target307>.*)$" $vps_company_target307; }',
          'map $vps_company_decision $vps_company_gone { default 0; "410|" 1; }']
        lines += [" error_page 410 =410 @retired;",
          " if ($vps_company_gone) { return 410; }",
          ' if ($vps_company_308 != "") { return 308 $vps_company_308; }',
          ' if ($vps_company_307 != "") { return 307 $vps_company_307; }',
          " location @retired { default_type text/html; add_header Cache-Control no-store always; add_header X-Robots-Tag 'noindex, nofollow' always; try_files /410.html =410; }",
          ' location ~ "^/(?:api/inquiries|pages/inquiry/?)$" { default_type application/json; add_header Cache-Control no-store always; return 503 \'{"ready":false,"message":"Private VPS staging: inquiry API is not connected."}\'; }']
    lines += [f" location /assets/ {{ if (${prefix}_read = 0) {{ return 405; }} root {root}/shared; add_header Cache-Control 'public,max-age=31536000,immutable'; try_files $uri =404; }}",
      f" location = /release.json {{ if (${prefix}_read = 0) {{ return 405; }} add_header Cache-Control no-store always; try_files $uri =404; }}",
      " location = /404 { return 404; }"]
    if kind=="company":lines += [" location = /410 { return 404; }"]
    for file,override in config.get("overrides",{}).items():
        route="/"+override.get("path",file)
        if route in ["/","/404","/404.html","/410","/410.html"]:continue
        if not re.fullmatch(r"/[A-Za-z0-9/_-]+",route):raise ValueError("Unsafe page path: "+route)
        lines.append(f" location = {route} {{ if (${prefix}_read = 0) {{ return 405; }} default_type text/html; try_files /{file} =404; }}")
    lines += [f" location / {{ if (${prefix}_read = 0) {{ return 405; }} try_files $uri $uri.html $uri/index.html =404; }}","}"]
    return "\n".join(maps+lines)+"\n"
def package(kind,revision,source,config_path,output,port=None):
    if kind not in KINDS or not re.fullmatch(r"[0-9a-f]{40}",revision):raise ValueError("Invalid kind/revision")
    port=port or KINDS[kind]
    if not 1024<=port<=65535:raise ValueError("Invalid loopback port")
    config=json.loads(config_path.read_text())
    release=json.loads((source/"release.json").read_text())
    if release["generator"]!="go" or release["revision"]!=revision:raise ValueError("Built revision mismatch")
    with tempfile.TemporaryDirectory() as temp:
        staging=pathlib.Path(temp)
        for p in source.rglob("*"):
            if p.is_symlink():raise ValueError("Symlinks cannot be distributed")
        shutil.copytree(source,staging/"site")
        (staging/"nginx.conf").write_text(compile_nginx(kind,config,port))
        (staging/"route-config.json").write_text(json.dumps(config,indent=2))
        hashes={p.relative_to(staging).as_posix():digest(p) for p in sorted(staging.rglob("*")) if p.is_file()}
        manifest={"schema":1,"kind":kind,"revision":revision,"port":port,"files":hashes,
          "public_cutover_ready":False,"static_routes_ready":True,
          "inquiry_api":"none" if kind=="tourism" else "not connected in private staging; separate migration gate"}
        (staging/"manifest.json").write_text(json.dumps(manifest,indent=2)+"\n")
        with tarfile.open(output,"w:gz") as archive:
            for p in sorted(staging.rglob("*")):
                if p.is_file():archive.add(p,arcname=p.relative_to(staging).as_posix(),recursive=False)
    print(json.dumps({"kind":kind,"revision":revision,"archive":str(output),"sha256":digest(output),"public_files":len(hashes)-2}))
if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("kind",choices=KINDS);p.add_argument("revision")
    p.add_argument("--source",type=pathlib.Path,default=pathlib.Path(".vercel/output/static"))
    p.add_argument("--config",type=pathlib.Path,default=pathlib.Path(".vercel/output/config.json"))
    p.add_argument("--output",type=pathlib.Path,default=pathlib.Path("vps-release.tar.gz"))
    p.add_argument("--port",type=int)
    a=p.parse_args();package(a.kind,a.revision,a.source,a.config,a.output,a.port)
