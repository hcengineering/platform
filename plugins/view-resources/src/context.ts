import { ViewContext } from '@hcengineering/view'
import { writable } from 'svelte/store'

/**
 * @public
 */
export const contextStore = writable<ViewContext[]>([])
