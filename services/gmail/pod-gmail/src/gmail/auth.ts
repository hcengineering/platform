//
// Copyright © 2025 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//
import { google } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'
import { ProjectCredentials } from '../types'

export class AuthProvider {
  private oAuth2Client: OAuth2Client | undefined
  private readonly credentials: ProjectCredentials

  constructor (credentials: ProjectCredentials) {
    this.credentials = credentials
    this.initClient()
  }

  initClient (): void {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const { client_secret, client_id, redirect_uris } = this.credentials.web
    this.oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0])
  }

  getAuthUrl (redirectURL: string, user: { workspace: string, userId: string }): string {
    const { workspace, userId } = user
    if (this.oAuth2Client === undefined) {
      throw new Error('OAuth client not initialized')
    }
    const authUrl = this.oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: ['https://www.googleapis.com/auth/gmail.modify'],
      state: Buffer.from(JSON.stringify({ workspace, userId, redirectURL })).toString('base64')
    })
    return authUrl
  }
}
