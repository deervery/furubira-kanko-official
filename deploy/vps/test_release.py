import hashlib,importlib.util,io,json,pathlib,tarfile,tempfile,unittest
spec=importlib.util.spec_from_file_location("receive",pathlib.Path(__file__).with_name("receive-release.py"))
receive=importlib.util.module_from_spec(spec);spec.loader.exec_module(receive)
class ReleaseBoundaryTests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();self.root=pathlib.Path(self.temp.name)
 def tearDown(self):self.temp.cleanup()
 def artifact(self,revision,label="a",extra=None):
  files={"site/release.json":json.dumps({"revision":revision,"generator":"go"}).encode(),
   "site/assets/"+label*16+"/site.js":label.encode(),"nginx.conf":b"server{}","route-config.json":b"{}"}
  manifest={"schema":1,"kind":"tourism","revision":revision,"public_cutover_ready":False,"files":{k:hashlib.sha256(v).hexdigest() for k,v in files.items()}}
  files["manifest.json"]=json.dumps(manifest).encode()
  if extra:files.update(extra)
  out=self.root/(revision+label+".tar.gz")
  with tarfile.open(out,"w:gz") as t:
   for n,b in files.items():
    m=tarfile.TarInfo(n);m.size=len(b);t.addfile(m,io.BytesIO(b))
  return out,receive.sha(out)
 def test_checksum_and_traversal_do_not_switch_existing_release(self):
  a,d=self.artifact("a"*40);receive.install("tourism","a"*40,a,d,self.root/"sites")
  current=self.root/"sites/tourism/current";before=current.readlink()
  with self.assertRaises(ValueError):receive.install("tourism","a"*40,a,"0"*64,self.root/"sites")
  bad,d=self.artifact("b"*40,extra={"../../escape":b"bad"})
  with self.assertRaises(ValueError):receive.install("tourism","b"*40,bad,d,self.root/"sites")
  self.assertEqual(current.readlink(),before);self.assertFalse((self.root/"escape").exists())
 def test_rollback_preserves_assets_needed_by_open_pages(self):
  a,d=self.artifact("a"*40);receive.install("tourism","a"*40,a,d,self.root/"sites")
  b,d=self.artifact("b"*40,"b");receive.install("tourism","b"*40,b,d,self.root/"sites")
  base=self.root/"sites/tourism";receive.switch(base,"a"*40)
  self.assertEqual(json.loads((base/"current/site/release.json").read_text())["revision"],"a"*40)
  self.assertTrue((base/("shared/assets/"+"b"*16+"/site.js")).exists())
 def test_manifest_rejects_modified_payload_and_immutable_revision_collision(self):
  a,d=self.artifact("a"*40);receive.install("tourism","a"*40,a,d,self.root/"sites")
  collision,d=self.artifact("a"*40,"b")
  with self.assertRaises(ValueError):receive.install("tourism","a"*40,collision,d,self.root/"sites")
  bad,d=self.artifact("b"*40,extra={"site/unlisted.js":b"bad"})
  with self.assertRaises(ValueError):receive.install("tourism","b"*40,bad,d,self.root/"sites")
 def test_symlink_cannot_escape_release(self):
  with tarfile.open(self.root/"link.tar.gz","w:gz") as t:
   m=tarfile.TarInfo("site/link");m.type=tarfile.SYMTYPE;m.linkname="/etc/passwd";t.addfile(m)
  p=self.root/"link.tar.gz"
  with self.assertRaises(ValueError):receive.install("tourism","a"*40,p,receive.sha(p),self.root/"sites")
if __name__=="__main__":unittest.main()
