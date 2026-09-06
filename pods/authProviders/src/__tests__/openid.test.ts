//
// Copyright © 2026 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// SPDX-License-Identifier: EPL-2.0
//
// Coverage for the OIDC registration retry (incident: a transient issuer
// outage at boot left the account service without the 'oidc' passport strategy
// for 10 days -> 500 "Unknown authentication strategy" until a manual
// restart). Block A tests the retry helper in isolation (injected discover +
// sleep, fake passport): schedule, cap, whole-attempt retry semantics, warn
// gating, OIDC_DEBUG both ways. Block B tests the registerOpenid wiring with a
// fully mocked openid-client: non-blocking startup, 503 + Retry-After during
// the pending window, and exactly-once strategy registration.
//
/* eslint-disable @typescript-eslint/unbound-method */

import Router from 'koa-router'
import { Issuer, Strategy } from 'openid-client'
import { registerOidcStrategyWithRetry, registerOpenid, shouldWarnOnAttempt } from '../openid'

jest.mock('openid-client', () => ({
  Issuer: { discover: jest.fn() },
  Strategy: jest.fn().mockImplementation(() => ({}))
}))

function makeMeasureCtx (): any {
  return { info: jest.fn(), warn: jest.fn(), error: jest.fn() }
}

const params = {
  issuerUrl: 'https://idp.example.com',
  clientId: 'client-id',
  clientSecret: 'client-secret',
  redirectUri: 'http://accounts.example.com/auth/openid/callback'
}

function makeSleepRecorder (): { sleep: (ms: number) => Promise<void>, delays: number[] } {
  const delays: number[] = []
  return {
    delays,
    sleep: async (ms: number): Promise<void> => {
      delays.push(ms)
    }
  }
}

