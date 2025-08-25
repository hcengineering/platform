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

import type { BaseEvent } from './common'
import { CardID, PeerKind, PeerExtra, WorkspaceID } from '@hcengineering/communication-types'

// Peer events only for system
export enum PeerEventType {
  CreatePeer = 'createPeer',
  RemovePeer = 'removePeer'
}

export type PeerEvent = CreatePeerEvent | RemovePeerEvent

export interface CreatePeerEvent extends BaseEvent {
  type: PeerEventType.CreatePeer
  workspaceId: WorkspaceID
  cardId: CardID
  kind: PeerKind
  value: string
  extra?: PeerExtra
  date?: Date
}

export interface RemovePeerEvent extends BaseEvent {
  type: PeerEventType.RemovePeer
  workspaceId: WorkspaceID
  cardId: CardID
  kind: PeerKind
  value: string
  date?: Date
}
