import type { Editor } from '@tiptap/core'
import { type AnySvelteComponent, ModernPopup, showPopup } from '@hcengineering/ui'
import { optionsSvg } from './icons'

export interface OptionItem {
  id: string
  icon: AnySvelteComponent
  label: string
  action: () => void
}

export function createOptionsButton (editor: Editor, options: OptionItem[], className?: string): HTMLElement {
  const button = document.createElement('button')

  button.className = 'table-options-button' + (className !== undefined ? ` ${className}` : '')
  button.innerHTML = optionsSvg

  button.addEventListener('mousedown', () => {
    button.classList.add('pressed')
    showPopup(ModernPopup, { items: options }, button, (result) => {
      const option = options.find((it) => it.id === result)
      if (option !== undefined) {
        option.action()
      }
      button.classList.remove('pressed')
    })
  })

  return button
}
