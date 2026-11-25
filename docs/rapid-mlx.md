# Rapid-MLX

[Rapid-MLX](https://rapidmlx.com) runs local inference on Apple Silicon Macs.
Install it with `pip install rapid-mlx`, then start a model:

```sh
rapid-mlx serve qwen3.5-4b-4bit --cors-origins chrome-extension://ogjibjphoadhljaoicdnjnmgokohngcc
```

That origin is NextAI Translator's Chrome Web Store extension ID. Rapid-MLX
rejects requests carrying a foreign `Origin` unless it is explicitly allowed.
For an unpacked Chromium build, replace the ID with the one shown in
`chrome://extensions`. For Firefox, use
`--cors-origins moz-extension://<uuid>`, replacing `<uuid>` with the extension's
internal UUID shown in `about:debugging#/runtime/this-firefox`.
Newer releases also accept `--cors-origins 'chrome-extension://*'`.

In NextAI Translator Settings:

1. Select **Rapid-MLX (Local Model)** as the provider.
2. Set **API URL** to `http://127.0.0.1:8000/v1` (the default). Include `/v1`
   exactly once; discovery uses `/models` and translation uses `/chat/completions`.
3. Leave **API Key** blank. No environment variables or API keys are required.
   If you started the server with `--api-key`, enter that key here.
4. Refresh the model list after changing the URL, select an ID returned by the
   server's `/v1/models` endpoint, and click **Save**. There is no fixed default model.
5. Open the extension popup and translate some text. Responses stream from your
   local server; summarization and polishing use the same provider.

If discovery fails, check that the server is running, the URL includes the right
port, and the CORS origin matches the installed extension. The browser build
includes access to `http://127.0.0.1` and `http://localhost`; keep the server on
loopback. In the desktop app, run the server on the same Mac and use the same
settings.
