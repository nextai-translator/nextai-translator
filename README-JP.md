# OpenAI社から商標権に関する警告を受けたため、このプロジェクトと製品は「Next AI Translator」に名称変更されました。ご理解のほどよろしくお願いいたします。

<p align="center">
    <br> <a href="README.md">English</a> | <a href="README-CN.md">中文</a> | 日本語
</p>
<p align="center">
    <em>The translator that does more than just translation</em>
</p>

<p align="center">
  <a href="LICENSE" target="_blank">
    <img alt="MIT License" src="https://img.shields.io/github/license/yetone/openai-translator.svg?style=flat-square" />
  </a>

  <!-- TypeScript Badge -->
  <img alt="TypeScript" src="https://img.shields.io/badge/-TypeScript-blue?style=flat-square&logo=typescript&logoColor=white" />

  <!-- Rust Badge -->
  <img alt="Rust" src="https://img.shields.io/badge/-Rust-orange?style=flat-square&logo=rust&logoColor=white" />

  <a href="https://chrome.google.com/webstore/detail/openai-translator/ogjibjphoadhljaoicdnjnmgokohngcc" target="_blank">
    <img alt="Chrome" src="https://img.shields.io/chrome-web-store/stars/ogjibjphoadhljaoicdnjnmgokohngcc?color=blue&label=Chrome&style=flat-square&logo=google-chrome&logoColor=white" />
  </a>

  <a href="https://addons.mozilla.org/en-US/firefox/addon/openai-translator/" target="_blank">
    <img alt="Firefox" src="https://img.shields.io/amo/stars/openai-translator?color=orange&label=Firefox&style=flat-square&logo=firefox&logoColor=white" />
  </a>

  <a href="https://github.com/yetone/openai-translator/releases" target="_blank">
    <img alt="macOS" src="https://img.shields.io/badge/-macOS-black?style=flat-square&logo=apple&logoColor=white" />
  </a>

  <a href="https://github.com/yetone/openai-translator/releases" target="_blank">
    <img alt="Windows" src="https://img.shields.io/badge/-Windows-blue?style=flat-square&logo=windows&logoColor=white" />
  </a>

  <a href="https://github.com/yetone/openai-translator/releases" target="_blank">
    <img alt="Linux" src="https://img.shields.io/badge/-Linux-yellow?style=flat-square&logo=linux&logoColor=white" />
  </a>
</p>

# なぜこのツールを作ったのか

