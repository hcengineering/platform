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

export type Action = DocumentCopyAction | DocumentFieldCopyAction

export type StorageType = 'minio' | 'platform'

export interface DocumentCopyAction {
  action: 'document.copy'
  params: {
    sourceId: string
    targetId: string
  }
}

export interface DocumentFieldCopyAction {
  action: 'document.field.copy'
  params: {
    documentId: string
    srcFieldId: string
    dstFieldId: string
  }
}

export type ActionStatus = 'completed' | 'failed'

export interface ActionStatusResponse {
  action: Action
  status: ActionStatus
}
