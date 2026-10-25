from html.parser import HTMLParser
from html import escape
import copy,re,json,shutil
from pathlib import Path
VOID=set("area base br col embed hr img input link meta param source track wbr".split())
class Raw:
 def __init__(self,text):self.text=text
 def render(self):return self.text
class Node:
 def __init__(self,tag="",attrs=None,parent=None):self.tag=tag;self.attrs=dict(attrs or []);self.children=[];self.parent=parent
 def walk(self):
  yield self
  for n in self.children:
   if isinstance(n,Node):yield from n.walk()
 def all(self,tag=None,cls=None,**attrs):
  return [n for n in self.walk() if (not tag or n.tag==tag) and (not cls or cls in n.attrs.get("class","").split()) and all(n.attrs.get(k)==v for k,v in attrs.items())]
 def find(self,*args,**kwargs):
  values=self.all(*args,**kwargs)
  return values[0] if values else None
 def text(self):return "".join(n.text() if isinstance(n,Node) else n.text if isinstance(n,Raw) else n for n in self.children)
 def render(self):
  if not self.tag:return "".join(render(n) for n in self.children)
  a="".join(" "+k+('="'+escape(str(v),quote=True)+'"' if v is not None else "") for k,v in self.attrs.items())
  return "<"+self.tag+a+">"+("" if self.tag in VOID else "".join(render(n,self.tag) for n in self.children)+"</"+self.tag+">")
 def replace(self,new):
  i=self.parent.children.index(self);self.parent.children[i]=new
  if isinstance(new,Node):new.parent=self.parent
 def remove(self):
  if self.parent and self in self.parent.children:self.parent.children.remove(self)
def render(n,parent=""):
 if isinstance(n,(Node,Raw)):return n.render()
 return n if parent in ["script","style"] else escape(n,quote=False)
class Parser(HTMLParser):
 def __init__(self,text):
  super().__init__(convert_charrefs=True);self.root=Node();self.stack=[self.root];self.feed(text)
 def handle_starttag(self,tag,attrs):
  n=Node(tag,attrs,self.stack[-1]);self.stack[-1].children.append(n)
  if tag not in VOID:self.stack.append(n)
 def handle_startendtag(self,tag,attrs):self.handle_starttag(tag,attrs);self.handle_endtag(tag)
 def handle_endtag(self,tag):
  for i in range(len(self.stack)-1,0,-1):
   if self.stack[i].tag==tag:self.stack=self.stack[:i];break
 def handle_data(self,data):self.stack[-1].children.append(data)
def parse(text):return Parser(text).root
def action(text):return Raw("{{"+text+"}}")
def write(root,name,text):
 p=root/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(text if isinstance(text,str) else text.render())
def inner(n):return "".join(render(c,n.tag) for c in n.children)
def settext(n,text):n.children=[action(text)]
def attr(n,k,text):n.attrs[k]="@@"+text+"@@"
def finish(text):
 return re.sub(r"@@(.*?)@@",lambda m:"{{"+m[1].replace("&quot;",'"').replace("&#x27;","'").replace("&amp;","&")+"}}",text)
def replace_text(root,old,new):
 for n in root.walk():
  if n.tag in ["script","style"]:continue
  n.children=[action(new) if isinstance(c,str) and c==old else c for c in n.children]
def signature(root):
 def visit(n):
  if isinstance(n,Raw):return None
  if isinstance(n,str):return re.sub(r"\s+"," ",n).strip() or None
  if n.tag in ["script","style","template"] or (n.tag=="link" and n.attrs.get("rel") in ["stylesheet","preload"]):return None
  attrs={k:v for k,v in n.attrs.items() if not k.startswith("data-") and not(k in ["id","aria-controls","aria-describedby"] and (str(v).startswith(("_R_","_S_","radix-")))) and not(n.tag=="html" and k in ["style","class"])}
  chunks=[]
  for child in n.children:
   if isinstance(child,str) and chunks and isinstance(chunks[-1],str):chunks[-1]+=child
   else:chunks.append(child)
  return [n.tag,attrs,[v for c in chunks if (v:=visit(c)) is not None]]
 return visit(root)
def first_difference(a,b,path="document"):
 if type(a)!=type(b):return path+": type differs "+str((a,b))[:200]
 if isinstance(a,list):
  if len(a)!=len(b):return path+": child count "+str((len(a),len(b)))
  for i,(x,y) in enumerate(zip(a,b)):
   d=first_difference(x,y,path+"/"+str(i))
   if d:return d
 elif a!=b:return path+": "+str((a,b))[:700]
 return ""