私はmacOS上でChatGPT APIを使用してグローバルな翻訳機能を提供する[Bob](https://bobtranslate.com/)の[プラグイン](https://github.com/yetone/bob-plugin-openai-translator)を開発しました。しかし、すべてのユーザーがmacOSを使用できるわけではないため、このプロジェクトを作成しました！

# ブラウザ拡張機能以上のもの

Chrome拡張機能として始まったこのプロジェクトは、現在マルチプラットフォーム対応のデスクトップアプリケーションへと進化しています。

<p align="center">
  <img width="560" src="https://user-images.githubusercontent.com/1206493/223899374-ff386436-63b8-4618-afdd-fed2e6b48d56.png" />
</p>

# 翻訳以上の機能

翻訳ツールとして始まったこのプロジェクトは、驚くほど効果的な文章改善機能と要約機能を持つツールへと進化しました（~~偶然にも~~）。

# 使い方

<p align="center">
  <img width="800" src="https://user-images.githubusercontent.com/1206493/223200182-6a1d2a02-3fe0-4723-bdae-99d8b7212a33.gif" />
</p>

# 機能

1. 翻訳、文章改善、要約の3つのモードを提供します。
2. 55種類の言語間での相互翻訳、文章改善、要約が可能です。
3. ストリーミングモードをサポートしています！
4. ユーザーが翻訳テキストをカスタマイズできます。
5. ワンクリックコピー機能
6. 音声読み上げ（TTS）機能
7. すべてのプラットフォーム（Windows、macOS、Linux）でブラウザとデスクトップの両方で利用可能です。
8. スクリーンショット翻訳をサポートしています。
9. 単語帳機能をサポートしており、単語帳の単語に基づいて記憶補助コンテンツを生成できます。
10. [OpenAI](https://openai.com/)と[Azure OpenAI Service](https://azure.microsoft.com/en-us/products/cognitive-services/openai-service)の両方を同時にサポートしています。

# 準備

- （必須）OpenAI APIキーを[こちら](https://platform.openai.com/account/api-keys)で申請するか、[Azure OpenAI Service APIキー](https://learn.microsoft.com/en-us/azure/cognitive-services/openai/chatgpt-quickstart?tabs=command-line&pivots=rest-api#retrieve-key-and-endpoint)を取得してください。
- （オプション）OpenAIにアクセスできない場合は、OpenAI APIプロキシを使用できます。

# インストール

## Windows

### 手動インストール

1. [最新リリース](https://github.com/yetone/openai-translator/releases/latest)ページから`.exe`で終わるインストールパッケージをダウンロードします。
2. ダウンロードしたファイルをダブルクリックしてインストールします。
3. 安全でないと表示された場合は、`詳細情報`→`実行`をクリックしてインストールを続行できます。
4. すぐに使用できます！

## MacOS

### 手動インストール

1. [最新リリース](https://github.com/yetone/openai-translator/releases/latest)ページから、お使いのチップに対応する`.dmg`インストールパッケージをダウンロードします。注意：Apple Siliconマシンの場合はaarch64バージョンを使用し、以下の`xattr`コマンドを実行してください。
2. ダウンロードしたファイルをダブルクリックしてインストールします。
3. すぐに使用できます！

### トラブルシューティング

- 「"OpenAI Translator"は開発元が未確認のため開けません」と表示される場合

    <p align="center">
      <img width="300" src="https://user-images.githubusercontent.com/1206493/223916804-45ce3f34-6a4a-4baf-a0c1-4ab5c54c521f.png" />
    </p>

    - `キャンセル`ボタンをクリックし、`設定`→`プライバシーとセキュリティ`ページに移動して、`このまま開く`ボタンをクリックし、ポップアップウィンドウで`開く`ボタンをクリックしてください。その後、`OpenAI Translator`を開く際に警告が表示されなくなります。🎉
        <p align="center">
          <img width="500" src="https://user-images.githubusercontent.com/1206493/223916970-9c99f15e-cf61-4770-b92d-4a78f980bb26.png" /> <img width="200" src="https://user-images.githubusercontent.com/1206493/223917449-ed1ac19f-c43d-4b13-9888-79ba46ceb862.png" />
        </p>

    - `プライバシーとセキュリティ`に上記のオプションが見つからない場合、またはApple Siliconマシンでファイルが破損しているというエラーが表示される場合は、`ターミナル.app`を開いて次のコマンドを入力してください（途中でパスワードの入力が必要な場合があります）。その後、`OpenAI Translator`を再起動してください：

        ```sh
        sudo xattr -d com.apple.quarantine /Applications/OpenAI\ Translator.app
        ```

- 開くたびに権限プロンプトが表示される場合、またはショートカットキーでの翻訳が実行できない場合は、`設定`→`プライバシーとセキュリティ`→`アクセシビリティ`でOpenAI Translatorを削除し、再度OpenAI Translatorを追加してください。

    <p align="center">
      <img width="500" src="https://user-images.githubusercontent.com/1206493/224536148-eec559bf-4d99-48c1-bbd3-2cc105aff084.png" />
      <img width="600" src="https://user-images.githubusercontent.com/1206493/224536277-4200f58e-8dc0-4c01-a27a-a30d7d8dc69e.gif" />
    </p>

## デスクトップクリップ拡張機能のインストール

詳細については、[デスクトップクリップ拡張機能](./CLIP-EXTENSIONS.md)をご覧ください。

  <p align="center">
    <img width="600" src="https://user-images.githubusercontent.com/1206493/240355949-8f41d98d-f097-4ce4-a533-af60e1757ca1.gif" />
  </p>

## ブラウザ拡張機能

1. ブラウザの拡張機能ストアにアクセスして、このプラグインをインストールしてください：

   <p align="center">
     <a target="_blank" href="https://chrome.google.com/webstore/detail/openai-translator/ogjibjphoadhljaoicdnjnmgokohngcc">
       <img src="https://img.shields.io/chrome-web-store/v/ogjibjphoadhljaoicdnjnmgokohngcc?label=Chrome%20Web%20Store&style=for-the-badge&color=blue&logo=google-chrome&logoColor=white" />
     </a>
     <a target="_blank" href="https://addons.mozilla.org/en-US/firefox/addon/openai-translator/">
       <img src="https://img.shields.io/amo/v/openai-translator?label=Firefox%20Add-on&style=for-the-badge&color=orange&logo=firefox&logoColor=white" />
     </a>
   </p>

2. ブラウザのプラグインリストにあるOpenAI Translatorアイコンをクリックし、取得したAPIキーをこのプラグインのポップアップ設定画面に入力してください。

   <p align="center">
     <img width="600" src="https://user-images.githubusercontent.com/1206493/222958165-159719b4-28a5-44a4-b700-567786df7f03.png" />
   </p>

3. ブラウザでページを更新すると、スムーズな翻訳体験をお楽しみいただけます🎉！

## Azure OpenAI Serviceの設定

```ts
const API_URL = `https://${resourceName}.openai.azure.com`
const API_URL_PATH = `/openai/deployments/${deployName}/chat/completions?api-version=${apiVersion}`
```

- resourceName: お使いのAzure OpenAI Serviceリソース名です。
- deployName: お使いのAzure OpenAI Serviceモデルのデプロイ名です。ここでモデルを変更できます。
- api-version: 2023-05-15以降のバージョンです（サポートされているapi-versionは[Azureの公式ドキュメント](https://learn.microsoft.com/en-us/azure/ai-services/openai/reference#completions)で確認できます）。

# ライセンス

[LICENSE](./LICENSE)

# スター履歴

<p align="center">
  <a target="_blank" href="https://star-history.com/#yetone/openai-translator&Date">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=yetone/openai-translator&type=Date&theme=dark">
      <img alt="NebulaGraph Data Intelligence Suite(ngdi)" src="https://api.star-history.com/svg?repos=yetone/openai-translator&type=Date">
    </picture>
  </a>
</p>
