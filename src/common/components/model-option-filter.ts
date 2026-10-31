export interface FilterableModelOption {
    id: string
    name: string
}

/**
 * Narrows the model list by what the user typed.
 *
 * The query must be the user's typed text, never the committed model id.
 * Deriving it from the committed value makes the option list change as a
 * *result* of picking an option, while the combobox still holds the index into
 * the list that was on screen when the click happened; it then resolves that
 * stale index against the new list and both displays and commits a different
 * model than the one that was clicked.
 */
export function filterModelOptions<T extends FilterableModelOption>(options: T[], query: string): T[] {
    const q = query.trim().toLowerCase()
    if (!q) {
        return options
    }
    const matched = options.filter(
        (option) => option.id.toLowerCase().includes(q) || option.name.toLowerCase().includes(q)
    )
    // A free-typed name that matches nothing should still let the user browse
    // the full list rather than face an empty dropdown.
    return matched.length > 0 ? matched : options
}
