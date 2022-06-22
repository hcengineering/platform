import { ViewOptions } from '@anticrm/tracker'
import { writable } from 'svelte/store'

/**
 * @public
 */
export const viewOptionsStore = writable<ViewOptions>()
