package sys

import (
	"errors"
	"time"

	"github.com/egoist/mygo"
)

// ErrNoPermission means the system refused to let the app read another
// app's selection; on macOS the app needs Accessibility access.
var ErrNoPermission = errors.New("accessibility permission required")

// copyBySimulation reads the selection by pressing the copy shortcut in the
// frontmost app, then puts the clipboard back as it was, in every format.
// press sends the shortcut. inputMu must be held. It must not run on the
// main thread, which the copy waits for.
func copyBySimulation(press func() error) (string, error) {
	// A paste that has not put the user's clipboard back yet does it now,
	// so that it is what is saved below.
	restoreClipboard()
	saved := readClipboard()
	mygo.Clipboard.Clear()
	defer writeClipboard(saved)
	if err := press(); err != nil {
		return "", err
	}
	text := ""
	for deadline := time.Now().Add(400 * time.Millisecond); time.Now().Before(deadline); {
		time.Sleep(25 * time.Millisecond)
		if text = mygo.Clipboard.ReadText(); text != "" {
			break
		}
	}
	return text, nil
}
