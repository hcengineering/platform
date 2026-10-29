//
// Copyright © 2026 Hardcore Engineering Inc.
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

import { getScreenShareErrorKind } from '../screenShareError'

function err (name: string, message: string = ''): Error {
  const e = new Error(message)
  e.name = name
  return e
}

describe('getScreenShareErrorKind', () => {
  it('reports an ambiguous NotAllowedError as not started', () => {
    expect(getScreenShareErrorKind(err('NotAllowedError'))).toBe('notStarted')
    expect(getScreenShareErrorKind(err('NotAllowedError', 'Permission denied'))).toBe('notStarted')
    expect(
      getScreenShareErrorKind(
        err('NotAllowedError', 'The request is not allowed by the user agent or the platform in the current context.')
      )
    ).toBe('notStarted')
  })

  it('detects a permission denied by the operating system', () => {
    expect(getScreenShareErrorKind(err('NotAllowedError', 'Permission denied by system'))).toBe('denied')
  })

  it('detects a permission denied by permissions policy', () => {
    expect(
      getScreenShareErrorKind(
        err('NotAllowedError', 'Access to the feature "display-capture" is disallowed by permission policy.')
      )
    ).toBe('denied')
    expect(getScreenShareErrorKind(err('NotAllowedError', 'Blocked by permissions policy'))).toBe('denied')
    expect(getScreenShareErrorKind(err('SecurityError', 'Insecure context'))).toBe('denied')
  })

  it('detects unsupported screen sharing', () => {
    expect(getScreenShareErrorKind(err('DeviceUnsupportedError', 'getDisplayMedia not supported'))).toBe('unsupported')
    expect(getScreenShareErrorKind(err('NotSupportedError'))).toBe('unsupported')
    expect(getScreenShareErrorKind(new TypeError('x is undefined'), false)).toBe('unsupported')
  })

  it('reports other errors as failed', () => {
    expect(getScreenShareErrorKind(err('NotReadableError', 'Could not start video source'))).toBe('failed')
    expect(getScreenShareErrorKind(err('AbortError', 'Starting videoinput failed'))).toBe('failed')
    expect(getScreenShareErrorKind(undefined)).toBe('failed')
  })
})
