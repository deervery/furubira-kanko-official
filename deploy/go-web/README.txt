Go HTTP origins, static route adapter, and read-only kiosk proxy. Standard library only.
Canonical operational copy: deervery/tailscale-monitor/go-web. Mirrored self-contained copies keep private repositories independently buildable.
Run go test -race ./... and go vet ./... before synchronizing all mirrors. Config fields are in Config in main.go.
All static roots reject traversal and hidden files; no directory listings. Display binds loopback only and never exposes its device token.
