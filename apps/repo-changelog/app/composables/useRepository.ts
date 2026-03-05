export const useRepository = () => {
  /**
   * Get the URL of a GitHub repository
   * @param repoName - The name of the repository, format: owner/repo
   * @returns The complete URL of the GitHub repository
   */
  const getRepoUrl = (repoName: string): string => {
    return `https://github.com/${repoName}`
  }

  return {
    getRepoUrl
  }
}
