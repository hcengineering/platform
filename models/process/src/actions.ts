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

import card from '@hcengineering/card'
import core from '@hcengineering/core'
import { type Builder } from '@hcengineering/model'
import process from './plugin'

export function defineMethods (builder: Builder): void {
  builder.createDoc(
    process.class.Method,
    core.space.Model,
    {
      label: process.string.RunProcess,
      objectClass: process.class.Process,
      editor: process.component.SubProcessEditor,
      presenter: process.component.SubProcessPresenter,
      createdContext: { _class: process.class.Execution },
      requiredParams: ['_id']
    },
    process.method.RunSubProcess
  )

  builder.createDoc(
    process.class.Method,
    core.space.Model,
    {
      label: process.string.CreateToDo,
      editor: process.component.ToDoEditor,
      objectClass: process.class.ProcessToDo,
      presenter: process.component.ToDoPresenter,
      createdContext: { _class: process.class.ProcessToDo, nameField: 'title' },
      requiredParams: ['title', 'user'],
      defaultParams: {
        withRollback: true
      }
    },
    process.method.CreateToDo
  )

  builder.createDoc(
    process.class.Trigger,
    core.space.Model,
    {
      label: process.string.OnExecutionStart,
      icon: process.icon.Process,
      init: true,
      requiredParams: []
    },
    process.trigger.OnExecutionStart
  )

  builder.createDoc(
    process.class.Method,
    core.space.Model,
    {
      label: process.string.UpdateCard,
      editor: process.component.UpdateCardEditor,
      objectClass: card.class.Card,
      createdContext: null,
      presenter: process.component.UpdateCardPresenter,
      requiredParams: []
    },
    process.method.UpdateCard
  )

  builder.createDoc(
    process.class.Method,
    core.space.Model,
    {
      label: process.string.CreateCard,
      objectClass: card.class.Card,
      editor: process.component.CreateCardEditor,
      presenter: process.component.CreateCardPresenter,
      createdContext: { _class: card.class.Card },
      requiredParams: ['title', '_class']
    },
    process.method.CreateCard
  )

  builder.createDoc(
    process.class.Method,
    core.space.Model,
    {
      label: core.string.AddRelation,
      objectClass: core.class.Relation,
      editor: process.component.AddRelationEditor,
      presenter: process.component.AddRelationPresenter,
      createdContext: { _class: core.class.Relation },
      requiredParams: ['association', 'direction', '_id']
    },
    process.method.AddRelation
  )

  builder.createDoc(
    process.class.Method,
    core.space.Model,
    {
      label: card.string.AddTag,
      objectClass: card.class.Tag,
      editor: process.component.AddTagEditor,
      presenter: process.component.AddTagPresenter,
      createdContext: { _class: card.class.Card },
      requiredParams: ['_id']
    },
    process.method.AddTag
  )
}
