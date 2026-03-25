//
// Copyright © 2025 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

import platform from '../platform'
import { ERROR, PlatformError, Severity, Status, UNAUTHORIZED, errorToStatus, unknownStatus } from '../status'

describe('errorToStatus', () => {
  it('returns status from PlatformError', () => {
    const err = new PlatformError(UNAUTHORIZED)
    expect(errorToStatus(err)).toBe(UNAUTHORIZED)
  })

  it('returns same Status instance', () => {
    const st = new Status(Severity.WARNING, platform.status.MaintenanceWarning, { time: 1, message: '' })
    expect(errorToStatus(st)).toBe(st)
  })

  it('reconstructs from plain status-shaped object (duplicate package / JSON)', () => {
    const plain = {
      severity: UNAUTHORIZED.severity,
      code: UNAUTHORIZED.code,
      params: UNAUTHORIZED.params
    }
    expect(errorToStatus(plain)).toEqual(UNAUTHORIZED)
  })

  it('unwraps embedded .status (foreign PlatformError shape)', () => {
    const workspaceUuid = 'd388f8f8-915c-4ef8-96f7-018147ce1234'
    const embedded = {
      status: {
        severity: Severity.ERROR,
        code: platform.status.WorkspaceNotFound,
        params: { workspaceUuid }
      }
    }
    expect(errorToStatus(embedded)).toMatchObject({
      severity: Severity.ERROR,
      code: platform.status.WorkspaceNotFound,
      params: { workspaceUuid }
    })
  })

  it('delegates Error to unknownError → unknownStatus', () => {
    expect(errorToStatus(new Error('boom'))).toEqual(unknownStatus('boom'))
  })

  it('delegates string to unknownError → unknownStatus', () => {
    expect(errorToStatus('nope')).toEqual(unknownStatus('nope'))
  })

  it('returns ERROR for unrecognized values', () => {
    expect(errorToStatus(null)).toBe(ERROR)
    expect(errorToStatus(undefined)).toBe(ERROR)
    expect(errorToStatus(42)).toBe(ERROR)
    expect(errorToStatus({})).toBe(ERROR)
  })

  it('ignores .status that is not status-shaped', () => {
    expect(
      errorToStatus({
        status: { code: 'only-code' }
      })
    ).toBe(ERROR)
  })
})
