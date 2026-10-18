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

import type { calendar_v3 } from 'googleapis'

/**
 * Returns the video conference link (e.g. Google Meet) attached to a Google event, if any.
 */
export function getConferenceLink (event: calendar_v3.Schema$Event): string | undefined {
  if (event.hangoutLink != null && event.hangoutLink !== '') {
    return event.hangoutLink
  }
  const entryPoint = event.conferenceData?.entryPoints?.find(
    (p) => p.entryPointType === 'video' && p.uri != null && p.uri !== ''
  )
  return entryPoint?.uri ?? undefined
}

/**
 * Returns the location to store in Huly for a Google event.
 * An explicit location always wins; the conference link is used only when the location is empty.
 */
export function getEventLocation (event: calendar_v3.Schema$Event): string | undefined {
  if (event.location != null && event.location.trim() !== '') {
    return event.location
  }
  return getConferenceLink(event) ?? event.location ?? undefined
}
