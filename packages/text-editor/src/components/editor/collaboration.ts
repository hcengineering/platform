//
// Copyright © 2023 Hardcore Engineering Inc.
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

import { type DecorationAttrs } from '@tiptap/pm/view'
import { showTooltip } from '@hcengineering/ui'
import { type CollaborationUser } from '../../types'
import CollaborationUserPopup from '../CollaborationUserPopup.svelte'

export const renderCursor = (user: CollaborationUser): HTMLElement => {
  const cursor = document.createElement('span')

  cursor.classList.add('collaboration-cursor__caret')
  cursor.setAttribute('style', `border-color: ${user.color}`)

  cursor.addEventListener('mousemove', () => {
    showTooltip(undefined, cursor, 'top', CollaborationUserPopup, { user })
  })

  return cursor
}

export const noSelectionRender = (_user: CollaborationUser): DecorationAttrs => ({})
