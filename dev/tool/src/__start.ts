//
// Copyright © 2022 Hardcore Engineering Inc.
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

import { prepareTools as prepareToolsRaw } from '@hcengineering/server-tool'

import { Data, Tx, Version } from '@hcengineering/core'
import { MigrateOperation } from '@hcengineering/model'
import builder, { migrateOperations, version } from '@hcengineering/model-all'
import { Client } from 'minio'
import { devTool } from '.'

function prepareTools (): {
  mongodbUri: string
  minio: Client
  txes: Tx[]
  version: Data<Version>
  migrateOperations: MigrateOperation[]
  productId: string
} {
  return { ...prepareToolsRaw(builder.getTxes()), version, migrateOperations, productId: '' }
}

devTool(prepareTools)
