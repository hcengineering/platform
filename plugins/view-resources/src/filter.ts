import { Filter } from '@anticrm/view'
import { writable } from 'svelte/store'

/**
 * @public
 */
export const filterStore = writable<Filter[]>([])
