import { Card } from '@anticrm/board'
import { Asset, IntlString } from '@anticrm/platform'
import { AnySvelteComponent } from '@anticrm/ui'

export interface CardActionGroup {
  actions: CardAction[]
  hint?: IntlString
  label: IntlString
}

export interface CardAction {
  hint?: IntlString
  icon: Asset | AnySvelteComponent
  isTransparent?: boolean
  label: IntlString
  handler?: (card: Card) => void
}
