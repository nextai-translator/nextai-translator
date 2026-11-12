#!/usr/bin/env bash
# Local test of the update from the Tauri app to the Go app, on the machine
# of the OS under test (macOS, Linux, or Windows in Git Bash), with
# throwaway keys and a local update server in place of GitHub:
#
#   desktop/scripts/tauri-bridge-harness.sh keys     # throwaway Tauri (minisign) and MyGo keys
#   desktop/scripts/tauri-bridge-harness.sh tauri    # the Tauri app 0.6.0, reading http://127.0.0.1:8787/latest.json
#   (install the Tauri build it names, open it once, quit it)
#   desktop/scripts/tauri-bridge-harness.sh go       # the Go app 9.0.0, signed with the throwaway MyGo key
#   desktop/scripts/tauri-bridge-harness.sh publish  # the files Tauri downloads, their .sig, latest.json
#   desktop/scripts/tauri-bridge-harness.sh serve    # serve them; open the Tauri app and update
#
# Then check, per OS, that the Tauri app became the Go app:
#   macOS    the installed NextAI Translator.app (in /Applications or
#            ~/Applications) holds Contents/MacOS/NextAI Translator
#            and the Go app started.
#   Windows  %LOCALAPPDATA%\NextAI Translator holds "NextAI Translator.exe",
#            Uninstall.exe and .mygo-files, no app.exe nor resources\; Settings >
#            Apps lists one NextAI Translator (9.0.0); the Start menu
#            shortcut opens the Go app, which started.
#   Linux    the AppImage file is now the launcher script; ~/.local/nextai-translator.app
#            holds the app, which started (from the AppImage's own environment).
# And that the Go app found the Tauri app's settings and history.
#
# Everything goes in $HARNESS_DIR (default <repo>/tmp/tauri-bridge-harness,
# ignored by git). The tauri step needs what `pnpm build-tauri` needs (Rust,
# pnpm); go needs Go; publish and serve need Node.
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
desktop="$(cd "$here/.." && pwd)"
repo="$(cd "$desktop/.." && pwd)"
H="${HARNESS_DIR:-$repo/tmp/tauri-bridge-harness}"
PORT="${PORT:-8787}"
TAURI_VERSION="${TAURI_VERSION:-0.6.0}"
GO_VERSION="${GO_VERSION:-9.0.0}"
TAURI_CLI="${TAURI_CLI:-npx --yes @tauri-apps/cli@2.8.4}"
bridge="$here/tauri-bridge.mjs"

case "$(uname -s)" in
Darwin) os=darwin ;;
Linux) os=linux ;;
MINGW* | MSYS* | CYGWIN*) os=windows ;;
*) echo "unsupported OS $(uname -s)" >&2; exit 1 ;;
esac
case "$(uname -m)" in
arm64 | aarch64) goarch=arm64 tauriarch=aarch64 ;;
x86_64 | amd64) goarch=amd64 tauriarch=x86_64 ;;
*) echo "unsupported arch $(uname -m)" >&2; exit 1 ;;
esac

sign() { # sign FILE: writes FILE.sig with the throwaway Tauri key
	$TAURI_CLI signer sign -f "$H/keys/tauri.key" -p "" "$1" >/dev/null
	[ -s "$1.sig" ] || { echo "no $1.sig" >&2; exit 1; }
}

step_keys() {
	mkdir -p "$H/keys"
	$TAURI_CLI signer generate --ci -p "" -f -w "$H/keys/tauri.key"
	(cd "$desktop" && go tool mygo keygen -o "$H/keys")
	echo "keys in $H/keys"
}

