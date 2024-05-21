import { type AnySvelteComponent, ModernPopup, showPopup } from '@hcengineering/ui'
import { handleSvg } from './icons'

export interface OptionItem {
  id: string
  icon: AnySvelteComponent
  label: string
  action: () => void
}

export function createCellsHandle (options: OptionItem[]): HTMLElement {
  const handle = document.createElement('div')

  const button = document.createElement('button')
  button.innerHTML = handleSvg
  button.addEventListener('click', () => {
    button.classList.add('pressed')
    showPopup(ModernPopup, { items: options }, button, (result) => {
      const option = options.find((it) => it.id === result)
      if (option !== undefined) {
        option.action()
      }
      button.classList.remove('pressed')
    })
  })

  handle.appendChild(button)

  return handle
}
