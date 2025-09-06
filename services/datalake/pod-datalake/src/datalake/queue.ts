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

import core, { TxFactory, type Blob, type Ref, type Tx } from '@hcengineering/core'

const factory = new TxFactory(core.account.System)

export const blobEvents = {
  created: function (
    name: string,
    data: {
      size: number
      etag: string
      contentType: string
      lastModified: number
    }
  ): Tx {
    const { lastModified, ...rest } = data
    return factory.createTxCreateDoc(
      core.class.Blob,
      core.space.Configuration,
      {
        provider: 'datalake',
        version: '',
        ...rest
      },
      name as Ref<Blob>,
      lastModified
    )
  },
  updated: function (
    name: string,
    data: {
      size: number
      etag: string
      contentType: string
      lastModified: number
    }
  ): Tx {
    const { lastModified, ...rest } = data
    return factory.createTxUpdateDoc(
      core.class.Blob,
      core.space.Configuration,
      name as Ref<Blob>,
      {
        provider: 'datalake',
        version: '',
        ...rest
      },
      false,
      lastModified
    )
  },
  deleted: function (name: string): Tx {
    return factory.createTxRemoveDoc(core.class.Blob, core.space.Configuration, name as Ref<Blob>)
  }
}
