//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//
// Minimal, faithful `svelte/store` stand-in for the Jest (node) environment.
// The real `svelte/store` ships as ESM and cannot be required under the ts-jest
// CommonJS runtime with the repo's pnpm layout, so — like the presentation
// package — we map `svelte/store` to this mock. It implements the `writable`
// and `get` semantics the store gate under test relies on (synchronous set +
// subscribe-on-register), so the test exercises the real gate logic.

export type Subscriber<T> = (value: T) => void
export type Unsubscriber = () => void
export type Updater<T> = (value: T) => T

export interface Readable<T> {
  subscribe: (run: Subscriber<T>) => Unsubscriber
}

export interface Writable<T> extends Readable<T> {
  set: (value: T) => void
  update: (updater: Updater<T>) => void
}

export function writable<T> (initialValue: T): Writable<T> {
  let value = initialValue
  const subscribers = new Set<Subscriber<T>>()
  return {
    subscribe (run: Subscriber<T>): Unsubscriber {
      subscribers.add(run)
      run(value)
      return () => subscribers.delete(run)
    },
    set (newValue: T): void {
      value = newValue
      subscribers.forEach((run) => {
        run(value)
      })
    },
    update (updater: Updater<T>): void {
      this.set(updater(value))
    }
  }
}

export function get<T> (store: Readable<T>): T {
  // Definite assignment: `subscribe` invokes the callback synchronously on
  // registration, so `current` is always set before `unsub()` returns.
  let current!: T
  const unsub = store.subscribe((v) => {
    current = v
  })
  unsub()
  return current
}
