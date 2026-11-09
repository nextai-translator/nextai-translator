package sys

import (
	"io"
	"net"
	"net/http"
	"os"
	"runtime"
	"strings"
)

// IPCAddr is where the old app listened, so PopClip and scripts that post
// text to it keep working: a Unix socket, or a local port on Windows.
func IPCAddr() (network, addr string) {
	if runtime.GOOS == "windows" {
		return "tcp", "127.0.0.1:62007"
	}
	return "unix", "/tmp/openai-translator.sock"
}

// ServeIPC calls onText with the body of each request, on a goroutine of
// its own. It returns once listening, and the listener's Close stops it.
func ServeIPC(onText func(string)) (io.Closer, error) {
	network, addr := IPCAddr()
	if network == "unix" {
		_ = os.Remove(addr)
	}
	ln, err := net.Listen(network, addr)
	if err != nil {
		return nil, err
	}
	srv := &http.Server{Handler: IPCHandler(onText)}
	go func() { _ = srv.Serve(ln) }()
	return srv, nil
}

// IPCHandler answers what the old server did: it reads the body as text.
func IPCHandler(onText func(string)) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		b, err := io.ReadAll(io.LimitReader(r.Body, 1<<20))
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		if text := strings.TrimSpace(string(b)); text != "" {
			onText(string(b))
		}
		w.WriteHeader(http.StatusOK)
	})
}
