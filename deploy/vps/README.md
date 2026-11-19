# Go static delivery

The public origin uses the standard-library Go server in deploy/go-web. Build it with Go 1.27.2 or later, run its race tests, and install the binary at /opt/go-web/go-web. The VPS package includes server.json, route-config.json, immutable public files, and a manifest. receive-release.py validates the archive and switches current atomically; it also accepts historical archives for rollback. Shared hashed assets remain available to already-open browsers.

The active services are deervery-go-static@company and deervery-go-static@tourism. Configuration in /etc/go-web points at current, so a normal static release does not restart either service. The TLS/HTTP origin is deervery-go-edge; its configuration and certificate paths live in /etc/go-web/edge.json. TLS certificates reload on each handshake; the existing ACME webroots and certbot timer remain in use. No nginx service or nginx CI tool is needed.

Run verify-static.py against loopback first, then against the owned HTTPS origin. The verifier checks public bytes, redirects, headers, retired API responses, and Google Forms handoffs without submitting an inquiry. The deploy boundary tests still verify checksums, traversal rejection, immutable revisions and rollback. A server-binary update is an explicit, backed-up operation separate from static content releases.