describe('A. registerOidcStrategyWithRetry — schedule, cap, whole-attempt retry, warn gating', () => {
  test('1. fails K=3 times then succeeds: registers once after K+1 attempts, default schedule', async () => {
    const ctx = makeMeasureCtx()
    const passport = { use: jest.fn() }
    const { sleep, delays } = makeSleepRecorder()
    const discover = jest
      .fn()
      .mockRejectedValueOnce(new Error('ECONNREFUSED'))
      .mockRejectedValueOnce(new Error('ECONNREFUSED'))
      .mockRejectedValueOnce(new Error('ECONNREFUSED'))
      .mockResolvedValue({ Client: jest.fn() })

    const res = await registerOidcStrategyWithRetry(ctx, passport, params, { discover, sleep })

    expect(res.attempts).toBe(4)
    expect(discover).toHaveBeenCalledTimes(4)
    expect(discover).toHaveBeenCalledWith('https://idp.example.com')
    expect(delays).toEqual([5000, 10000, 20000])
    expect(passport.use).toHaveBeenCalledTimes(1)
    expect(passport.use).toHaveBeenCalledWith('oidc', expect.anything())
    expect(Strategy).toHaveBeenCalledTimes(1)
    expect(ctx.warn).toHaveBeenCalledTimes(3)
    expect(ctx.info).toHaveBeenCalledWith('Registered OIDC strategy', { attempts: 4 })
    expect(ctx.error).not.toHaveBeenCalled()
  })

  test('2. backoff is capped at 60s and stays there', async () => {
    const ctx = makeMeasureCtx()
    const passport = { use: jest.fn() }
    const { sleep, delays } = makeSleepRecorder()
    const discover = jest.fn()
    for (let i = 0; i < 7; i++) discover.mockRejectedValueOnce(new Error('boom'))
    discover.mockResolvedValue({ Client: jest.fn() })

    const res = await registerOidcStrategyWithRetry(ctx, passport, params, { discover, sleep })

    expect(res.attempts).toBe(8)
    expect(delays).toEqual([5000, 10000, 20000, 40000, 60000, 60000, 60000])
  })

  test('3. immediate success: one attempt, no sleep, no warn, exactly one passport.use', async () => {
    const ctx = makeMeasureCtx()
    const passport = { use: jest.fn() }
    const sleep = jest.fn()
    const discover = jest.fn().mockResolvedValue({ Client: jest.fn() })

    const res = await registerOidcStrategyWithRetry(ctx, passport, params, { discover, sleep })

    expect(res.attempts).toBe(1)
    expect(sleep).not.toHaveBeenCalled()
    expect(ctx.warn).not.toHaveBeenCalled()
    expect(passport.use).toHaveBeenCalledTimes(1)
  })

  test('4. retry covers the whole attempt: client construction failure retries too (HIGH-1)', async () => {
    const ctx = makeMeasureCtx()
    const passport = { use: jest.fn() }
    const { sleep, delays } = makeSleepRecorder()
    const throwingClient = jest.fn().mockImplementation(() => {
      throw new Error('unsupported code_challenge_method')
    })
    const discover = jest
      .fn()
      .mockResolvedValueOnce({ Client: throwingClient })
      .mockResolvedValue({ Client: jest.fn() })

    const res = await registerOidcStrategyWithRetry(ctx, passport, params, { discover, sleep })

    expect(res.attempts).toBe(2)
    expect(discover).toHaveBeenCalledTimes(2)
    expect(delays).toEqual([5000])
    expect(passport.use).toHaveBeenCalledTimes(1)
    expect(ctx.warn).toHaveBeenCalledTimes(1)
    expect(ctx.error).not.toHaveBeenCalled()
  })

  test('5. warn gating: attempts 1-5 and every 60th log, others are silent (MED-2)', async () => {
    const ctx = makeMeasureCtx()
    const passport = { use: jest.fn() }
    const { sleep } = makeSleepRecorder()
    const discover = jest.fn()
    for (let i = 0; i < 65; i++) discover.mockRejectedValueOnce(new Error('boom'))
    discover.mockResolvedValue({ Client: jest.fn() })

    const res = await registerOidcStrategyWithRetry(ctx, passport, params, { discover, sleep })

    expect(res.attempts).toBe(66)
    expect(ctx.warn).toHaveBeenCalledTimes(6)
    expect(ctx.warn.mock.calls.map((c: any[]) => c[1].attempt)).toEqual([1, 2, 3, 4, 5, 60])
    expect(ctx.info).toHaveBeenCalledWith('Registered OIDC strategy', { attempts: 66 })
    // pure gating function, spot checks
    expect(shouldWarnOnAttempt(6)).toBe(false)
    expect(shouldWarnOnAttempt(59)).toBe(false)
    expect(shouldWarnOnAttempt(120)).toBe(true)
  })

  test('6. errStack absent without OIDC_DEBUG (L-AUTH-2 convention)', async () => {
    const ctx = makeMeasureCtx()
    const passport = { use: jest.fn() }
    const { sleep } = makeSleepRecorder()
    const discover = jest.fn().mockRejectedValueOnce(new Error('x')).mockResolvedValue({ Client: jest.fn() })
    const prev = process.env.OIDC_DEBUG
    try {
      delete process.env.OIDC_DEBUG
      await registerOidcStrategyWithRetry(ctx, passport, params, { discover, sleep })
      expect(ctx.warn.mock.calls[0][1]).not.toHaveProperty('errStack')
    } finally {
      if (prev === undefined) delete process.env.OIDC_DEBUG
      else process.env.OIDC_DEBUG = prev
    }
  })

  test('7. errStack present with OIDC_DEBUG=true (L-AUTH-2 convention)', async () => {
    const ctx = makeMeasureCtx()
    const passport = { use: jest.fn() }
    const { sleep } = makeSleepRecorder()
    const discover = jest.fn().mockRejectedValueOnce(new Error('x')).mockResolvedValue({ Client: jest.fn() })
    const prev = process.env.OIDC_DEBUG
    try {
      process.env.OIDC_DEBUG = 'true'
      await registerOidcStrategyWithRetry(ctx, passport, params, { discover, sleep })
      expect(ctx.warn.mock.calls[0][1]).toHaveProperty('errStack')
      expect(typeof ctx.warn.mock.calls[0][1].errStack).toBe('string')
    } finally {
      if (prev === undefined) delete process.env.OIDC_DEBUG
      else process.env.OIDC_DEBUG = prev
    }
  })

  test('8. success log throwing after passport.use does not re-register (LOW-1)', async () => {
    const ctx = makeMeasureCtx()
    ctx.info = jest.fn((msg: string) => {
      if (msg === 'Registered OIDC strategy') throw new Error('logger down')
    })
    const passport = { use: jest.fn() }
    const { sleep } = makeSleepRecorder()
    const discover = jest.fn().mockResolvedValue({ Client: jest.fn() })

    const res = await registerOidcStrategyWithRetry(ctx, passport, params, { discover, sleep })

    // The throw from the success log must not re-enter the retry loop.
    expect(res.attempts).toBe(1)
    expect(passport.use).toHaveBeenCalledTimes(1)
    expect(discover).toHaveBeenCalledTimes(1)
    expect(ctx.warn).not.toHaveBeenCalled()
  })

  test('9. helper never rejects even if the failure warn throws (LOW-2)', async () => {
    const ctx = makeMeasureCtx()
    ctx.warn = jest.fn(() => {
      throw new Error('warn sink down')
    })
    const passport = { use: jest.fn() }
    const { sleep } = makeSleepRecorder()
    const discover = jest.fn().mockRejectedValueOnce(new Error('ECONNREFUSED')).mockResolvedValue({ Client: jest.fn() })

    // Must resolve (contract: never rejects), not throw the warn error.
    const res = await registerOidcStrategyWithRetry(ctx, passport, params, { discover, sleep })

    expect(res.attempts).toBe(2)
    expect(passport.use).toHaveBeenCalledTimes(1)
  })
})

