export async function backgroundFetch(input: string, options: RequestInit) {
    return await fetch(input, options)
}
