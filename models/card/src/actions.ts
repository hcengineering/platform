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

import { type Builder } from '@hcengineering/model'
import presentation from '@hcengineering/model-presentation'
import setting from '@hcengineering/model-setting'
import view, { actionTemplates, createAction } from '@hcengineering/model-view'
import workbench from '@hcengineering/model-workbench'
import card from './plugin'

export function createActions (builder: Builder): void {
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

  createAction(builder, {
    action: view.actionImpl.CopyDocumentMarkdown,
    actionProps: {
      contentClass: card.class.Card,
      contentField: 'content'
    },
    label: view.string.CopyDocumentMarkdown,
    icon: view.icon.Print,
    input: 'any',
    category: card.category.Card,
    target: card.class.Card,
    query: {},
    context: {
      mode: ['context', 'browser'],
      group: 'tools'
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

  createAction(builder, {
    ...actionTemplates.move,
    input: 'any',
    target: card.class.Card,
    context: {
      mode: ['context', 'browser'],
      group: 'edit'
    }
  })

  createAction(
    builder,
    {
      action: card.actionImpl.DuplicateCard,
      label: card.string.Duplicate,
      icon: card.icon.Duplicate,
      input: 'focus',
      category: card.category.Card,
      target: card.class.Card,
      context: {
        mode: ['context', 'browser'],
        application: card.app.Card,
        group: 'associate'
      }
    },
    card.action.Duplicate
  )
}
