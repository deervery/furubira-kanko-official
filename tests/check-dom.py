import json,hashlib,sys
from pathlib import Path
from dom_tree import parse,signature,first_difference
root=Path(__file__).resolve().parents[1]
failures=[]
for p in sorted((root/"tests/baseline").rglob("*.json")):
 rel=p.relative_to(root/"tests/baseline")
 if str(rel) in ["assets.json","css.json","functions.json","api.json","sitemap.json"]:continue
 if str(rel)=="contact.json" and (root/"server").exists():continue
 actual=root/"out"/rel.with_suffix(".html")
 if not actual.exists():failures.append(str(rel)+": missing");continue
 diff=first_difference(json.loads(p.read_text()),signature(parse(actual.read_text())))
 if diff:failures.append(str(rel)+": "+diff)
manifest=json.loads((root/"tests/baseline/assets.json").read_text())
for filename,want in manifest["public_assets"].items():
 actual=root/"out"/filename
 if not actual.is_file() or hashlib.sha256(actual.read_bytes()).hexdigest()!=want:failures.append("asset differs: "+filename)
for filename,want in json.loads((root/"tests/baseline/css.json").read_text()).items():
 actual=root/"out"/json.loads((root/"out/release.json").read_text())["assetsPrefix"].lstrip("/")/filename
 if not actual.is_file() or hashlib.sha256(actual.read_bytes()).hexdigest()!=want:failures.append("stylesheet differs: "+filename)
functions=root/"tests/baseline/functions.json"
if functions.exists():
 for filename,want in json.loads(functions.read_text()).items():
  actual=root/".vercel/output/functions/api/inquiries.func"/filename
  if not actual.is_file() or hashlib.sha256(actual.read_bytes()).hexdigest()!=want:failures.append("inquiry implementation differs: "+filename)
for p in (root/"out").rglob("*.html"):
 content=p.read_text()
 if 'src="/_next/' in content or "self.__next" in content:failures.append("framework payload remains: "+str(p.relative_to(root)))
if failures:
 print("\n".join(failures));sys.exit(1)
print("DOM, CSS, asset and retained-function contracts match source commit "+manifest["source_commit"])

api=root/"tests/baseline/api.json"
if api.exists():
 for filename,value in json.loads(api.read_text()).items():
  assert json.loads((root/"out"/filename).read_text())==value,"static JSON contract differs: "+filename
import xml.etree.ElementTree as ET
def sitemap_entries(p):
 doc=ET.parse(p).getroot();return {next(n.text for n in entry if n.tag.endswith("loc")):{n.tag.rsplit("}",1)[-1]:n.text for n in entry if not n.tag.endswith("lastmod")} for entry in doc}
expected=json.loads((root/"tests/baseline/sitemap.json").read_text())
assert sitemap_entries(root/"out/sitemap.xml")==expected,"sitemap contract differs"
