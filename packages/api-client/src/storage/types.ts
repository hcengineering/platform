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

import { Blob } from '@hcengineering/core'
import { Readable } from 'stream'

export interface StorageClient {
  stat: (objectName: string) => Promise<Blob | undefined>
  get: (objectName: string) => Promise<Readable>
  put: (objectName: string, stream: Readable | Buffer | string, contentType: string, size?: number) => Promise<Blob>
  partial: (objectName: string, offset: number, length?: number) => Promise<Readable>
  remove: (objectName: string) => Promise<void>
}
