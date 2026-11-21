# OpenLLM

[OpenLLM](https://www.openllm.sh) routes your API keys, OAuth subscription accounts and local models through one format-agnostic endpoint. NextAI Translator uses its Chat Completions API.

## Cloud

In Settings, choose **OpenLLM** and use `https://www.openllm.sh` as the API URL. Add an `sk-llm-...` API key from [openllm.sh](https://www.openllm.sh), then choose a model. `plus` is a sensible default for translation.

## Local daemon

The local daemon runs on macOS and Linux. In Settings, choose **OpenLLM**, set the API URL to `http://127.0.0.1:8787`, and leave the API key blank. Refresh the model list, select a model, and save.

## Model discovery

The model selector reads `GET /v1/models`. Cloud requests use the configured bearer key; local-daemon requests do not need one. Model IDs can use the `<provider>/<model>` format. The `ultra`, `plus`, and `lite` aliases can be available when enabled.

See [OpenLLM documentation](https://docs.openllm.sh) for setup details.
