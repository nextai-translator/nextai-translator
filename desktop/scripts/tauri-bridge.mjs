#!/usr/bin/env node
// The bridge from the Tauri app (NextAI Translator 0.x) to the Go app: the
// files that let installed Tauri apps update, with tauri-plugin-updater,
// into the Go app, which then updates itself with MyGo's updater.
//
//   node tauri-bridge.mjs latest-json [options] KEY[,KEY…]=FILE …
//   node tauri-bridge.mjs linux-launcher --version V --install-sh F --archive F --out F
//   node tauri-bridge.mjs verify [--pubkey KEY | --tauri-conf F] FILE [SIGFILE]
//   node tauri-bridge.mjs serve --dir D [--port 8787]
//
// latest-json writes the static update manifest of tauri-plugin-updater
// (latest.json), which installed Tauri apps read from
// https://github.com/nextai-translator/nextai-translator/releases/latest/download/latest.json
// (plugins.updater.endpoints in src-tauri/tauri.conf.json). Each FILE needs
// FILE.sig, the signature of `tauri signer sign`; each is checked against
// the updater's public key of tauri.conf.json before it is written. KEY is
// a target of the plugin, "<os>-<arch>" as darwin-aarch64, windows-x86_64 or
// linux-x86_64, which plugin 2.x looks up (updater.rs, json_target); the
// manifest also gets the "-app", "-nsis" and "-appimage" keys that
// tauri-action writes, for readers that prefer them.
//
// What each platform's Tauri app does with the file it downloads, and so
// which file to name:
//   macOS    a .tar.gz of one "<Name>.app" folder: it replaces the
//            installed bundle with it and starts CFBundleExecutable of the
//            new Info.plist. MyGo's update archive of darwin-universal
//            (nextai-translator-<v>-darwin-universal.tar.gz) is one.
//   Windows  an NSIS setup.exe, which it runs with /P /R /UPDATE and exits:
//            MyGo's installer (nextai-translator-setup-<v>-amd64.exe),
//            whose packaging/windows/tauri-migration.nsh takes over the
//            Tauri install.
//   Linux    any executable: it writes the bytes over $APPIMAGE and execs
//            it. linux-launcher makes it (see below).
//
// linux-launcher writes a shell script holding MyGo's install.sh and the
// app's Linux archive. Run in place of the AppImage, it installs the Go app
// in ~/.local/nextai-translator.app the first time, as install.sh does,
// and then only starts it there, where the app updates itself.
//
// verify checks a file against a Tauri (minisign) signature as
// tauri-plugin-updater does (minisign-verify, legacy signatures allowed).
//
// serve serves the files of a folder over HTTP, logging each request, for
// a Tauri app built with a local endpoint (see tauri-bridge-harness.sh).
//
// It needs Node 18 or later and nothing else (tar for linux-launcher).

import { createServer } from 'node:http'
import { createHash, createPublicKey, verify as edVerify } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { chmodSync, copyFileSync, existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const defaultTauriConf = resolve(here, '../../src-tauri/tauri.conf.json')

// The keys tauri-action writes besides "<os>-<arch>", by os.
const aliases = { darwin: ['app'], windows: ['nsis'], linux: ['appimage'] }

function fail(msg) {
    console.error(`tauri-bridge: ${msg}`)
    process.exit(1)
}

// parseArgs returns the --name value options and the other arguments.
function parseArgs(argv, flags = []) {
    const opts = {}
    const rest = []
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i]
        if (!a.startsWith('--')) {
            rest.push(a)
            continue
        }
        const eq = a.indexOf('=')
        const name = a.slice(2, eq < 0 ? undefined : eq)
        if (flags.includes(name)) {
            opts[name] = true
            continue
        }
        const value = eq < 0 ? argv[++i] : a.slice(eq + 1)
        if (value === undefined) fail(`--${name} needs a value`)
        opts[name] = value
    }
    return { opts, rest }
}

// --- minisign, as minisign-verify reads it ---

function b64lines(text, what) {
    const lines = text.replace(/\r/g, '').split('\n')
    if (lines.length < 2 || !lines[0].startsWith('untrusted comment:')) fail(`${what} is not minisign text`)
    return lines
}

// decodeTauriText decodes the base64 that Tauri keeps keys and signatures
// in (tauri.conf.json, .sig files, latest.json); text already decoded is
// returned as is.
function decodeTauriText(s) {
    s = s.trim()
    if (s.startsWith('untrusted comment:')) return s
    return Buffer.from(s, 'base64').toString('utf8')
}

