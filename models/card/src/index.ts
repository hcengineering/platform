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

import activity from '@hcengineering/activity'
import { cardId, type Card, type MasterTag, type Tag } from '@hcengineering/card'
import chunter from '@hcengineering/chunter'
import core, {
  AccountRole,
  type CollectionSize,
  type Domain,
  type MarkupBlobRef,
  type Rank,
  type Ref
} from '@hcengineering/core'
import {
  Collection,
  Model,
  Prop,
  TypeCollaborativeDoc,
  TypeRef,
  TypeString,
  UX,
  type Builder
} from '@hcengineering/model'
import attachment from '@hcengineering/model-attachment'
import { TClass, TDoc, TMixin } from '@hcengineering/model-core'
import presentation from '@hcengineering/model-presentation'
import setting from '@hcengineering/model-setting'
import view, { createAction } from '@hcengineering/model-view'
import workbench from '@hcengineering/model-workbench'
import { getEmbeddedLabel } from '@hcengineering/platform'
import time, { type ToDo } from '@hcengineering/time'
import card from './plugin'

export { cardId } from '@hcengineering/card'

const DOMAIN_CARD = 'card' as Domain

@Model(card.class.MasterTag, core.class.Class)
export class TMasterTag extends TClass implements MasterTag {}

@Model(card.class.Tag, core.class.Mixin)
export class TTag extends TMixin implements Tag {}

@Model(card.class.Card, core.class.Doc, DOMAIN_CARD)
@UX(card.string.Card)
export class TCard extends TDoc implements Card {
  @Prop(TypeRef(card.class.MasterTag), card.string.MasterTag)
  declare _class: Ref<MasterTag>

  @Prop(TypeString(), core.string.Name)
    title!: string

  @Prop(TypeCollaborativeDoc(), card.string.Content)
    content!: MarkupBlobRef

  parent?: Ref<Card> | null

  @Prop(Collection(attachment.class.Attachment), attachment.string.Attachments, { shortLabel: attachment.string.Files })
    attachments?: number

  rank!: Rank

  @Prop(Collection(time.class.ToDo), getEmbeddedLabel('Action Items'))
    todos?: CollectionSize<ToDo>
}

export function createModel (builder: Builder): void {
  builder.createModel(TMasterTag, TTag, TCard)

  builder.createDoc(
    workbench.class.Application,
    core.space.Model,
    {
      label: card.string.CardApplication,
      icon: card.icon.Card,
      accessLevel: AccountRole.User,
      alias: cardId,
      hidden: false,
      locationResolver: card.resolver.Location,
      locationDataResolver: card.resolver.LocationData,
      component: card.component.Main
    },
    card.app.Card
  )

  builder.createDoc(
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: card.class.Card,
      descriptor: view.viewlet.Table,
      configOptions: {
        hiddenKeys: ['description', 'title']
      },
      config: [
        '',
        '_class',
        { key: '', presenter: view.component.RolePresenter, label: card.string.Tags, props: { fullSize: true } },
        'modifiedOn'
      ]
    },
    card.viewlet.CardTable
  )

  builder.createDoc(
    setting.class.WorkspaceSettingCategory,
    core.space.Model,
    {
      name: 'masterTags',
      label: card.string.Tags,
      icon: card.icon.Tags,
      role: AccountRole.User,
      component: card.component.MasterTags,
      order: 4400
    },
    card.ids.MasterTags
  )

  builder.mixin(card.class.Card, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: card.component.CardPresenter
  })

  builder.mixin(card.class.Card, core.class.Class, activity.mixin.ActivityDoc, {})

  builder.createDoc(activity.class.ActivityExtension, core.space.Model, {
    ofClass: card.class.Card,
    components: { input: { component: chunter.component.ChatMessageInput } }
  })

  builder.mixin(card.class.Card, core.class.Class, setting.mixin.Editable, {
    value: false
  })

  builder.mixin(card.class.Card, core.class.Class, view.mixin.ObjectPanel, {
    component: card.component.EditCard
  })

  builder.mixin(card.class.Card, core.class.Class, view.mixin.ObjectEditor, {
    editor: card.component.EditCard
  })

  builder.mixin(card.class.Card, core.class.Class, view.mixin.ObjectTitle, {
    titleProvider: card.function.CardTitleProvider
  })

  builder.mixin(card.class.Card, core.class.Class, view.mixin.ObjectIdentifier, {
    provider: card.function.CardIdProvider
  })

  builder.mixin(card.class.Card, core.class.Class, view.mixin.LinkProvider, {
    encode: card.function.GetCardLink
  })

  createAction(builder, {
    action: view.actionImpl.ShowPopup,
    actionProps: {
      component: card.component.CreateTag,
      props: {
        _class: card.class.Tag
      },
      fillProps: {
        _object: 'parent'
      }
    },
    label: card.string.CreateTag,
    input: 'focus',
    icon: view.icon.Add,
    category: setting.category.Settings,
    target: card.class.MasterTag,
    context: {
      mode: ['context', 'browser'],
      group: 'edit'
    }
  })

  createAction(builder, {
    action: view.actionImpl.ShowPopup,
    actionProps: {
      component: card.component.CreateTag,
      props: {
        _class: card.class.Tag
      },
      fillProps: {
        _object: 'parent'
      }
    },
    label: card.string.CreateTag,
    input: 'focus',
    icon: view.icon.Add,
    category: setting.category.Settings,
    target: card.class.Tag,
    context: {
      mode: ['context', 'browser'],
      group: 'edit'
    }
  })

  builder.mixin(card.class.MasterTag, core.class.Class, view.mixin.IgnoreActions, {
    actions: [setting.action.CreateMixin, view.action.OpenInNewTab]
  })

  builder.mixin(card.class.Tag, core.class.Class, view.mixin.IgnoreActions, {
    actions: [setting.action.CreateMixin, view.action.OpenInNewTab]
  })

  createAction(builder, {
    action: view.actionImpl.ShowPopup,
    actionProps: {
      component: card.component.CreateTag,
      props: {
        _class: card.class.MasterTag
      },
      fillProps: {
        _object: 'parent'
      }
    },
    label: card.string.CreateMasterTag,
    input: 'focus',
    icon: card.icon.MasterTag,
    category: setting.category.Settings,
    target: card.class.MasterTag,
    context: {
      mode: ['context', 'browser'],
      group: 'edit'
    }
  })

  builder.mixin(card.class.Card, core.class.Class, view.mixin.ClassFilters, {
    filters: [],
    ignoreKeys: ['parent']
  })

  builder.createDoc(
    presentation.class.ObjectSearchCategory,
    core.space.Model,
    {
      icon: card.icon.Card,
      label: card.string.SearchCard,
      title: card.string.Cards,
      query: card.completion.CardQuery,
      context: ['search', 'mention', 'spotlight'],
      classToSearch: card.class.Card,
      priority: 500
    },
    card.completion.CardCategory
  )
}

export default card
