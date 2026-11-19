// go-web replaces the owned nginx origins using only the Go standard library.
package main

import (
	"bytes"
	"compress/gzip"
	"context"
	"crypto/sha256"
	"crypto/tls"
	"encoding/hex"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"log"
	"mime"
	"net"
	"net/http"
	"net/http/httputil"
	"net/netip"
	"net/url"
	"os"
	"os/signal"
	"path"
	"path/filepath"
	"regexp"
	"slices"
	"strconv"
	"strings"
	"sync"
	"syscall"
	"time"
)

type Config struct {
	Mode      string          `json:"mode"`
	Listen    string          `json:"listen"`
	Root      string          `json:"root"`
	Shared    string          `json:"shared"`
	Routes    string          `json:"routes"`
	EventLog  string          `json:"event_log"`
	TokenFile string          `json:"token_file"`
	Origin    string          `json:"origin"`
	Backend   string          `json:"backend"`
	Socket    string          `json:"socket"`
	HTTP      string          `json:"http"`
	HTTPS     string          `json:"https"`
	Hosts     map[string]Host `json:"hosts"`
}
type Host struct {
	Target           string `json:"target"`
	Certificate      string `json:"certificate"`
	Key              string `json:"key"`
	ACME             string `json:"acme"`
	Redirect         string `json:"redirect"`
	RedirectStatus   int    `json:"redirect_status"`
	CORS             bool   `json:"cors"`
	Forms            bool   `json:"forms"`
	RetiredInquiries bool   `json:"retired_inquiries"`
	MaxBody          int64  `json:"max_body"`
}
type Condition struct {
	Type, Key string
	Value     any
}
type Transform struct {
	Type, Op string
	Target   struct{ Key struct{ Pre string } }
}
type Route struct {
	Src, Dest, Handle string
	Headers           map[string]string
	Methods           []string
	Has, Missing      []Condition
	Transforms        []Transform
	Status            int
	Continue          bool
	re                *regexp.Regexp
}
type Override struct {
	Path        *string
	ContentType string
}
type Contract struct {
	Routes    []Route
	Overrides map[string]Override
}
type bucket struct {
	tokens float64
	at     time.Time
}
type app struct {
	c            Config
	mu           sync.Mutex
	contract     *Contract
	contractName string
	buckets      map[string]bucket
}

