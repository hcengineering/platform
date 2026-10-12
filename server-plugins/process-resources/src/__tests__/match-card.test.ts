//
// Copyright © 2026 TraceX SAS.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

import cardPlugin from '@hcengineering/card'
import type { Card } from '@hcengineering/card'
import core, { ClassifierKind, Hierarchy, TxFactory } from '@hcengineering/core'
import type { Class, Data, Doc, DocumentQuery, Ref } from '@hcengineering/core'
import type { Execution, Process } from '@hcengineering/process'
import type { ProcessControl } from '@hcengineering/server-process'
import { MatchCardCheck } from '../functions'

const parentClass = 'test:class:Parent' as Ref<Class<Card>>
const childClass = 'test:class:Child' as Ref<Class<Card>>
const grandchildClass = 'test:class:Grandchild' as Ref<Class<Card>>
const siblingClass = 'test:class:Sibling' as Ref<Class<Card>>
const execution: Partial<Execution> = { process: 'test:process' as Ref<Process> }

describe('When card matches class criteria', () => {
  let control: ProcessControl

  beforeEach(() => {
    const hierarchy = new Hierarchy()
    const factory = new TxFactory(core.account.System)

    const classes: [Ref<Class<Doc>>, Ref<Class<Doc>> | undefined][] = [
      [core.class.Obj, undefined],
      [core.class.Doc, core.class.Obj],
      [core.class.Class, core.class.Doc],
      [cardPlugin.class.Card, core.class.Doc],
      [parentClass, cardPlugin.class.Card],
      [childClass, parentClass],
      [grandchildClass, childClass],
      [siblingClass, parentClass]
    ]
    for (const [id, parent] of classes) {
      const data: Data<Class<Doc>> = {
        label: core.string.Class,
        kind: ClassifierKind.CLASS,
        extends: parent
      }
      hierarchy.tx(factory.createTxCreateDoc(core.class.Class, core.space.Model, data, id))
    }

    const definition: Partial<Process> = { masterTag: parentClass }
    control = {
      client: {
        getHierarchy: () => hierarchy,
        getModel: () => ({ findObject: () => definition })
      }
    } as unknown as ProcessControl
  })

  function matches (_class: Ref<Class<Card>>, params: DocumentQuery<Card>): boolean {
    const card: Partial<Card> = { _class, title: 'Ready' }
    return MatchCardCheck(control, execution as Execution, params, { card })
  }

  it.each([parentClass, childClass, grandchildClass, siblingClass])(
    'matches %s against the current process class',
    (_class) => {
      expect(matches(_class, { _class: parentClass })).toBe(true)
    }
  )

  it.each([childClass, grandchildClass])('matches %s against a selected subclass', (_class) => {
    expect(matches(_class, { _class: childClass })).toBe(true)
  })

  it.each([parentClass, siblingClass, cardPlugin.class.Card])('rejects %s outside the selected subclass', (_class) => {
    expect(matches(_class, { _class: childClass })).toBe(false)
  })

  it('combines class inheritance with other attribute criteria without mutating parameters', () => {
    const params: DocumentQuery<Card> = { _class: childClass, title: 'Ready' }

    expect(matches(grandchildClass, params)).toBe(true)
    expect(matches(grandchildClass, { ...params, title: { $ne: 'Ready' } })).toBe(false)
    expect(matches(siblingClass, params)).toBe(false)
    expect(params).toEqual({ _class: childClass, title: 'Ready' })
  })

  it('keeps matching ordinary criteria when no class is selected', () => {
    expect(matches(childClass, { title: 'Ready' })).toBe(true)
    expect(matches(childClass, { title: 'Other' })).toBe(false)
  })

  it('rejects an unknown selected class', () => {
    expect(matches(childClass, { _class: 'test:class:Unknown' as Ref<Class<Card>> })).toBe(false)
  })
})