export function parsePublicKey(b64) {
    const lines = b64lines(decodeTauriText(b64), 'the public key')
    const raw = Buffer.from(lines[1].trim(), 'base64')
    if (raw.length !== 42 || raw.subarray(0, 2).toString() !== 'Ed') fail('the public key is not a minisign Ed25519 key')
    return { keyId: raw.subarray(2, 10), key: raw.subarray(10) }
}

export function parseSignature(b64) {
    const lines = b64lines(decodeTauriText(b64), 'the signature')
    if (lines.length < 4 || !lines[2].startsWith('trusted comment: ')) fail('the signature has no trusted comment')
    const raw = Buffer.from(lines[1].trim(), 'base64')
    const alg = raw.subarray(0, 2).toString()
    if (raw.length !== 74 || (alg !== 'Ed' && alg !== 'ED')) fail('the signature is not a minisign Ed25519 signature')
    return {
        prehashed: alg === 'ED',
        keyId: raw.subarray(2, 10),
        sig: raw.subarray(10),
        trustedComment: lines[2].slice('trusted comment: '.length),
        globalSig: Buffer.from(lines[3].trim(), 'base64'),
    }
}

function ed25519Key(raw) {
    return createPublicKey({ key: { kty: 'OKP', crv: 'Ed25519', x: raw.toString('base64url') }, format: 'jwk' })
}

// verifyData reports why data does not match the signature, or '' when it
// does.
export function verifyData(pub, sig, data) {
    if (!pub.keyId.equals(sig.keyId)) {
        return `signed with key ${sig.keyId.toString('hex')}, not ${pub.keyId.toString('hex')}`
    }
    const key = ed25519Key(pub.key)
    const message = sig.prehashed ? createHash('blake2b512').update(data).digest() : data
    if (!edVerify(null, message, key, sig.sig)) return 'the signature does not match the file'
    const global = Buffer.concat([sig.sig, Buffer.from(sig.trustedComment, 'utf8')])
    if (!edVerify(null, global, key, sig.globalSig)) return 'the trusted comment is not signed'
    return ''
}

function tauriPublicKey(opts) {
    if (opts.pubkey) return opts.pubkey
    const conf = JSON.parse(readFileSync(opts['tauri-conf'] || defaultTauriConf, 'utf8'))
    const key = conf?.plugins?.updater?.pubkey
    if (!key) fail(`${opts['tauri-conf'] || defaultTauriConf} has no plugins.updater.pubkey`)
    return key
}

// signatureOf returns the signature of file as latest.json holds it: the
// base64 of the minisign text, which is what `tauri signer sign` writes.
function signatureOf(file) {
    const sigFile = `${file}.sig`
    if (!existsSync(sigFile)) fail(`no ${sigFile}: sign ${file} with tauri signer sign`)
    const text = readFileSync(sigFile, 'utf8').trim()
    return text.startsWith('untrusted comment:') ? Buffer.from(text + '\n').toString('base64') : text
}

// --- commands ---

function cmdVerify(argv) {
    const { opts, rest } = parseArgs(argv)
    if (rest.length < 1 || rest.length > 2) fail('usage: verify [--pubkey KEY | --tauri-conf F] FILE [SIGFILE]')
    const [file, sigFile = `${file}.sig`] = rest
    const pub = parsePublicKey(tauriPublicKey(opts))
    const why = verifyData(pub, parseSignature(readFileSync(sigFile, 'utf8')), readFileSync(file))
    if (why) fail(`${file}: ${why}`)
    console.log(`${file}: signature OK (key ${pub.keyId.toString('hex')})`)
}

export function buildManifest({ version, notes, pubDate, baseUrl, entries, pubkey }) {
    const pub = pubkey ? parsePublicKey(pubkey) : null
    const platforms = {}
    for (const { keys, file } of entries) {
        const signature = signatureOf(file)
        if (pub) {
            const why = verifyData(pub, parseSignature(signature), readFileSync(file))
            if (why) fail(`${file}: ${why}: Tauri apps would refuse it`)
        }
        const url = baseUrl + encodeURIComponent(basename(file))
        for (const key of keys) {
            if (!/^(darwin|windows|linux)-[a-z0-9_]+$/.test(key)) fail(`${key} is not a target of tauri-plugin-updater (<os>-<arch>)`)
            const os = key.split('-')[0]
            for (const k of [key, ...aliases[os].map((a) => `${key}-${a}`)]) {
                if (platforms[k] && platforms[k].url !== url) fail(`${k} names two files`)
                platforms[k] = { signature, url }
            }
        }
    }
    const sorted = Object.fromEntries(Object.keys(platforms).sort().map((k) => [k, platforms[k]]))
    return { version: version.replace(/^v/, ''), notes, pub_date: pubDate, platforms: sorted }
}

