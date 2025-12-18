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

import core from '@hcengineering/core'
import { type Builder } from '@hcengineering/model'
import card from '.'

export function definePermissions (builder: Builder): void {
  builder.createDoc(
    core.class.Permission,
    core.space.Model,
    {
      label: card.string.AddTagPermission,
      txClass: core.class.TxMixin,
      objectClass: card.class.Card,
      scope: 'space',
      txMatch: {
        attributes: {}
      }
    },
    card.permission.AddTag
  )

  builder.createDoc(
    core.class.Permission,
    core.space.Model,
    {
      label: card.string.RemoveTag,
      txClass: core.class.TxUpdateDoc,
      txMatch: {
        'operations.$unset': {
          $exists: true
        }
      },
      objectClass: card.class.Card,
      scope: 'space'
    },
    card.permission.RemoveTag
  )

  builder.createDoc(
    core.class.Permission,
    core.space.Model,
    {
      label: card.string.CreateCardPermission,
      txClass: core.class.TxCreateDoc,
      objectClass: card.class.Card,
      scope: 'space'
    },
    card.permission.CreateCard
  )

  builder.createDoc(
    core.class.Permission,
    core.space.Model,
    {
      label: card.string.UpdateCard,
      txClass: core.class.TxUpdateDoc,
      objectClass: card.class.Card,
      scope: 'space'
    },
    card.permission.UpdateCard
  )

  builder.createDoc(
    core.class.Permission,
    core.space.Model,
    {
      label: card.string.RemoveCard,
      txClass: core.class.TxRemoveDoc,
      objectClass: card.class.Card,
      scope: 'space'
    },
    card.permission.RemoveCard
  )

  builder.createDoc(
    core.class.Permission,
    core.space.Model,
    {
      label: card.string.ForbidAddTagPermission,
      txClass: core.class.TxMixin,
      objectClass: card.class.Card,
      scope: 'space',
      forbid: true
    },
    card.permission.ForbidAddTag
  )

  builder.createDoc(
    core.class.Permission,
    core.space.Model,
    {
      label: card.string.ForbidRemoveTag,
      txClass: core.class.TxUpdateDoc,
      txMatch: {
        'operations.$unset': {
          $exists: true
        }
      },
      objectClass: card.class.Card,
      scope: 'space',
      forbid: true
    },
    card.permission.ForbidRemoveTag
  )

  builder.createDoc(
    core.class.Permission,
    core.space.Model,
    {
      label: card.string.ForbidCreateCardPermission,
      txClass: core.class.TxCreateDoc,
      objectClass: card.class.Card,
      scope: 'space',
      forbid: true
    },
    card.permission.ForbidCreateCard
  )

  builder.createDoc(
    core.class.Permission,
    core.space.Model,
    {
      label: card.string.ForbidUpdateCard,
      txClass: core.class.TxUpdateDoc,
      objectClass: card.class.Card,
      scope: 'space',
      forbid: true
    },
    card.permission.ForbidUpdateCard
  )

  builder.createDoc(
    core.class.Permission,
    core.space.Model,
    {
      label: card.string.ForbidRemoveCard,
      txClass: core.class.TxRemoveDoc,
      objectClass: card.class.Card,
      scope: 'space',
      forbid: true
    },
    card.permission.ForbidRemoveCard
  )
}
