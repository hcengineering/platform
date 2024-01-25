<!--
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
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import { PDFViewer, getFileUrl } from '@hcengineering/presentation'
  import { IconExpand, IconMoreH, IconSize, SelectPopup, getEventPositionElement, showPopup } from '@hcengineering/ui'
  import { Editor } from '@tiptap/core'
  import IconAlignCenter from './icons/AlignCenter.svelte'
  import IconAlignLeft from './icons/AlignLeft.svelte'
  import IconAlignRight from './icons/AlignRight.svelte'
  import IconScaleOut from './icons/ScaleOut.svelte'
  import StyleButton from './StyleButton.svelte'
  import plugin from '../plugin'

  export let formatButtonSize: IconSize = 'small'
  export let textEditor: Editor

  const dispatch = createEventDispatcher()

  function getImageAlignmentToggler (align: 'center' | 'left' | 'right') {
    return () => {
      textEditor.commands.setImageAlignment({ align })
      dispatch('focus')
    }
  }

  function openImage (): void {
    const attributes = textEditor.getAttributes('image')
    const fileId = attributes['file-id'] ?? attributes.src
    const fileName = attributes.alt ?? ''
    showPopup(
      PDFViewer,
      { file: fileId, name: fileName, contentType: 'image/*', fullSize: true, showIcon: false },
      'centered',
      () => {
        dispatch('focus')
      }
    )
  }

  function openOriginalImage (): void {
    const attributes = textEditor.getAttributes('image')
    const fileId = attributes['file-id'] ?? attributes.src
    const url = getFileUrl(fileId, 'full')
    window.open(url, '_blank')
  }

  function moreOptions (event: MouseEvent): void {
    const widthActions = ['25%', '50%', '75%', '100%', plugin.string.Unset].map((it) => {
      return {
        id: `#imageWidth${it}`,
        label: it === plugin.string.Unset ? it : getEmbeddedLabel(it),
        action: () =>
          textEditor.commands.setImageSize({ width: it === plugin.string.Unset ? undefined : it, height: undefined }),
        category: {
          label: plugin.string.Width
        }
      }
    })

    const actions = [...widthActions]

    showPopup(
      SelectPopup,
      {
        value: actions
      },
      getEventPositionElement(event),
      (val) => {
        if (val !== undefined) {
          const op = actions.find((it) => it.id === val)
          if (op !== undefined) {
            op.action()
            dispatch('focus')
          }
        }
      }
    )
  }
</script>

{#if textEditor}
  {#if textEditor.isActive('image')}
    <StyleButton
      icon={IconAlignLeft}
      size={formatButtonSize}
      selected={textEditor.isActive('image', { align: 'left' })}
      showTooltip={{ label: plugin.string.AlignLeft }}
      on:click={getImageAlignmentToggler('left')}
    />
    <StyleButton
      icon={IconAlignCenter}
      size={formatButtonSize}
      selected={textEditor.isActive('image', { align: 'center' })}
      showTooltip={{ label: plugin.string.AlignCenter }}
      on:click={getImageAlignmentToggler('center')}
    />
    <StyleButton
      icon={IconAlignRight}
      size={formatButtonSize}
      selected={textEditor.isActive('image', { align: 'right' })}
      showTooltip={{ label: plugin.string.AlignRight }}
      on:click={getImageAlignmentToggler('right')}
    />
    <div class="buttons-divider" />
    <StyleButton
      icon={IconScaleOut}
      size={formatButtonSize}
      on:click={openImage}
      showTooltip={{ label: plugin.string.ViewImage }}
    />
    <StyleButton
      icon={IconExpand}
      size={formatButtonSize}
      on:click={openOriginalImage}
      showTooltip={{ label: plugin.string.ViewOriginal }}
    />
    <div class="buttons-divider" />
    <StyleButton
      icon={IconMoreH}
      size={formatButtonSize}
      on:click={moreOptions}
      showTooltip={{ label: plugin.string.MoreActions }}
    />
  {/if}
{/if}
