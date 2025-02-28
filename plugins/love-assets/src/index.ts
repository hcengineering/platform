//
// Copyright © 2023 Hardcore Engineering Inc.
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

/// <reference path="../../../common/types/assets.d.ts" />

import { loadMetadata } from '@hcengineering/platform'
import love from '@hcengineering/love'
import icons from '../assets/icons.svg'
import Knock from '../assets/knock.wav'

loadMetadata(love.icon, {
  Love: `${icons}#office`,
  SharingEnabled: `${icons}#shareOn`,
  SharingDisabled: `${icons}#shareOff`,
  CamEnabled: `${icons}#cameraOn`,
  CamDisabled: `${icons}#cameraOff`,
  Cam: `${icons}#camera`,
  Mic: `${icons}#mic`,
  MicEnabled: `${icons}#micOn`,
  MicDisabled: `${icons}#micOff`,
  LeaveRoom: `${icons}#leave`,
  EnterRoom: `${icons}#enter`,
  Open: `${icons}#open`,
  Knock: `${icons}#knock`,
  DND: `${icons}#dnd`,
  Record: `${icons}#record`,
  StopRecord: `${icons}#stopRecord`,
  FullScreen: `${icons}#fullscreen`,
  ExitFullScreen: `${icons}#exitfullscreen`,
  Invite: `${icons}#invite`,
  Kick: `${icons}#kick`
})
loadMetadata(love.sound, {
  Knock
})
