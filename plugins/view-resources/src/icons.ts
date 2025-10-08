import view from '@hcengineering/view'
import core from '@hcengineering/core'
import type { Asset } from '@hcengineering/platform'

export const iconsLibrary: Asset[] = Object.values(core.icon).concat(Object.values(view.icon))
