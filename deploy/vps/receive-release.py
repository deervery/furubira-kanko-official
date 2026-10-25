#!/usr/bin/env python3
"""Verify immutable release bytes; switch only site symlinks, never system services."""
import argparse,fcntl,hashlib,json,os,pathlib,re,shutil,tarfile,tempfile
ROOT=pathlib.Path("/opt/static-sites")
def sha(p):
    with p.open("rb") as f:return hashlib.file_digest(f,"sha256").hexdigest()
def safe_manifest(directory,kind,revision):
    m=json.loads((directory/"manifest.json").read_text())
    if m["schema"]!=1 or m["kind"]!=kind or m["revision"]!=revision:raise ValueError("Manifest identity mismatch")
    actual={p.relative_to(directory).as_posix() for p in directory.rglob("*") if p.is_file()}-{"manifest.json"}
    if actual!=set(m["files"]):raise ValueError("Manifest file set mismatch")
    for name,digest in m["files"].items():
        p=pathlib.PurePosixPath(name)
        if p.is_absolute() or ".."in p.parts or not re.fullmatch(r"[0-9a-f]{64}",digest):raise ValueError("Unsafe manifest path/hash")
        path=directory/name
        if path.is_symlink() or not path.is_file() or sha(path)!=digest:raise ValueError("Release file hash mismatch: "+name)
    r=json.loads((directory/"site/release.json").read_text())
    if r["revision"]!=revision or r["generator"]!="go":raise ValueError("Static release marker mismatch")
    return m
def switch(base,revision):
    target=base/"releases"/revision
    if target.is_symlink() or not target.is_dir():raise ValueError("Unknown release")
    safe_manifest(target,base.name,revision)
    old=os.readlink(base/"current") if (base/"current").is_symlink() else None
    temp=base/".current-next"
    if temp.exists() or temp.is_symlink():temp.unlink()
    temp.symlink_to("releases/"+revision)
    os.replace(temp,base/"current")
    return old
def install(kind,revision,archive,expected,root=ROOT):
    if kind not in ["company","tourism"] or not re.fullmatch(r"[0-9a-f]{40}",revision):raise ValueError("Invalid deployment identity")
    if not re.fullmatch(r"[0-9a-f]{64}",expected) or sha(archive)!=expected:raise ValueError("Archive checksum mismatch")
    base=root/kind
    if base.is_symlink():raise ValueError("Site root cannot be a symlink")
    (base/"releases").mkdir(parents=True,exist_ok=True)
    with (base/"deploy.lock").open("w") as lock:
      fcntl.flock(lock,fcntl.LOCK_EX)
      with tempfile.TemporaryDirectory(prefix=".incoming-",dir=base/"releases") as name:
        staged=pathlib.Path(name)
        with tarfile.open(archive,"r:gz") as t:
          members=t.getmembers();names=set()
          if len(members)>10000 or sum(m.size for m in members)>512*1024**2:raise ValueError("Archive exceeds distribution limits")
          for m in members:
            p=pathlib.PurePosixPath(m.name)
            if not m.isfile() or p.is_absolute() or ".."in p.parts or "\\"in m.name or m.name in names:raise ValueError("Unsafe archive member")
            if p.parts[0] not in ["site","nginx.conf","route-config.json","manifest.json"]:raise ValueError("Unexpected archive member")
            names.add(m.name)
            dest=staged/m.name;dest.parent.mkdir(parents=True,exist_ok=True)
            with t.extractfile(m) as source,dest.open("wb") as output:shutil.copyfileobj(source,output)
            dest.chmod(0o644)
        manifest=safe_manifest(staged,kind,revision)
        for folder in (staged/"site/assets").iterdir():
          if not folder.is_dir() or not re.fullmatch(r"[0-9a-f]{16}",folder.name):raise ValueError("Unexpected asset prefix")
          target=base/"shared/assets"/folder.name
          if target.exists():
            a={p.relative_to(folder).as_posix():sha(p) for p in folder.rglob("*") if p.is_file()}
            b={p.relative_to(target).as_posix():sha(p) for p in target.rglob("*") if p.is_file()}
            if a!=b:raise ValueError("Content-addressed asset collision")
          else:
            target.parent.mkdir(parents=True,exist_ok=True)
            shutil.copytree(folder,target)
        release=base/"releases"/revision
        if release.exists():
          prior=safe_manifest(release,kind,revision)
          if prior["files"]!=manifest["files"]:raise ValueError("Immutable revision already has different bytes")
        else:os.rename(staged,release)
        previous=switch(base,revision)
        if previous:(base/"previous-release").write_text(previous+"\n")
        result={"kind":kind,"revision":revision,"previous":previous,"root":str(base),"public_cutover_ready":manifest["public_cutover_ready"]}
        print(json.dumps(result))
        return result
if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("kind",choices=["company","tourism"]);p.add_argument("revision")
    p.add_argument("--archive",type=pathlib.Path);p.add_argument("--sha256")
    p.add_argument("--rollback",action="store_true")
    a=p.parse_args()
    if a.rollback:
        if not re.fullmatch(r"[0-9a-f]{40}",a.revision):raise ValueError("Invalid revision")
        base=ROOT/a.kind
        with (base/"deploy.lock").open("w") as lock:
            fcntl.flock(lock,fcntl.LOCK_EX)
            print(json.dumps({"restored":a.revision,"previous":switch(base,a.revision)}))
    else:
        if not a.archive or not a.sha256:p.error("--archive and --sha256 required")
        install(a.kind,a.revision,a.archive,a.sha256)
