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

export type ScreenShareErrorKind = 'notStarted' | 'denied' | 'unsupported' | 'failed'

/**
 * Classifies an error thrown while starting a screen share.
 *
 * Browsers report both a closed source picker and a blocked permission as NotAllowedError with
 * the same message, so a user cancellation cannot be told apart reliably. Only denials that can
 * be recognized by their message (operating system or permissions policy) are reported as
 * 'denied'; any other NotAllowedError is reported as 'notStarted' and handled silently.
 */
export function getScreenShareErrorKind (error: unknown, displayMediaSupported: boolean = true): ScreenShareErrorKind {
  if (!displayMediaSupported) return 'unsupported'
  const name = (error as Error | undefined)?.name ?? ''
  const message = ((error as Error | undefined)?.message ?? '').toLowerCase()
  if (name === 'DeviceUnsupportedError' || name === 'NotSupportedError') return 'unsupported'
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') {
    if (
      message.includes('by system') ||
      message.includes('permission policy') ||
      message.includes('permissions policy')
    ) {
      return 'denied'
    }
    return name === 'SecurityError' ? 'denied' : 'notStarted'
  }
  return 'failed'
}
