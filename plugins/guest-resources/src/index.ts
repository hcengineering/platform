import { type Resources } from '@hcengineering/platform'
import CreatePublicLink from './components/CreatePublicLink.svelte'
import GuestApp from './components/GuestApp.svelte'

export default async (): Promise<Resources> => ({
  component: {
    GuestApp,
    CreatePublicLink
  }
})
