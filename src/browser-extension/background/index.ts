/* eslint-disable no-case-declarations */
import browser from 'webextension-polyfill'
import { BackgroundEventNames } from '../../common/background/eventnames'
import { BackgroundFetchRequestMessage, BackgroundFetchResponseMessage } from '../../common/background/fetch'
import { vocabularyInternalService } from '../../common/internal-services/vocabulary'
import { actionInternalService } from '../../common/internal-services/action'
import { optionsPageHeaderPromotionIDKey, optionsPageOpenaiAPIKeyPromotionIDKey } from '../common'
import { chatgptArkoseReqParams } from '@/common/constants'
import { keyChatgptArkoseReqForm, keyChatgptArkoseReqUrl } from '@/common/engines/chatgpt'
import { keyKimiAccessToken } from '@/common/engines/kimi'
import { keyChatGLMAccessToken } from '@/common/engines/chatglm'
import { type TranslationResult } from '../../common/translate/types'

// 定义消息类型枚举，用于类型安全的消息传递
export enum MessageType {
    STORE_TRANSLATION_RESULT = 'STORE_TRANSLATION_RESULT',
    GET_LAST_TRANSLATION = 'GET_LAST_TRANSLATION',
    TRANSLATION_RESULT_UPDATED = 'TRANSLATION_RESULT_UPDATED',
    PING = 'PING',
}

// --- 添加存储键常量 ---
const TRANSLATION_RESULT_STORAGE_KEY = 'openai_translator_last_translation_result'

// --- 添加缺失的变量 ---
let lastTranslationResult: TranslationResult | null = null

// --- 添加顶层日志，用于确认背景脚本执行 ---
console.log('%%%%% BACKGROUND SCRIPT LOADED %%%%%')

// --- 初始化时从存储中加载上次的翻译结果 ---
browser.storage.local
    .get(TRANSLATION_RESULT_STORAGE_KEY)
    .then((result) => {
        if (result[TRANSLATION_RESULT_STORAGE_KEY]) {
            lastTranslationResult = result[TRANSLATION_RESULT_STORAGE_KEY] as TranslationResult
            console.log('Loaded last translation result from storage:', lastTranslationResult)
        } else {
            console.log('No stored translation result found')
        }
    })
    .catch((err) => {
        console.error('Error loading translation result from storage:', err)
    })

// --- 在初始化时配置侧边栏行为 ---
try {
    // 使用setTimeout延迟侧边栏配置，确保扩展完全初始化
    setTimeout(() => {
        // @ts-expect-error 处理浏览器兼容性和类型定义问题
        if (browser.sidePanel) {
            // @ts-expect-error 处理浏览器兼容性和类型定义问题
            browser.sidePanel
                .setPanelBehavior({ openPanelOnActionClick: true })
                .then(() => console.log('Side panel behavior set: will open on action click'))
                .catch((err: unknown) => console.error('Failed to set side panel behavior:', err))
        } else {
            console.warn('sidePanel API not available in this browser version')
        }
    }, 500)
} catch (error) {
    console.error('Error configuring side panel behavior:', error)
}

browser.contextMenus?.create(
    {
        id: 'open-translator',
        type: 'normal',
        title: 'OpenAI Translator',
        contexts: ['page', 'selection'],
    },
    () => {
        browser.runtime.lastError
    }
)

browser.contextMenus?.onClicked.addListener(async function (info) {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
    tab.id &&
        browser.tabs.sendMessage(tab.id, {
            type: 'open-translator',
            info,
        })
})

async function fetchWithStream(
    port: browser.Runtime.Port,
    message: BackgroundFetchRequestMessage,
    signal: AbortSignal
) {
    if (!message.details) {
        throw new Error('No fetch details')
    }

    const { url, options } = message.details
    let response: Response | null = null

    try {
        response = await fetch(url, { ...options, signal })
    } catch (error) {
        if (error instanceof Error) {
            const { message, name } = error
            port.postMessage({
                error: { message, name },
            })
        }
        port.disconnect()
        return
    }

    const responseSend: BackgroundFetchResponseMessage = {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        redirected: response.redirected,
        type: response.type,
        url: response.url,
    }

    const reader = response?.body?.getReader()
    if (!reader) {
        port.postMessage(responseSend)
        return
    }

    try {
        // eslint-disable-next-line no-constant-condition
        while (true) {
            const { done, value } = await reader.read()
            if (done) {
                break
            }
            const str = new TextDecoder().decode(value)
            port.postMessage({
                ...responseSend,
                data: str,
            })
        }
    } catch (error) {
        if (error instanceof Error) {
            const { message, name } = error
            port.postMessage({
                error: { message, name },
            })
        }
    } finally {
        port.disconnect()
        reader.releaseLock()
    }
}

