//
// Copyright © 2026 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// SPDX-License-Identifier: EPL-2.0
//

import { loginOrSignUpWithProvider } from '@hcengineering/account'

import { handleProviderAuth, ProviderAuthenticationHookError } from '../utils'

jest.mock('@hcengineering/account', () => ({
  joinWithProvider: jest.fn(),
  loginOrSignUpWithProvider: jest.fn()
}))

describe('handleProviderAuth', () => {
  test('propagates post-authentication failures instead of reporting a generic authentication failure', async () => {
    const measureCtx = { info: jest.fn(), error: jest.fn() } as any
    const syncFailure = new Error('workspace synchronization unavailable')
    ;(loginOrSignUpWithProvider as jest.Mock).mockResolvedValue({ account: 'account-id', token: 'token' })

    await expect(
      handleProviderAuth(
        measureCtx,
        {} as any,
        {},
        'https://front.example',
        'openid',
        undefined,
        undefined,
        'person@example.com',
        'Person',
        'Example',
        {} as any,
        false,
        async () => {
          throw syncFailure
        }
      )
    ).rejects.toEqual(expect.objectContaining({ cause: syncFailure, name: ProviderAuthenticationHookError.name }))

    expect(measureCtx.error).not.toHaveBeenCalled()
  })
})
