package sys

import (
	"strings"
	"testing"
)

// #1902: with an English-first profile only the en-US engine ran, and
// Chinese text vanished. With every engine tried, the Chinese one wins on
// a mixed page even when English is listed first.
func TestOCREnglishFirstEngineListStillReadsChinese(t *testing.T) {
	f, cjk := ocrTestFont(t)
	if !cjk {
		t.Skip("no Chinese font")
	}
	img := ocrTestImage(t, f, "Hello World", "你好世界")
	englishOnly, err := ocrRecognizeWith(img, []string{"en-US"})
	if err != nil {
		t.Skip(err)
	}
	t.Logf("en-US only: %q", englishOnly)
	content, err := ocrRecognizeWith(img, []string{"en-US", "zh-Hans-CN"})
	if err != nil {
		t.Skip(err)
	}
	t.Logf("en-US + zh-Hans: %q", content)
	if strings.Contains(englishOnly, "你") {
		t.Errorf("en-US read Chinese? %q", englishOnly)
	}
	if !strings.Contains(content, "He") || !strings.Contains(content, "你好世界") {
		t.Errorf("unexpected content: %q", content)
	}
}
