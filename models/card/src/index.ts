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
import { cardId, DOMAIN_CARD, type Card, type MasterTag, type ParentInfo, type Tag } from '@hcengineering/card'
import chunter from '@hcengineering/chunter'
import core, {
  AccountRole,
  ClassifierKind,
  DOMAIN_MODEL,
  IndexKind,
  SortingOrder,
  type Blobs,
  type CollectionSize,
  type MarkupBlobRef,
  type Rank,
  type Ref
} from '@hcengineering/core'
import {
  Collection,
  Index,
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
import { type Asset, getEmbeddedLabel, type IntlString } from '@hcengineering/platform'
import time, { type ToDo } from '@hcengineering/time'
import { type AnyComponent } from '@hcengineering/ui/src/types'
import { type BuildModelKey } from '@hcengineering/view'
import card from './plugin'

export { cardId } from '@hcengineering/card'

@Model(card.class.MasterTag, core.class.Class)
export class TMasterTag extends TClass implements MasterTag {
  color?: number
  removed?: boolean
}

@Model(card.class.Tag, core.class.Mixin)
export class TTag extends TMixin implements Tag {
  color?: number
}

@Model(card.class.Card, core.class.Doc, DOMAIN_CARD)
@UX(card.string.Card, card.icon.Card)
export class TCard extends TDoc implements Card {
  @Prop(TypeRef(card.class.MasterTag), card.string.MasterTag)
  declare _class: Ref<MasterTag>

  @Prop(TypeString(), core.string.Name)
  @Index(IndexKind.FullText)
    title!: string

  @Prop(TypeCollaborativeDoc(), card.string.Content)
    content!: MarkupBlobRef

  blobs!: Blobs

  @Prop(TypeRef(card.class.Card), card.string.Parent)
    parent?: Ref<Card> | null

  @Prop(Collection(attachment.class.Attachment), attachment.string.Attachments, { shortLabel: attachment.string.Files })
    attachments?: number

  rank!: Rank

  @Prop(Collection(time.class.ToDo), getEmbeddedLabel('Action Items'))
    todos?: CollectionSize<ToDo>

  children?: number

  parentInfo!: ParentInfo[]
}

@Model(card.class.MasterTagEditorSection, core.class.Doc, DOMAIN_MODEL)
export class MasterTagEditorSection extends TDoc implements MasterTagEditorSection {
  id!: string
  label!: IntlString
  component!: AnyComponent
}

export * from './migration'

const listConfig: (BuildModelKey | string)[] = [
  { key: '', props: { showParent: true }, displayProps: { fixed: 'left', key: 'card' } },
  { key: '_class', displayProps: { fixed: 'left', key: 'type' } },
  { key: '', displayProps: { grow: true } },
  {
    key: '',
    presenter: view.component.RolePresenter,
    label: card.string.Tags,
    props: { fullSize: true },
    displayProps: { key: 'tags', fixed: 'right' }
  },
  {
    key: 'modifiedOn',
    displayProps: { fixed: 'right', dividerBefore: true }
  }
]

export function createSystemType (
  builder: Builder,
  type: Ref<MasterTag>,
  label: IntlString,
  icon: Asset = card.icon.MasterTag
): void {
  builder.createDoc(
    card.class.MasterTag,
    core.space.Model,
    {
      label,
      extends: card.class.Card,
      icon,
      kind: ClassifierKind.CLASS
    },
    type
  )

  builder.createDoc(view.class.Viewlet, core.space.Model, {
    attachTo: type,
    descriptor: view.viewlet.List,
    viewOptions: {
      groupBy: ['_class', 'createdBy', 'modifiedBy'],
      orderBy: [
        ['modifiedOn', SortingOrder.Descending],
        ['rank', SortingOrder.Ascending]
      ],
      other: []
    },
    configOptions: {
      hiddenKeys: ['content', 'title']
    },
    config: listConfig
  })

  builder.mixin(type, card.class.MasterTag, setting.mixin.Editable, {
    value: false
  })

  builder.createDoc(view.class.Viewlet, core.space.Model, {
    attachTo: type,
    descriptor: view.viewlet.Table,
    configOptions: {
      hiddenKeys: ['content', 'title']
    },
    config: [
      '',
      '_class',
      { key: '', presenter: view.component.RolePresenter, label: card.string.Tags, props: { fullSize: true } },
      'modifiedOn'
    ]
  })
}

export function createModel (builder: Builder): void {
  builder.createModel(TMasterTag, TTag, TCard, MasterTagEditorSection)

  createSystemType(builder, card.types.File, attachment.string.File, card.icon.File)
  createSystemType(builder, card.types.Document, card.string.Document, card.icon.Document)

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

  createAction(
    builder,
    {
      action: view.actionImpl.ShowPopup,
      actionProps: {
        component: card.component.SetParentActionPopup,
        element: 'top',
        fillProps: {
          _objects: 'value'
        }
      },
      label: card.string.SetParent,
      icon: card.icon.MasterTag,
      input: 'none',
      category: card.category.Card,
      target: card.class.Card,
      context: {
        mode: ['context'],
        application: card.app.Card,
        group: 'associate'
      }
    },
    card.action.SetParent
  )

  builder.mixin(card.class.Card, core.class.Class, view.mixin.AttributeEditor, {
    inlineEditor: card.component.CardEditor
  })

  createAction(
    builder,
    {
      action: view.actionImpl.UpdateDocument,
      actionProps: {
        key: 'parent',
        value: null
      },
      query: {
        parent: { $ne: null, $exists: true }
      },
      label: card.string.UnsetParent,
      icon: card.icon.MasterTag,
      input: 'none',
      category: card.category.Card,
      target: card.class.Card,
      context: {
        mode: ['context'],
        application: card.app.Card,
        group: 'associate'
      }
    },
    card.action.UnsetParent
  )

  builder.createDoc(
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: card.class.Card,
      descriptor: view.viewlet.Table,
      configOptions: {
        hiddenKeys: ['content', 'title']
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
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: card.class.Card,
      descriptor: view.viewlet.List,
      viewOptions: {
        groupBy: ['_class', 'createdBy', 'modifiedBy'],
        orderBy: [
          ['modifiedOn', SortingOrder.Descending],
          ['rank', SortingOrder.Ascending]
        ],
        other: []
      },
      configOptions: {
        hiddenKeys: ['content', 'title']
      },
      config: listConfig
    },
    card.viewlet.CardList
  )

  builder.createDoc(
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: card.class.Card,
      descriptor: view.viewlet.List,
      variant: 'child',
      viewOptions: {
        groupBy: ['_class', 'createdBy', 'modifiedBy'],
        orderBy: [
          ['modifiedOn', SortingOrder.Descending],
          ['rank', SortingOrder.Ascending]
        ],
        other: []
      },
      configOptions: {
        strict: true,
        hiddenKeys: ['content', 'title']
      },
      config: listConfig
    },
    card.viewlet.CardChildList
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
    actions: [setting.action.CreateMixin, view.action.OpenInNewTab, view.action.Delete, setting.action.DeleteMixin]
  })

  builder.mixin(card.class.Tag, core.class.Class, view.mixin.IgnoreActions, {
    actions: [setting.action.CreateMixin, view.action.OpenInNewTab, view.action.Delete, setting.action.DeleteMixin]
  })

  createAction(
    builder,
    {
      action: card.actionImpl.DeleteMasterTag,
      label: workbench.string.Delete,
      icon: view.icon.Delete,
      input: 'any',
      category: view.category.General,
      target: card.class.MasterTag,
      context: {
        mode: ['context', 'browser'],
        group: 'remove'
      }
    },
    card.action.DeleteMasterTag
  )

  createAction(builder, {
    action: card.actionImpl.DeleteMasterTag,
    label: workbench.string.Delete,
    icon: view.icon.Delete,
    input: 'any',
    category: view.category.General,
    target: card.class.Tag,
    context: {
      mode: ['context', 'browser'],
      group: 'remove'
    }
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

  builder.createDoc(
    setting.class.WorkspaceSettingCategory,
    core.space.Model,
    {
      name: 'tagrelation',
      label: card.string.TagRelations,
      icon: setting.icon.Relations,
      component: card.component.RelationSetting,
      group: 'settings-editor',
      role: AccountRole.Maintainer,
      order: 4501
    },
    card.ids.TagRelations
  )

  builder.createDoc(
    setting.class.SettingsCategory,
    core.space.Model,
    {
      name: 'types',
      label: card.string.MasterTags,
      icon: card.icon.Card,
      component: card.component.ManageMasterTagsContent,
      extraComponents: {
        navigation: card.component.ManageMasterTags,
        tools: card.component.ManageMasterTagsTools
      },
      group: 'settings-editor',
      role: AccountRole.User,
      order: 5000,
      expandable: true
    },
    card.ids.ManageMasterTags
  )

  builder.mixin(card.class.Card, core.class.Class, view.mixin.ClassFilters, {
    filters: [],
    ignoreKeys: ['parent']
  })

  builder.createDoc(core.class.FullTextSearchContext, core.space.Model, {
    toClass: card.class.Card,
    fullTextSummary: true,
    forceIndex: true,
    childProcessingAllowed: true,
    propagate: []
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
      includeChilds: true,
      priority: 500
    },
    card.completion.CardCategory
  )

  builder.createDoc(card.class.MasterTagEditorSection, core.space.Model, {
    id: 'general',
    label: setting.string.General,
    component: card.component.GeneralSection
  })

  builder.createDoc(card.class.MasterTagEditorSection, core.space.Model, {
    id: 'properties',
    label: setting.string.Properties,
    component: card.component.ProperitiesSection
  })

  builder.createDoc(card.class.MasterTagEditorSection, core.space.Model, {
    id: 'tags',
    label: card.string.Tags,
    component: card.component.TagsSection
  })

  builder.createDoc(card.class.MasterTagEditorSection, core.space.Model, {
    id: 'childs',
    label: card.string.MasterTags,
    masterOnly: true,
    component: card.component.ChildsSection
  })

  builder.createDoc(card.class.MasterTagEditorSection, core.space.Model, {
    id: 'relations',
    label: core.string.Relations,
    component: card.component.RelationsSection
  })

  builder.createDoc(card.class.MasterTagEditorSection, core.space.Model, {
    id: 'views',
    label: card.string.Views,
    component: card.component.ViewsSection
  })
}

export default card