browser.runtime.onConnect.addListener(async function (port) {
    switch (port.name) {
        case BackgroundEventNames.fetch:
            const controller = new AbortController()
            const { signal } = controller

            port.onMessage.addListener(function (message: BackgroundFetchRequestMessage) {
                switch (message.type) {
                    case 'abort':
                        controller.abort()
                        break
                    case 'open':
                        fetchWithStream(port, message, signal)
                        break
                }
            })
            return
    }
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function callMethod(request: any, service: any): Promise<any> {
    const { method, args } = request
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = (service as any)[method](...args)
    if (result instanceof Promise) {
        const v = await result
        return { result: v }
    }
    return { result }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
browser.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    console.log('Background script received message:', request, 'from:', sender)

    if (!request || !request.type) {
        console.error('Invalid message received: missing type')
        // Note: Linter might incorrectly flag sendResponse with arguments. This usage is correct.
        sendResponse({ error: 'Invalid message: missing type' })
        return
    }

    // 处理不同类型的消息
    switch (request.type) {
        case MessageType.STORE_TRANSLATION_RESULT:
            console.log(`${MessageType.STORE_TRANSLATION_RESULT} received with payload:`, request.payload)
            if (!request.payload) {
                console.error(`No payload in ${MessageType.STORE_TRANSLATION_RESULT} message`)
                // Note: Linter might incorrectly flag sendResponse with arguments. This usage is correct.
                sendResponse({ error: 'No payload provided' })
                return
            }

            // 使用 Promise.all 等待所有异步操作完成
            try {
                // 保存翻译结果（增加时间戳）
                const translationResult = {
                    ...(request.payload as TranslationResult),
                    timestamp: Date.now(),
                }

                lastTranslationResult = translationResult
                console.log('Translation result saved to memory:', lastTranslationResult)

                // 等待所有异步操作完成后再发送响应
                await Promise.all([
                    // 保存到存储
                    (async () => {
                        try {
                            await browser.storage.local.set({
                                [TRANSLATION_RESULT_STORAGE_KEY]: translationResult,
                            })
                            console.log('Translation result saved to storage')
                        } catch (err) {
                            console.error('Error saving translation result to storage:', err)
                            throw err
                        }
                    })(),

                    // 设置侧边栏
                    (async () => {
                        try {
                            // 获取当前活动标签页
                            const tabs = await browser.tabs.query({ active: true, currentWindow: true })
                            console.log('Active tabs:', tabs)

                            if (tabs.length > 0 && tabs[0]?.id) {
                                const tabId = tabs[0].id
                                console.log(`Using tab ${tabId} for sidepanel`)

                                // 检查 sidePanel API 是否可用
                                // @ts-expect-error 处理浏览器兼容性和类型定义问题
                                if (browser.sidePanel) {
                                    // 只设置为启用状态，但不主动打开
                                    console.log(`Setting side panel options for tab ${tabId}`)
                                    try {
                                        // @ts-expect-error 处理浏览器兼容性和类型定义问题
                                        await browser.sidePanel.setOptions({
                                            tabId: tabId,
                                            enabled: true,
                                        })
                                    } catch (error: unknown) {
                                        const sidePanelError = error as Error
                                        console.warn(
                                            `Could not set sidePanel options: ${sidePanelError.message}`,
                                            sidePanelError
                                        )
                                    }
                                } else {
                                    console.warn('sidePanel API not available on this tab')
                                }
                            }
                        } catch (error) {
                            console.error('Error setting side panel:', error)
                            // 不抛出错误，因为这不是关键操作
                        }
                    })(),

                    // 设置角标通知
                    (async () => {
                        try {
                            await browser.action.setBadgeText({ text: '!' })
                            await browser.action.setBadgeBackgroundColor({ color: '#4CAF50' })
                            console.log('Badge notification set on extension icon')
                        } catch (err) {
                            console.error('Error setting badge notification:', err)
                            // 不抛出错误，因为这不是关键操作
                        }
                    })(),

                    // 发送消息到侧边栏
                    (async () => {
                        try {
                            console.log('Attempting to send message directly to sidepanel if open')
                            await browser.runtime
                                .sendMessage({
                                    type: MessageType.TRANSLATION_RESULT_UPDATED,
                                    payload: lastTranslationResult,
                                })
                                .catch((err) => {
                                    // 忽略因为侧边栏没有监听器而产生的错误
                                    if (!err.message.includes('Receiving end does not exist')) {
                                        console.error('Error sending message to sidepanel:', err)
                                    } else {
                                        console.log('Sidepanel not listening yet, will get data when opened')
                                    }
                                })
                        } catch (err) {
                            console.error('Error sending message to sidepanel:', err)
                            // 不抛出错误，因为这不是关键操作
                        }
                    })(),
                ])

                // 所有操作完成后发送成功响应
                // Note: Linter might incorrectly flag sendResponse with arguments. This usage is correct.
                sendResponse({ success: true })
            } catch (error) {
                console.error('Error in STORE_TRANSLATION_RESULT handler:', error)
                // Note: Linter might incorrectly flag sendResponse with arguments. This usage is correct.
                sendResponse({
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error occurred',
                })
            }

            // 返回 true 表示我们将异步发送响应
            return true

        case MessageType.GET_LAST_TRANSLATION:
            console.log(`Responding to ${MessageType.GET_LAST_TRANSLATION} request`)

            try {
                // 尝试从存储中获取，因为service worker可能已重启，内存中的lastTranslationResult可能为null
                const storage = await browser.storage.local.get(TRANSLATION_RESULT_STORAGE_KEY)
                const storedResult = storage[TRANSLATION_RESULT_STORAGE_KEY] as TranslationResult | undefined

                // 使用存储中的结果或内存中的结果，以确保获取最新的
                const result = storedResult || lastTranslationResult

                console.log('Translation result retrieved:', result)

                if (result) {
                    // 需要将result的各个字段展开，而不是将整个对象作为参数传递
                    // Note: Linter might incorrectly flag sendResponse with arguments. This usage is correct.
                    sendResponse({
                        success: true,
                        text: result.text,
                        error: result.error,
                        timestamp: result.timestamp,
                    })
                } else {
                    // Note: Linter might incorrectly flag sendResponse with arguments. This usage is correct.
                    sendResponse({ success: false, error: 'No translation available yet.' })
                }
            } catch (err) {
                console.error('Error retrieving translation result:', err)
                // Note: Linter might incorrectly flag sendResponse with arguments. This usage is correct.
                sendResponse({
                    success: false,
                    error: `Error retrieving translation: ${err instanceof Error ? err.message : String(err)}`,
                })
            }

            // 返回true表示我们将异步发送响应
            return true

        case BackgroundEventNames.vocabularyService:
            try {
                // 同步调用或不需要异步响应，可以不返回 true
                // 但为了统一处理异步，返回 true 也没问题
                return await callMethod(request, vocabularyInternalService)
            } catch (e) {
                console.error('Error calling vocabularyService:', e)
                return { error: String(e) }
            }
        case BackgroundEventNames.actionService:
            try {
                // 同步调用或不需要异步响应，可以不返回 true
                return await callMethod(request, actionInternalService)
            } catch (e) {
                console.error('Error calling actionService:', e)
                return { error: String(e) }
            }
        case BackgroundEventNames.getItem:
            // 异步操作，需要返回 true 并调用 sendResponse
            ;(async () => {
                try {
                    const data = await browser.storage.local.get(request.key)
                    // Note: Linter might incorrectly flag sendResponse with arguments. This usage is correct.
                    sendResponse(data)
                } catch (e) {
                    console.error(`Error getting item ${request.key}:`, e)
                    // Note: Linter might incorrectly flag sendResponse with arguments. This usage is correct.
                    sendResponse({ error: e instanceof Error ? e.message : String(e) })
                }
            })()
            return true // **** 需要返回 true ****
        case BackgroundEventNames.setItem:
            // 异步操作，但通常不需要响应，移除 return true
            ;(async () => {
                try {
                    await browser.storage.local.set({
                        [request.key]: request.value,
                    })
                } catch (e) {
                    console.error(`Error setting item ${request.key}:`, e)
                    // Optionally send error response if needed, but currently fire-and-forget
                }
            })()
            // No return true needed unless sendResponse is called
            break // **** BREAK ADDED ****
        case BackgroundEventNames.removeItem:
            // 异步操作，但通常不需要响应，移除 return true
            ;(async () => {
                try {
                    await browser.storage.local.remove(request.key)
                } catch (e) {
                    console.error(`Error removing item ${request.key}:`, e)
                    // Optionally send error response if needed, but currently fire-and-forget
                }
            })()
            // No return true needed unless sendResponse is called
            break // **** BREAK ADDED ****
        case 'openOptionsPage':
            // 异步操作，但通常不关心响应
            ;(async () => {
                await browser.storage.local.set({
                    [optionsPageOpenaiAPIKeyPromotionIDKey]: request.openaiAPIKeyPromotionID,
                })
                await browser.storage.local.set({ [optionsPageHeaderPromotionIDKey]: request.headerPromotionID })
                browser.runtime.openOptionsPage()
            })()
            // 这里可以不返回 true，因为原始调用者不期待响应
            break

        default:
            console.warn(`Received unknown message type: ${request.type}`)
            // 对于未处理的消息，可以不返回 true
            break
    }
    // 如果 case 中没有显式 return，则默认返回 undefined (同步响应)
})

browser.commands.onCommand.addListener(async (command) => {
    switch (command) {
        case 'open-popup': {
            await browser.windows.create({
                type: 'popup',
                url: '/src/browser-extension/popup/index.html',
            })
        }
    }
})

try {
    browser.webRequest.onBeforeRequest.addListener(
        (details) => {
            if (details.url.includes('/public_key') && !details.url.includes(chatgptArkoseReqParams)) {
                if (!details.requestBody) {
                    return
                }
                const formData = new URLSearchParams()
                for (const k in details.requestBody.formData) {
                    formData.append(k, details.requestBody.formData[k])
                }
                browser.storage.local
                    .set({
                        [keyChatgptArkoseReqUrl]: details.url,
                        [keyChatgptArkoseReqForm]:
                            formData.toString() ||
                            new TextDecoder('utf-8').decode(new Uint8Array(details.requestBody.raw?.[0].bytes)),
                    })
                    .then(() => {
                        console.log('Arkose req url and form saved')
                    })
            }
        },
        {
            urls: ['https://*.openai.com/*'],
            types: ['xmlhttprequest'],
        },
        ['requestBody']
    )

    browser.webRequest.onBeforeSendHeaders.addListener(
        (details) => {
            if (details.url.includes('/api/user')) {
                const headers = details.requestHeaders || []
                const authorization = headers.find((h) => h.name === 'Authorization')?.value || ''
                const accessToken = authorization.split(' ')[1]
                browser.storage.local
                    .set({
                        [keyKimiAccessToken]: accessToken,
                    })
                    .then(() => {
                        console.log('Kimi access_token saved')
                    })
            }
        },
        {
            urls: ['https://*.moonshot.cn/*'],
            types: ['xmlhttprequest'],
        },
        ['requestHeaders']
    )

    browser.webRequest.onBeforeSendHeaders.addListener(
        (details) => {
            if (details.url.includes('/chatglm/user-api/user/info')) {
                const headers = details.requestHeaders || []
                const authorization = headers.find((h) => h.name === 'Authorization')?.value || ''
                const accessToken = authorization.split(' ')[1]
                browser.storage.local
                    .set({
                        [keyChatGLMAccessToken]: accessToken,
                    })
                    .then(() => {
                        console.log('Kimi access_token saved')
                    })
            }
        },
        {
            urls: ['https://*.chatglm.cn/*'],
            types: ['xmlhttprequest'],
        },
        ['requestHeaders']
    )
} catch (error) {
    console.error('Error adding webRequest listener', error)
}
