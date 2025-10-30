send_text() {
    curl -d "$POPCLIP_TEXT" --unix-socket /tmp/nextai-translator.sock http://nextai-translator
}

if ! send_text; then
    open -g -a NextAI\ Translator
    sleep 2
    send_text
fi
