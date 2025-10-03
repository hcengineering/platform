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
import contact, { getPrimarySocialId } from '@hcengineering/contact'
import core, {
  AccountUuid,
  MeasureContext,
  PersonId,
  SocialIdType,
  TxOperations,
  WorkspaceUuid
} from '@hcengineering/core'
import type { IntegrationClient } from '@hcengineering/integration-client'
import setting from '@hcengineering/setting'
import { Credentials, OAuth2Client } from 'google-auth-library'
import { calendar_v3, google } from 'googleapis'

import { encode64 } from './base64'
import { getClient } from './client'
import { setSyncHistory } from './kvsUtils'
import { lock } from './mutex'
import { IncomingSyncManager } from './sync'
import { GoogleEmail, SCOPES, State, Token } from './types'
import { addUserByEmail, getGoogleClient, removeIntegrationSecret, removeUserByEmail } from './utils'
import { WatchController } from './watch'

interface AuthResult {
  success: boolean
  email: GoogleEmail
  personId?: PersonId
}

export class AuthController {
  private readonly oAuth2Client: OAuth2Client
  private readonly googleClient: calendar_v3.Calendar
  email: GoogleEmail | undefined

  private constructor (
    private readonly ctx: MeasureContext,
    private readonly accountClient: AccountClient,
    private readonly integrationClient: IntegrationClient,
    private readonly user: State
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
        const mutex = await lock(`${state.workspace}:${state.accountUuid}`)
        try {
          const controller = new AuthController(ctx, accountClient, integrationClient, state)
          await controller.process(code, state)
        } finally {
          mutex()
        }
      },
      { workspace: state.workspace, user: state.accountUuid }
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
          const txOp = new TxOperations(client, userId)
          const integration = await txOp.findOne(setting.class.Integration, {
            type: calendar.integrationType.Calendar,
            createdBy: userId,
            value
          })
          if (integration !== undefined) {
            await txOp.remove(integration)
          }
          removeUserByEmail(
            {
              workspace,
              userId
            },
            value
          )
          const data = {
            kind: calendarIntegrationKind,
            workspaceUuid: workspace,
            key: value,
            socialId: userId
          }
          const secret = await accountClient.getIntegrationSecret(data)
          if (secret == null) return
          const token = JSON.parse(secret.secret)
          await removeIntegrationSecret(ctx, accountClient, data)
          const watchController = WatchController.get(ctx, accountClient)
          await watchController.unsubscribe(token)
        } catch (err) {
          ctx.error('signout', { workspace, userId, err })
        } finally {
          mutex()
        }
      },
      { workspace, userId }
    )
  }

  private async process (code: string, state: State): Promise<void> {
    const authRes = await this.authorize(code, state)
    if (authRes.success && authRes.personId !== undefined) {
      const client = await getClient(this.user.workspace)
      const txOp = new TxOperations(client, authRes.personId)
      await this.setWorkspaceIntegration(authRes, authRes.personId, txOp)
      await setSyncHistory(this.user.workspace, Date.now())
      void IncomingSyncManager.initSync(
        this.ctx,
        this.accountClient,
        txOp,
        {
          workspace: this.user.workspace,
          userId: authRes.personId
        },
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

  private async authorize (code: string, state: State): Promise<AuthResult> {
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
    const personId = await this.createAccIntegrationIfNotExists(state.accountUuid, email)
    await this.updateToken(res.credentials, personId, email)

    return { success: true, email, personId }
  }

  private async setWorkspaceIntegration (res: AuthResult, personId: PersonId, client: TxOperations): Promise<void> {
    await this.ctx.with(
      'Set workspace integration',
      {},
      async () => {
        const integrations = await client.findAll(setting.class.Integration, {
          createdBy: personId,
          type: calendar.integrationType.Calendar
        })

        const updated = integrations.find((p) => p.disabled && p.value === res.email)
        for (const integration of integrations.filter((p) => p.value === '')) {
          await client.remove(integration)
        }
        if (!res.success) {
          if (updated !== undefined) {
            await client.update(updated, {
              disabled: true,
              error: calendar.string.NotAllPermissions
            })
          } else {
            await client.createDoc(setting.class.Integration, core.space.Workspace, {
              type: calendar.integrationType.Calendar,
              disabled: true,
              error: calendar.string.NotAllPermissions,
              value: res.email
            })
          }
          throw new Error('Not all scopes provided')
        } else {
          if (updated !== undefined) {
            await client.update(updated, {
              disabled: false,
              error: null
            })
          } else {
            await client.createDoc(setting.class.Integration, core.space.Workspace, {
              type: calendar.integrationType.Calendar,
              disabled: false,
              value: res.email
            })
          }
        }
      },
      {
        user: personId,
        workspace: this.user.workspace,
        email: res.email
      }
    )
  }

  private async createAccIntegrationIfNotExists (accountUuid: AccountUuid, email: string): Promise<PersonId> {
    return await this.ctx.with(
      'Create account integration if not exists',
      {},
      async () => {
        const data = { email }
        const newSocialId = await this.accountClient.addSocialIdToPerson(
          accountUuid,
          SocialIdType.GOOGLE,
          email,
          true,
          email
        )
        const connection = await this.integrationClient.connect(newSocialId, data)
        await this.integrationClient.integrate(connection, this.user.workspace, data)
        return newSocialId
      },
      { accountUuid, email }
    )
  }

  private async updateToken (token: Credentials, personId: PersonId, email: GoogleEmail): Promise<void> {
    const _token: Token = {
      workspace: this.user.workspace,
      userId: personId,
      email,
      ...token
    }
    const data: IntegrationSecret = {
      socialId: personId,
      kind: calendarIntegrationKind,
      workspaceUuid: this.user.workspace,
      key: email,
      secret: JSON.stringify(_token)
    }
    try {
      await this.integrationClient.setSecret(data)
      addUserByEmail(_token, email)
    } catch (err) {
      this.ctx.error('update token error', { workspace: this.user.workspace, email, err })
    }
  }

  static getAuthUrl (redirectURL: string, workspace: WorkspaceUuid, accountUuid: AccountUuid): string {
    const res = getGoogleClient()
    const oAuth2Client = res.auth
    const state: State = {
      redirectURL,
      accountUuid,
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

  static async getPrimaryUserId (
    account: AccountUuid,
    workspace: WorkspaceUuid,
    token: string,
    email: GoogleEmail
  ): Promise<PersonId> {
    const client = await getClient(workspace, token)
    const person = await client.findOne(contact.class.Person, { personUuid: account })
    if (person === undefined) {
      throw new Error('Person not found')
    }

    const primaryId = await getPrimarySocialId(client, person._id)
    if (primaryId === undefined) {
      throw new Error('PrimaryId not found')
    }

    return primaryId
  }

  static async getUserId (
    account: AccountUuid,
    workspace: WorkspaceUuid,
    token: string,
    email: GoogleEmail
  ): Promise<PersonId> {
    const client = await getClient(workspace, token)
    const person = await client.findOne(contact.class.Person, { personUuid: account })
    if (person === undefined) {
      throw new Error('Person not found')
    }

    const personId = await client.findOne(contact.class.SocialIdentity, {
      attachedTo: person._id,
      type: SocialIdType.GOOGLE,
      value: email
    })

    if (personId === undefined) {
      throw new Error('PersonId not found')
    }

    return personId._id
  }
}
