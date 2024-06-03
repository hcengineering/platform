import { writable } from 'svelte/store'

export const scrollIntoSection = writable<number | undefined>()
