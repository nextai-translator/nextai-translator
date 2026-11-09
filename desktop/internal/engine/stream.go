package engine

import (
	"bufio"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/nextai-translator/nextai-translator/desktop/internal/settings"
)

// errStop ends a stream early from inside an event handler.
var errStop = errors.New("stop")

// readSSE calls fn with the data of each server-sent event. Returning
// errStop from fn ends the stream without an error.
func readSSE(r io.Reader, fn func(event, data string) error) error {
	sc := bufio.NewScanner(r)
	sc.Buffer(make([]byte, 64*1024), 16*1024*1024)
	var event string
	var data []string
	dispatch := func() error {
		if len(data) == 0 {
			event = ""
			return nil
		}
		d := strings.Join(data, "\n")
		e := event
		event, data = "", data[:0]
		return fn(e, d)
	}
	for sc.Scan() {
		line := sc.Text()
		if line == "" {
			if err := dispatch(); err != nil {
				return stopIsNil(err)
			}
			continue
		}
		if strings.HasPrefix(line, ":") {
			continue
		}
		field, value, _ := strings.Cut(line, ":")
		value = strings.TrimPrefix(value, " ")
		switch field {
		case "event":
			event = value
		case "data":
			data = append(data, value)
		}
	}
	if err := sc.Err(); err != nil {
		return err
	}
	return stopIsNil(dispatch())
}

// readJSONStream calls fn with each JSON value of a stream of concatenated
// values (Cohere).
func readJSONStream(r io.Reader, fn func(json.RawMessage) error) error {
	dec := json.NewDecoder(r)
	for {
		var v json.RawMessage
		if err := dec.Decode(&v); err != nil {
			if errors.Is(err, io.EOF) {
				return nil
			}
			return err
		}
		if err := fn(v); err != nil {
			return stopIsNil(err)
		}
	}
}

func stopIsNil(err error) error {
	if errors.Is(err, errStop) {
		return nil
	}
	return err
}

// NewHTTPClient returns the client for provider requests, going through the
// proxy in the settings when it is on.
func NewHTTPClient(s settings.Settings) *http.Client {
	tr := http.DefaultTransport.(*http.Transport).Clone()
	tr.ResponseHeaderTimeout = 0
	tr.TLSHandshakeTimeout = 15 * time.Second
	if p := s.Proxy; p.Enabled && p.Server != "" {
		scheme := "http"
		if strings.EqualFold(p.Protocol, "HTTPS") {
			scheme = "https"
		}
		host := p.Server
		if p.Port != "" {
			host += ":" + p.Port
		}
		proxyURL := &url.URL{Scheme: scheme, Host: host}
		if p.BasicAuth.Username != "" {
			proxyURL.User = url.UserPassword(p.BasicAuth.Username, p.BasicAuth.Password)
		}
		noProxy := splitList(p.NoProxy)
		tr.Proxy = func(req *http.Request) (*url.URL, error) {
			if bypassProxy(req.URL.Hostname(), noProxy) {
				return nil, nil
			}
			return proxyURL, nil
		}
	}
	return &http.Client{Transport: tr}
}

func splitList(s string) []string {
	var out []string
	for _, p := range strings.Split(s, ",") {
		if p = strings.TrimSpace(p); p != "" {
			out = append(out, strings.ToLower(p))
		}
	}
	return out
}

// bypassProxy matches host against a no_proxy list: exact hosts, domain
// suffixes (".example.com" or "example.com") and "*".
func bypassProxy(host string, list []string) bool {
	host = strings.ToLower(host)
	for _, p := range list {
		if p == "*" || p == host {
			return true
		}
		suffix := "." + strings.TrimPrefix(p, ".")
		if strings.HasSuffix(host, suffix) {
			return true
		}
	}
	return false
}
