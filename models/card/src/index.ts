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
import {
  type Card,
  cardId,
  type CardNavigation,
  type CardSection,
  type CardSpace,
  type CardViewDefaults,
  type CreateCardExtension,
  type CanCreateCardResource,
  DOMAIN_CARD,
  type FavoriteCard,
  type MasterTag,
  type ParentInfo,
  type Role,
  type Tag
} from '@hcengineering/card'
import chunter from '@hcengineering/chunter'
import core, {
  AccountRole,
  type Blobs,
  ClassifierKind,
  type CollectionSize,
  DOMAIN_MODEL,
  DOMAIN_SPACE,
  IndexKind,
  type MarkupBlobRef,
  type MixinData,
  type Rank,
  type Ref,
  SortingOrder
} from '@hcengineering/core'
import {
  type Builder,
  Collection,
  Hidden,
  Index,
  Mixin,
  Model,
  Prop,
  TypeCollaborativeDoc,
  TypeNumber,
  TypeRef,
  TypeString,
  UX
} from '@hcengineering/model'
import attachment from '@hcengineering/model-attachment'
import { TAttachedDoc, TClass, TDoc, TMixin, TSpace } from '@hcengineering/model-core'
import { createPublicLinkAction } from '@hcengineering/model-guest'
import presentation from '@hcengineering/model-presentation'
import setting from '@hcengineering/model-setting'
import view, { createAction, type Viewlet } from '@hcengineering/model-view'
import workbench, { WidgetType } from '@hcengineering/model-workbench'
import { type Asset, getEmbeddedLabel, type IntlString, type Resource } from '@hcengineering/platform'
import time, { type ToDo } from '@hcengineering/time'
import { type AnyComponent } from '@hcengineering/ui/src/types'
import { type BuildModelKey } from '@hcengineering/view'
import preference, { TPreference } from '@hcengineering/model-preference'
import card from './plugin'
import { PaletteColorIndexes } from '@hcengineering/ui/src/colors'

export { cardId } from '@hcengineering/card'

@Model(card.class.MasterTag, core.class.Class)
export class TMasterTag extends TClass implements MasterTag {
  color?: number
  background?: number
  removed?: boolean
}

@Model(card.class.Tag, core.class.Mixin)
export class TTag extends TMixin implements Tag {
  color?: number
  background?: number
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

  @Prop(TypeString(), view.string.Icon)
  @Hidden()
    icon?: Asset

  @Prop(TypeNumber(), view.string.Color)
  @Hidden()
    color?: number

  @Hidden()
    readonly?: boolean

  children?: number

  parentInfo!: ParentInfo[]
}

@Model(card.class.CardSpace, core.class.Space, DOMAIN_SPACE)
@UX(core.string.Space)
export class TCardSpace extends TSpace implements CardSpace {
  types!: Ref<MasterTag>[]
}

@Model(card.class.MasterTagEditorSection, core.class.Doc, DOMAIN_MODEL)
export class MasterTagEditorSection extends TDoc implements MasterTagEditorSection {
  id!: string
  label!: IntlString
  component!: AnyComponent
}

@Model(card.class.CardSection, core.class.Doc, DOMAIN_MODEL)
export class TCardSection extends TDoc implements CardSection {
  label!: IntlString
  component!: AnyComponent
  order!: number
  navigation!: CardNavigation[]
  checkVisibility?: Resource<(doc: Card) => Promise<boolean>>
}

@Mixin(card.mixin.CardViewDefaults, card.class.MasterTag)
export class TCardViewDefaults extends TMasterTag implements CardViewDefaults {
  defaultSection!: Ref<CardSection>
  defaultNavigation?: string
}

@Model(card.class.Role, core.class.AttachedDoc, DOMAIN_MODEL)
export class TRole extends TAttachedDoc implements Role {
  name!: string
  declare attachedTo: Ref<MasterTag | Tag>
  declare collection: 'roles'
}

@Model(card.class.FavoriteCard, preference.class.Preference)
export class TFavoriteCard extends TPreference implements FavoriteCard {
  declare attachedTo: Ref<Card>
  application!: string
}