func newApp(c Config) (*app, error) {
	if c.Mode == "" {
		return nil, errors.New("mode is required")
	}
	if c.Mode == "display" && c.TokenFile == "" {
		c.TokenFile = os.Getenv("DISPLAY_TOKEN_FILE")
		if c.TokenFile == "" {
			c.TokenFile = filepath.Join(os.Getenv("CREDENTIALS_DIRECTORY"), "display-token")
		}
	}
	a := &app{c: c, buckets: map[string]bucket{}}
	if c.Mode == "company" || c.Mode == "tourism" {
		if _, e := a.loadContract(); e != nil {
			return nil, e
		}
	}
	if c.Mode == "display" {
		h, _, e := net.SplitHostPort(c.Listen)
		if e != nil || h != "127.0.0.1" {
			return nil, errors.New("display must bind 127.0.0.1")
		}
		token, e := os.ReadFile(c.TokenFile)
		if e != nil || len(strings.TrimSpace(string(token))) != 64 {
			return nil, errors.New("invalid display token file")
		}
	}
	return a, nil
}
func (a *app) loadContract() (*Contract, error) {
	a.mu.Lock()
	defer a.mu.Unlock()
	name, e := filepath.EvalSymlinks(a.c.Routes)
	if e != nil {
		return nil, e
	}
	if a.contract != nil && name == a.contractName {
		return a.contract, nil
	}
	b, e := os.ReadFile(name)
	if e != nil {
		return nil, e
	}
	var c Contract
	if e = json.Unmarshal(b, &c); e != nil {
		return nil, e
	}
	for i := range c.Routes {
		r := &c.Routes[i]
		if r.Src != "" {
			r.re, e = regexp.Compile("^(?:" + r.Src + ")$")
			if e != nil {
				return nil, e
			}
		}
	}
	a.contract = &c
	a.contractName = name
	return &c, nil
}
func hostname(h string) string {
	if v, _, e := net.SplitHostPort(h); e == nil {
		return strings.ToLower(v)
	}
	return strings.ToLower(h)
}
func readOnly(w http.ResponseWriter, r *http.Request) bool {
	if r.Method == "GET" || r.Method == "HEAD" {
		return true
	}
	w.Header().Set("Allow", "GET, HEAD")
	w.WriteHeader(405)
	return false
}
func plain(w http.ResponseWriter, r *http.Request, status int, body string) {
	w.WriteHeader(status)
	if r.Method != "HEAD" {
		io.WriteString(w, body)
	}
}
func redirect(w http.ResponseWriter, r *http.Request, status int, to string) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Header().Set("Location", to)
	w.WriteHeader(status)
}
func querySuffix(raw string) string {
	if raw != "" {
		return "?" + raw
	}
	return ""
}
func cleanRelative(p string) (string, bool) {
	if strings.ContainsAny(p, "\\\x00") {
		return "", false
	}
	for _, v := range strings.Split(p, "/") {
		if v == ".." || strings.HasPrefix(v, ".") && v != "" && v != ".well-known" {
			return "", false
		}
	}
	return strings.TrimPrefix(p, "/"), true
}
func file(w http.ResponseWriter, r *http.Request, root, name string, status int, inject bool, fallback ...string) bool {
	rel, ok := cleanRelative(name)
	if !ok {
		return false
	}
	if rel == "" {
		rel = "index.html"
	}
	fs, e := os.OpenRoot(root)
	if e != nil {
		return false
	}
	defer fs.Close()
	f, e := fs.Open(rel)
	if e != nil {
		return false
	}
	defer f.Close()
	st, e := f.Stat()
	if e != nil || !st.Mode().IsRegular() {
		return false
	}
	if w.Header().Get("Content-Type") == "" {
		t := mime.TypeByExtension(filepath.Ext(rel))
		if len(fallback) > 0 {
			// Keep the deployed static-origin media types, including its text fallback.
			media := map[string]string{".html": "text/html; charset=utf-8", ".htm": "text/html; charset=utf-8", ".css": "text/css", ".js": "application/javascript", ".mjs": "text/javascript", ".json": "application/json", ".xml": "text/xml", ".txt": "text/plain", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".webp": "image/webp", ".avif": "image/avif", ".ico": "image/x-icon", ".woff": "font/woff", ".woff2": "font/woff2", ".ttf": "font/ttf", ".otf": "font/otf", ".pdf": "application/pdf", ".wasm": "application/wasm", ".mp4": "video/mp4"}
			t = media[strings.ToLower(filepath.Ext(rel))]
		}
		if t == "" {
			t = "application/octet-stream"
			if len(fallback) > 0 {
				t = fallback[0]
			}
		}
		w.Header().Set("Content-Type", t)
	}
	if inject || status != 200 {
		b, e := io.ReadAll(io.LimitReader(f, 16<<20))
		if e != nil {
			return false
		}
		if inject {
			b = []byte(strings.Replace(string(b), "</head>", "<script defer src=\"/_watchdog/script.js\"></script></head>", 1))
		}
		w.Header().Set("Content-Length", strconv.Itoa(len(b)))
		w.WriteHeader(status)
		if r.Method != "HEAD" {
			w.Write(b)
		}
		return true
	}
	sum := sha256.Sum256([]byte(fmt.Sprintf("%s:%d:%d", rel, st.Size(), st.ModTime().UnixNano())))
	w.Header().Set("ETag", "\""+hex.EncodeToString(sum[:12])+"\"")
	contentType := w.Header().Get("Content-Type")
	if st.Size() >= 1024 && st.Size() <= 16<<20 && r.Header.Get("Range") == "" && strings.Contains(r.Header.Get("Accept-Encoding"), "gzip") && (strings.HasPrefix(contentType, "text/") || strings.Contains(contentType, "javascript") || strings.Contains(contentType, "json") || strings.Contains(contentType, "svg")) {
		var compressed bytes.Buffer
		z, _ := gzip.NewWriterLevel(&compressed, 5)
		if _, e = io.Copy(z, f); e != nil {
			return false
		}
		if e = z.Close(); e != nil {
			return false
		}
		w.Header().Set("Content-Encoding", "gzip")
		w.Header().Add("Vary", "Accept-Encoding")
		w.Header().Set("ETag", strings.TrimSuffix(w.Header().Get("ETag"), "\"")+"-gzip\"")
		http.ServeContent(w, r, path.Base(rel), st.ModTime(), bytes.NewReader(compressed.Bytes()))
		return true
	}
	http.ServeContent(w, r, path.Base(rel), st.ModTime(), f)
	return true
}
func (a *app) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if _, ok := cleanRelative(r.URL.Path); !ok {
		w.WriteHeader(404)
		return
	}
	switch a.c.Mode {
	case "company", "tourism":
		a.routed(w, r)
	case "local":
		a.local(w, r)
	case "lhlp":
		a.lhlp(w, r)
	case "display":
		a.display(w, r)
	case "edge":
		a.edge(w, r)
	default:
		w.WriteHeader(500)
	}
}
func condition(c Condition, r *http.Request, q url.Values) bool {
	var vals []string
	switch c.Type {
	case "host":
		vals = []string{hostname(r.Host)}
	case "query":
		vals = q[c.Key]
	case "header":
		vals = r.Header.Values(c.Key)
	case "cookie":
		if k, e := r.Cookie(c.Key); e == nil {
			vals = []string{k.Value}
		}
	}
	if len(vals) != 1 {
		return false
	}
	if c.Value == nil {
		return true
	}
	v, ok := c.Value.(string)
	if !ok {
		if m, yes := c.Value.(map[string]any); yes {
			v, _ = m["re"].(string)
		} else {
			return false
		}
	}
	rx, e := regexp.Compile("^(?:" + v + ")$")
	return e == nil && rx.MatchString(vals[0])
}
func conditions(cs []Condition, r *http.Request, q url.Values) bool {
	for _, c := range cs {
		if !condition(c, r, q) {
			return false
		}
	}
	return true
}

