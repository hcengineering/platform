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

import { AccountClient, IntegrationSecret } from '@hcengineering/account-client'
import calendar, { calendarIntegrationKind } from '@hcengineering/calendar'
import contact, { Employee, getPrimarySocialId, SocialIdentityRef } from '@hcengineering/contact'
import core, {
  AccountUuid,
  buildSocialIdString,
  MeasureContext,
  PersonId,
  Ref,
  SocialIdType,
  TxOperations,
  WorkspaceUuid
} from '@hcengineering/core'
import setting from '@hcengineering/setting'
import { Credentials, OAuth2Client } from 'google-auth-library'
import { calendar_v3, google } from 'googleapis'
import type { IntegrationClient } from '@hcengineering/integration-client'

import { encode64 } from './base64'
import { getClient } from './client'
import { setSyncHistory } from './kvsUtils'
import { lock } from './mutex'
import { IncomingSyncManager } from './sync'
import { GoogleEmail, SCOPES, State, Token, User } from './types'
import { addUserByEmail, getGoogleClient, removeIntegrationSecret, removeUserByEmail } from './utils'
import { WatchController } from './watch'

interface AuthResult {
  success: boolean
  email: GoogleEmail
}

export class AuthController {
  private readonly oAuth2Client: OAuth2Client
  private readonly googleClient: calendar_v3.Calendar
  email: GoogleEmail | undefined

  private constructor (
    private readonly ctx: MeasureContext,
    private readonly accountClient: AccountClient,
    private readonly integrationClient: IntegrationClient,
    private readonly client: TxOperations,
    private readonly user: User
  ) {
    const res = getGoogleClient()
    this.googleClient = res.google
    this.oAuth2Client = res.auth
  }

  static async createAndSync (
    ctx: MeasureContext,
    accountClient: AccountClient,
    integrationClient: IntegrationClient,
    state: State,
    code: string
  ): Promise<void> {
    await ctx.with(
      'Create auth controller',
      {},
      async () => {
        const mutex = await lock(`${state.workspace}:${state.userId}`)
        try {
          const client = await getClient(state.workspace)
          const txOp = new TxOperations(client, state.userId)
          const controller = new AuthController(ctx, accountClient, integrationClient, txOp, state)
          await controller.process(code)
        } finally {
          mutex()
        }
      },
      { workspace: state.workspace, user: state.userId }
    )
  }

  static async signout (
    ctx: MeasureContext<any>,
    accountClient: AccountClient,
    integrationClient: IntegrationClient,
    userId: PersonId,
    workspace: WorkspaceUuid,
    value: GoogleEmail
  ): Promise<void> {
    await ctx.with(
      'Signout auth controller',
      {},
      async () => {
        const mutex = await lock(`${workspace}:${userId}`)
        try {
          const client = await getClient(workspace)
          const txOp = new TxOperations(client, core.account.System)
          const controller = new AuthController(ctx, accountClient, integrationClient, txOp, {
            userId,
            workspace
          })
          await controller.signout(value)
        } catch (err) {
          ctx.error('signout', { workspace, userId, err })
        } finally {
          mutex()
        }
      },
      { workspace, userId }
    )
  }

  private async signout (value: GoogleEmail): Promise<void> {
    const integration = await this.client.findOne(setting.class.Integration, {
      type: calendar.integrationType.Calendar,
      createdBy: this.user.userId,
      value
    })
    if (integration !== undefined) {
      await this.client.remove(integration)
    }
    removeUserByEmail(this.user, value)
    const data = {
      kind: calendarIntegrationKind,
      workspaceUuid: this.user.workspace,
      key: value,
      socialId: this.user.userId
    }
    const secret = await this.accountClient.getIntegrationSecret(data)
    if (secret == null) return
    const token = JSON.parse(secret.secret)
    await removeIntegrationSecret(this.ctx, this.accountClient, data)
    const watchController = WatchController.get(this.ctx, this.accountClient)
    await watchController.unsubscribe(token)
  }

  private async process (code: string): Promise<void> {
    const authRes = await this.authorize(code)
    await this.setWorkspaceIntegration(authRes)
    if (authRes.success) {
      await setSyncHistory(this.user.workspace, Date.now())
      void IncomingSyncManager.initSync(
        this.ctx,
        this.accountClient,
        this.client,
        this.user,
        authRes.email,
        this.googleClient
      )
    }
  }

  private async getEmail (): Promise<GoogleEmail> {
    if (this.email !== undefined) return this.email
    const info = await google.oauth2({ version: 'v2', auth: this.oAuth2Client }).userinfo.get()
    const email = info.data.email
    if (email == null) {
      throw new Error('Email not found')
    }
    this.email = email as GoogleEmail
    return this.email
  }