@Mixin(card.mixin.CreateCardExtension, card.class.MasterTag)
export class TCreateCardExtension extends TMasterTag implements CreateCardExtension {
  component?: AnyComponent
  canCreate?: CanCreateCardResource
}

export * from './migration'

const listConfig: (BuildModelKey | string)[] = [
  { key: '' },
  { key: '_class' },
  { key: '', displayProps: { grow: true } },
  {
    key: '',
    presenter: card.component.CardTagsColored,
    label: card.string.Tags,
    props: {
      showType: false
    },
    displayProps: { optional: true }
  },
  {
    key: '',
    presenter: card.component.LabelsPresenter,
    label: card.string.Labels,
    props: { fullSize: true }
  },
  {
    key: 'modifiedOn',
    displayProps: { fixed: 'right', key: 'modifiedOn', dividerBefore: true }
  },
  {
    key: 'modifiedBy',
    props: { kind: 'list', shouldShowName: false, avatarSize: 'x-small' }
  }
]

const favoritesViewletConfig: (BuildModelKey | string)[] = [
  {
    displayProps: {
      fixed: 'left',
      key: '$lookup.attachedTo.createdBy'
    },
    key: '$lookup.attachedTo.createdBy'
  },
  {
    displayProps: {
      fixed: 'left',
      key: ''
    },
    key: '',
    label: view.string.Title,
    props: {
      showParent: false
    }
  },
  { key: '$lookup.attachedTo._class', label: card.string.MasterTag, displayProps: { fixed: 'left', key: '_class' } },
  {
    displayProps: {
      grow: true
    },
    key: ''
  },
  {
    displayProps: {
      fixed: 'left',
      key: 'tags'
    },
    key: '$lookup.attachedTo',
    label: card.string.Tags,
    props: {
      showType: false
    },
    presenter: card.component.CardTagsColored
  },
  {
    key: '$lookup.attachedTo',
    presenter: card.component.LabelsPresenter,
    label: card.string.Labels,
    props: { fullSize: true, key: 'labels' }
  },
  {
    key: '$lookup.attachedTo.parent'
  },
  {
    key: '$lookup.attachedTo.createdOn'
  }
]