var capture = regexp.MustCompile(`\$(\d+)`)

func expand(s string, m []string) string {
	return capture.ReplaceAllStringFunc(s, func(v string) string {
		i, _ := strconv.Atoi(v[1:])
		if i < len(m) {
			return m[i]
		}
		return ""
	})
}
func (a *app) missing(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Del("Location")
	if !file(w, r, a.c.Root, "404.html", 404, false) {
		w.WriteHeader(404)
	}
}
func (a *app) routed(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "no-cache")
	p := r.URL.Path
	if a.c.Mode == "company" && (p == "/api/inquiries" || p == "/api/inquiries/") {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Cache-Control", "no-store")
		plain(w, r, 410, `{"ready":false,"message":"Use https://deervery.com/contact"}`)
		return
	}
	retired := a.c.Mode == "tourism" && regexp.MustCompile(`^/api/(?:chat(?:/.*)?|embedding|system_message)$`).MatchString(p)
	if !retired && !readOnly(w, r) {
		return
	}
	contract, e := a.loadContract()
	if e != nil {
		w.WriteHeader(503)
		return
	}
	if p == "/release.json" {
		w.Header().Set("Cache-Control", "no-store")
		if file(w, r, a.c.Root, "release.json", 200, false) {
			return
		}
	}
	// Vercel overrides publish clean URLs and keep their raw HTML filenames private.
	for name, o := range contract.Overrides {
		if o.Path != nil && p == "/"+name && *o.Path != name {
			a.missing(w, r)
			return
		}
	}
	q := r.URL.Query()
	raw := r.URL.RawQuery
	for _, route := range contract.Routes {
		if route.Handle == "filesystem" {
			if a.routeFile(w, r, contract, p, 200) {
				return
			}
			continue
		}
		if route.re == nil {
			continue
		}
		m := route.re.FindStringSubmatch(p)
		if m == nil || len(route.Methods) > 0 && !slices.Contains(route.Methods, r.Method) || !conditions(route.Has, r, q) {
			continue
		}
		missing := false
		for _, c := range route.Missing {
			if condition(c, r, q) {
				missing = true
				break
			}
		}
		if missing {
			continue
		}
		for _, t := range route.Transforms {
			if t.Type == "request.query" && t.Op == "delete" && t.Target.Key.Pre == "" {
				q = url.Values{}
				raw = ""
			}
		}
		for k, v := range route.Headers {
			w.Header().Set(k, expand(v, m))
		}
		if route.Status >= 300 && route.Status < 400 {
			to := w.Header().Get("Location")
			if to == "" {
				to = expand(route.Dest, m)
			}
			u, e := url.Parse(to)
			if e != nil {
				w.WriteHeader(500)
				return
			}
			if u.RawQuery == "" {
				u.RawQuery = raw
			}
			redirect(w, r, route.Status, u.String())
			return
		}
		if route.Continue {
			continue
		}
		if route.Dest != "" {
			u, e := url.Parse(expand(route.Dest, m))
			if e != nil {
				w.WriteHeader(500)
				return
			}
			p = u.Path
			if u.RawQuery != "" {
				for k, vs := range u.Query() {
					q[k] = append(q[k], vs...)
				}
				raw = q.Encode()
			}
			if strings.HasPrefix(r.URL.Path, "/api/cms/") {
				w.Header().Set("Cache-Control", "no-store")
			}
			if route.Status > 0 {
				if route.Status == 410 {
					w.Header().Set("Cache-Control", "no-store")
					if a.c.Mode == "company" {
						w.Header().Set("X-Robots-Tag", "noindex, nofollow")
					}
				}
				if a.routeFile(w, r, contract, p, route.Status) {
					return
				}
			}
		}
	}
	a.missing(w, r)
}
func (a *app) routeFile(w http.ResponseWriter, r *http.Request, c *Contract, p string, status int) bool {
	if strings.HasPrefix(p, "/assets/") && a.c.Shared != "" {
		w.Header().Set("Cache-Control", "public,max-age=31536000,immutable")
		return file(w, r, a.c.Shared, p, status, false, "text/plain")
	}
	clean := strings.TrimSuffix(p, "/")
	if clean == "" {
		clean = "/"
	}
	for name, o := range c.Overrides {
		target := "/" + name
		if o.Path != nil {
			target = "/" + *o.Path
		}
		if target == clean {
			if o.ContentType != "" {
				w.Header().Set("Content-Type", o.ContentType)
			}
			return file(w, r, a.c.Root, name, status, false, "text/plain")
		}
	}
	if file(w, r, a.c.Root, p, status, false, "text/plain") {
		return true
	}
	if file(w, r, a.c.Root, strings.TrimSuffix(p, "/")+".html", status, false, "text/plain") {
		return true
	}
	return file(w, r, a.c.Root, strings.TrimSuffix(p, "/")+"/index.html", status, false, "text/plain")
}
func (a *app) local(w http.ResponseWriter, r *http.Request) {
	if !readOnly(w, r) {
		return
	}
	p := r.URL.Path
	root := a.c.Root
	if p == "/manifest.json" {
		w.WriteHeader(404)
		return
	}
	if p == "/release.json" {
		w.Header().Set("Cache-Control", "no-store")
	} else if strings.HasPrefix(p, "/_next/static/") {
		root = a.c.Shared
		w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
	} else if strings.HasPrefix(p, "/photos/") {
		w.Header().Set("Cache-Control", "public, max-age=3600, must-revalidate")
	} else {
		w.Header().Set("Cache-Control", "no-cache")
	}
	if file(w, r, root, p, 200, false) {
		return
	}
	if file(w, r, root, strings.TrimSuffix(p, "/")+"/index.html", 200, false) {
		return
	}
	w.WriteHeader(404)
}
func (a *app) allow(key string, rate, burst float64) bool {
	a.mu.Lock()
	defer a.mu.Unlock()
	now := time.Now()
	v, ok := a.buckets[key]
	if !ok {
		if len(a.buckets) >= 20000 {
			for k, b := range a.buckets {
				if now.Sub(b.at) > time.Minute {
					delete(a.buckets, k)
				}
			}
			if len(a.buckets) >= 20000 {
				return false
			}
		}
		v = bucket{burst, now}
	}
	v.tokens = min(burst, v.tokens+now.Sub(v.at).Seconds()*rate)
	v.at = now
	allowed := v.tokens >= 1
	if allowed {
		v.tokens--
	}
	a.buckets[key] = v
	return allowed
}
func (a *app) lhlp(w http.ResponseWriter, r *http.Request) {
	for k, v := range map[string]string{"X-Content-Type-Options": "nosniff", "X-Frame-Options": "DENY", "Referrer-Policy": "strict-origin-when-cross-origin", "Permissions-Policy": "camera=(), microphone=(), geolocation=()", "Content-Security-Policy": "default-src 'self'; img-src 'self' https://deervery.com data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'; font-src 'self' data:; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"} {
		w.Header().Set(k, v)
	}
	p := r.URL.Path
	w.Header().Set("Cache-Control", "no-cache")
	if p == "/" || p == "/stay" || p == "/stay/" || p == "/stay/index.html" || p == "/ab/e" {
		w.Header().Set("Cache-Control", "no-store")
	}
	ip := r.Header.Get("CF-Connecting-IP")
	if ip == "" {
		ip, _, _ = net.SplitHostPort(r.RemoteAddr)
	}
	if p == "/ab/e" {
		if r.Method != "GET" && r.Method != "HEAD" && r.Method != "POST" {
			w.WriteHeader(403)
			return
		}
		if !a.allow("ab:"+ip, 5, 40) {
			w.WriteHeader(503)
			return
		}
		r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
		if _, e := io.Copy(io.Discard, r.Body); e != nil {
			w.WriteHeader(413)
			return
		}
		a.mu.Lock()
		f, e := os.OpenFile(a.c.EventLog, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0640)
		if e == nil {
			_, e = fmt.Fprintf(f, "%s\t%s\n", time.Now().Format(time.RFC3339), strings.NewReplacer("\n", "", "\r", "").Replace(r.URL.RawQuery))
			f.Close()
		}
		a.mu.Unlock()
		if e != nil {
			w.WriteHeader(503)
			return
		}
		w.WriteHeader(204)
		return
	}
	if !readOnly(w, r) {
		return
	}
	switch p {
	case "/healthz":
		w.Header().Set("Content-Type", "text/plain")
		plain(w, r, 200, "ok\n")
		return
	case "/":
		redirect(w, r, 302, "/stay/"+querySuffix(r.URL.RawQuery))
		return
	case "/stay":
		redirect(w, r, 301, "/stay/"+querySuffix(r.URL.RawQuery))
		return
	}
	if !strings.HasPrefix(p, "/stay/") {
		w.WriteHeader(404)
		return
	}
	if !a.allow("public:"+ip, 20, 80) {
		w.WriteHeader(503)
		return
	}
	if file(w, r, a.c.Root, p, 200, false) {
		return
	}
	if file(w, r, a.c.Root, strings.TrimSuffix(p, "/")+"/index.html", 200, false) {
		return
	}
	w.WriteHeader(404)
}

