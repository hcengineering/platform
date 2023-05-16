//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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

import { Domain, DOMAIN_MODEL, IndexKind, Ref } from '@hcengineering/core'
import { Builder, Index, Model, Prop, TypeString, UX } from '@hcengineering/model'
import core, { TDoc, TSpace } from '@hcengineering/model-core'
import textEditor from '@hcengineering/model-text-editor'
import tracker from '@hcengineering/model-tracker'
import view, { createAction } from '@hcengineering/model-view'
import { IntlString, Resource } from '@hcengineering/platform'
import setting from '@hcengineering/setting'
import type {
  MessageTemplate,
  TemplateCategory,
  TemplateField,
  TemplateFieldCategory,
  TemplateFieldFunc
} from '@hcengineering/templates'
import templates from './plugin'

export { templatesId } from '@hcengineering/templates'
export { templatesOperation } from './migration'

export const DOMAIN_TEMPLATES = 'templates' as Domain

@Model(templates.class.MessageTemplate, core.class.Doc, DOMAIN_TEMPLATES)
export class TMessageTemplate extends TDoc implements MessageTemplate {
  @Prop(TypeString(), templates.string.Title)
  @Index(IndexKind.FullText)
    title!: string

  @Prop(TypeString(), templates.string.Message)
  @Index(IndexKind.FullText)
    message!: string
}

@Model(templates.class.TemplateCategory, core.class.Space)
@UX(templates.string.TemplateCategory)
export class TTemplateCategory extends TSpace implements TemplateCategory {}

@Model(templates.class.TemplateFieldCategory, core.class.Doc, DOMAIN_MODEL)
export class TTemplateFieldCategory extends TDoc implements TemplateFieldCategory {
  label!: IntlString
}

@Model(templates.class.TemplateField, core.class.Doc, DOMAIN_MODEL)
export class TTemplateField extends TDoc implements TemplateField {
  category!: Ref<TemplateFieldCategory>
  label!: IntlString
  func!: Resource<TemplateFieldFunc>
}

export function createModel (builder: Builder): void {
  builder.createModel(TMessageTemplate, TTemplateFieldCategory, TTemplateField, TTemplateCategory)

  builder.createDoc(
    setting.class.WorkspaceSettingCategory,
    core.space.Model,
    {
      name: 'message-templates',
      label: templates.string.Templates,
      icon: templates.icon.Templates,
      component: templates.component.Templates,
      group: 'settings-editor',
      secured: false,
      order: 3500
    },
    templates.ids.Templates
  )

  builder.createDoc(
    textEditor.class.RefInputActionItem,
    core.space.Model,
    {
      label: templates.string.Templates,
      icon: templates.icon.Template,
      action: templates.action.ShowTemplates,
      order: 5000
    },
    templates.ids.TemplatePopupAction
  )

  createAction(
    builder,
    {
      action: view.actionImpl.ShowPopup,
      actionProps: {
        component: templates.component.Copy,
        element: 'top',
        fillProps: {
          _object: 'value'
        }
      },
      label: templates.string.Copy,
      icon: templates.icon.Copy,
      input: 'focus',
      inline: true,
      category: templates.category.MessageTemplate,
      target: templates.class.MessageTemplate,
      context: { mode: 'context', group: 'create' }
    },
    templates.action.Copy
  )

  createAction(
    builder,
    {
      action: view.actionImpl.ShowPopup,
      actionProps: {
        element: 'top',
        fillProps: {
          _object: 'object'
        },
        component: templates.component.EditGroup
      },
      label: view.string.Open,
      input: 'focus',
      icon: view.icon.Open,
      category: templates.category.MessageTemplate,
      target: templates.class.TemplateCategory,
      keyBinding: ['keyE'],
      context: {
        mode: ['browser', 'context'],
        group: 'create'
      },
      override: [view.action.Open]
    },
    templates.action.EditGroup
  )

  createAction(
    builder,
    {
      action: view.actionImpl.ShowPopup,
      actionProps: {
        component: templates.component.Move,
        element: 'top',
        fillProps: {
          _object: 'value'
        }
      },
      keyBinding: ['keyM'],
      label: view.string.Move,
      icon: view.icon.Move,
      input: 'focus',
      inline: true,
      category: templates.category.MessageTemplate,
      target: templates.class.MessageTemplate,
      context: { mode: 'context', group: 'create' }
    },
    templates.action.Move
  )

  builder.mixin(templates.class.MessageTemplate, core.class.Class, view.mixin.IgnoreActions, {
    actions: [view.action.Open, tracker.action.NewRelatedIssue]
  })
}
