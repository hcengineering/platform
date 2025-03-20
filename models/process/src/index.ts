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

import card, { type Card, type MasterTag } from '@hcengineering/card'
import core, {
  type Class,
  DOMAIN_MODEL,
  type Doc,
  type Domain,
  type Ref,
  SortingOrder,
  type Space,
  type Tx
} from '@hcengineering/core'
import { ArrOf, Model, Prop, TypeBoolean, TypeRecord, TypeRef, TypeString, type Builder } from '@hcengineering/model'
import presentation from '@hcengineering/model-presentation'
import { TDoc } from '@hcengineering/model-core'
import { TToDo } from '@hcengineering/model-time'
import view, { createAction } from '@hcengineering/model-view'
import { type IntlString } from '@hcengineering/platform'
import {
  type ProcessFunction,
  type Execution,
  type Method,
  type Process,
  type ProcessToDo,
  type State,
  type Step
} from '@hcengineering/process'
import time from '@hcengineering/time'

import { type AnyComponent } from '@hcengineering/ui'
import process from './plugin'
import contact, { type Employee } from '@hcengineering/contact'
import { type AttributeCategory } from '@hcengineering/view'

const DOMAIN_PROCESS = 'process' as Domain

@Model(process.class.Process, core.class.Doc, DOMAIN_MODEL)
export class TProcess extends TDoc implements Process {
  @Prop(TypeString(), core.string.Name)
    name!: string

  @Prop(TypeString(), core.string.Description)
    description!: string

  @Prop(TypeRef(card.class.MasterTag), core.string.Name)
    masterTag!: Ref<MasterTag>

  @Prop(ArrOf(TypeRef(process.class.State)), process.string.States)
    states!: Ref<State>[]
}

@Model(process.class.Execution, core.class.Doc, DOMAIN_PROCESS)
export class TExecution extends TDoc implements Execution {
  @Prop(TypeRef(contact.mixin.Employee), contact.string.Employee)
    assignee!: Ref<Employee>

  @Prop(TypeRef(process.class.Process), process.string.Process)
    process!: Ref<TProcess>

  @Prop(TypeRef(process.class.ProcessToDo), time.string.ToDo)
    currentToDo!: Ref<ProcessToDo> | null

  @Prop(TypeRef(process.class.State), process.string.Step)
    currentState!: Ref<State>

  @Prop(TypeBoolean(), process.string.Done)
    done!: boolean

  @Prop(TypeRecord(), process.string.Rollback)
    rollback!: Record<Ref<State>, Tx[]>

  @Prop(TypeRef(card.class.Card), card.string.Card)
    card!: Ref<Card>
}

@Model(process.class.ProcessToDo, time.class.ToDo)
export class TProcessToDo extends TToDo implements ProcessToDo {
  execution!: Ref<Execution>

  state!: Ref<State>
}

@Model(process.class.Method, core.class.Doc, DOMAIN_MODEL)
export class TMethod extends TDoc implements Method<Doc> {
  label!: IntlString

  objectClass!: Ref<Class<Doc>>

  description?: IntlString

  editor!: AnyComponent

  systemOnly!: boolean

  presenter?: AnyComponent

  requiredParams!: string[]
}

@Model(process.class.State, core.class.Doc, DOMAIN_MODEL)
export class TState extends TDoc implements State {
  process!: Ref<Process>
  title!: string
  actions!: Step<Doc>[]
  endAction?: Step<Doc> | null
}

@Model(process.class.ProcessFunction, core.class.Doc, DOMAIN_MODEL)
export class TProcessFunction extends TDoc implements ProcessFunction {
  of!: Ref<Class<Doc<Space>>>
  category?: AttributeCategory | undefined
  label!: IntlString
}

