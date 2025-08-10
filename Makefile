VERSION ?= 0.1.0

clean:
	rm -rf dist

change-version:
	sed -i -e "s/\"version\": \".*\"/\"version\": \"$(VERSION)\"/" src-tauri/tauri.conf.json

change-package-version:
	sed -i -e "s/\"version\": \".*\"/\"version\": \"$(VERSION)\"/" package.json

build-browser-extension: change-package-version
	pnpm vite build -c vite.config.chromium.ts
	pnpm vite build -c vite.config.firefox.ts
	cd dist/browser-extension/chromium && zip -r ../chromium.zip .
	cd dist/browser-extension/firefox && zip -r ../firefox.zip .

build-userscript: change-package-version
	pnpm vite build -c vite.config.userscript.ts

build-popclip-extension:
	rm -f dist/lingualearn.popclipextz
	mkdir -p dist/lingualearn.popclipext
	cp -r clip-extensions/popclip/* dist/lingualearn.popclipext
	cd dist && zip -r lingualearn.popclipextz lingualearn.popclipext && rm -r lingualearn.popclipext

build-snipdo-extension:
	rm -f dist/lingualearn.pbar
	zip -j -r dist/lingualearn.pbar clip-extensions/snipdo/*
