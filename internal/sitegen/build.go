package sitegen

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"html/template"
	"io"
	"io/fs"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"time"
	"unicode/utf16"
)

type Page struct {
	Path     string
	Template string
	Lang     string
	Items    string
}
type News struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	Body        string `json:"body"`
	TitleEn     string `json:"title_en"`
	BodyEn      string `json:"body_en"`
	PublishedOn string `json:"published_on"`
}
type Settings struct {
	Kind      string `json:"kind"`
	Origin    string `json:"origin"`
	Analytics string `json:"analytics"`
}

var validID = regexp.MustCompile("^[a-z0-9]+(?:-[a-z0-9]+)*$")

func readJSON(filename string, value any) error {
	data, err := os.ReadFile(filename)
	if err != nil {
		return err
	}
	dec := json.NewDecoder(bytes.NewReader(data))
	dec.DisallowUnknownFields()
	if err = dec.Decode(value); err != nil {
		return fmt.Errorf("%s: %w", filename, err)
	}
	var trailing any
	if err := dec.Decode(&trailing); err != io.EOF {
		return fmt.Errorf("%s: trailing JSON", filename)
	}
	return nil
}
func trimJS(s string) string {
	return strings.TrimFunc(s, func(r rune) bool {
		return r == 0xFEFF || r == 0x0009 || r == 0x000A || r == 0x000B || r == 0x000C || r == 0x000D || r == 0x0020 || r == 0x00A0 || r == 0x1680 || (r >= 0x2000 && r <= 0x200A) || r == 0x2028 || r == 0x2029 || r == 0x202F || r == 0x205F || r == 0x3000
	})
}
func length(s string) int { return len(utf16.Encode([]rune(s))) }
func LoadNews(path string) ([]News, error) {
	var raw []map[string]json.RawMessage
	if err := readJSON(path, &raw); err != nil {
		return nil, err
	}
	for _, item := range raw {
		for _, key := range []string{"id", "title", "body", "title_en", "body_en", "published_on"} {
			value, exists := item[key]
			if !exists && (key == "title_en" || key == "body_en") {
				continue
			}
			if !exists || string(value) == "null" {
				return nil, fmt.Errorf("news field %s must be a string", key)
			}
			var text string
			if err := json.Unmarshal(value, &text); err != nil {
				return nil, fmt.Errorf("news field %s must be a string", key)
			}
		}
	}
	var items []News
	if err := readJSON(path, &items); err != nil {
		return nil, err
	}
	if items == nil {
		return nil, fmt.Errorf("news must be an array")
	}
	if len(items) > 1000 {
		return nil, fmt.Errorf("news exceeds 1000 entries")
	}
	seen := map[string]bool{}
	for i := range items {
		n := &items[i]
		n.Title = trimJS(n.Title)
		n.Body = trimJS(n.Body)
		n.TitleEn = trimJS(n.TitleEn)
		n.BodyEn = trimJS(n.BodyEn)
		if !validID.MatchString(n.ID) || length(n.ID) > 100 || seen[n.ID] {
			return nil, fmt.Errorf("invalid or duplicate news ID %q", n.ID)
		}
		seen[n.ID] = true
		if n.Title == "" || n.Body == "" || length(n.Title) > 200 || length(n.Body) > 20000 || length(n.TitleEn) > 200 || length(n.BodyEn) > 20000 {
			return nil, fmt.Errorf("invalid news text %q", n.ID)
		}
		if (n.TitleEn == "") != (n.BodyEn == "") {
			return nil, fmt.Errorf("incomplete translation %q", n.ID)
		}
		date, err := time.Parse("2006-01-02", n.PublishedOn)
		if err != nil || date.Format("2006-01-02") != n.PublishedOn {
			return nil, fmt.Errorf("invalid date %q", n.ID)
		}
	}
	sort.SliceStable(items, func(i, j int) bool {
		if items[i].PublishedOn == items[j].PublishedOn {
			return items[i].ID < items[j].ID
		}
		return items[i].PublishedOn > items[j].PublishedOn
	})
	return items, nil
}
func NewsText(n News, lang string) map[string]string {
	if lang == "en" && n.TitleEn != "" && n.BodyEn != "" {
		return map[string]string{"title": n.TitleEn, "body": n.BodyEn, "lang": "en", "id": n.ID, "published_on": n.PublishedOn}
	}
	return map[string]string{"title": n.Title, "body": n.Body, "lang": "ja", "id": n.ID, "published_on": n.PublishedOn}
}
func Revision(root string) string {
	for _, key := range []string{"SITE_REVISION", "VERCEL_GIT_COMMIT_SHA", "GITHUB_SHA"} {
		if v := os.Getenv(key); v != "" {
			return v
		}
	}
	cmd := exec.Command("git", "rev-parse", "HEAD")
	cmd.Dir = root
	if data, err := cmd.Output(); err == nil {
		return strings.TrimSpace(string(data))
	}
	return "local"
}
func copyTree(src, dst string) error {
	return filepath.WalkDir(src, func(path string, entry fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		rel, err := filepath.Rel(src, path)
		if err != nil {
			return err
		}
		target := filepath.Join(dst, rel)
		if entry.Type()&os.ModeSymlink != 0 {
			return fmt.Errorf("unexpected symlink %s", path)
		}
		if entry.IsDir() {
			return os.MkdirAll(target, 0755)
		}
		data, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		return os.WriteFile(target, data, 0644)
	})
}
func writeFile(root, relative string, data []byte) error {
	rel := filepath.Clean(filepath.FromSlash(relative))
	if rel == "." || filepath.IsAbs(rel) || rel == ".." || strings.HasPrefix(rel, ".."+string(filepath.Separator)) {
		return fmt.Errorf("unsafe output path %q", relative)
	}
	dest := filepath.Join(root, rel)
	if err := os.MkdirAll(filepath.Dir(dest), 0755); err != nil {
		return err
	}
	return os.WriteFile(dest, data, 0644)
}
func jsMap(v any) map[string]any { m, _ := v.(map[string]any); return m }
func text(v any) string          { s, _ := v.(string); return s }
func localized(item map[string]any, lang string, home bool, messages map[string]any) map[string]any {
	out := map[string]any{}
	for _, k := range []string{"id", "name", "name_en", "description", "description_en", "address", "facilities", "facilities_en", "date", "date_en", "type", "url", "image_path", "image", "icon"} {
		out[k] = ""
	}
	for k, v := range item {
		if v != nil {
			out[k] = v
		}
	}
	for _, key := range []string{"name", "description", "date"} {
		if lang == "en" && trimJS(text(out[key+"_en"])) != "" {
			out[key] = out[key+"_en"]
		}
	}
	if home && lang == "en" {
		ja := jsMap(jsMap(messages["ja"])["cms"])
		en := jsMap(jsMap(messages["en"])["cms"])
		normalize := func(s string) string { return strings.Join(strings.Fields(strings.ReplaceAll(s, "\u3000", " ")), " ") }
		keys := make([]string, 0, len(ja))
		for k := range ja {
			keys = append(keys, k)
		}
		sort.Strings(keys)
		for _, field := range []string{"name", "description"} {
			if trimJS(text(item[field+"_en"])) != "" {
				continue
			}
			for _, k := range keys {
				if normalize(text(ja[k])) == normalize(text(item[field])) && trimJS(text(en[k])) != "" {
					out[field] = en[k]
					break
				}
			}
		}
	}
	image := trimJS(text(out["image_path"]))
	if image == "" {
		image = "/no_photo.jpg?height=300&width=400"
	}
	if !strings.HasPrefix(image, "/") && !strings.HasPrefix(image, "https://") && !strings.HasPrefix(image, "http://") && !strings.HasPrefix(image, "data:") {
		image = "/no_photo.jpg?height=300&width=400"
	}
	out["image"] = image
	out["facilities_extra"] = out["facilities"]
	if lang == "en" {
		out["facilities_extra"] = out["facilities_en"]
	}
	if lang == "en" {
		if v, exists := item["date_en"]; exists && v != nil {
			out["date"] = v
		}
	}
	return out
}
func Build(root string) error {
	root, err := filepath.Abs(root)
	if err != nil {
		return err
	}
	for _, name := range []string{".vercel", "out"} {
		if info, e := os.Lstat(filepath.Join(root, name)); e == nil && info.Mode()&os.ModeSymlink != 0 {
			return fmt.Errorf("refusing symlink build directory %s", name)
		}
	}
	var settings Settings
	if err = readJSON(filepath.Join(root, "config/site.json"), &settings); err != nil {
		return err
	}
	var pages []Page
	if err = readJSON(filepath.Join(root, "config/pages.json"), &pages); err != nil {
		return err
	}
	corporate := settings.Kind == "company"
	var companyNews []map[string]any
	var news []News
	var facilities map[string][]map[string]any
	var messages map[string]any
	if corporate {
		if err = readJSON(filepath.Join(root, "content/news.json"), &companyNews); err != nil {
			return err
		}
	} else {
		if news, err = LoadNews(filepath.Join(root, "content/news.json")); err != nil {
			return err
		}
		if err = readJSON(filepath.Join(root, "content/facilities.json"), &facilities); err != nil {
			return err
		}
		if err = readJSON(filepath.Join(root, "locales/messages.json"), &messages); err != nil {
			return err
		}
	}
	staging, err := os.MkdirTemp(root, ".sitegen-")
	if err != nil {
		return err
	}
	defer os.RemoveAll(staging)
	out := filepath.Join(staging, "out")
	if err = os.MkdirAll(out, 0755); err != nil {
		return err
	}
	if err = copyTree(filepath.Join(root, "public"), out); err != nil {
		return err
	}
	digest := sha256.New()
	if e := filepath.WalkDir(filepath.Join(root, "assets"), func(path string, entry fs.DirEntry, e error) error {
		if e != nil {
			return e
		}
		if entry.IsDir() {
			return nil
		}
		rel, _ := filepath.Rel(filepath.Join(root, "assets"), path)
		digest.Write([]byte(filepath.ToSlash(rel)))
		digest.Write([]byte{0})
		b, e := os.ReadFile(path)
		if e == nil {
			digest.Write(b)
		}
		return e
	}); e != nil {
		return e
	}
	assetPrefix := "/assets/" + hex.EncodeToString(digest.Sum(nil))[:16]
	if err = copyTree(filepath.Join(root, "assets"), filepath.Join(out, assetPrefix)); err != nil {
		return err
	}
	partials, err := filepath.Glob(filepath.Join(root, "templates/partials/*.gohtml"))
	if err != nil {
		return err
	}
	funcs := template.FuncMap{
		"boundary": func() template.HTML { return template.HTML("<!-- -->") }, "t": func(lang, key string) string {
			lookup := func(language string) (any, bool) {
				var value any = messages[language]
				for _, part := range strings.Split(key, ".") {
					m, ok := value.(map[string]any)
					if !ok {
						return nil, false
					}
					var exists bool
					value, exists = m[part]
					if !exists {
						return nil, false
					}
				}
				return value, true
			}
			value, ok := lookup(lang)
			if !ok {
				value, _ = lookup("ja")
			}
			if result, ok := value.(string); ok {
				return result
			}
			return key
		},

		"dateDots": func(s string) string { return strings.ReplaceAll(s, "-", ".") },
		"newsText": NewsText,
		"archiveURL": func(u string) string {
			if u == "https://deervery.com/pages/raku-sika" {
				return "/products/rakusika"
			}
			return u
		},
		"switchLang": func(path, lang string) string {
			parts := strings.Split(strings.TrimPrefix(path, "/"), "/")
			if len(parts) > 0 && (parts[0] == "ja" || parts[0] == "en") {
				parts[0] = lang
				return "/" + strings.Join(parts, "/")
			}
			return "/" + lang + path
		},
		"icon": func(name string) template.HTML {
			if !regexp.MustCompile("^[A-Za-z]+$").MatchString(name) {
				name = "MapPin"
			}
			data, e := os.ReadFile(filepath.Join(root, "templates/icons", name+".svg"))
			if e != nil {
				data, _ = os.ReadFile(filepath.Join(root, "templates/icons/MapPin.svg"))
			}
			return template.HTML(data)
		},
	}
	publicPaths := []string{}
	renderPage := func(p Page, data map[string]any) error {
		all := append([]string{}, partials...)
		all = append(all, filepath.Join(root, "templates/pages", p.Template))
		t := template.New("site").Funcs(funcs).Option("missingkey=error")
		for _, filename := range all {
			content, e := os.ReadFile(filename)
			if e != nil {
				return e
			}
			name := filepath.Base(filename)
			if strings.Contains(filename, "/partials/") {
				name = strings.TrimSuffix(name, ".gohtml")
			}
			if _, e = t.New(name).Parse(string(content)); e != nil {
				return fmt.Errorf("%s: %w", filename, e)
			}
		}
		data["Assets"] = assetPrefix
		data["Year"] = time.Now().Year()
		data["Lang"] = p.Lang
		data["Path"] = "/" + p.Path
		data["SiteKey"] = os.Getenv("NEXT_PUBLIC_TURNSTILE_SITE_KEY")
		data["BotProtection"] = os.Getenv("CONTACT_BOT_PROTECTION_ENABLED") == "true"
		var b bytes.Buffer
		if e := t.ExecuteTemplate(&b, filepath.Base(p.Template), data); e != nil {
			return fmt.Errorf("%s: %w", p.Path, e)
		}
		if bytes.Contains(b.Bytes(), []byte("#ZgotmplZ")) {
			return fmt.Errorf("%s: unsafe URL or style", p.Path)
		}
		target := p.Path + ".html"
		if p.Path == "" {
			target = "index.html"
		}
		if e := writeFile(out, target, b.Bytes()); e != nil {
			return e
		}
		if p.Path != "404" && p.Path != "410" && !strings.HasPrefix(p.Path, "admin") {
			publicPaths = append(publicPaths, "/"+p.Path)
		}
		return nil
	}
	archiveYears := []map[string]any{}
	if corporate {
		var archive []map[string]any
		if e := readJSON(filepath.Join(root, "content/news-archive.json"), &archive); e != nil {
			return e
		}
		for _, post := range archive {
			date := text(post["date"])
			if len(date) < 4 {
				return fmt.Errorf("invalid archive date")
			}
			if _, ok := post["url"]; !ok {
				post["url"] = ""
			}
			index := -1
			for i, group := range archiveYears {
				if group["Year"] == date[:4] {
					index = i
					break
				}
			}
			if index < 0 {
				archiveYears = append(archiveYears, map[string]any{"Year": date[:4], "Open": len(archiveYears) == 0, "Posts": []map[string]any{}})
				index = len(archiveYears) - 1
			}
			archiveYears[index]["Posts"] = append(archiveYears[index]["Posts"].([]map[string]any), post)
		}
	}
	for _, p := range pages {
		data := map[string]any{"ArchiveYears": archiveYears, "Latest": companyNews[:min(3, len(companyNews))], "News": companyNews, "Items": []map[string]any{}, "PublicNews": news, "Empty": len(news) == 0}
		if !corporate {
			items := append([]map[string]any{}, facilities[p.Items]...)
			sort.SliceStable(items, func(i, j int) bool {
				a, _ := items[i]["display_order"].(float64)
				b, _ := items[j]["display_order"].(float64)
				return a < b
			})
			localizedItems := []map[string]any{}
			for _, item := range items {
				localizedItems = append(localizedItems, localized(item, p.Lang, false, messages))
			}
			data["Items"] = localizedItems
			var original []News
			if e := readJSON(filepath.Join(root, "content/news.json"), &original); e != nil {
				return e
			}
			byID := map[string]News{}
			for _, item := range news {
				byID[item.ID] = item
			}
			homeNews := []News{}
			for _, item := range original[:min(5, len(original))] {
				homeNews = append(homeNews, byID[item.ID])
			}
			data["HomeNews"] = homeNews
			editorNews := []News{}
			for _, item := range original {
				editorNews = append(editorNews, byID[item.ID])
			}
			data["EditorNews"] = editorNews
			data["HomeItems"] = map[string][]map[string]any{}
			for key, items := range facilities {
				for _, item := range items {
					home := data["HomeItems"].(map[string][]map[string]any)
					home[key] = append(home[key], localized(item, p.Lang, true, messages))
				}
			}
		}
		if err = renderPage(p, data); err != nil {
			return err
		}
	}
	if corporate {
		for _, post := range companyNews {
			slug := text(post["slug"])
			if !validID.MatchString(slug) {
				return fmt.Errorf("unsafe article slug")
			}
			p := Page{Path: "news/" + slug, Template: "news-article.gohtml", Lang: "ja"}
			if err = renderPage(p, map[string]any{"Post": post}); err != nil {
				return err
			}
		}
	} else {
		for _, lang := range []string{"ja", "en"} {
			for _, item := range news {
				p := Page{Path: lang + "/news/" + item.ID, Template: lang + "-news-article.gohtml", Lang: lang}
				if err = renderPage(p, map[string]any{"Article": NewsText(item, lang)}); err != nil {
					return err
				}
			}
		}
		for name, items := range facilities {
			items = append([]map[string]any{}, items...)
			sort.SliceStable(items, func(i, j int) bool {
				a, _ := items[i]["display_order"].(float64)
				b, _ := items[j]["display_order"].(float64)
				return a < b
			})
			data, _ := json.Marshal(items)
			if err = writeFile(out, "data/"+name+".json", append(data, '\n')); err != nil {
				return err
			}
		}
		data, err := os.ReadFile(filepath.Join(root, "content/news.json"))
		if err != nil {
			return err
		}
		if err = writeFile(out, "data/news.json", data); err != nil {
			return err
		}
		if err = writeFile(out, "retired-api.json", []byte("{\"error\":\"この旧APIは公開を終了しました。\"}")); err != nil {
			return err
		}
	}
	if corporate {
		for _, name := range []string{"robots.txt", "sitemap.xml"} {
			data, e := os.ReadFile(filepath.Join(root, "config", name))
			if e != nil {
				return e
			}
			if name == "sitemap.xml" {
				pattern, e := os.ReadFile(filepath.Join(root, "config/news-sitemap.txt"))
				if e != nil {
					return e
				}
				var blocks strings.Builder
				for _, post := range companyNews {
					part := strings.ReplaceAll(string(pattern), "{{.URL}}", template.HTMLEscapeString(settings.Origin+"/news/"+text(post["slug"])))
					part = strings.ReplaceAll(part, "{{.Date}}", template.HTMLEscapeString(text(post["date"])))
					blocks.WriteString(part)
				}
				data = []byte(strings.Replace(string(data), "</urlset>", blocks.String()+"</urlset>", 1))
			}
			if err = writeFile(out, name, data); err != nil {
				return err
			}
		}
	} else {
		if err = writeFile(out, "robots.txt", []byte("User-agent: *\nAllow: /\nSitemap: "+settings.Origin+"/sitemap.xml\n")); err != nil {
			return err
		}
		var sitemap strings.Builder
		sitemap.WriteString("<?xml version=\"1.0\" encoding=\"UTF-8\"?><urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">")
		for _, path := range publicPaths {
			sitemap.WriteString("<url><loc>" + template.HTMLEscapeString(settings.Origin+path) + "</loc></url>")
		}
		sitemap.WriteString("</urlset>")
		if err = writeFile(out, "sitemap.xml", []byte(sitemap.String())); err != nil {
			return err
		}
	}
	functions := []string{}
	if corporate {
		functions = append(functions, "/api/inquiries")
	}
	release, _ := json.Marshal(map[string]any{"revision": Revision(root), "mode": "static", "generator": "go", "assetsPrefix": assetPrefix, "serverFunctions": functions})
	if err = writeFile(out, "release.json", append(release, '\n')); err != nil {
		return err
	}
	overrides := map[string]any{}
	err = filepath.WalkDir(out, func(path string, entry fs.DirEntry, e error) error {
		if e != nil {
			return e
		}
		if entry.IsDir() || !strings.HasSuffix(path, ".html") {
			return nil
		}
		rel, _ := filepath.Rel(out, path)
		rel = filepath.ToSlash(rel)
		value := map[string]any{"contentType": "text/html; charset=utf-8"}
		if rel != "404.html" && rel != "410.html" {
			value["path"] = strings.TrimSuffix(rel, ".html")
			if rel == "index.html" {
				value["path"] = ""
			}
		}
		overrides[rel] = value
		return nil
	})
	if err != nil {
		return err
	}
	var routes []map[string]any
	if err = readJSON(filepath.Join(root, "config/routes.json"), &routes); err != nil {
		return err
	}
	for _, route := range routes {
		if route["src"] == "/_next/static/.*" {
			route["src"] = "/assets/.*"
		}
	}
	config, _ := json.MarshalIndent(map[string]any{"version": 3, "routes": routes, "overrides": overrides}, "", "  ")
	deploy := filepath.Join(staging, "deploy")
	if err = copyTree(out, filepath.Join(deploy, "static")); err != nil {
		return err
	}
	if err = writeFile(deploy, "config.json", append(config, '\n')); err != nil {
		return err
	}
	if corporate {
		funcdir := filepath.Join(deploy, "functions/api/inquiries.func")
		if err = os.MkdirAll(funcdir, 0755); err != nil {
			return err
		}
		for _, name := range []string{"index.mjs", "inquiries.mjs", "form-origin.mjs", "turnstile.mjs", "domain-migration.mjs"} {
			data, e := os.ReadFile(filepath.Join(root, "server", name))
			if e != nil {
				return e
			}
			if err = writeFile(funcdir, name, data); err != nil {
				return err
			}
		}
		data, e := os.ReadFile(filepath.Join(root, "config/inquiries-function.json"))
		if e != nil {
			return e
		}
		if err = writeFile(funcdir, ".vc-config.json", data); err != nil {
			return err
		}
	}
	// Only replace fixed build output directories within the selected project, after all validation.
	for _, pair := range [][2]string{{out, filepath.Join(root, "out")}, {deploy, filepath.Join(root, ".vercel/output")}} {
		if err = os.RemoveAll(pair[1]); err != nil {
			return err
		}
		if err = os.MkdirAll(filepath.Dir(pair[1]), 0755); err != nil {
			return err
		}
		if err = os.Rename(pair[0], pair[1]); err != nil {
			return err
		}
	}
	fmt.Printf("Go static export: %d pages; server functions: %d\n", len(pages)+len(companyNews)+len(news)*2, len(functions))
	return nil
}
