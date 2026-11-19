package main

import (
	"crypto/tls"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func put(t *testing.T, root, name, body string) {
	t.Helper()
	p := filepath.Join(root, name)
	if e := os.MkdirAll(filepath.Dir(p), 0755); e != nil {
		t.Fatal(e)
	}
	if e := os.WriteFile(p, []byte(body), 0644); e != nil {
		t.Fatal(e)
	}
}
func request(a http.Handler, method, p string) *httptest.ResponseRecorder {
	r := httptest.NewRequest(method, p, nil)
	r.Host = "deervery.com"
	r.RemoteAddr = "127.0.0.1:1234"
	w := httptest.NewRecorder()
	a.ServeHTTP(w, r)
	return w
}
func TestStaticBoundaryAndRange(t *testing.T) {
	root := t.TempDir()
	put(t, root, "index.html", "hello-world")
	put(t, root, "manifest.json", "private manifest")
	outside := t.TempDir()
	put(t, outside, "secret", "private")
	if e := os.Symlink(outside, filepath.Join(root, "escape")); e != nil {
		t.Fatal(e)
	}
	a, _ := newApp(Config{Mode: "local", Root: root})
	for _, p := range []string{"/manifest.json", "/../secret", "/escape/secret", "/.git/config", "/file%5csecret"} {
		if w := request(a, "GET", p); w.Code != 404 {
			t.Errorf("%s: %d", p, w.Code)
		}
	}
	r := httptest.NewRequest("GET", "/", nil)
	r.Header.Set("Range", "bytes=0-4")
	w := httptest.NewRecorder()
	a.ServeHTTP(w, r)
	if w.Code != 206 || w.Body.String() != "hello" {
		t.Fatalf("range %d %q", w.Code, w.Body.String())
	}
	if w := request(a, "POST", "/"); w.Code != 405 {
		t.Fatal(w.Code)
	}
}
func TestRouteContractsAndPrivacy(t *testing.T) {
	root := t.TempDir()
	put(t, root, "company.html", "company")
	put(t, root, "404.html", "missing")
	put(t, root, "contact.html", "chooser")
	put(t, root, "index.html", "home")
	for _, kind := range []string{"company", "tourism"} {
		b, e := os.ReadFile("testdata/" + kind + ".json")
		if e != nil {
			t.Fatal(e)
		}
		cfg := filepath.Join(root, kind+".json")
		os.WriteFile(cfg, b, 0644)
		a, e := newApp(Config{Mode: kind, Root: root, Routes: cfg})
		if e != nil {
			t.Fatal(e)
		}
		if kind == "company" {
			for p, status := range map[string]int{"/company": 200, "/company/": 200, "/company.html": 404, "/missing": 404, "/api/inquiries": 410} {
				if w := request(a, "GET", p); w.Code != status {
					t.Errorf("%s %d want %d", p, w.Code, status)
				}
			}
			w := request(a, "GET", "/contact?form=corporate&email=private&next=https://evil.invalid")
			if w.Code != 302 || strings.Contains(w.Header().Get("Location"), "private") {
				t.Fatalf("redirect leaked query: %d %s", w.Code, w.Header().Get("Location"))
			}
			if w = request(a, "GET", "/contact?form=unknown&product=shop"); w.Code != 200 {
				t.Fatal(w.Code)
			}
		} else {
			r := httptest.NewRequest("GET", "/?from=keep", nil)
			r.Header.Set("Cookie", "lang=ja")
			r.Header.Set("Accept-Language", "en")
			w := httptest.NewRecorder()
			a.ServeHTTP(w, r)
			if w.Header().Get("Location") != "/ja?from=keep" {
				t.Fatal(w.Header())
			}
		}
	}
}
func TestReleaseSwitch(t *testing.T) {
	base := t.TempDir()
	for _, name := range []string{"a", "b"} {
		put(t, base, name+"/site/index.html", name)
		data, _ := json.Marshal(Contract{Routes: []Route{{Handle: "filesystem"}}, Overrides: map[string]Override{}})
		put(t, base, name+"/routes.json", string(data))
	}
	current := filepath.Join(base, "current")
	os.Symlink("a", current)
	a, e := newApp(Config{Mode: "company", Root: current + "/site", Routes: current + "/routes.json"})
	if e != nil {
		t.Fatal(e)
	}
	if request(a, "GET", "/").Body.String() != "a" {
		t.Fatal("first")
	}
	os.Symlink("b", filepath.Join(base, "next"))
	os.Rename(filepath.Join(base, "next"), current)
	if request(a, "GET", "/").Body.String() != "b" {
		t.Fatal("release did not switch")
	}
}
func TestDisplayReadOnlyAuthAndInjection(t *testing.T) {
	root := t.TempDir()
	token := strings.Repeat("a", 64)
	put(t, root, "token", token)
	put(t, root, "index.html", "<html><head></head><body>display</body></html>")
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer "+token || r.Header.Get("Cookie") != "" || r.Header.Get("Origin") != "https://owned.invalid" {
			t.Error("display credentials not isolated")
		}
		io.WriteString(w, `{"role":"display"}`)
	}))
	defer backend.Close()
	a, e := newApp(Config{Mode: "display", Listen: "127.0.0.1:8788", Root: root, TokenFile: root + "/token", Backend: backend.URL, Origin: "https://owned.invalid"})
	if e != nil {
		t.Fatal(e)
	}
	w := request(a, "GET", "/")
	if !strings.Contains(w.Body.String(), "/_watchdog/script.js") || strings.Contains(w.Body.String(), token) {
		t.Fatal("HTML injection/token")
	}
	r := httptest.NewRequest("GET", "/api/me", nil)
	r.Header.Set("Authorization", "Bearer attacker")
	r.Header.Set("Cookie", "admin=attacker")
	w = httptest.NewRecorder()
	a.ServeHTTP(w, r)
	if w.Code != 200 {
		t.Fatal(w.Code)
	}
	for _, p := range []string{"/api/items", "/", "/_watchdog/status"} {
		if w = request(a, "POST", p); w.Code == 200 || w.Code == 201 {
			t.Fatalf("write allowed %s", p)
		}
	}
	if _, e = newApp(Config{Mode: "display", Listen: ":8788", TokenFile: root + "/token"}); e == nil {
		t.Fatal("public display bind allowed")
	}
}
func TestLandingEventsAndLimits(t *testing.T) {
	root := t.TempDir()
	put(t, root, "stay/index.html", "landing")
	a, _ := newApp(Config{Mode: "lhlp", Root: root, EventLog: root + "/events.log"})
	if request(a, "GET", "/stay/").Code != 200 {
		t.Fatal("landing")
	}
	if w := request(a, "GET", "/?x=1"); w.Header().Get("Location") != "/stay/?x=1" {
		t.Fatal(w.Header())
	}
	if w := request(a, "POST", "/ab/e?e=view"); w.Code != 204 {
		t.Fatal(w.Code)
	}
	if b, _ := os.ReadFile(root + "/events.log"); !strings.Contains(string(b), "\te=view\n") {
		t.Fatal(string(b))
	}
	for i := 0; i < 100; i++ {
		request(a, "GET", "/ab/e")
	}
	if w := request(a, "GET", "/ab/e"); w.Code != 503 {
		t.Fatal("event limiter", w.Code)
	}
}
func TestEdgeTrustAndHeaderBoundaries(t *testing.T) {
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("X-Forwarded-Proto") != "https" || r.Header.Get("X-Forwarded-For") == "attacker" {
			t.Error("untrusted forwarding headers")
		}
		io.WriteString(w, "ok")
	}))
	defer backend.Close()
	a, _ := newApp(Config{Mode: "edge", Hosts: map[string]Host{"owned.invalid": {Target: backend.URL, MaxBody: 32}}})
	r := httptest.NewRequest("GET", "https://owned.invalid/", nil)
	r.RemoteAddr = "203.0.113.1:1000"
	w := httptest.NewRecorder()
	a.ServeHTTP(w, r)
	if w.Code != 403 {
		t.Fatal(w.Code)
	}
	r.RemoteAddr = "127.0.0.1:1234"
	r.TLS = &tls.ConnectionState{}
	r.Header.Set("X-Forwarded-For", "attacker")
	w = httptest.NewRecorder()
	a.ServeHTTP(w, r)
	if w.Code != 200 {
		t.Fatal(w.Code)
	}
	r = httptest.NewRequest("POST", "https://owned.invalid/", strings.NewReader(strings.Repeat("x", 33)))
	r.RemoteAddr = "127.0.0.1:1234"
	w = httptest.NewRecorder()
	a.ServeHTTP(w, r)
	if w.Code != 413 {
		t.Fatal(w.Code)
	}
}
