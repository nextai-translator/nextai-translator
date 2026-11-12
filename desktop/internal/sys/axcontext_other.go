//go:build !darwin

package sys

import "github.com/egoist/mygo"

// axcRead has no accessibility reader here; it reports only the pointer, in
// MyGo's screen coordinates. It needs the app running.
func axcRead(bool) AXContext {
	p := mygo.Screen.CursorScreenPoint()
	return AXContext{MouseX: p.X, MouseY: p.Y}
}