function cmdLatestJSON(argv) {
    const { opts, rest } = parseArgs(argv, ['no-verify'])
    if (!opts.version || !opts['base-url'] || rest.length === 0) {
        fail('usage: latest-json --version V --base-url URL [--notes S | --notes-file F] [--pub-date RFC3339] [--out F] [--pubkey KEY | --tauri-conf F | --no-verify] KEY[,KEY…]=FILE …')
    }
    if (!/^v?\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(opts.version)) fail(`${opts.version} is not a semver version`)
    let baseUrl = opts['base-url']
    if (!baseUrl.endsWith('/')) baseUrl += '/'
    const entries = rest.map((a) => {
        const eq = a.indexOf('=')
        if (eq < 0) fail(`${a} is not KEY=FILE`)
        return { keys: a.slice(0, eq).split(','), file: a.slice(eq + 1) }
    })
    const notes = opts['notes-file'] ? readFileSync(opts['notes-file'], 'utf8').trim() : (opts.notes ?? '')
    const manifest = buildManifest({
        version: opts.version,
        notes,
        pubDate: opts['pub-date'] || new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
        baseUrl,
        entries,
        pubkey: opts['no-verify'] ? null : tauriPublicKey(opts),
    })
    const text = JSON.stringify(manifest, null, 2) + '\n'
    if (opts.out) writeFileSync(opts.out, text)
    else process.stdout.write(text)
}

// The script that stands in for the AppImage. @…@ are filled in.
const launcherHeader = `#!/bin/sh
# NextAI Translator @VERSION@ for Linux (@TARGET@).
#
# Tauri's updater wrote this over the AppImage of NextAI Translator 0.x
# and runs it. The first time, it installs the app in
# ~/.local/nextai-translator.app with the install.sh it holds, as the
# app's own install script does; then it starts the app there, which
# updates itself from then on. Launchers and autostart entries that
# pointed at the AppImage keep working through this file.
set -u
app="$HOME/.local/nextai-translator.app/nextai-translator"

fail() {
	echo "NextAI Translator: $*" >&2
	command -v notify-send >/dev/null 2>&1 && notify-send "NextAI Translator" "$*" 2>/dev/null
	exit 1
}

# Started by the AppImage that just updated, this inherits its environment:
# paths into its mount (APPDIR, /tmp/.mount_*), gone once it exits, in
# PATH, LD_LIBRARY_PATH, XDG_DATA_DIRS, GTK_*, GIO_*, GST_*. Drop them.
if [ -n "\${APPDIR:-}" ] || [ -n "\${APPIMAGE:-}" ]; then
	mnt="\${APPDIR:-}"
	set -f
	for var in $(env | sed -n 's/^\\([A-Za-z_][A-Za-z0-9_]*\\)=.*/\\1/p'); do
		eval "val=\\\${$var-}"
		touches=
		case "$val" in
		*/.mount_*) touches=1 ;;
		esac
		if [ -n "$mnt" ]; then
			case "$val" in
			*"$mnt"*) touches=1 ;;
			esac
		fi
		[ -n "$touches" ] || continue
		kept=
		old_ifs=$IFS
		IFS=:
		for part in $val; do
			case "$part" in
			*/.mount_*) continue ;;
			esac
			if [ -n "$mnt" ]; then
				case "$part" in
				"$mnt" | "$mnt"/*) continue ;;
				esac
			fi
			kept="\${kept:+$kept:}$part"
		done
		IFS=$old_ifs
		if [ -n "$kept" ]; then
			export "$var=$kept"
		else
			unset "$var"
		fi
	done
	set +f
	unset APPDIR APPIMAGE ARGV0
	# The AppImage's hooks (linuxdeploy's gtk and gstreamer plugins) set
	# these over any value of the user's, for the Tauri app alone.
	unset GTK_THEME GDK_BACKEND GST_REGISTRY_REUSE_PLUGIN_SCANNER
	# Its AppRun works in the mount (usr/): an app working there keeps the
	# old AppImage mounted. Start where the user started it.
	cd "\${OWD:-$HOME}" 2>/dev/null || cd "$HOME" 2>/dev/null || cd /
	unset OWD OLDPWD
	from_appimage=1
fi

if [ ! -x "$app" ]; then
	work="$(mktemp -d)" || fail "could not make a temporary folder"
	trap 'rm -rf "$work"' EXIT
	line="$(awk '/^__NEXTAI_TRANSLATOR_PAYLOAD__$/ { print NR + 1; exit }' "$0")"
	[ -n "$line" ] || fail "$0 holds no app"
	tail -n +"$line" "$0" | tar -xf - -C "$work" || fail "could not unpack the app from $0"
	sh "$work/install.sh" "$work/@ARCHIVE@" >&2 || fail "could not install the app in ~/.local/nextai-translator.app"
	rm -rf "$work"
	trap - EXIT
	[ -x "$app" ] || fail "the app is not in ~/.local/nextai-translator.app"
fi
# The AppImage runtime leaves the app two descriptors: the read end of
# its keepalive pipe (3) and the mount itself (1023). Its FUSE process
# stays, mounted, until no process holds them. The app needs none of what
# comes in above stderr, so close them all; sh closes only up to 9, bash
# does the rest and becomes the app.
if [ -n "\${from_appimage:-}" ] && command -v bash >/dev/null 2>&1; then
	exec bash -c 'for f in /proc/$$/fd/*; do n=\${f##*/}; [ "$n" -gt 2 ] 2>/dev/null && eval "exec $n>&-"; done; exec "$0" "$@"' "$app" "$@"
fi
exec "$app" "$@"
exit 1
__NEXTAI_TRANSLATOR_PAYLOAD__
`

