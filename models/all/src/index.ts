//
// Copyright © 2020 Anticrm Platform Contributors.
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

import { Builder } from '@anticrm/model'

import { createModel as coreModel } from '@anticrm/model-core'
import { createModel as viewModel } from '@anticrm/model-view'
import { createModel as workbenchModel } from '@anticrm/model-workbench'
import { createModel as contactModel } from '@anticrm/model-contact'
import { createModel as taskModel, upgradeModel as upgradeTask } from '@anticrm/model-task'
import { createModel as chunterModel } from '@anticrm/model-chunter'
import { createModel as recruitModel } from '@anticrm/model-recruit'
import { createModel as settingModel } from '@anticrm/model-setting'
import { createModel as telegramModel } from '@anticrm/model-telegram'

import { createModel as serverCoreModel } from '@anticrm/model-server-core'
import { createModel as serverChunterModel } from '@anticrm/model-server-chunter'
import { createModel as serverRecruitModel } from '@anticrm/model-server-recruit'
import { createModel as serverViewModel } from '@anticrm/model-server-view'
import { createModel as activityModel } from '@anticrm/model-activity'

import { createDemo } from '@anticrm/model-demo'
import { TxOperations } from '@anticrm/core'

const builder = new Builder()

coreModel(builder)
activityModel(builder)
viewModel(builder)
workbenchModel(builder)
contactModel(builder)
chunterModel(builder)
taskModel(builder)
recruitModel(builder)
settingModel(builder)
telegramModel(builder)

serverCoreModel(builder)
serverChunterModel(builder)
serverRecruitModel(builder)
serverViewModel(builder)

createDemo(builder)

export default builder

export const upgrades: ((client: TxOperations) => Promise<void>) [] = [upgradeTask]
