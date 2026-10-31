// Claude models do not all take the same request. Opus 4.7 and later, Sonnet 5 and later,
// Haiku 5.5 and later, and Fable 5 and Mythos 5 and later answer `temperature: 0`,
// `thinking: { type: 'enabled', budget_tokens }` or both with a 400. Their thinking is adaptive,
// and `output_config.effort` sets its depth.
// https://platform.claude.com/docs/en/about-claude/models/migration-guide

// Reads the version from ids such as claude-opus-4-7, claude-haiku-4-5-20251001,
// anthropic.claude-sonnet-5 and anthropic/claude-sonnet-4.5. Major and minor are one digit each,
// and a longer run of digits is a date: claude-opus-4-20250514 is Opus 4. Claude 3 ids put the
// version first (claude-3-5-haiku-20241022) and do not match.
const VERSION = /claude-(?:opus|sonnet|haiku|fable|mythos)-(\d)(?!\d)(?:[-.](\d)(?!\d))?/i

/**
 * Whether the model wants the newer request. An id whose version cannot be read (a custom name,
 * an alias on a gateway) gets false, and with it the request this engine has always sent.
 */
export function isAdaptiveThinkingOnly(model: string): boolean {
    const version = VERSION.exec(model)
    if (!version) {
        return false
    }
    const major = Number(version[1])
    const minor = Number(version[2] ?? 0)
    // One threshold for all families: Sonnet and Haiku have no release between 4.6 and 5, and
    // the numbered Fable and Mythos models begin at 5.
    return major > 4 || (major === 4 && minor >= 7)
}

/** The thinking levels arrive as budgets: 5000, 10000 and 20000 tokens (getThinkingBudget in translate.ts). */
export function effortForThinkingBudget(thinkingBudget: number): 'low' | 'medium' | 'high' {
    if (thinkingBudget <= 5000) {
        return 'low'
    }
    return thinkingBudget >= 20000 ? 'high' : 'medium'
}
