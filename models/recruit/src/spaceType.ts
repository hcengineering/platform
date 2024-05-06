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

import { TDefaultVacancyTypeData, TApplicantTypeData } from './types'
import plugin from './plugin'

export const defaultApplicantStatuses = [
  {
    id: plugin.taskTypeStatus.Backlog,
    color: PaletteColorIndexes.Coin,
    name: 'Backlog',
    ofAttribute: plugin.attribute.State,
    category: task.statusCategory.UnStarted
  },
  {
    id: plugin.taskTypeStatus.HRInterview,
    color: PaletteColorIndexes.Coin,
    name: 'HR Interview',
    ofAttribute: plugin.attribute.State,
    category: task.statusCategory.Active
  },
  {
    id: plugin.taskTypeStatus.TechnicalInterview,
    color: PaletteColorIndexes.Cerulean,
    name: 'Technical Interview',
    ofAttribute: plugin.attribute.State,
    category: task.statusCategory.Active
  },
  {
    id: plugin.taskTypeStatus.TestTask,
    color: PaletteColorIndexes.Waterway,
    name: 'Test task',
    ofAttribute: plugin.attribute.State,
    category: task.statusCategory.Active
  },
  {
    id: plugin.taskTypeStatus.Offer,
    color: PaletteColorIndexes.Grass,
    name: 'Offer',
    ofAttribute: plugin.attribute.State,
    category: task.statusCategory.Active
  },
  {
    id: plugin.taskTypeStatus.Won,
    name: 'Won',
    ofAttribute: plugin.attribute.State,
    category: task.statusCategory.Won
  },
  {
    id: plugin.taskTypeStatus.Lost,
    name: 'Lost',
    ofAttribute: plugin.attribute.State,
    category: task.statusCategory.Lost
  }
]

export function defineSpaceType (builder: Builder): void {
  builder.createModel(TDefaultVacancyTypeData)
  builder.createDoc(
    task.class.ProjectTypeDescriptor,
    core.space.Model,
    {
      name: plugin.string.RecruitApplication,
      description: plugin.string.ManageVacancyStatuses,
      icon: plugin.icon.RecruitApplication,
      editor: plugin.component.VacancyTemplateEditor,
      baseClass: plugin.class.Vacancy,
      availablePermissions: [core.permission.ArchiveSpace, core.permission.ForbidDeleteObject],
      allowedTaskTypeDescriptors: [plugin.descriptors.Application]
    },
    plugin.descriptors.VacancyType
  )

  builder.createDoc(
    task.class.TaskTypeDescriptor,
    core.space.Model,
    {
      baseClass: plugin.class.Applicant,
      allowCreate: true,
      description: plugin.string.Application,
      icon: plugin.icon.Application,
      name: plugin.string.Application
    },
    plugin.descriptors.Application
  )

  const defaultStatuses: Ref<Status>[] = []

  // Create statuses for the default task type
  for (const status of defaultApplicantStatuses) {
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
  builder.createModel(TApplicantTypeData)

  builder.createDoc(
    task.class.TaskType,
    core.space.Model,
    {
      name: 'Applicant',
      descriptor: plugin.descriptors.Application,
      ofClass: plugin.class.Applicant,
      targetClass: plugin.mixin.ApplicantTypeData,
      parent: plugin.template.DefaultVacancy,
      kind: 'task',
      statuses: defaultStatuses,
      statusClass: core.class.Status,
      statusCategories: [
        task.statusCategory.UnStarted,
        task.statusCategory.Active,
        task.statusCategory.Won,
        task.statusCategory.Lost
      ],
      icon: plugin.icon.Application
    },
    plugin.taskTypes.Applicant
  )

  builder.createDoc(
    task.class.ProjectType,
    core.space.Model,
    {
      name: 'Default vacancy',
      descriptor: plugin.descriptors.VacancyType,
      description: '',
      tasks: [plugin.taskTypes.Applicant],
      roles: 0,
      classic: false,
      statuses: defaultStatuses.map((s) => ({ _id: s, taskType: plugin.taskTypes.Applicant })),
      targetClass: plugin.mixin.DefaultVacancyTypeData
    },
    plugin.template.DefaultVacancy
  )
}