var upstreamTransport = &http.Transport{Proxy: nil, DialContext: (&net.Dialer{Timeout: 5 * time.Second, KeepAlive: 30 * time.Second}).DialContext, ForceAttemptHTTP2: false, MaxIdleConns: 64, MaxIdleConnsPerHost: 16, MaxConnsPerHost: 64, IdleConnTimeout: 90 * time.Second, ResponseHeaderTimeout: 65 * time.Second}

func proxy(target string, adjust func(*http.Request), change func(*http.Response) error) *httputil.ReverseProxy {
	u, e := url.Parse(target)
	if e != nil {
		panic(e)
	}
	return &httputil.ReverseProxy{Transport: upstreamTransport, FlushInterval: -1, Rewrite: func(p *httputil.ProxyRequest) {
		host := p.In.Host
		p.SetURL(u)
		p.Out.Host = host
		p.Out.Header.Del("Forwarded")
		p.Out.Header.Del("X-Forwarded-For")
		p.Out.Header.Del("X-Real-IP")
		p.SetXForwarded()
		if adjust != nil {
			adjust(p.Out)
		}
	}, ModifyResponse: change, ErrorHandler: func(w http.ResponseWriter, r *http.Request, e error) { http.Error(w, "Upstream unavailable", 502) }}
}
func trusted(remote string) bool {
	host, _, e := net.SplitHostPort(remote)
	if e != nil {
		return false
	}
	ip, e := netip.ParseAddr(host)
	if e != nil {
		return false
	}
	ip = ip.Unmap()
	for _, s := range []string{"127.0.0.0/8", "::1/128", "172.18.0.0/16", "100.64.0.0/10", "fd7a:115c:a1e0::/48"} {
		if netip.MustParsePrefix(s).Contains(ip) {
			return true
		}
	}
	return false
}
func (a *app) edge(w http.ResponseWriter, r *http.Request) {
	if !trusted(r.RemoteAddr) {
		w.WriteHeader(403)
		return
	}
	host := hostname(r.Host)
	h, ok := a.c.Hosts[host]
	if !ok {
		w.WriteHeader(404)
		return
	}
	if strings.HasPrefix(r.URL.Path, "/.well-known/acme-challenge/") && h.ACME != "" {
		if readOnly(w, r) && file(w, r, h.ACME, r.URL.Path, 200, false) {
			return
		}
		w.WriteHeader(404)
		return
	}
	if r.TLS == nil || ((h.Forms || h.RetiredInquiries) && r.Header.Get("X-Forwarded-Proto") == "http") {
		status := 308
		if r.TLS == nil && (host == "localhost.deervery.com" || host == "furubira-taiken.com") {
			status = 301
		}
		redirect(w, r, status, "https://"+host+r.URL.RequestURI())
		return
	}
	if h.CORS {
		w.Header().Set("Strict-Transport-Security", "max-age=63072000")
	}
	if h.Redirect != "" {
		redirect(w, r, h.RedirectStatus, h.Redirect+r.URL.RequestURI())
		return
	}
	if h.RetiredInquiries && r.URL.Path == "/api/inquiries" {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Cache-Control", "no-store")
		plain(w, r, 410, `{"ready":false,"message":"Use https://deervery.com/contact"}`)
		return
	}
	if h.Forms && strings.HasPrefix(r.URL.Path, "/media-review/") {
		w.Header().Set("X-Robots-Tag", "noindex, nofollow, noarchive")
		w.Header().Set("Referrer-Policy", "no-referrer")
		w.Header().Set("Cache-Control", "no-store")
		redirect(w, r, 302, "https://raku-sika-lite--article-569-983be920db9c-00pmp42a.web.app")
		return
	}
	target := h.Target
	forms := h.Forms && (r.URL.Path == "/internal/forms/status" || r.URL.Path == "/internal/forms/inquiries")
	if forms {
		if r.Method != "GET" && r.Method != "HEAD" && (r.URL.Path != "/internal/forms/inquiries" || r.Method != "POST") {
			w.WriteHeader(403)
			return
		}
		target = "http://127.0.0.1:8098"
		h.MaxBody = 32768
	}
	if h.MaxBody == 0 {
		h.MaxBody = 1 << 20
	}
	if r.ContentLength > h.MaxBody {
		w.WriteHeader(413)
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, h.MaxBody)
	proxy(target, func(out *http.Request) {
		out.Header.Set("X-Forwarded-Proto", "https")
		ip, _, _ := net.SplitHostPort(r.RemoteAddr)
		if netip.MustParsePrefix("172.18.0.0/16").Contains(parseIP(ip)) {
			if cf := r.Header.Get("CF-Connecting-IP"); net.ParseIP(cf) != nil {
				ip = cf
			}
		}
		out.Header.Set("X-Real-IP", ip)
		out.Header.Set("X-Forwarded-For", ip)
		if forms {
			out.Header.Del("Authorization")
		}
	}, func(res *http.Response) error {
		if h.CORS && (res.StatusCode == 200 || res.StatusCode == 206 || res.StatusCode == 304) {
			res.Header.Set("Access-Control-Allow-Origin", "*")
		}
		return nil
	}).ServeHTTP(w, r)
}
func parseIP(s string) netip.Addr { v, _ := netip.ParseAddr(s); return v.Unmap() }
func (a *app) display(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "no-store")
	p := r.URL.Path
	if p == "/_watchdog/script.js" || p == "/_watchdog/pulse" {
		if p == "/_watchdog/script.js" && !readOnly(w, r) {
			return
		}
		if p == "/_watchdog/pulse" {
			if r.Method != "POST" {
				w.WriteHeader(403)
				return
			}
			if r.ContentLength > 1024 {
				w.WriteHeader(413)
				return
			}
			r.Body = http.MaxBytesReader(w, r.Body, 1024)
		}
		dest := "/script.js"
		if p == "/_watchdog/pulse" {
			dest = "/pulse"
		}
		handler := proxy("http://localhost", func(out *http.Request) {
			out.URL.Path = dest
			out.URL.RawPath = ""
			out.Header.Del("Cookie")
			out.Header.Del("Authorization")
		}, nil)
		handler.Transport = &http.Transport{DisableKeepAlives: true, DialContext: func(ctx context.Context, network, address string) (net.Conn, error) {
			return (&net.Dialer{Timeout: 3 * time.Second}).DialContext(ctx, "unix", a.c.Socket)
		}}
		handler.ServeHTTP(w, r)
		return
	}
	if strings.HasPrefix(p, "/_watchdog/") {
		w.WriteHeader(404)
		return
	}
	if !readOnly(w, r) {
		return
	}
	if strings.HasPrefix(p, "/api/") {
		b, e := os.ReadFile(a.c.TokenFile)
		if e != nil {
			w.WriteHeader(503)
			return
		}
		proxy(a.c.Backend, func(out *http.Request) {
			out.Header.Del("Cookie")
			out.Header.Set("Authorization", "Bearer "+strings.TrimSpace(string(b)))
			out.Header.Set("Origin", a.c.Origin)
		}, nil).ServeHTTP(w, r)
		return
	}
	if file(w, r, a.c.Root, p, 200, p == "/" || strings.HasSuffix(p, ".html")) {
		return
	}
	if file(w, r, a.c.Root, strings.TrimSuffix(p, "/")+"/index.html", 200, true) {
		return
	}
	if file(w, r, a.c.Root, "index.html", 200, true) {
		return
	}
	w.WriteHeader(404)
}
func run(c Config, check bool) error {
	a, e := newApp(c)
	if e != nil {
		return e
	}
	if check {
		return nil
	}
	_ = mime.AddExtensionType(".mjs", "text/javascript")
	_ = mime.AddExtensionType(".js", "application/javascript")
	_ = mime.AddExtensionType(".ico", "image/x-icon")
	_ = mime.AddExtensionType(".webmanifest", "application/manifest+json")
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()
	errs := make(chan error, 2)
	var servers []*http.Server
	start := func(addr string, tlsConfig *tls.Config) {
		s := &http.Server{Addr: addr, Handler: a, ReadHeaderTimeout: 10 * time.Second, ReadTimeout: 30 * time.Second, IdleTimeout: 30 * time.Second, MaxHeaderBytes: 64 << 10, TLSConfig: tlsConfig}
		servers = append(servers, s)
		go func() {
			if tlsConfig != nil {
				errs <- s.ListenAndServeTLS("", "")
			} else {
				errs <- s.ListenAndServe()
			}
		}()
	}
	if c.Mode == "edge" {
		tc := &tls.Config{MinVersion: tls.VersionTLS12, GetCertificate: func(hi *tls.ClientHelloInfo) (*tls.Certificate, error) {
			h, ok := c.Hosts[strings.ToLower(hi.ServerName)]
			if !ok {
				return nil, errors.New("unknown TLS host")
			}
			cert, e := tls.LoadX509KeyPair(h.Certificate, h.Key)
			return &cert, e
		}}
		start(c.HTTP, nil)
		start(c.HTTPS, tc)
	} else {
		start(c.Listen, nil)
	}
	select {
	case <-ctx.Done():
	case e = <-errs:
		if !errors.Is(e, http.ErrServerClosed) {
			stop()
		} else {
			e = nil
		}
	}
	for _, s := range servers {
		shutdown, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		s.Shutdown(shutdown)
		cancel()
	}
	return e
}
func main() {
	p := flag.String("config", "", "JSON configuration file")
	mode := flag.String("mode", "", "server mode")
	listen := flag.String("listen", "127.0.0.1:8080", "listen address")
	root := flag.String("root", ".", "static root")
	routes := flag.String("routes", "", "routing contract")
	shared := flag.String("shared", "", "shared assets root")
	events := flag.String("events", "/var/log/go-web/events.log", "AB event log")
	check := flag.Bool("check-config", false, "validate and exit")
	probe := flag.String("probe", "", "check an HTTP health endpoint and exit")
	flag.Parse()
	if *probe != "" {
		client := &http.Client{Timeout: 3 * time.Second}
		res, err := client.Get(*probe)
		if err != nil {
			os.Exit(1)
		}
		res.Body.Close()
		if res.StatusCode != 200 {
			os.Exit(1)
		}
		return
	}
	c := Config{Mode: *mode, Listen: *listen, Root: *root, Routes: *routes, Shared: *shared, EventLog: *events}
	if *p != "" {
		b, e := os.ReadFile(*p)
		if e != nil {
			log.Fatal(e)
		}
		if e = json.Unmarshal(b, &c); e != nil {
			log.Fatal(e)
		}
	}
	if e := run(c, *check); e != nil {
		log.Fatal(e)
	}
}
