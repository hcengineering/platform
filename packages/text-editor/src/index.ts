import { addStringsLoader } from '@anticrm/platform'
import { textEditorId } from './plugin'

//
export { default as ReferenceInput } from './components/ReferenceInput.svelte'
export { default as TextEditor } from './components/TextEditor.svelte'

export * from '@anticrm/presentation/src/types'

addStringsLoader(textEditorId, async (lang: string) => {
  return await import(`../lang/${lang}.json`)
})

export { default } from './plugin'
