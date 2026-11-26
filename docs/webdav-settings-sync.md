# WebDAV settings sync

1. Open **Settings → WebDAV Sync** in the desktop app or on the browser extension's options page.
2. Enter the full URL of a settings file in an existing WebDAV folder. For example, the [Nutstore WebDAV endpoint](https://help.jianguoyun.com/?p=5677) is `https://dav.jianguoyun.com/dav/`. If your sync folder is named `NextAI`, enter `https://dav.jianguoyun.com/dav/NextAI/nextai-settings.json` and use your Nutstore email and [third-party app password](https://help.jianguoyun.com/?p=2064).
3. Enter an encryption passphrase and select **Sync now**. In the browser, grant access to the WebDAV host when prompted.
4. Use the same file URL and passphrase on every device. Select **Sync now** after saving changes or to pull settings changed elsewhere.

The first sync creates the file if it does not exist. Settings changed on only one device are kept. If both copies of a setting changed since the last sync, choose which side to keep for the conflicts. Action definitions, per-action options and the default action are merged as a group so their references stay intact.

The file includes global preferences, provider API keys, proxy options, shortcuts, custom actions and per-action model settings. The app encrypts the file on the device before upload. The WebDAV password and encryption passphrase are kept in the open settings view. Translation history and vocabulary remain on each device.

The server must support HTTPS, `GET`, conditional `PUT`, and strong `ETag` responses for updates. HTTP is accepted for loopback testing. Use the final file URL if the server normally redirects. A shortcut or voice selected on one device must also be available on the other device to take effect.

# WebDAV 设置同步

1. 在桌面端设置或浏览器扩展的选项页中打开 **设置 → WebDAV 同步**。
2. 输入现有 WebDAV 目录中设置文件的完整 URL。[坚果云的 WebDAV 入口](https://help.jianguoyun.com/?p=5677)是 `https://dav.jianguoyun.com/dav/`。例如，同步文件夹名为 `NextAI` 时，填写 `https://dav.jianguoyun.com/dav/NextAI/nextai-settings.json`，并使用坚果云账号邮箱和[第三方应用密码](https://help.jianguoyun.com/?p=2064)。
3. 输入加密口令并点击 **立即同步**。浏览器弹出权限提示时，允许访问 WebDAV 服务器。
4. 在每台设备上使用相同的文件 URL 和口令。保存设置后或需要获取其他设备的修改时，点击 **立即同步**。

首次同步会在文件不存在时创建文件。只在一台设备上改动的设置会自动合并。同一设置在上次同步后两端都有修改时，可以选择保留哪一端的值。操作定义、单个操作的设置和默认操作会一起合并，以保持引用一致。

同步范围包括全局偏好、服务商 API 密钥、代理、快捷键、自定义操作和单个操作的模型设置。文件在设备上加密后再上传。WebDAV 密码和加密口令保留在当前打开的设置界面中。翻译历史和生词本保留在各设备上。

服务器需支持 HTTPS、`GET`、带条件的 `PUT`，以及更新所需的强 `ETag`。本机回环地址可以使用 HTTP 测试。如果服务器会重定向，请直接填写最终的文件 URL。快捷键和语音需在目标设备上可用才能生效。
