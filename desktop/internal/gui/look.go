package gui

import (
	_ "embed"
	"sort"

	"github.com/egoist/mygo/ui"
)

// palette holds the Tauri app's colors (Base Web's light and dark themes as
// the Tauri app sets them up), so the windows look the same.
type palette struct {
	dark bool

	bg      ui.Color // window
	header  ui.Color // translator header
	line    ui.Color // dividers
	control ui.Color // selects, inputs at rest
	input   ui.Color // inputs with the focus
	focus   ui.Color // focused input border

	text      ui.Color // contentPrimary
	body      ui.Color // translated text
	secondary ui.Color // contentSecondary
	tertiary  ui.Color // contentTertiary
	faint     ui.Color // "Powered by"

	primaryBg, primaryFg ui.Color // primary button
	secondaryBtn         ui.Color // secondary button
	pill                 ui.Color // backgroundTertiary
	hover                ui.Color // icon button hover
	menu                 ui.Color // popovers
	menuHover            ui.Color

	errText, errBg ui.Color
}

func pal(c *ui.Context) palette {
	if c.Theme().Dark {
		return palette{
			dark:         true,
			bg:           ui.RGB(20, 20, 20),
			header:       ui.RGB(27, 27, 27),
			line:         ui.RGBA(255, 255, 255, .06),
			control:      ui.RGB(41, 41, 41),
			input:        ui.RGB(51, 51, 51),
			focus:        ui.RGB(226, 226, 226),
			text:         ui.RGB(255, 255, 255),
			body:         ui.RGB(203, 203, 203),
			secondary:    ui.RGB(203, 203, 203),
			tertiary:     ui.RGB(175, 175, 175),
			faint:        ui.RGB(84, 84, 84),
			primaryBg:    ui.RGB(226, 226, 226),
			primaryFg:    ui.RGB(0, 0, 0),
			secondaryBtn: ui.RGB(51, 51, 51),
			pill:         ui.RGB(51, 51, 51),
			hover:        ui.RGBA(255, 255, 255, .08),
			menu:         ui.RGB(31, 31, 31),
			menuHover:    ui.RGB(51, 51, 51),
			errText:      ui.RGB(252, 165, 165),
			errBg:        ui.RGBA(220, 38, 38, .1),
		}
	}
	return palette{
		bg:           ui.RGB(255, 255, 255),
		header:       ui.RGB(255, 255, 255),
		line:         ui.RGBA(0, 0, 0, .06),
		control:      ui.RGB(238, 238, 238),
		input:        ui.RGB(246, 246, 246),
		focus:        ui.RGB(0, 0, 0),
		text:         ui.RGB(0, 0, 0),
		body:         ui.RGB(0, 0, 0),
		secondary:    ui.RGB(84, 84, 84),
		tertiary:     ui.RGB(107, 107, 107),
		faint:        ui.RGB(175, 175, 175),
		primaryBg:    ui.RGB(0, 0, 0),
		primaryFg:    ui.RGB(255, 255, 255),
		secondaryBtn: ui.RGB(238, 238, 238),
		pill:         ui.RGB(238, 238, 238),
		hover:        ui.RGBA(0, 0, 0, .05),
		menu:         ui.RGB(255, 255, 255),
		menuHover:    ui.RGB(246, 246, 246),
		errText:      ui.RGB(220, 38, 38),
		errBg:        ui.RGBA(220, 38, 38, .05),
	}
}

//go:embed assets/icon.png
var logoPNG []byte

var logo = func() *ui.Bitmap {
	b, err := ui.DecodeBitmap(logoPNG)
	if err != nil {
		panic(err)
	}
	return b
}()

var (
	// Base Web's TriangleDown, the selects' caret.
	iconCaret = svg(`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M12.7071 15.2929L17.1464 10.8536C17.4614 10.5386 17.2383 10 16.7929 10L7.20711 10C6.76165 10 6.53857 10.5386 6.85355 10.8536L11.2929 15.2929C11.6834 15.6834 12.3166 15.6834 12.7071 15.2929Z"/></svg>`)
	// The title bar's pin, as the Tauri window draws it.
	iconPinned   = svg(`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M16 9V4h1c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1h1v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1l1-1v-7H19v-2c-1.66 0-3-1.34-3-3z"/></svg>`)
	iconUnpinned = svg(`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M14 4v5c0 1.12.37 2.16 1 3H9c.65-.86 1-1.9 1-3V4h4m3-2H7c-.55 0-1 .45-1 1s.45 1 1 1h1v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1l1-1v-7H19v-2c-1.66 0-3-1.34-3-3V4h1c.55 0 1-.45 1-1s-.45-1-1-1z"/></svg>`)
)

// actionIcons are the react-icons an action may name.
var actionIcons = map[string]*ui.SVG{
	"MdOutlineGTranslate": riMdOutlineGTranslate,
	"MdPalette":           riMdPalette,
	"MdOutlineSummarize":  riMdOutlineSummarize,
	"MdOutlineAnalytics":  riMdOutlineAnalytics,
	"MdCode":              riMdCode,
	"MdGrade":             riMdGrade,
	"MdOutlineGrade":      riMdOutlineGrade,
	"MdHistory":           riMdHistory,
	"MdStar":              riMdStar,
	"MdStarBorder":        riMdStarBorder,
	"MdEdit":              riMdEdit,
	"MdOutlineEdit":       riMdOutlineEdit,
	"MdContentCopy":       riMdContentCopy,
	"MdOutlineSearch":     riMdOutlineSearch,
	"TbCsv":               riTbCsv,
	"IoIosRocket":         riIoIosRocket,
}

// actionIconNames are the icons the action form offers, in order.
var actionIconNames = func() []string {
	names := make([]string, 0, len(actionIcons))
	for n := range actionIcons {
		names = append(names, n)
	}
	sort.Strings(names)
	return names
}()

func actionIcon(name string) *ui.SVG {
	if ic, ok := actionIcons[name]; ok {
		return ic
	}
	return riMdOutlineGrade
}

// ghostButton is a borderless icon button: size the box, pad the icon,
// round the corners, and light up on hover.
func ghostButton(c *ui.Context, p palette, icon *ui.SVG, label string, box, iconSize, radius float32) ui.Element {
	b := ui.Row(c).Size(box, box).Center().Radius(radius).Cursor(ui.CursorPointer).Label(label).Tooltip(label)
	if b.Hovered() {
		b.Background(p.hover)
	}
	b.Children(func() { ui.Icon(c, icon).Size(iconSize, iconSize) })
	return b
}
