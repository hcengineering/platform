//
// Copyright © 2024 Hardcore Engineering Inc.
//
import { type Doc } from '@hcengineering/core'
import { type Resources } from '@hcengineering/platform'
import { showPopup } from '@hcengineering/ui'
import { getPrintBaseURL } from '@hcengineering/print'

import PrintToPDF from './components/PrintToPDF.svelte'
import DOCXViewer from './components/DOCXViewer.svelte'

export async function print (
  object: Doc,
  evt: Event,
  props: {
    signed: boolean
  }
): Promise<void> {
  const signed = props?.signed ?? false

  showPopup(
    PrintToPDF,
    {
      object,
      signed
    },
    'float'
  )
}

export async function canPrint (): Promise<boolean> {
  let printURL = ''
  try {
    printURL = getPrintBaseURL()
  } catch (err) {
    // do nothing
  }

  return printURL?.length > 0
}

export default async (): Promise<Resources> => ({
  component: {
    PrintToPDF,
    DOCXViewer
  },
  actionImpl: {
    Print: print
  },
  function: {
    CanPrint: canPrint,
    CanConvert: canPrint
  }
})
