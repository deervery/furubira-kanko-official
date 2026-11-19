#!/usr/bin/env python3
"""Package prebuilt public files and include the Go routing configuration."""
import argparse, hashlib, json, pathlib, re, tarfile, tempfile, shutil
KINDS={"company":18099,"tourism":18098}
SUPPORTED_ROUTES={'company': 'b86ce6e2394e8aeb2c1b91277e865cec9314fe5b6d6e64a72d19a24413b88d80', 'tourism': '1d9f0789237a84a99d5e83419cb53450c945f7ceaf1738838afd29e5c3f40c64'}
def digest(p):
    with p.open("rb") as f:return hashlib.file_digest(f,"sha256").hexdigest()
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
        (staging/"server.json").write_text(json.dumps({"mode":kind,"listen":"127.0.0.1:"+str(port),"root":"/opt/static-sites/"+kind+"/current/site","shared":"/opt/static-sites/"+kind+"/shared","routes":"/opt/static-sites/"+kind+"/current/route-config.json"},indent=2)+"\n")
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