describe('B. registerOpenid wiring — non-blocking startup, 503 pending window, exactly-once use', () => {
  const env = process.env

  beforeEach(() => {
    jest.useFakeTimers()
    jest.clearAllMocks()
    process.env = {
      ...env,
      OPENID_CLIENT_ID: 'client-id',
      OPENID_CLIENT_SECRET: 'client-secret',
      OPENID_ISSUER: 'https://idp.example.com',
      OPENID_DISPLAY_NAME: 'Example IdP'
    }
  })

  afterEach(() => {
    jest.useRealTimers()
    process.env = env
  })

  function callRegister (): { passport: any, router: Router<any, any>, ctx: any } {
    const passport: any = { use: jest.fn(), authenticate: jest.fn(() => async () => {}) }
    const router = new Router<any, any>()
    const ctx = makeMeasureCtx()
    const info = registerOpenid(
      ctx,
      passport,
      router,
      'http://accounts.example.com',
      Promise.resolve({} as any),
      'http://front.example.com',
      {}
    )
    expect(info).toEqual({ name: 'openid', displayName: 'Example IdP' })
    return { passport, router, ctx }
  }

  async function invokeAuthRoute (router: Router<any, any>): Promise<any> {
    const layer = router.stack.find((l) => l.path === '/auth/openid')
    expect(layer).toBeDefined()
    // encodeState dereferences ctx.request.headers (utils.ts getHost) and
    // ctx.query — both must exist on the fixture. set/status/body carry the
    // 503 pending-window response.
    const koaCtx: any = {
      redirect: jest.fn(),
      set: jest.fn(),
      status: undefined,
      body: undefined,
      query: {},
      state: {},
      request: { headers: {} }
    }
    await (layer as any).stack[0](koaCtx, async () => {})
    return koaCtx
  }

  test('1. route registered synchronously; pending window responds 503 + Retry-After', async () => {
    const discover = Issuer.discover as jest.Mock
    discover.mockReturnValue(new Promise(() => {})) // discovery never settles

    const { passport, router } = callRegister()
    const koaCtx = await invokeAuthRoute(router)

    expect(koaCtx.status).toBe(503)
    expect(koaCtx.set).toHaveBeenCalledWith('Retry-After', '5')
    expect(koaCtx.body).toEqual(expect.any(String))
    expect(koaCtx.redirect).not.toHaveBeenCalled()
    expect(passport.authenticate).not.toHaveBeenCalled()
    expect(passport.use).not.toHaveBeenCalled()
  })

  test('2. discover fails twice then succeeds: strategy registered exactly once, retries stop', async () => {
    const discover = Issuer.discover as jest.Mock
    discover
      .mockRejectedValueOnce(new Error('ECONNREFUSED'))
      .mockRejectedValueOnce(new Error('ECONNREFUSED'))
      .mockResolvedValue({ Client: jest.fn() })

    const { passport, ctx } = callRegister()

    // attempt 1 fails immediately; backoff 5s -> attempt 2 fails; 10s -> attempt 3 succeeds
    await jest.advanceTimersByTimeAsync(5000)
    await jest.advanceTimersByTimeAsync(10000)

    expect(discover).toHaveBeenCalledTimes(3)
    expect(passport.use).toHaveBeenCalledTimes(1)
    expect(passport.use).toHaveBeenCalledWith('oidc', expect.anything())
    expect(Strategy).toHaveBeenCalledTimes(1)
    expect(ctx.info).toHaveBeenCalledWith('Registered OIDC strategy', { attempts: 3 })

    // no further attempts, no double registration
    await jest.advanceTimersByTimeAsync(600000)
    expect(discover).toHaveBeenCalledTimes(3)
    expect(passport.use).toHaveBeenCalledTimes(1)
  })

  test('3. after successful registration the auth route takes the passport path, no 503', async () => {
    const discover = Issuer.discover as jest.Mock
    discover.mockResolvedValue({ Client: jest.fn() })

    const { passport, router } = callRegister()
    await jest.advanceTimersByTimeAsync(0) // flush the resolved registration

    const koaCtx = await invokeAuthRoute(router)
    expect(koaCtx.status).not.toBe(503)
    expect(koaCtx.set).not.toHaveBeenCalled()
    expect(koaCtx.redirect).not.toHaveBeenCalled()
    expect(passport.authenticate).toHaveBeenCalledWith(
      'oidc',
      expect.objectContaining({ scope: 'openid profile email' })
    )
  })
})