export function createSystemType (
  builder: Builder,
  type: Ref<MasterTag>,
  icon: Asset = card.icon.MasterTag,
  label: IntlString,
  pluralLabel?: IntlString,
  viewDefaults?: MixinData<MasterTag, CardViewDefaults>,
  background?: number
): void {
  builder.createDoc(
    card.class.MasterTag,
    core.space.Model,
    {
      label,
      pluralLabel,
      extends: card.class.Card,
      icon,
      kind: ClassifierKind.CLASS,
      background
    },
    type
  )

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
      { key: '', props: { shrink: true } },
      '_class',
      {
        key: '',
        presenter: card.component.CardTagsColored,
        label: card.string.Tags,
        props: {
          showType: false
        }
      },
      {
        key: '',
        presenter: card.component.LabelsPresenter,
        label: card.string.Labels,
        props: { fullSize: true }
      },
      'modifiedOn'
    ]
  })

  builder.createDoc(view.class.Viewlet, core.space.Model, {
    attachTo: type,
    descriptor: view.viewlet.List,
    viewOptions: {
      groupBy: ['_class', 'createdBy', 'modifiedBy', 'parent'],
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

  if (viewDefaults !== undefined) {
    builder.mixin(type, card.class.MasterTag, card.mixin.CardViewDefaults, viewDefaults)
  }
}

export function createModel (builder: Builder): void {
  builder.createModel(
    TMasterTag,
    TTag,
    TCard,
    MasterTagEditorSection,
    TCardSpace,
    TRole,
    TCardSection,
    TCardViewDefaults,
    TFavoriteCard,
    TCreateCardExtension
  )

  defineTabs(builder)

  builder.mixin(card.class.Card, core.class.Class, view.mixin.ObjectIcon, {
    component: card.component.CardIcon
  })

  createSystemType(
    builder,
    card.types.File,
    card.icon.File,
    attachment.string.File,
    attachment.string.Files,
    undefined,
    PaletteColorIndexes.Orchid
  )
  createSystemType(
    builder,
    card.types.Document,
    card.icon.Document,
    card.string.Document,
    card.string.Documents,
    {
      defaultSection: card.section.Content
    },
    PaletteColorIndexes.Arctic
  )

  builder.createDoc(view.class.Viewlet, core.space.Model, {
    attachTo: card.class.CardSpace,
    descriptor: view.viewlet.Table,
    configOptions: {
      hiddenKeys: ['name', 'description']
    },
    config: ['', 'members', 'private', 'archived'],
    viewOptions: {
      groupBy: [],
      orderBy: [],
      other: [
        {
          key: 'hideArchived',
          type: 'toggle',
          defaultValue: true,
          actionTarget: 'options',
          action: view.function.HideArchived,
          label: view.string.HideArchived
        }
      ]
    }
  })

  createAction(builder, {
    action: card.actionImpl.EditSpace,
    label: presentation.string.Edit,
    icon: view.icon.Edit,
    input: 'focus',
    category: view.category.General,
    target: card.class.CardSpace,
    visibilityTester: view.function.CanEditSpace,
    query: {},
    context: {
      mode: ['context', 'browser'],
      group: 'edit'
    }
  })

  createAction(builder, {
    action: view.actionImpl.CopyTextToClipboard,
    actionProps: {
      textProvider: card.function.GetSpaceAccessPublicLink
    },
    label: card.string.GetIndividualPublicLink,
    icon: view.icon.CopyLink,
    input: 'any',
    category: view.category.General,
    target: card.class.CardSpace,
    query: {},
    visibilityTester: card.function.CanGetSpaceAccessPublicLink,
    context: {
      mode: ['context', 'browser']
    }
  })

  builder.mixin(card.class.CardSpace, core.class.Class, workbench.mixin.SpaceView, {
    view: {
      class: card.class.Card,
      component: card.component.Main
    }
  })

  builder.createDoc(
    workbench.class.Application,
    core.space.Model,
    {
      label: card.string.CardApplication,
      icon: card.icon.Card,
      alias: cardId,
      hidden: false,
      locationResolver: card.resolver.Location,
      locationDataResolver: card.resolver.LocationData,
      navigatorModel: {
        specials: [
          {
            id: 'browser',
            label: core.string.Spaces,
            icon: view.icon.List,
            component: workbench.component.SpecialView,
            componentProps: {
              _class: card.class.CardSpace,
              icon: view.icon.List,
              label: core.string.Spaces
            },
            position: 'top'
          }
        ],
        spaces: [
          {
            id: 'spaces',
            label: core.string.Spaces,
            spaceClass: card.class.CardSpace,
            addSpaceLabel: core.string.Space,
            icon: card.icon.Space,
            // intentionally left empty in order to make space presenter working
            specials: []
          }
        ]
      },
      navHeaderComponent: card.component.NewCardHeader
    },
    card.app.Card
  )

  builder.mixin(card.class.CardSpace, core.class.Class, view.mixin.SpacePresenter, {
    presenter: card.component.SpacePresenter
  })

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

  builder.mixin(card.class.Card, core.class.Class, view.mixin.ArrayEditor, {
    inlineEditor: card.component.CardArrayEditor
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
        {
          key: '',
          presenter: card.component.CardTagsColored,
          label: card.string.Tags,
          props: {
            showType: false
          }
        },
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
        groupBy: ['_class', 'createdBy', 'modifiedBy', 'parent'],
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
        groupBy: ['_class', 'createdBy', 'modifiedBy', 'parent'],
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

  builder.createDoc(
    view.class.ViewletDescriptor,
    core.space.Model,
    {
      label: card.string.Feed,
      icon: card.icon.Feed,
      component: card.component.CardFeedView
    },
    card.viewlet.CardFeedDescriptor
  )

  builder.createDoc(
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: card.class.Card,
      descriptor: card.viewlet.CardFeedDescriptor,
      config: []
    },
    card.viewlet.CardFeed
  )

  builder.mixin(card.class.Card, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: card.component.CardPresenter
  })

  builder.mixin(card.class.FavoriteCard, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: card.component.FavoriteCardPresenter
  })

  builder.mixin(card.class.Card, core.class.Class, view.mixin.AttributePresenter, {
    presenter: card.component.CardRefPresenter,
    arrayPresenter: card.component.CardArrayEditor
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
      component: card.component.ChangeType,
      fillProps: {
        _object: 'value'
      }
    },
    label: card.string.ChangeType,
    input: 'focus',
    icon: card.icon.MasterTag,
    category: setting.category.Settings,
    target: card.class.Card,
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
      role: AccountRole.Maintainer,
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
    forceIndex: true
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
    id: 'roles',
    label: core.string.Roles,
    component: card.component.RolesSection
  })

  builder.createDoc(card.class.MasterTagEditorSection, core.space.Model, {
    id: 'views',
    label: card.string.Views,
    component: card.component.ViewsSection
  })

  builder.createDoc(
    workbench.class.Widget,
    core.space.Model,
    {
      label: card.string.Cards,
      type: WidgetType.Flexible,
      icon: card.icon.Card,
      component: card.component.CardWidget,
      tabComponent: card.component.CardWidgetTab
    },
    card.ids.CardWidget
  )
  builder.mixin(card.class.Card, core.class.Class, view.mixin.CustomObjectLinkProvider, {
    match: card.function.CardCustomLinkMatch,
    encode: card.function.CardCustomLinkEncode
  })

  createPublicLinkAction(builder, card.class.Card, card.action.PublicLink)
}

