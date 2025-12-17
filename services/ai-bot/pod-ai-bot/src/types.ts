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

import { Class, Doc, Ref, PersonUuid } from '@hcengineering/core'

export interface HistoryRecord {
  workspace: string
  message: string
  objectId: Ref<Doc>
  objectClass: Ref<Class<Doc>>
  role: string
  user: PersonUuid
  tokens: number
  timestamp: number
}

/**
 * Transcription task stored in queue
 */
export interface TranscriptionTask {
  /** Storage object name for gzipped WAV file */
  blobId: string
  /** Room name from LiveKit (format: workspaceUuid_roomName_roomId) */
  roomName: string
  /** Participant identity (Ref<Person>) */
  participant: string
  /** Start time in seconds from meeting start */
  startTimeSec: number
  /** End time in seconds from meeting start */
  endTimeSec: number
  /** Duration in seconds */
  durationSec: number
  /** Whether chunk contains speech */
  hasSpeech: boolean
  /** Ratio of speech to total duration (0-1) */
  speechRatio: number
  /** Peak amplitude (0-1 normalized) */
  peakAmplitude: number
  /** RMS amplitude (0-1 normalized) */
  rmsAmplitude: number
  /** Sample rate */
  sampleRate: number
  /** Number of channels */
  channels: number
  /** Bits per sample */
  bitsPerSample: number
  /** Placeholder message ID for pending transcription (created when speech starts) */
  placeholderMessageId?: string
}
