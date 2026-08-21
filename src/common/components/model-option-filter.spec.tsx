import { describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { act } from 'react-dom/test-utils'
import { Provider as StyletronProvider } from 'styletron-react'
import { Client as Styletron } from 'styletron-engine-atomic'
import { BaseProvider, LightTheme } from 'baseui-sd'
import { Combobox } from 'baseui-sd/combobox'
import { filterModelOptions } from './model-option-filter'

interface Option {
    id: string
    name: string
}

// Shaped like an OpenRouter listing: the models a user searches for sit far
// down a list of several hundred.
const options: Option[] = [
    ...Array.from({ length: 40 }, (_, i) => ({ id: `vendor/model-${i}`, name: `Model ${i}` })),
    { id: 'bytedance-seed/seed-2-1-turbo', name: 'Seed 2.1 Turbo' },
    { id: 'bytedance-seed/seed-2.0-code', name: 'Seed 2.0 Code' },
    { id: 'bytedance-seed/seed-2.0-lite', name: 'Seed 2.0 Lite' },
]

describe('filterModelOptions', () => {
    it('returns everything for an empty query', () => {
        expect(filterModelOptions(options, '')).toHaveLength(options.length)
        expect(filterModelOptions(options, '   ')).toHaveLength(options.length)
    })

    it('matches on both id and display name, case insensitively', () => {
        expect(filterModelOptions(options, 'seed').map((o) => o.id)).toEqual([
            'bytedance-seed/seed-2-1-turbo',
            'bytedance-seed/seed-2.0-code',
            'bytedance-seed/seed-2.0-lite',
        ])
        expect(filterModelOptions(options, 'SEED 2.0 Lite').map((o) => o.id)).toEqual(['bytedance-seed/seed-2.0-lite'])
    })

    it('falls back to the full list when nothing matches', () => {
        expect(filterModelOptions(options, 'no-such-model')).toHaveLength(options.length)
    })
})

// APIModelSelector lives in Settings.tsx, which cannot be imported from a test
// (the module pulls in the whole settings tree and never settles). This mirrors
// the wiring it uses so the regression is covered against the real combobox.
function ModelCombobox({ onCommit }: { onCommit: (value: string) => void }) {
    const [value, setValue] = useState('vendor/model-0')
    const [query, setQuery] = useState('')
    return (
        <Combobox
            value={value}
            onChange={(nextValue: string, option: Option | null) => {
                // Only typing may refilter; picking an option must leave the
                // list - and therefore the combobox's index into it - alone.
                if (!option) {
                    setQuery(String(nextValue ?? ''))
                }
                setValue(nextValue)
                onCommit(nextValue)
            }}
            options={filterModelOptions(options, query)}
            mapOptionToString={(option: Option) => option.id}
        />
    )
}

function typeInto(input: HTMLInputElement, value: string) {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!
    setter.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
}

describe('model combobox selection', () => {
    it('commits and keeps showing the model that was clicked in a filtered list', async () => {
        const container = document.createElement('div')
        document.body.appendChild(container)
        const onCommit = vi.fn()

        await act(async () => {
            createRoot(container).render(
                <StyletronProvider value={new Styletron()}>
                    <BaseProvider theme={LightTheme}>
                        <ModelCombobox onCommit={onCommit} />
                    </BaseProvider>
                </StyletronProvider>
            )
        })

        const input = container.querySelector('input') as HTMLInputElement

        await act(async () => typeInto(input, 'seed'))
        const shown = Array.from(container.querySelectorAll('[role="option"]'))
        expect(shown).toHaveLength(3)

        await act(async () => {
            shown[2].dispatchEvent(new MouseEvent('click', { bubbles: true }))
        })

        expect(onCommit).toHaveBeenLastCalledWith('bytedance-seed/seed-2.0-lite')
        // Filtering off the committed value used to widen the list here, and
        // the stale index then resolved to an unrelated model.
        expect(input.value).toBe('bytedance-seed/seed-2.0-lite')

        // A following Enter must not commit a different model either.
        await act(async () => {
            input.dispatchEvent(new MouseEvent('click', { bubbles: true }))
        })
        await act(async () => {
            input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter', keyCode: 13 }))
        })
        expect(onCommit).toHaveBeenLastCalledWith('bytedance-seed/seed-2.0-lite')
    })
})
