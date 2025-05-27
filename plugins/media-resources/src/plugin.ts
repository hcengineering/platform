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

import { type IntlString, mergeIds } from '@hcengineering/platform'
import media, { mediaId } from '@hcengineering/media'
import { type AnyComponent } from '@hcengineering/ui/src/types'

export default mergeIds(mediaId, media, {
  component: {
    MediaExt: '' as AnyComponent
  },
  string: {
    Camera: '' as IntlString,
    Microphone: '' as IntlString,
    Speaker: '' as IntlString,
    NoMic: '' as IntlString,
    NoCam: '' as IntlString,
    NoSpeaker: '' as IntlString,
    DefaultCam: '' as IntlString,
    DefaultMic: '' as IntlString,
    DefaultSpeaker: '' as IntlString,
    On: '' as IntlString,
    Off: '' as IntlString
  }
})
