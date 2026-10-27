// Minimal child controls isolate SignatureDialog's rendered state. StylishEdit is real,
// including both input branches and aria-labelledby. TimeLeft is real too, but the test adds it
// lazily because it imports this (mocked) ui index. Layout/focus remain browser checks.
export { default as StylishEdit } from '@hcengineering/ui/src/components/StylishEdit.svelte'
export { default as ModernDialog } from './Dialog.svelte'
export { default as Button } from './Button.svelte'
export { default as EditBox } from './Field.svelte'
export { default as Label } from './Text.svelte'
export { default as Spinner } from './Spinner.svelte'
