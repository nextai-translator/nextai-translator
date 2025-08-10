send_text() {
    curl -d "$POPCLIP_TEXT" --unix-socket /tmp/lingualearn.sock http://lingualearn
}

if ! send_text; then
    open -g -a LinguaLearn
    sleep 2
    send_text
fi
