//
// Copyright © 2024 Hardcore Engineering Inc.
//
import { type IntlString, type Resources } from '@hcengineering/platform'
import ExportButton from './components/ExportButton.svelte'
import ExportSettings from './components/ExportSettings.svelte'

export default async (): Promise<Resources> => ({
  string: {
    Export: '' as IntlString // todo: test, try to remove (check if this mean public)
  },
  component: {
    ExportButton,
    ExportSettings
  }
})
