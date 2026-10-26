// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0

import type { PersonId, Ref } from '@hcengineering/core'
import type { IssueTemplate, Project } from '@hcengineering/tracker'
import { tick, type ComponentType, type SvelteComponent } from 'svelte'
import Card from '../../../../../../packages/presentation/src/components/Card.svelte'
import GanttSaveViewPopup from '../../gantt/GanttSaveViewPopup.svelte'
import CopyIssueTemplate from '../CopyIssueTemplate.svelte'
import { handleError } from './fixtures/analytics'
import CustomButtons from './fixtures/CustomButtons.svelte'
import { translateCB } from './fixtures/platform'
import { createDoc, findAll, findOne } from './fixtures/presentation'
import { nextFocus, themeStore } from './fixtures/ui'

jest.mock('../../../plugin', () => jest.requireActual('./fixtures/tracker'))
jest.mock('../../../../../../packages/presentation/src', () => ({
  __esModule: true,
  default: { string: { Close: 'Close', Create: 'Create' } }
}))

// Mount the actual popup, submission helper and Card. UI controls, translated text and backend
// collaborators are synthetic. These tests do not establish browser activation/focus, CSS,
// project membership, issue creation or authorization behavior.
const mounted: SvelteComponent[] = []

interface Mounted {
  instance: SvelteComponent
  close: jest.Mock
}

function mount (Component: ComponentType, props: Record<string, unknown> = {}): Mounted {
  const instance = new Component({ target: document.body, props })
  mounted.push(instance)
  const close = jest.fn()
  instance.$on('close', close)
  return { instance, close }
}

function element<T extends HTMLElement> (selector: string): T {
  const result = document.querySelector<T>(selector)
  if (result === null) throw new Error(`Missing ${selector}`)
  return result
}

interface Deferred<T> {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (error: Error) => void
}

function deferred<T> (): Deferred<T> {
  let complete: (value: T) => void = () => {
    throw new Error('Promise executor did not run')
  }
  let fail: (error: Error) => void = () => {
    throw new Error('Promise executor did not run')
  }
  const promise = new Promise<T>((resolve, reject) => {
    complete = resolve
    fail = reject
  })
  return { promise, resolve: complete, reject: fail }
}

async function select (target: string): Promise<void> {
  const selector = element<HTMLSelectElement>('select')
  selector.value = target
  selector.dispatchEvent(new Event('change', { bubbles: true }))
  await tick()
}

async function clickSave (): Promise<void> {
  element<HTMLButtonElement>('.antiCard-footer button[data-loading]').click()
  await tick()
}

// Observe Card's rendered processing state instead of guessing how many Promise callbacks run.
async function idle (): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const observer = new MutationObserver(check)
    const timeout = setTimeout(() => {
      observer.disconnect()
      reject(new Error('Card remained busy'))
    }, 1000)
    function check (): void {
      const buttons = document.querySelectorAll<HTMLButtonElement>('button[data-loading="true"]')
      if (buttons.length === 0) {
        observer.disconnect()
        clearTimeout(timeout)
        resolve()
      }
    }
    observer.observe(document.body, { subtree: true, attributes: true })
    check()
  })
}

function template (): IssueTemplate {
  return {
    _id: 'template' as Ref<IssueTemplate>,
    _class: 'tracker:class:IssueTemplate' as IssueTemplate['_class'],
    space: 'source' as Ref<Project>,
    modifiedOn: 0,
    modifiedBy: 'author' as PersonId,
    title: 'Release',
    description: '',
    priority: 0,
    assignee: null,
    component: null,
    estimation: 0,
    comments: 0,
    children: []
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  themeStore.set({ language: 'en' })
  translateCB.mockReset()
  translateCB.mockImplementation((label, params, language, onTranslated) => {
    onTranslated(`Localized ${label}`)
  })
  // Synthetic project/model results: only the fields consumed by submission are returned.
  findOne.mockImplementation(async (objectClass, query) => ({ _id: query._id, type: 'target-type' }))
  findAll.mockResolvedValue([])
  createDoc.mockResolvedValue('copy')
})

afterEach(() => {
  for (const instance of mounted) instance.$destroy()
  mounted.length = 0
  document.body.replaceChildren()
})

