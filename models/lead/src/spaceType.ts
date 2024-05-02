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
import { PaletteColorIndexes } from '@hcengineering/ui/src/colors'
import task from '@hcengineering/task'
import { type Builder } from '@hcengineering/model'
import core from '@hcengineering/model-core'
import { type Ref, type Status } from '@hcengineering/core'

import { TDefaultFunnelTypeData, TLeadTypeData } from './types'
import plugin from './plugin'

export const defaultLeadStatuses = [
  {
    id: plugin.taskTypeStatus.Backlog,
    color: PaletteColorIndexes.Coin,
    name: 'Backlog',
    ofAttribute: plugin.attribute.State,
    category: task.statusCategory.UnStarted
  },
  {
    id: plugin.taskTypeStatus.Incoming,
    color: PaletteColorIndexes.Coin,
    name: 'Incoming',
    ofAttribute: plugin.attribute.State,
    category: task.statusCategory.Active
  },
  {
    id: plugin.taskTypeStatus.Negotiation,
    color: PaletteColorIndexes.Arctic,
    name: 'Negotiation',
    ofAttribute: plugin.attribute.State,
    category: task.statusCategory.Active
  },
  {
    id: plugin.taskTypeStatus.OfferPreparing,
    color: PaletteColorIndexes.Watermelon,
    name: 'Offer preparing',
    ofAttribute: plugin.attribute.State,
    category: task.statusCategory.Active
  },
  {
    id: plugin.taskTypeStatus.MakeADecision,
    color: PaletteColorIndexes.Orange,
    name: 'Make a decision',
    ofAttribute: plugin.attribute.State,
    category: task.statusCategory.Active
  },
  {
    id: plugin.taskTypeStatus.ContractConclusion,
    color: PaletteColorIndexes.Ocean,
    name: 'Contract conclusion',
    ofAttribute: plugin.attribute.State,
    category: task.statusCategory.Active
  },
  {
    name: 'Won',
    id: plugin.taskTypeStatus.Won,
    ofAttribute: plugin.attribute.State,
    category: task.statusCategory.Won
  },
  {
    name: 'Lost',
    id: plugin.taskTypeStatus.Lost,
    ofAttribute: plugin.attribute.State,
    category: task.statusCategory.Lost
  }
]

export function defineSpaceType (builder: Builder): void {
  builder.createModel(TDefaultFunnelTypeData)
  builder.createDoc(
    task.class.ProjectTypeDescriptor,
    core.space.Model,
    {
      name: plugin.string.LeadApplication,
      description: plugin.string.ManageFunnelStatuses,
      icon: plugin.icon.LeadApplication,
      baseClass: plugin.class.Funnel,
      availablePermissions: [
        core.permission.UpdateSpace,
        core.permission.ArchiveSpace,
        core.permission.ForbidDeleteObject
      ],
      allowedTaskTypeDescriptors: [plugin.descriptors.Lead]
    },
    plugin.descriptors.FunnelType
  )
  builder.createDoc(
    task.class.TaskTypeDescriptor,
    core.space.Model,
    {
      baseClass: plugin.class.Lead,
      allowCreate: true,
      description: plugin.string.Lead,
      icon: plugin.icon.Lead,
      name: plugin.string.Lead
    },
    plugin.descriptors.Lead
  )

  const defaultStatuses: Ref<Status>[] = []

  // Create statuses for the default task type
  for (const status of defaultLeadStatuses) {
    const { name, color, ofAttribute, id, category } = status

    if (id === undefined) {
      throw new Error('Status id is required when creating in static model. Missing for: ' + name)
    }

    defaultStatuses.push(id)

    builder.createDoc(
      core.class.Status,
      core.space.Model,
      {
        ofAttribute,
        name,
        color,
        category
      },
      id
    )
  }

  // Create default task type
  builder.createModel(TLeadTypeData)

  builder.createDoc(
    task.class.TaskType,
    core.space.Model,
    {
      name: 'Lead',
      descriptor: plugin.descriptors.Lead,
      ofClass: plugin.class.Lead,
      targetClass: plugin.mixin.LeadTypeData,
      statusClass: core.class.Status,
      statusCategories: [
        task.statusCategory.UnStarted,
        task.statusCategory.Active,
        task.statusCategory.Won,
        task.statusCategory.Lost
      ],
      kind: 'task',
      parent: plugin.template.DefaultFunnel,
      statuses: defaultStatuses,
      icon: plugin.icon.Lead
    },
    plugin.taskType.Lead
  )

  builder.createDoc(
    task.class.ProjectType,
    core.space.Model,
    {
      name: 'Default funnel',
      descriptor: plugin.descriptors.FunnelType,
      description: '',
      tasks: [plugin.taskType.Lead],
      roles: 0,
      classic: false,
      statuses: defaultStatuses.map((s) => ({ _id: s, taskType: plugin.taskType.Lead })),
      targetClass: plugin.mixin.DefaultFunnelTypeData
    },
    plugin.template.DefaultFunnel
  )
}
