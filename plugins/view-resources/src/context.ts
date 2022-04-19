import { ViewContext } from '@anticrm/view'
import { writable } from 'svelte/store'

/**
 * @public
 */
export const contextStore = writable<ViewContext[]>([])
