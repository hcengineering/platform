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
import plugin, { recorderId } from '@hcengineering/recorder'
import { type AnyComponent } from '@hcengineering/ui/src/types'

export default mergeIds(recorderId, plugin, {
  component: {
    RecorderExt: '' as AnyComponent
  },
  string: {
    Done: '' as IntlString,
    Pause: '' as IntlString,
    Stop: '' as IntlString,
    Resume: '' as IntlString,
    Record: '' as IntlString,
    Cancel: '' as IntlString,
    Restart: '' as IntlString,
    CancelRecording: '' as IntlString,
    CancelRecordingConfirm: '' as IntlString,
    RestartRecording: '' as IntlString,
    RestartRecordingConfirm: '' as IntlString,
    ScreenRecordingName: '' as IntlString,
    CameraRecordingName: '' as IntlString,
    ClickToSkip: '' as IntlString,
    RecordVideo: '' as IntlString,
    SelectVideoToRecord: '' as IntlString,
    ShareWithAudio: '' as IntlString,
    ShareScreen: '' as IntlString,
    StopSharing: '' as IntlString,
    CameraSize: '' as IntlString,
    CameraPos: '' as IntlString,
    Small: '' as IntlString,
    Medium: '' as IntlString,
    Large: '' as IntlString,
    TopLeft: '' as IntlString,
    TopRight: '' as IntlString,
    BottomLeft: '' as IntlString,
    BottomRight: '' as IntlString,
    Resolution: '' as IntlString,
    Original: '' as IntlString
  }
})