export function createModel (builder: Builder): void {
  builder.createModel(TProcess, TExecution, TProcessToDo, TMethod, TState, TProcessFunction)

  createAction(
    builder,
    {
      action: view.actionImpl.ValueSelector,
      actionPopup: process.component.RunProcessPopup,
      actionProps: {
        attribute: ''
      },
      label: process.string.RunProcess,
      icon: process.icon.Process,
      input: 'focus',
      category: view.category.General,
      target: card.class.Card,
      context: {
        mode: ['context', 'browser']
      }
    },
    process.action.RunProcess
  )

  builder.createDoc(
    process.class.ProcessFunction,
    core.space.Model,
    {
      of: core.class.TypeString,
      category: 'attribute',
      label: process.string.UpperCase
    },
    process.function.UpperCase
  )

  builder.createDoc(
    process.class.ProcessFunction,
    core.space.Model,
    {
      of: core.class.TypeString,
      category: 'attribute',
      label: process.string.LowerCase
    },
    process.function.LowerCase
  )

  builder.createDoc(
    process.class.ProcessFunction,
    core.space.Model,
    {
      of: core.class.TypeString,
      category: 'attribute',
      label: process.string.Trim
    },
    process.function.Trim
  )

  builder.createDoc(
    process.class.ProcessFunction,
    core.space.Model,
    {
      of: core.class.ArrOf,
      label: process.string.FirstValue
    },
    process.function.FirstValue
  )

  builder.createDoc(
    process.class.ProcessFunction,
    core.space.Model,
    {
      of: core.class.ArrOf,
      label: process.string.LastValue
    },
    process.function.LastValue
  )

  builder.createDoc(
    process.class.ProcessFunction,
    core.space.Model,
    {
      of: core.class.ArrOf,
      label: process.string.Random
    },
    process.function.Random
  )

  builder.mixin(process.class.Process, core.class.Class, view.mixin.AttributePresenter, {
    presenter: process.component.ProcessPresenter
  })

  builder.createDoc(
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: process.class.Execution,
      descriptor: view.viewlet.List,
      viewOptions: {
        groupBy: ['process', 'assignee'],
        orderBy: [
          ['modifiedOn', SortingOrder.Descending],
          ['createdOn', SortingOrder.Descending]
        ],
        other: []
      },
      configOptions: {
        strict: true,
        hiddenKeys: ['process', 'currentState']
      },
      config: [
        {
          key: '',
          label: process.string.Process,
          presenter: process.component.ExecutonPresenter,
          displayProps: { key: 'process' }
        },
        {
          key: '',
          label: process.string.Step,
          presenter: process.component.ExecutonProgressPresenter,
          displayProps: { key: 'state' }
        },
        { key: '', presenter: process.component.ExecutonPresenter, displayProps: { grow: true } },
        {
          key: 'assignee',
          displayProps: { key: 'assignee', fixed: 'right' },
          props: { kind: 'list', shouldShowName: false, avatarSize: 'x-small', onChange: undefined }
        },
        'modifiedOn',
        'createdOn'
      ]
    },
    process.viewlet.CardExecutions
  )

  builder.createDoc(presentation.class.ComponentPointExtension, core.space.Model, {
    extension: card.extensions.EditCardExtension,
    component: process.component.ProcessesExtension,
    props: {}
  })

  builder.createDoc(
    process.class.Method,
    core.space.Model,
    {
      label: process.string.RunProcess,
      objectClass: process.class.Process,
      editor: process.component.SubProcessEditor,
      presenter: process.component.SubProcessPresenter,
      systemOnly: false,
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
      systemOnly: true,
      requiredParams: ['state', 'title', 'user']
    },
    process.method.CreateToDo
  )

  builder.createDoc(
    process.class.Method,
    core.space.Model,
    {
      label: process.string.UpdateCard,
      editor: process.component.UpdateCardEditor,
      objectClass: card.class.Card,
      presenter: process.component.UpdateCardPresenter,
      systemOnly: false,
      requiredParams: []
    },
    process.method.UpdateCard
  )

  builder.createDoc(card.class.MasterTagEditorSection, core.space.Model, {
    id: 'processes',
    label: process.string.Processes,
    component: process.component.ProcessesSettingSection
  })
}

export { processId } from '@hcengineering/process'

export default process
