//
// Copyright © 2024 Hardcore Engineering Inc.
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

import { RemoteParticipant, RemoteTrack, RemoteTrackPublication } from '@livekit/rtc-node'

export enum TranscriptionStatus {
  Idle = 'idle',
  InProgress = 'inProgress',
  Completed = 'completed'
}

export interface Metadata {
  transcription?: TranscriptionStatus
  language?: string
}

export type SttProvider = 'openai' | 'deepgram'

export interface Stt {
  stop: () => void
  start: () => void
  subscribe: (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => void
  unsubscribe: (track: RemoteTrack | undefined, publication: RemoteTrackPublication, participant: RemoteParticipant) => void
  updateLanguage: (language: string) => void
  close: () => void
}