  private async authorize (code: string): Promise<AuthResult> {
    const token = await this.oAuth2Client.getToken(code)
    this.oAuth2Client.setCredentials(token.tokens)
    const email = await this.getEmail()
    const providedScopes = token.tokens.scope?.split(' ') ?? []
    for (const scope of SCOPES) {
      if (providedScopes.findIndex((p) => p === scope) === -1) {
        this.ctx.error(`Not all scopes provided, provided: ${providedScopes.join(', ')} required: ${SCOPES.join(', ')}`)
        return { success: false, email }
      }
    }
    const res = await this.oAuth2Client.refreshAccessToken()
    await this.createAccIntegrationIfNotExists(email)
    await this.updateToken(res.credentials, email)

    return { success: true, email }
  }

  private async setWorkspaceIntegration (res: AuthResult): Promise<void> {
    await this.ctx.with(
      'Set workspace integration',
      {},
      async () => {
        const integrations = await this.client.findAll(setting.class.Integration, {
          createdBy: this.user.userId,
          type: calendar.integrationType.Calendar
        })

        const updated = integrations.find((p) => p.disabled && p.value === res.email)
        for (const integration of integrations.filter((p) => p.value === '')) {
          await this.client.remove(integration)
        }
        if (!res.success) {
          if (updated !== undefined) {
            await this.client.update(updated, {
              disabled: true,
              error: calendar.string.NotAllPermissions
            })
          } else {
            await this.client.createDoc(setting.class.Integration, core.space.Workspace, {
              type: calendar.integrationType.Calendar,
              disabled: true,
              error: calendar.string.NotAllPermissions,
              value: res.email
            })
          }
          throw new Error('Not all scopes provided')
        } else {
          if (updated !== undefined) {
            await this.client.update(updated, {
              disabled: false,
              error: null
            })
          } else {
            await this.client.createDoc(setting.class.Integration, core.space.Workspace, {
              type: calendar.integrationType.Calendar,
              disabled: false,
              value: res.email
            })
          }
        }
        await this.addSocialId(res.email)
      },
      {
        user: this.user.userId,
        workspace: this.user.workspace,
        email: res.email
      }
    )
  }

  private async createAccIntegrationIfNotExists (email: string): Promise<void> {
    await this.ctx.with(
      'Create account integration if not exists',
      {},
      async () => {
        const data = { email }
        const connection = await this.integrationClient.connect(this.user.userId, data)
        await this.integrationClient.integrate(connection, this.user.workspace, data)
      },
      { user: this.user.userId }
    )
  }

  private async updateToken (token: Credentials, email: GoogleEmail): Promise<void> {
    const _token: Token = {
      ...this.user,
      email,
      ...token
    }
    const data: IntegrationSecret = {
      socialId: this.user.userId,
      kind: calendarIntegrationKind,
      workspaceUuid: this.user.workspace,
      key: email,
      secret: JSON.stringify(_token)
    }
    try {
      await this.integrationClient.setSecret(data)
      addUserByEmail(_token, email)
    } catch (err) {
      this.ctx.error('update token error', { workspace: this.user.workspace, user: this.user.userId, err })
    }
  }

  private async addSocialId (email: GoogleEmail): Promise<void> {
    const socialString = buildSocialIdString({ type: SocialIdType.GOOGLE, value: email })
    const exists = await this.accountClient.findFullSocialIdBySocialKey(socialString)
    if (exists !== undefined) {
      return
    }
    const sID = await this.client.findOne(contact.class.SocialIdentity, {
      _id: this.user.userId as SocialIdentityRef
    })
    if (sID === undefined) return
    const person = await this.client.findOne(contact.mixin.Employee, { _id: sID.attachedTo as Ref<Employee> })
    if (person?.personUuid === undefined) return
    await this.accountClient.addSocialIdToPerson(person.personUuid, SocialIdType.GOOGLE, email, true)
  }

  static getAuthUrl (redirectURL: string, workspace: WorkspaceUuid, userId: PersonId, token: string): string {
    const res = getGoogleClient()
    const oAuth2Client = res.auth
    const state: State = {
      redirectURL,
      userId,
      workspace
    }
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: SCOPES,
      state: encode64(JSON.stringify(state))
    })
    return authUrl
  }

  static async getUserId (account: AccountUuid, workspace: WorkspaceUuid, token: string): Promise<PersonId> {
    const client = await getClient(workspace, token)
    const person = await client.findOne(contact.class.Person, { personUuid: account })
    if (person === undefined) {
      throw new Error('Person not found')
    }

    const personId = await getPrimarySocialId(client, person._id)

    if (personId === undefined) {
      throw new Error('PersonId not found')
    }

    return personId
  }
}
