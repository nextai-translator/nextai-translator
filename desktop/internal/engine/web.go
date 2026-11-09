package engine

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"strings"
)

// The free web providers (Kimi, ChatGLM, ChatGPT) talk to the sites' own
// backends, so they send what a browser sends.
const browserUA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"

// do sends a JSON request (body nil for none) and returns the response
// whatever its status.
func do(ctx context.Context, client *http.Client, method, url string, header http.Header, body any) (*http.Response, error) {
	var r io.Reader
	if body != nil {
		data, err := json.Marshal(body)
		if err != nil {
			return nil, err
		}
		r = strings.NewReader(string(data))
	}
	req, err := http.NewRequestWithContext(ctx, method, url, r)
	if err != nil {
		return nil, err
	}
	req.Header = header.Clone()
	req.Header.Set("Content-Type", "application/json")
	return client.Do(req)
}

// decode reads a JSON body, or the error in it when the status is not 2xx.
func decode(resp *http.Response, v any) error {
	defer resp.Body.Close()
	if resp.StatusCode/100 != 2 {
		return errorFromResponse(resp)
	}
	return json.NewDecoder(resp.Body).Decode(v)
}

// prefixDelta returns what full adds to sent, for backends that resend the
// whole answer so far with each event.
func prefixDelta(sent *string, full string) string {
	if !strings.HasPrefix(full, *sent) {
		*sent = full
		return ""
	}
	d := full[len(*sent):]
	*sent = full
	return d
}
