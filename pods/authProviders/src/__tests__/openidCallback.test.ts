//
// Copyright © 2026 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// SPDX-License-Identifier: EPL-2.0
//
import { type MeasureContext } from '@hcengineering/core'
import { Issuer } from 'openid-client'

import { registerOpenid } from '../openid'
import { handleProviderAuth } from '../utils'

jest.mock('openid-client', () => ({
  Issuer: { discover: jest.fn() },
  Strategy: jest.fn()
}))

jest.mock('../utils', () => ({
  ...jest.requireActual('../utils'),
  handleProviderAuth: jest.fn()
}))

const issuer = 'https://login.microsoftonline.com/tenant-id/v2.0'
const frontUrl = 'https://front.example'
const measureCtx = { info: jest.fn(), warn: jest.fn(), error: jest.fn() } as unknown as MeasureContext

describe('OpenID callback redirects', () => {
  const previousClientId = process.env.OPENID_CLIENT_ID
  const previousClientSecret = process.env.OPENID_CLIENT_SECRET
  const previousIssuer = process.env.OPENID_ISSUER
  const previousAllowedGroups = process.env.OPENID_ALLOWED_GROUPS
  const previousPrompt = process.env.OPENID_PROMPT
  const previousRoleGroups = process.env.OPENID_ROLE_GROUPS

  beforeEach(() => {
    jest.useFakeTimers()
    jest.clearAllMocks()
    process.env.OPENID_CLIENT_ID = 'client-id'
    process.env.OPENID_CLIENT_SECRET = 'client-secret'
    process.env.OPENID_ISSUER = issuer
    process.env.OPENID_ALLOWED_GROUPS = 'engineering'
    delete process.env.OPENID_PROMPT
    delete process.env.OPENID_ROLE_GROUPS
    ;(Issuer.discover as jest.Mock).mockResolvedValue({ Client: jest.fn() })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  afterAll(() => {
    if (previousClientId === undefined) delete process.env.OPENID_CLIENT_ID
    else process.env.OPENID_CLIENT_ID = previousClientId
    if (previousClientSecret === undefined) delete process.env.OPENID_CLIENT_SECRET
    else process.env.OPENID_CLIENT_SECRET = previousClientSecret
    if (previousIssuer === undefined) delete process.env.OPENID_ISSUER
    else process.env.OPENID_ISSUER = previousIssuer
    if (previousAllowedGroups === undefined) delete process.env.OPENID_ALLOWED_GROUPS
    else process.env.OPENID_ALLOWED_GROUPS = previousAllowedGroups
    if (previousPrompt === undefined) delete process.env.OPENID_PROMPT
    else process.env.OPENID_PROMPT = previousPrompt
    if (previousRoleGroups === undefined) delete process.env.OPENID_ROLE_GROUPS
    else process.env.OPENID_ROLE_GROUPS = previousRoleGroups
  })

  function registerOpenidRoutes (user: Record<string, unknown> = {}, db: Record<string, unknown> = {}): {
    routes: Map<string, Array<(ctx: any, next: () => Promise<void>) => Promise<void>>>
    passport: { use: jest.Mock, authenticate: jest.Mock }
  } {
    const routes = new Map<string, Array<(ctx: any, next: () => Promise<void>) => Promise<void>>>()
    const router = {
      get: jest.fn((path: string, ...handlers: Array<(ctx: any, next: () => Promise<void>) => Promise<void>>) => {
        routes.set(path, handlers)
      })
    }
    const passport = {
      use: jest.fn(),
      authenticate: jest.fn(
        (_provider: string, options: Record<string, unknown>) => async (ctx: any, next: () => Promise<void>) => {
          if (options.failureRedirect !== undefined) {
            ctx.state.user = user
            await next()
          }
        }
      )
    }

    registerOpenid(
      measureCtx,
      passport as any,
      router as any,
      'https://accounts.example',
      Promise.resolve(db as any),
      frontUrl,
      {}
    )

    return { routes, passport }
  }

  async function invokeCallback (user: Record<string, unknown>): Promise<jest.Mock> {
    const { routes } = registerOpenidRoutes(user)

    const handlers = routes.get('/auth/openid/callback')
    if (handlers === undefined) throw new Error('OpenID callback was not registered')
    const redirect = jest.fn()
    const ctx = { query: {}, state: {}, redirect }
    await handlers[0](ctx, async () => {
      await handlers[1](ctx, async () => {})
    })
    return redirect
  }

  async function invokeOpenidLogin (): Promise<jest.Mock> {
    const { routes, passport } = registerOpenidRoutes()
    const handlers = routes.get('/auth/openid')
    if (handlers === undefined) throw new Error('OpenID login was not registered')

    await jest.advanceTimersByTimeAsync(0)
    await handlers[0]({ query: {}, request: { headers: {} }, set: jest.fn() }, async () => {})
    return passport.authenticate
  }

  test('keeps an absolute successful account redirect unchanged', async () => {
    ;(handleProviderAuth as jest.Mock).mockResolvedValue('https://front.example/login/auth?token=token-value')

    const redirect = await invokeCallback({
      sub: 'subject',
      _idClaims: { sub: 'subject', groups: ['engineering'], email: 'user@example.com', xms_edov: true }
    })

    expect(redirect).toHaveBeenCalledWith('https://front.example/login/auth?token=token-value')
  })

  test('resolves a relative group-denial redirect against the frontend URL', async () => {
    const redirect = await invokeCallback({
      sub: 'subject',
      _idClaims: { sub: 'subject', groups: ['another-group'], email: 'user@example.com' }
    })

    expect(handleProviderAuth).not.toHaveBeenCalled()
    expect(redirect).toHaveBeenCalledWith('https://front.example/login?oidcError=group_not_allowed')
  })

  test('passes OPENID_PROMPT to the authorization request', async () => {
    process.env.OPENID_PROMPT = 'select_account'

    const authenticate = await invokeOpenidLogin()

    expect(authenticate).toHaveBeenCalledWith(
      'oidc',
      expect.objectContaining({ prompt: 'select_account', scope: 'openid profile email' })
    )
  })

  test('omits prompt when OPENID_PROMPT is empty', async () => {
    process.env.OPENID_PROMPT = ''

    const authenticate = await invokeOpenidLogin()

    expect(authenticate.mock.calls[0][1]).not.toHaveProperty('prompt')
  })

  test('retries role-rule resolution after a transient failure', async () => {
    process.env.OPENID_ROLE_GROUPS = 'workspace:engineering=user'
    ;(handleProviderAuth as jest.Mock).mockResolvedValue('https://front.example/login/auth?token=token-value')
    const findOne = jest
      .fn()
      .mockRejectedValueOnce(new Error('temporary database failure'))
      .mockResolvedValue({ uuid: 'a1111111-1111-4111-9111-111111111111' })
    const { routes } = registerOpenidRoutes(
      { sub: 'subject', _idClaims: { sub: 'subject', groups: ['engineering'], email: 'user@example.com', xms_edov: true } },
      { workspace: { findOne } }
    )
    const handlers = routes.get('/auth/openid/callback')
    if (handlers === undefined) throw new Error('OIDC callback was not registered')
    const invoke = async (): Promise<jest.Mock> => {
      const redirect = jest.fn()
      const ctx = { query: {}, state: {}, redirect }
      await handlers[0](ctx, async () => {
        await handlers[1](ctx, async () => {})
      })
      return redirect
    }

    const failedRedirect = await invoke()
    const redirect = await invoke()

    expect(findOne).toHaveBeenCalledTimes(2)
    expect(failedRedirect).toHaveBeenCalledWith('https://front.example/login?error=oidc_callback_failed')
    expect(handleProviderAuth).toHaveBeenCalledTimes(1)
    expect(redirect).toHaveBeenCalledWith('https://front.example/login/auth?token=token-value')
  })

  test('ignores an invalid OPENID_PROMPT and logs one warning without its value', async () => {
    process.env.OPENID_PROMPT = 'select_account unexpected-value'

    const authenticate = await invokeOpenidLogin()

    expect(authenticate.mock.calls[0][1]).not.toHaveProperty('prompt')
    expect(measureCtx.warn).toHaveBeenCalledTimes(1)
    expect(measureCtx.warn).toHaveBeenCalledWith('Ignoring invalid OPENID_PROMPT configuration')
  })
})
