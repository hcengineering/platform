//
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
//

import { getEventPositionElement, showPopup } from '@hcengineering/ui'
import { type Editor } from '@tiptap/core'
import ColorPicker from './popups/ColorPicker.svelte'
import { type ActionContext } from '@hcengineering/text-editor'

export interface BackgroundColorOptions {
  types: string[]
}

interface ColorSpec {
  color: string
  preview?: string
}

function colorVar (tag: string, prefix = 'text'): string {
  return `var(--theme-text-editor-palette-${prefix}-${tag})`
}

function colorSpec (tag: string, prefix = 'text'): ColorSpec {
  const color = colorVar(tag, prefix)
  return { color, preview: colorVar(tag) }
}

const palette = {
  background: [
    { color: 'transparent' },
    colorSpec('gray', 'bg'),
    colorSpec('brown', 'bg'),
    colorSpec('orange', 'bg'),
    colorSpec('yellow', 'bg'),
    colorSpec('green', 'bg'),
    colorSpec('blue', 'bg'),
    colorSpec('purple', 'bg'),
    colorSpec('pink', 'bg'),
    colorSpec('red', 'bg')
  ],
  text: [
    { color: 'var(--theme-text-color-primary)' },
    colorSpec('gray'),
    colorSpec('brown'),
    colorSpec('orange'),
    colorSpec('yellow'),
    colorSpec('green'),
    colorSpec('blue'),
    colorSpec('purple'),
    colorSpec('pink'),
    colorSpec('red')
  ]
}

export async function openBackgroundColorOptions (editor: Editor, event: MouseEvent): Promise<void> {
  console.log(palette)
  await new Promise<void>((resolve) => {
    showPopup(ColorPicker, { palette: palette.background }, getEventPositionElement(event), (val) => {
      const color: string | undefined = val?.color
      if (color === undefined) return

      if (color === 'transparent') {
        editor.commands.unsetBackgroundColor()
      } else {
        editor.commands.setBackgroundColor(color)
      }
      resolve()
    })
  })
}

export async function openTextColorOptions (editor: Editor, event: MouseEvent): Promise<void> {
  await new Promise<void>((resolve) => {
    showPopup(ColorPicker, { palette: palette.text }, getEventPositionElement(event), (val) => {
      const color: string | undefined = val?.color
      if (color === undefined) return

      if (color === 'var(--theme-text-color-primary)') {
        editor.commands.unsetTextColor()
      } else {
        editor.commands.setTextColor(color)
      }
      resolve()
    })
  })
}

export async function isTextStylingEnabled (editor: Editor, context: ActionContext): Promise<boolean> {
  return editor.isEditable && editor.commands.setTextColor !== undefined
}