function defineTabs (builder: Builder): void {
  builder.createDoc(
    card.class.CardSection,
    core.space.Model,
    {
      label: card.string.Properties,
      component: card.sectionComponent.PropertiesSection,
      order: 100,
      navigation: []
    },
    card.section.Properties
  )

  builder.createDoc(
    card.class.CardSection,
    core.space.Model,
    {
      label: card.string.Content,
      component: card.sectionComponent.ContentSection,
      order: 200,
      navigation: []
    },
    card.section.Content
  )

  builder.createDoc(
    card.class.CardSection,
    core.space.Model,
    {
      label: card.string.Children,
      component: card.sectionComponent.ChildrenSection,
      order: 400,
      navigation: []
    },
    card.section.Children
  )

  builder.createDoc(
    card.class.CardSection,
    core.space.Model,
    {
      label: attachment.string.Attachments,
      component: card.sectionComponent.AttachmentsSection,
      order: 300,
      navigation: []
    },
    card.section.Attachments
  )

  builder.createDoc(
    card.class.CardSection,
    core.space.Model,
    {
      label: core.string.Relations,
      component: card.sectionComponent.RelationsSection,
      order: 500,
      navigation: [],
      checkVisibility: card.function.CheckRelationsSectionVisibility
    },
    card.section.Relations
  )

  builder.createDoc<Viewlet>(view.class.Viewlet, core.space.Model, {
    attachTo: card.class.FavoriteCard,
    descriptor: view.viewlet.Table,
    viewOptions: {
      groupBy: [],
      orderBy: [
        ['$lookup.attachedTo.modifiedOn', SortingOrder.Descending],
        ['$lookup.attachedTo.title', SortingOrder.Ascending]
      ],
      other: []
    },
    configOptions: {
      hiddenKeys: ['$lookup.attachedTo.content', '$lookup.attachedTo.title', 'attachedTo']
    },
    config: favoritesViewletConfig,
    options: {
      lookup: {
        attachedTo: card.class.Card
      } as any
    }
  })

  builder.createDoc<Viewlet>(view.class.Viewlet, core.space.Model, {
    attachTo: card.class.FavoriteCard,
    descriptor: view.viewlet.List,
    configOptions: {
      hiddenKeys: ['$lookup.attachedTo.content', '$lookup.attachedTo.title', 'attachedTo']
    },
    viewOptions: {
      groupBy: [],
      orderBy: [
        ['$lookup.attachedTo.modifiedOn', SortingOrder.Descending],
        ['$lookup.attachedTo.title', SortingOrder.Ascending]
      ],
      other: []
    },
    config: favoritesViewletConfig,
    options: {
      lookup: {
        attachedTo: card.class.Card
      } as any
    }
  })
}

export default card
