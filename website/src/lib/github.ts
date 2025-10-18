const GITHUB_REPO = 'yetone/nextai-translator'
const GITHUB_API_BASE = 'https://api.github.com'

export interface GitHubRepoInfo {
  stars: number
  forks: number
  watchers: number
}

export interface GitHubRelease {
  tag_name: string
  name: string
  published_at: string
  html_url: string
  body: string
}

export async function getRepoInfo(): Promise<GitHubRepoInfo> {
  try {
    const response = await fetch(`${GITHUB_API_BASE}/repos/${GITHUB_REPO}`, {
      next: { revalidate: 3600 }, // Cache for 1 hour
    })

    if (!response.ok) {
      throw new Error('Failed to fetch repo info')
    }

    const data = await response.json()

    return {
      stars: data.stargazers_count || 0,
      forks: data.forks_count || 0,
      watchers: data.watchers_count || 0,
    }
  } catch (error) {
    console.error('Error fetching GitHub repo info:', error)
    return {
      stars: 0,
      forks: 0,
      watchers: 0,
    }
  }
}

export async function getLatestRelease(): Promise<GitHubRelease | null> {
  try {
    const response = await fetch(`${GITHUB_API_BASE}/repos/${GITHUB_REPO}/releases/latest`, {
      next: { revalidate: 3600 }, // Cache for 1 hour
    })

    if (!response.ok) {
      throw new Error('Failed to fetch latest release')
    }

    const data = await response.json()

    return {
      tag_name: data.tag_name,
      name: data.name,
      published_at: data.published_at,
      html_url: data.html_url,
      body: data.body || '',
    }
  } catch (error) {
    console.error('Error fetching latest release:', error)
    return null
  }
}
