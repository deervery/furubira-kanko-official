#!/usr/bin/env python3
"""Read-only HTTP checks against an installed nginx release. Never sends a real inquiry."""
import argparse,hashlib,json,pathlib,urllib.request,urllib.error,urllib.parse
class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self,*args):return None
def verify(kind,revision,origin):
    root=pathlib.Path("/opt/static-sites")/kind/"releases"/revision
    manifest=json.loads((root/"manifest.json").read_text())
    config=json.loads((root/"route-config.json").read_text())
    opener=urllib.request.build_opener(NoRedirect)
    domain="deervery.com" if kind=="company" else "furubira-kanko.com"
    results=[]
    def req(path,method="GET",headers=None):
        h={"Host":domain};h.update(headers or {})
        try:r=opener.open(urllib.request.Request(origin+path,method=method,headers=h),timeout=10)
        except urllib.error.HTTPError as e:r=e
        with r:
            body=r.read();status=r.status;response_headers=dict(r.headers)
        return status,response_headers,body
    for name,expected in manifest["files"].items():
        if not name.startswith("site/"):continue
        path="/"+name[5:]
        status,headers,body=req(urllib.parse.quote(path,safe="/"))
        assert status==200,(path,status)
        assert hashlib.sha256(body).hexdigest()==expected,("public bytes differ",path)
        if path.startswith("/assets/"):assert "immutable"in headers.get("Cache-Control","")
    for name,o in config["overrides"].items():
        route="/"+o.get("path",name)
        if route in ["/","/404.html","/410.html"]:continue
        status,headers,body=req(route)
        assert status==200,(route,status)
        assert hashlib.sha256(body).hexdigest()==manifest["files"]["site/"+name],route
        results.append({"path":route,"status":status})
    status,headers,body=req("/release.json")
    r=json.loads(body);assert status==200 and r["revision"]==revision and r["generator"]=="go"
    assert "no-store"in headers.get("Cache-Control","")
    status,headers,body=req("/missing-vps-smoke");assert status==404
    status,headers,body=req("/assets/missing.js");assert status==404
    if kind=="tourism":
        cases=[("/",{},"/ja"),("/",{"Accept-Language":"en-US,en;q=0.9"},"/en"),
          ("/spots?from=test",{"Cookie":"lang=ja","Accept-Language":"en"},"/ja/spots?from=test"),
          ("/spots",{"Cookie":"lang=en","Accept-Language":"ja"},"/en/spots")]
        for path,h,want in cases:
            status,headers,body=req(path,headers=h);assert status==307 and headers.get("Location")==want,(path,status,headers.get("Location"))
            results.append({"path":path,"status":status,"location":want})
        for name,count in [("spots",10),("restaurants",6),("accommodations",4),("events",9),("shops",8)]:
            status,headers,body=req("/api/cms/"+name);assert status==200 and len(json.loads(body))==count
            assert body==(root/("site/data/"+name+".json")).read_bytes()
            assert "application/json"in headers.get("Content-Type","")
            results.append({"path":"/api/cms/"+name,"status":status,"rows":count})
        for path in ["/api/chat","/api/chat/messages","/api/embedding","/api/system_message"]:
            status,headers,body=req(path);assert status==410 and body==(root/"site/retired-api.json").read_bytes()
            assert "application/json"in headers.get("Content-Type","")
            results.append({"path":path,"status":status})
        status,headers,body=req("/api/cms/spots","POST");assert status==405
    else:
        for path,want in [("/pages/profile?email=private%40example.invalid","https://deervery.com/company"),
          ("/blogs/news/old?email=private","https://deervery.com/news"),
          ("/admin?email=private","/"),
          ("/cart?variant=1","https://shop.deervery.com/cart?variant=1"),
          ("/products/pocket?variant=1","https://shop.deervery.com/products/pocket?variant=1")]:
            status,headers,body=req(path);assert status in [307,308] and headers.get("Location")==want,(path,status,headers.get("Location"))
            results.append({"path":path,"status":status,"location":want})
        status,headers,body=req("/company?ref=test",headers={"Host":"www.deervery.com"})
        assert status==308 and headers.get("Location")=="https://deervery.com/company?ref=test"
        status,headers,body=req("/pages/ksk");assert status==410 and body==(root/"site/410.html").read_bytes()
        status,headers,body=req("/cart","POST");assert status==405
        for method in ["GET","POST"]:
            status,headers,body=req("/api/inquiries",method);assert status==503 and json.loads(body)["ready"]==False
        results.append({"inquiry_api":"disconnected in private staging; DNS cutover remains blocked"})
    result={"result":"pass","kind":kind,"revision":revision,"verified_static_files":sum(n.startswith("site/") for n in manifest["files"]),"checks":results,"production_inquiry_sent":False}
    print(json.dumps(result,ensure_ascii=False))
    return result
if __name__=="__main__":
    p=argparse.ArgumentParser();p.add_argument("kind",choices=["company","tourism"]);p.add_argument("revision");p.add_argument("origin")
    a=p.parse_args();verify(a.kind,a.revision,a.origin)
