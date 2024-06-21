import { writable } from 'svelte/store'
import { type CompAndProps } from './popups'
import { type LabelAndProps } from './types'

export const modalStore = writable<Array<LabelAndProps | CompAndProps>>([])
