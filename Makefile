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
	rm -f dist/nextai-translator.popclipextz
	mkdir -p dist/nextai-translator.popclipext
	cp -r clip-extensions/popclip/* dist/nextai-translator.popclipext
	cd dist && zip -r nextai-translator.popclipextz nextai-translator.popclipext && rm -r nextai-translator.popclipext

build-snipdo-extension:
	rm -f dist/nextai-translator.pbar
	zip -j -r dist/nextai-translator.pbar clip-extensions/snipdo/*