export function launcherScript(version, target, archiveName) {
    for (const [what, v] of [['version', version], ['target', target], ['archive', archiveName]]) {
        if (!/^[0-9A-Za-z._+-]+$/.test(v)) fail(`the ${what} ${v} has characters the launcher cannot hold`)
    }
    return launcherHeader.replaceAll('@VERSION@', version).replaceAll('@TARGET@', target).replaceAll('@ARCHIVE@', archiveName)
}

function cmdLinuxLauncher(argv) {
    const { opts } = parseArgs(argv)
    for (const k of ['version', 'install-sh', 'archive', 'out']) {
        if (!opts[k]) fail('usage: linux-launcher --version V --install-sh F --archive F --out F')
    }
    const archiveName = basename(opts.archive)
    const target = /-(linux-[a-z0-9]+)\.tar\.gz$/.exec(archiveName)?.[1]
    if (!target) fail(`${archiveName} is not a Linux archive of mygo build (<slug>-<version>-linux-<arch>.tar.gz)`)
    const work = mkdtempSync(join(tmpdir(), 'tauri-bridge-'))
    try {
        copyFileSync(opts['install-sh'], join(work, 'install.sh'))
        copyFileSync(opts.archive, join(work, archiveName))
        const tar = spawnSync('tar', ['-cf', '-', '-C', work, 'install.sh', archiveName], {
            maxBuffer: 1 << 30,
            env: { ...process.env, COPYFILE_DISABLE: '1' },
        })
        if (tar.status !== 0) fail(`tar: ${tar.stderr}`)
        const script = Buffer.from(launcherScript(opts.version.replace(/^v/, ''), target, archiveName))
        writeFileSync(opts.out, Buffer.concat([script, tar.stdout]))
        chmodSync(opts.out, 0o755)
    } finally {
        rmSync(work, { recursive: true, force: true })
    }
    console.log(`wrote ${opts.out}`)
}

function cmdServe(argv) {
    const { opts } = parseArgs(argv)
    if (!opts.dir) fail('usage: serve --dir D [--port 8787]')
    const root = resolve(opts.dir)
    const port = Number(opts.port || 8787)
    createServer((req, res) => {
        const name = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '')
        const file = resolve(root, name)
        const ok = file.startsWith(root + '/') || file.startsWith(root + '\\')
        if (!ok || !existsSync(file) || !statSync(file).isFile()) {
            console.log(`${req.method} ${req.url} 404`)
            res.writeHead(404).end()
            return
        }
        const body = readFileSync(file)
        console.log(`${req.method} ${req.url} 200 ${body.length}`)
        res.writeHead(200, { 'Content-Length': body.length, 'Content-Type': file.endsWith('.json') ? 'application/json' : 'application/octet-stream' })
        res.end(req.method === 'HEAD' ? undefined : body)
    }).listen(port, '127.0.0.1', () => console.log(`serving ${root} at http://127.0.0.1:${port}/`))
}

const commands = {
    'latest-json': cmdLatestJSON,
    'linux-launcher': cmdLinuxLauncher,
    'verify': cmdVerify,
    'serve': cmdServe,
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const [cmd, ...argv] = process.argv.slice(2)
    if (!commands[cmd]) fail(`usage: tauri-bridge.mjs ${Object.keys(commands).join(' | ')} …`)
    commands[cmd](argv)
}