describe('copy dialog selection during submission', () => {
  it.each(['unavailable', 'rejected'])(
    'keeps B when the pending lookup for A is %s, then permits retry',
    async (outcome) => {
      const lookup = deferred<undefined>()
      findOne.mockReturnValueOnce(lookup.promise)
      const { close } = mount(CopyIssueTemplate, { value: template() })
      await select('target-a')
      await clickSave()
      expect(findOne).toHaveBeenCalledTimes(1)
      await select('target-b')

      if (outcome === 'unavailable') lookup.resolve(undefined)
      else lookup.reject(new Error('A lookup failed'))
      await idle()

      expect(element<HTMLSelectElement>('select').value).toBe('target-b')
      expect(element('[role="alert"]').textContent?.trim()).toBe('')
      expect(createDoc).not.toHaveBeenCalled()
      expect(close).not.toHaveBeenCalled()
      expect(handleError).toHaveBeenCalledTimes(outcome === 'rejected' ? 1 : 0)

      await clickSave()
      await idle()
      expect(createDoc).toHaveBeenCalledTimes(1)
      expect(createDoc).toHaveBeenCalledWith('tracker:class:IssueTemplate', 'target-b', expect.any(Object))
      expect(close).toHaveBeenCalledTimes(1)
    }
  )

  it('keeps B open when the pending create for A succeeds, then submits B separately', async () => {
    const write = deferred<string>()
    const entered = deferred<undefined>()
    createDoc.mockImplementationOnce(async () => {
      entered.resolve(undefined)
      return await write.promise
    })
    const { close } = mount(CopyIssueTemplate, { value: template() })
    await select('target-a')
    await clickSave()
    await entered.promise
    await select('target-b')
    await clickSave()
    expect(createDoc).toHaveBeenCalledTimes(1)
    expect(createDoc).toHaveBeenLastCalledWith('tracker:class:IssueTemplate', 'target-a', expect.any(Object))

    write.resolve('copy-a')
    await idle()
    expect(close).not.toHaveBeenCalled()
    expect(element<HTMLSelectElement>('select').value).toBe('target-b')
    await clickSave()
    await idle()
    expect(createDoc).toHaveBeenCalledTimes(2)
    expect(createDoc).toHaveBeenLastCalledWith('tracker:class:IssueTemplate', 'target-b', expect.any(Object))
    expect(close).toHaveBeenCalledTimes(1)
  })

  it('shows invalidation and write failures for the current target and allows recovery', async () => {
    findOne.mockResolvedValueOnce(undefined)
    const { close } = mount(CopyIssueTemplate, { value: template() })
    await select('target-a')
    await clickSave()
    await idle()
    expect(element('[role="alert"]').textContent).toContain('Select another project')
    expect(element<HTMLSelectElement>('select').selectedIndex).toBe(0)
    expect(close).not.toHaveBeenCalled()

    await select('target-b')
    expect(element('[role="alert"]').textContent?.trim()).toBe('')
    createDoc.mockRejectedValueOnce(new Error('write failed'))
    await clickSave()
    await idle()
    expect(element('[role="alert"]').textContent).toContain('Copy failed; retry')
    expect(close).not.toHaveBeenCalled()
    expect(handleError).toHaveBeenCalledTimes(1)

    await clickSave()
    await idle()
    expect(close).toHaveBeenCalledTimes(1)
  })
})

describe('shared Card contracts', () => {
  it('keeps the latest locale Close title when an older translation finishes last', async () => {
    const translations: Array<(title: string) => void> = []
    translateCB.mockImplementation((label, params, language, onTranslated) => {
      translations.push(onTranslated)
    })
    mount(Card, { label: 'Create', okAction: jest.fn() })
    themeStore.set({ language: 'fr' })
    await tick()

    expect(translateCB).toHaveBeenNthCalledWith(1, 'Close', {}, 'en', expect.any(Function))
    expect(translateCB).toHaveBeenNthCalledWith(2, 'Close', {}, 'fr', expect.any(Function))
    expect(translations).toHaveLength(2)
    const [english, french] = translations
    french('Fermer')
    await tick()
    expect(element<HTMLButtonElement>('#card-close').title).toBe('Fermer')

    english('Close')
    await tick()
    expect(element<HTMLButtonElement>('#card-close').title).toBe('Fermer')
  })

  it.each([false, true])(
    'recovers from an action failure (async: %s) and closes after a successful retry',
    async (asynchronous) => {
      const failure = new Error('action failed')
      const action = jest.fn<Promise<void> | void, []>()
      if (asynchronous) {
        action.mockRejectedValueOnce(failure)
      } else {
        action.mockImplementationOnce(() => {
          throw failure
        })
      }
      const { close } = mount(Card, { label: 'Create', canSave: true, okAction: action })
      await clickSave()
      await idle()
      expect(close).not.toHaveBeenCalled()
      expect(handleError).toHaveBeenCalledWith(failure)
      await clickSave()
      await idle()
      expect(action).toHaveBeenCalledTimes(2)
      expect(close).toHaveBeenCalledTimes(1)
    }
  )

  it('retains the CreateIssue custom button slot processing/duplicate/close contract', async () => {
    const completion = deferred<undefined>()
    const action = jest.fn(async () => {
      await completion.promise
    })
    const { close } = mount(CustomButtons, { okAction: action })
    await clickSave()
    expect(element('#custom-save').getAttribute('data-loading')).toBe('true')
    await clickSave()
    expect(action).toHaveBeenCalledTimes(1)
    completion.resolve(undefined)
    await idle()
    expect(close).toHaveBeenCalledTimes(1)
  })

  it('does not prevent native button Enter/Space, advances input Enter and handles Ctrl/Meta Enter', async () => {
    const action = jest.fn()
    mount(Card, { label: 'Create', canSave: true, okAction: action })
    const button = element<HTMLButtonElement>('#card-close')
    expect(button.title).toBe('Localized Close')
    for (const key of ['Enter', ' ']) {
      const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
      button.dispatchEvent(event)
      expect(event.defaultPrevented).toBe(false)
    }
    const input = document.createElement('input')
    element('form').appendChild(input)
    const enter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
    input.dispatchEvent(enter)
    expect(enter.defaultPrevented).toBe(true)
    expect(nextFocus).toHaveBeenCalledWith(1)
    for (const modifier of ['ctrlKey', 'metaKey']) {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', [modifier]: true, bubbles: true }))
    }
    await tick()
    expect(action).toHaveBeenCalledTimes(2)
  })

  it('keeps Gantt save detail ahead of the default tail close and honors explicit cancel', async () => {
    const { close } = mount(GanttSaveViewPopup)
    const input = element<HTMLInputElement>('input')
    input.value = '  Release plan  '
    input.dispatchEvent(new Event('input', { bubbles: true }))
    await tick()
    await clickSave()
    await idle()
    expect(close.mock.calls[0][0].detail).toEqual({ name: 'Release plan', fixTimeWindow: false, sharable: true })
    expect(close).toHaveBeenCalledTimes(2)
    element<HTMLButtonElement>('#card-close').click()
    expect(close).toHaveBeenCalledTimes(3)
    expect(close.mock.calls[2][0].detail).toBeNull()
  })
})
