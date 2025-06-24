import type { Resources } from '@hcengineering/platform'
import Settings from './components/Settings.svelte'

// export * from './utils'

export default async (): Promise<Resources> => ({
  component: {
    Settings
  }
})
