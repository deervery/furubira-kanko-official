package sitegen

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func projectRoot(t *testing.T) string {
	t.Helper()
	root, err := filepath.Abs("../..")
	if err != nil {
		t.Fatal(err)
	}
	return root
}
func TestNewsContract(t *testing.T) {
	root := projectRoot(t)
	var cases []struct {
		Name  string
		Value json.RawMessage
		Valid bool
	}
	if err := readJSON(filepath.Join(root, "tests/news-contract.json"), &cases); err != nil {
		t.Fatal(err)
	}
	for _, c := range cases {
		t.Run(c.Name, func(t *testing.T) {
			p := filepath.Join(t.TempDir(), "news.json")
			if err := os.WriteFile(p, c.Value, 0644); err != nil {
				t.Fatal(err)
			}
			_, err := LoadNews(p)
			if (err == nil) != c.Valid {
				t.Fatalf("valid=%v, error=%v", c.Valid, err)
			}
		})
	}
}
func TestBuildContentChangesAndAtomicFailure(t *testing.T) {
	original := projectRoot(t)
	root := t.TempDir()
	for _, name := range []string{"config", "templates", "content", "public", "assets", "locales", "server"} {
		source := filepath.Join(original, name)
		if _, err := os.Stat(source); os.IsNotExist(err) {
			continue
		}
		if err := copyTree(source, filepath.Join(root, name)); err != nil {
			t.Fatal(err)
		}
	}
	t.Setenv("SITE_REVISION", "isolated-fixture")
	var settings Settings
	if err := readJSON(filepath.Join(root, "config/site.json"), &settings); err != nil {
		t.Fatal(err)
	}
	payload := "</script><script>alert(1)</script>"
	if settings.Kind == "company" {
		var items []map[string]any
		if err := readJSON(filepath.Join(root, "content/news.json"), &items); err != nil {
			t.Fatal(err)
		}
		items = append(items, map[string]any{"slug": "isolated-fixture", "title": payload, "excerpt": "A & B", "date": "2026-10-25", "image": nil, "imageAlt": "", "category": "test", "sections": []map[string]any{{"title": "Test", "paragraphs": []string{payload}}}})
		data, _ := json.Marshal(items)
		os.WriteFile(filepath.Join(root, "content/news.json"), data, 0644)
	} else {
		data, _ := json.Marshal([]News{{ID: "isolated-fixture", Title: payload, Body: "本文\n改行", TitleEn: "English", BodyEn: payload, PublishedOn: "2026-10-25"}})
		os.WriteFile(filepath.Join(root, "content/news.json"), data, 0644)
	}
	if err := Build(root); err != nil {
		t.Fatal(err)
	}
	paths := []string{"news/isolated-fixture.html"}
	if settings.Kind != "company" {
		paths = []string{"ja/news/isolated-fixture.html", "en/news/isolated-fixture.html"}
	}
	for _, path := range paths {
		html, err := os.ReadFile(filepath.Join(root, "out", path))
		if err != nil {
			t.Fatal(err)
		}
		if strings.Contains(string(html), "<script>alert(1)</script>") || !strings.Contains(string(html), "&lt;/script&gt;") {
			t.Fatalf("article text was not safely generated: %s", path)
		}
	}
	previous, err := os.ReadFile(filepath.Join(root, "out/release.json"))
	if err != nil {
		t.Fatal(err)
	}
	if settings.Kind == "company" {
		os.WriteFile(filepath.Join(root, "content/news.json"), []byte("[{\"slug\":\"../escape\"}]"), 0644)
	} else {
		os.WriteFile(filepath.Join(root, "content/news.json"), []byte("[{\"id\":\"../escape\"}]"), 0644)
	}
	if err := Build(root); err == nil {
		t.Fatal("invalid content must fail")
	}
	current, err := os.ReadFile(filepath.Join(root, "out/release.json"))
	if err != nil {
		t.Fatal(err)
	}
	if string(previous) != string(current) {
		t.Fatal("failed build replaced the valid release")
	}
}
func TestWriteFileRejectsTraversal(t *testing.T) {
	for _, path := range []string{"../escape", "/absolute", "a/../../escape"} {
		if err := writeFile(t.TempDir(), path, []byte("x")); err == nil {
			t.Fatalf("accepted %q", path)
		}
	}
}
