//
// Class refs for the love plugin — same id shape the model builder emits (`${pluginId}:class:${name}`).
// Use this in API tests without a dependency on `@hcengineering/love`.
//

import type { Class, Doc, Ref } from '@hcengineering/core'

export const loveClass = {
  Room: 'love:class:Room' as Ref<Class<Doc>>,
  MeetingMinutes: 'love:class:MeetingMinutes' as Ref<Class<Doc>>
}

/** @see `@hcengineering/love` MeetingStatus */
export enum LoveMeetingStatus {
  Active = 0,
  Finished = 1
}
