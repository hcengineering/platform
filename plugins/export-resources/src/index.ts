//
// Copyright © 2024 Hardcore Engineering Inc.
//
import { type Resources } from '@hcengineering/platform'
import ExportButton from './components/ExportButton.svelte'
import ExportSettings from './components/ExportSettings.svelte'

export default async (): Promise<Resources> => ({
  component: {
    ExportButton,
    ExportSettings
  }
})
