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

import { getConferenceLink, getEventLocation } from '../conference'

const meet = 'https://meet.google.com/abc-defg-hij'

describe('getConferenceLink', () => {
  it('returns hangoutLink', () => {
    expect(getConferenceLink({ hangoutLink: meet })).toBe(meet)
  })

  it('falls back to the video entry point of conferenceData', () => {
    expect(
      getConferenceLink({
        conferenceData: {
          entryPoints: [
            { entryPointType: 'phone', uri: 'tel:+1-555-0100' },
            { entryPointType: 'video', uri: meet }
          ]
        }
      })
    ).toBe(meet)
  })

  it('returns undefined without conference', () => {
    expect(getConferenceLink({})).toBeUndefined()
    expect(getConferenceLink({ conferenceData: { entryPoints: [{ entryPointType: 'phone', uri: 'tel:1' }] } })).toBe(
      undefined
    )
  })
})

describe('getEventLocation', () => {
  it('keeps an explicit location', () => {
    expect(getEventLocation({ location: 'Room 1', hangoutLink: meet })).toBe('Room 1')
  })

  it('uses the conference link when location is missing or empty', () => {
    expect(getEventLocation({ hangoutLink: meet })).toBe(meet)
    expect(getEventLocation({ location: '', hangoutLink: meet })).toBe(meet)
    expect(getEventLocation({ location: '  ', hangoutLink: meet })).toBe(meet)
  })

  it('is stable on repeated calls', () => {
    const event = { hangoutLink: meet }
    expect(getEventLocation(event)).toBe(getEventLocation(event))
  })

  it('keeps previous behaviour without conference', () => {
    expect(getEventLocation({})).toBeUndefined()
    expect(getEventLocation({ location: null })).toBeUndefined()
    expect(getEventLocation({ location: '' })).toBe('')
  })
})
