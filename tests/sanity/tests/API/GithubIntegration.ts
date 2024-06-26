import { APIRequestContext } from '@playwright/test'

export class GithubIntegration {
    private readonly request: APIRequestContext;
    private readonly baseUrl: string;
    private readonly githubToken: string;
    private readonly repoOwner: string;
  
    constructor(request: APIRequestContext) {
      this.request = request;
      this.baseUrl = 'https://api.github.com';
  
      this.githubToken = process.env.TESTING_GH_TOKEN as string;
      this.repoOwner = process.env.TESTING_GH_OWNER as string;
  
      if (!this.githubToken || !this.repoOwner) {
        throw new Error('Environment variables TESTING_GH_TOKEN or TESTING_GH_OWNER are not set.');
      }
    }

  async createGitHubRepository (repoName: string, description: string = '', isPrivate: boolean = false): Promise<any> {
    const githubToken = this.githubToken
    const url = `${this.baseUrl}/user/repos`
    const payload = {
      name: repoName,
      description,
      private: isPrivate
    }
    const headers = {
      Authorization: `token ${githubToken}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    }
    const response = await this.request.post(url, { data: payload, headers })
    if (response.status() !== 201) {
      throw new Error(`Failed to create repository: ${response.status()} ${response.statusText()}`)
    }
    return await response.json()
  }

  async createGitHubIssue (repoName: string, issueTitle: string, issueBody: string): Promise<any> {
    const githubToken = this.githubToken
    const url = `${this.baseUrl}/repos/${this.repoOwner}/${repoName}/issues`
    const payload = {
      title: issueTitle,
      body: issueBody
    }
    const headers = {
      Authorization: `token ${githubToken}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    }
    const response = await this.request.post(url, { data: payload, headers })
    if (response.status() !== 201) {
      throw new Error(`Failed to create issue: ${response.status()} ${response.statusText()}`)
    }
    return await response.json()
  }

  async deleteGitHubRepository (repoName: string): Promise<void> {
    const githubToken = this.githubToken
    const url = `${this.baseUrl}/repos/${this.repoOwner}/${repoName}`
    const headers = {
      Authorization: `token ${githubToken}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    }
    const response = await this.request.delete(url, { headers })
    if (response.status() !== 204) {
      throw new Error(`Failed to delete repository: ${response.status()} ${response.statusText()}`)
    }
  }
}