step_tauri() {
	local pub
	pub="$(cat "$H/keys/tauri.key.pub")"
	cat >"$H/tauri.conf.json" <<EOF
{
  "version": "$TAURI_VERSION",
  "plugins": {
    "updater": {
      "endpoints": ["http://127.0.0.1:$PORT/latest.json"],
      "dangerousInsecureTransportProtocol": true,
      "pubkey": "$pub"
    }
  }
}
EOF
	local bundles=()
	if [ "$os" = darwin ]; then
		# The DMG's layout is set by an AppleScript to Finder, which waits
		# forever for the Automation prompt in an SSH session; the test
		# installs the .app itself. bindgen (appkit-nsworkspace-bindings)
		# needs libclang, which a Command Line Tools-only Mac has there.
		bundles=(--bundles app)
		[ -n "${LIBCLANG_PATH:-}" ] || export LIBCLANG_PATH="$(xcode-select -p)/usr/lib"
	fi
	cd "$repo"
	pnpm install
	pnpm build-tauri-renderer
	TAURI_SIGNING_PRIVATE_KEY="$(cat "$H/keys/tauri.key")" TAURI_SIGNING_PRIVATE_KEY_PASSWORD="" \
		pnpm tauri build --config "$H/tauri.conf.json" ${bundles[@]+"${bundles[@]}"}
	echo "Install the Tauri app $TAURI_VERSION from:"
	find "$repo/src-tauri/target/release/bundle" -maxdepth 2 \( -name '*.app' -o -name '*-setup.exe' -o -name '*.AppImage' \) -print
}

step_go() {
	local src="$H/go-src"
	rm -rf "$src"
	mkdir -p "$src"
	# The project without its builds, with the test version and key.
	(cd "$desktop" && tar --exclude=./dist -cf - .) | (cd "$src" && tar -xf -)
	node -e '
		const fs = require("fs")
		const [file, version, key] = process.argv.slice(1)
		const c = JSON.parse(fs.readFileSync(file, "utf8"))
		c.version = version
		c.updates.publicKey = fs.readFileSync(key, "utf8").trim()
		fs.writeFileSync(file, JSON.stringify(c, null, 2) + "\n")
	' "$src/mygo.json" "$GO_VERSION" "$H/keys/mygo-update.pub"
	local platform="$os/$goarch"
	[ "$os" = darwin ] && platform=darwin/universal
	(cd "$src" && MYGO_UPDATER_PRIVATE_KEY="$(cat "$H/keys/mygo-update.key")" go tool mygo build -platform "$platform" -skip-dmg)
	echo "built into $src/dist"
}

step_publish() {
	local dist="$H/go-src/dist" www="$H/www" file key
	rm -rf "$www"
	mkdir -p "$www"
	case "$os" in
	darwin)
		file="$www/nextai-translator-$GO_VERSION-darwin-universal.tar.gz"
		cp "$dist/darwin-universal/$(basename "$file")" "$file"
		key="darwin-aarch64,darwin-x86_64"
		;;
	windows)
		file="$www/nextai-translator-setup-$GO_VERSION-$goarch.exe"
		cp "$dist/windows-$goarch/$(basename "$file")" "$file"
		key="windows-$tauriarch"
		;;
	linux)
		file="$www/nextai-translator-$GO_VERSION-linux-$goarch.run"
		node "$bridge" linux-launcher --version "$GO_VERSION" --install-sh "$dist/linux-$goarch/install.sh" \
			--archive "$dist/linux-$goarch/nextai-translator-$GO_VERSION-linux-$goarch.tar.gz" --out "$file"
		key="linux-$tauriarch"
		;;
	esac
	sign "$file"
	node "$bridge" latest-json --version "$GO_VERSION" --notes "Tauri to Go bridge test" \
		--base-url "http://127.0.0.1:$PORT/" --pubkey "$(cat "$H/keys/tauri.key.pub")" \
		--out "$www/latest.json" "$key=$file"
	cat "$www/latest.json"
}

step_serve() {
	node "$bridge" serve --dir "$H/www" --port "$PORT"
}

case "${1:-}" in
keys | tauri | go | publish | serve) "step_$1" ;;
*) sed -n '2,/^set -e/p' "$0" | sed '$d; s/^# \{0,1\}//' >&2; exit 2 ;;
esac
