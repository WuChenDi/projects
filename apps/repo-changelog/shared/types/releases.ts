import type { MDCRoot } from '@nuxtjs/mdc'

export type Release = {
  url: string
  repo: string
  tag: string
  title: string
  date: string
  body: MDCRoot
}

export interface GithubRepo {
  id: number
  name: string
  repo: string
  description: string
  createdAt: string
  updatedAt: string
  pushedAt: string
  stars: number
  watchers: number
  forks: number
  defaultBranch: string
}

export interface GithubReleaseAsset {
  contentType: string
  size: number
  createdAt: string
  updatedAt: string
  downloadCount: number
  downloadUrl: string
}

export interface GithubRelease {
  id: number
  tag: string
  author: string
  name: string
  draft: boolean
  prerelease: boolean
  createdAt: string
  publishedAt: string
  markdown: string
  html: string
  assets: GithubReleaseAsset[]
}

export interface SearchResult {
  id: number
  name: string
  repo: string
  description: string
  stars: number
  forks: number
  updatedAt: string
}

export interface RepoApiResponse {
  error?: string
  repo?: GithubRepo
}

export interface ReposApiResponse {
  error?: string
  repos?: GithubRepo[]
}
