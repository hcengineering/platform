//
// Copyright © 2024 Hardcore Engineering Inc.
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

import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { type EditorView } from '@tiptap/pm/view'
import { type Asset, getMetadata } from '@hcengineering/platform'
import { SelectPopup, getEventPositionElement, showPopup } from '@hcengineering/ui'

export interface LeftMenuOptions {
  width: number
  height: number
  marginX: number
  className: string
  icon: Asset
  iconProps: any
  items: Array<{ id: string, label: string, icon: Asset }>
  handleSelect: (id: string, pos: number, event: MouseEvent) => Promise<void>
}

function nodeDOMAtCoords (coords: { x: number, y: number }): Element | undefined {
  return document
    .elementsFromPoint(coords.x, coords.y)
    .find((elem: Element) => elem.parentElement?.matches?.('.ProseMirror') === true)
}

function posAtLeftMenuElement (view: EditorView, leftMenuElement: HTMLElement, offsetX: number): number {
  const rect = leftMenuElement.getBoundingClientRect()

  const position = view.posAtCoords({
    left: rect.left + offsetX,
    top: rect.top + rect.height / 2
  })

  if (position === null) {
    return -1
  }

  return position.inside >= 0 ? position.inside : position.pos
}

function LeftMenu (options: LeftMenuOptions): Plugin {
  let leftMenuElement: HTMLElement | null = null
  const offsetX = options.width + options.marginX

  function hideLeftMenu (): void {
    if (leftMenuElement !== null) {
      leftMenuElement.classList.add('hidden')
    }
  }

  function showLeftMenu (): void {
    if (leftMenuElement !== null) {
      leftMenuElement.classList.remove('hidden')
    }
  }

  return new Plugin({
    key: new PluginKey('left-menu'),
    view: (view) => {
      leftMenuElement = document.createElement('div')
      leftMenuElement.classList.add(options.className) // Style externally with CSS
      leftMenuElement.style.position = 'absolute'

      const svgNs = 'http://www.w3.org/2000/svg'
      const icon = document.createElementNS(svgNs, 'svg')
      const { className: iconClassName, ...restIconProps } = options.iconProps
      icon.classList.add(iconClassName)
      Object.entries(restIconProps).forEach(([key, value]) => {
        icon.setAttribute(key, value as string)
      })

      const use = document.createElementNS(svgNs, 'use')
      const href = getMetadata(options.icon)

      if (href !== undefined) {
        use.setAttributeNS('http://www.w3.org/1999/xlink', 'href', href)
      }

      icon.appendChild(use)
      leftMenuElement.appendChild(icon)

      leftMenuElement.addEventListener('mousedown', (e) => {
        // Prevent default in order for the popup to take focus for keyboard events
        e.preventDefault()
        e.stopPropagation()
        showPopup(
          SelectPopup,
          {
            value: options.items
          },
          getEventPositionElement(e),
          (val) => {
            if (leftMenuElement === null) return
            const pos = posAtLeftMenuElement(view, leftMenuElement, offsetX)

            void options.handleSelect(val, pos, e)
          }
        )
      })

      view?.dom?.parentElement?.appendChild(leftMenuElement)

      return {
        destroy: () => {
          leftMenuElement?.remove?.()
          leftMenuElement = null
        }
      }
    },
    props: {
      handleDOMEvents: {
        mousemove: (view, event) => {
          if (!view.editable) {
            return
          }

          const node = nodeDOMAtCoords({
            x: event.clientX + offsetX,
            y: event.clientY
          })

          if (!(node instanceof HTMLElement)) {
            hideLeftMenu()
            return
          }

          const parent = node?.parentElement
          if (!(parent instanceof HTMLElement)) {
            hideLeftMenu()
            return
          }

          const compStyle = window.getComputedStyle(node)
          const lineHeight = parseInt(compStyle.lineHeight, 10)
          const paddingTop = parseInt(compStyle.paddingTop, 10)

          // For some reason the offsetTop value for all elements is shifted by the first element's margin
          // so taking it into account here
          let firstMargin = 0
          const firstChild = parent.firstChild
          if (firstChild !== null) {
            const firstChildCompStyle = window.getComputedStyle(firstChild as HTMLElement)
            firstMargin = parseInt(firstChildCompStyle.marginTop, 10)
          }

          const left = -offsetX
          let top = node.offsetTop
          top += (lineHeight - options.height) / 2
          top += paddingTop
          top += firstMargin

          if (leftMenuElement === null) return

          leftMenuElement.style.left = `${left}px`
          leftMenuElement.style.top = `${top}px`

          showLeftMenu()
        },
        keydown: () => {
          hideLeftMenu()
        },
        mousewheel: () => {
          hideLeftMenu()
        }
      }
    }
  })
}

/*
 * @public
 */
export const LeftMenuExtension = Extension.create<LeftMenuOptions>({
  name: 'leftMenu',

  addProseMirrorPlugins () {
    return [LeftMenu(this.options)]
  }
})
