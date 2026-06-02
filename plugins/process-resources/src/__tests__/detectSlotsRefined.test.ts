/* eslint-disable no-template-curly-in-string, @typescript-eslint/no-non-null-assertion */
import cardPlugin from '@hcengineering/card'
import core, { generateId, Hierarchy, ModelDb } from '@hcengineering/core'
import { getEmbeddedLabel } from '@hcengineering/platform'
import process, { type Process, type State, type Transition } from '@hcengineering/process'
import { detectSlots, normalizeIds } from '../exporter'
import { createDoc, genMinModel } from './minmodel'

jest.mock('@hcengineering/presentation', () => ({
  getClient: jest.fn()
}))

describe('detectSlots refined', () => {
  let h: Hierarchy
  let m: ModelDb
  const processId = generateId<Process>()
  const stateId = generateId<State>()
  const masterTag = cardPlugin.class.Card

  beforeEach(async () => {
    h = new Hierarchy()
    m = new ModelDb(h)
    const txes = genMinModel()
    const _processTx = createDoc(
      process.class.Process,
      {
        masterTag,
        name: 'Main process',
        description: 'La-la-la',
        context: {}
      },
      processId
    )
    const stateTx = createDoc(
      process.class.State,
      {
        process: processId,
        title: 'State 1',
        rank: '0'
      },
      stateId
    )

    for (const tx of txes) {
      h.tx(tx)
    }

    h.tx(_processTx)
    h.tx(stateTx)
    for (const tx of txes) {
      await m.tx(tx)
    }
    await m.tx(_processTx)
    await m.tx(stateTx)
  })

  async function addAttribute (id: string, label: string): Promise<void> {
    const attrTx = createDoc(
      core.class.Attribute,
      {
        name: id,
        attributeOf: masterTag,
        type: { _class: core.class.TypeString, label: core.string.String },
        label: getEmbeddedLabel(label)
      },
      id as any
    )
    h.tx(attrTx)
    await m.tx(attrTx)
  }

  test('Test 1: Update attribute with fixed value', async () => {
    await addAttribute('attr1', 'Attribute 1')

    const transitions: Transition[] = [
      {
        triggerParams: {},
        actions: [
          {
            _id: generateId(),
            _class: 'process:Action' as any,
            methodId: process.method.UpdateCard,
            params: {
              attr1: 'fixed value'
            }
          } as any
        ],
        rank: '',
        process: processId,
        from: null,
        to: stateId,
        trigger: process.trigger.OnCardUpdate,
        _id: generateId(),
        space: core.space.Model,
        modifiedOn: 0,
        modifiedBy: core.account.System,
        _class: process.class.Transition
      } as any
    ]

    const slots: Record<string, any> = {}
    const bindings: Record<string, string> = {}

    detectSlots({ masterTag } as any, transitions, slots, bindings, m, h)

    // attr1 should be a slot because it is a key in params and NOT a required param of UpdateCard (requiredParams [])
    expect(bindings).toEqual({
      attr1: 'attr1'
    })
    expect(Object.keys(slots)).toEqual(['attr1'])
  })

  test('Test 2: Update attribute with value from another attribute', async () => {
    await addAttribute('attr1', 'Attribute 1')
    await addAttribute('attr2', 'Attribute 2')

    const transitions: Transition[] = [
      {
        triggerParams: {},
        actions: [
          {
            _id: generateId(),
            _class: 'process:Action' as any,
            methodId: process.method.UpdateCard,
            params: {
              attr1: '${@attr2}'
            }
          } as any
        ],
        rank: '',
        process: processId,
        from: null,
        to: stateId,
        trigger: process.trigger.OnCardUpdate,
        _id: generateId(),
        space: core.space.Model,
        modifiedOn: 0,
        modifiedBy: core.account.System,
        _class: process.class.Transition
      } as any
    ]

    const slots: Record<string, any> = {}
    const bindings: Record<string, string> = {}

    detectSlots({ masterTag } as any, transitions, slots, bindings, m, h)

    // Both attr1 and attr2 should be slots
    expect(bindings).toEqual({
      attr1: 'attr1',
      attr2: 'attr2'
    })
    expect(Object.keys(slots).sort()).toEqual(['attr1', 'attr2'])
  })

  test('Test 3: Required params should NOT be slots in keys', async () => {
    await addAttribute('title', 'Title')

    const transitions: Transition[] = [
      {
        triggerParams: {},
        actions: [
          {
            _id: generateId(),
            _class: 'process:Action' as any,
            methodId: process.method.CreateToDo,
            params: {
              title: 'My task'
            }
          } as any
        ],
        rank: '',
        process: processId,
        from: null,
        to: stateId,
        trigger: process.trigger.OnCardUpdate,
        _id: generateId(),
        space: core.space.Model,
        modifiedOn: 0,
        modifiedBy: core.account.System,
        _class: process.class.Transition
      } as any
    ]

    const slots: Record<string, any> = {}
    const bindings: Record<string, string> = {}

    detectSlots({ masterTag } as any, transitions, slots, bindings, m, h)

    // title is a required param for CreateToDo, so it should NOT be a slot even if it matches an attribute on masterTag
    expect(bindings).toEqual({})
    expect(slots).toEqual({})
  })

  test('Test 4: Required param key with DSL value referencing attributes', async () => {
    await addAttribute('title', 'Title')
    await addAttribute('attr2', 'Attribute 2')

    const transitions: Transition[] = [
      {
        triggerParams: {},
        actions: [
          {
            _id: generateId(),
            _class: 'process:Action' as any,
            methodId: process.method.CreateToDo,
            params: {
              title: '${@title} - ${@attr2}'
            }
          } as any
        ],
        rank: '',
        process: processId,
        from: null,
        to: stateId,
        trigger: process.trigger.OnCardUpdate,
        _id: generateId(),
        space: core.space.Model,
        modifiedOn: 0,
        modifiedBy: core.account.System,
        _class: process.class.Transition
      } as any
    ]

    const slots: Record<string, any> = {}
    const bindings: Record<string, string> = {}

    detectSlots({ masterTag } as any, transitions, slots, bindings, m, h)

    // 'title' as a KEY should be excluded (required param).
    // 'title' and 'attr2' inside DSL should BE slots.
    expect(bindings).toEqual({
      title: 'title',
      attr2: 'attr2'
    })
    expect(Object.keys(slots).sort()).toEqual(['attr2', 'title'])
  })

  test('Test 5: RunSubProcess with required _id parameter containing DSL', async () => {
    await addAttribute('_id', 'ID')
    await addAttribute('subProcessId', 'Sub Process ID')

    const transitions: Transition[] = [
      {
        triggerParams: {},
        actions: [
          {
            _id: generateId(),
            _class: 'process:Action' as any,
            methodId: process.method.RunSubProcess,
            params: {
              _id: '${@subProcessId}'
            }
          } as any
        ],
        rank: '',
        process: processId,
        from: null,
        to: stateId,
        trigger: process.trigger.OnCardUpdate,
        _id: generateId(),
        space: core.space.Model,
        modifiedOn: 0,
        modifiedBy: core.account.System,
        _class: process.class.Transition
      } as any
    ]

    const slots: Record<string, any> = {}
    const bindings: Record<string, string> = {}

    detectSlots({ masterTag } as any, transitions, slots, bindings, m, h)

    // _id as a key should NOT be a slot.
    // subProcessId inside DSL SHOULD be a slot.
    expect(bindings).toEqual({
      subProcessId: 'subProcessId'
    })
    expect(Object.keys(slots)).toEqual(['subProcessId'])
    expect(slots.subProcessId._class).toBe('core:class:TypeString')
  })

  test('Test 6: Multiple actions with results and cross-references', async () => {
    await addAttribute('title', 'Title')
    await addAttribute('relationAttr', 'Relation Attribute')
    await addAttribute('processIdAttr', 'Process ID Attribute')

    const transitions: Transition[] = [
      {
        triggerParams: {},
        actions: [
          {
            _id: 'action1',
            _class: 'process:Action' as any,
            methodId: process.method.CreateCard,
            params: {
              title: '${@title}',
              _class: 'core:class:Card'
            }
          },
          {
            _id: 'action2',
            _class: 'process:Action' as any,
            methodId: process.method.AddRelation,
            params: {
              association: 'assoc',
              direction: 'both' as any,
              _id: '${@relationAttr}',
              from: '${context:action1}' // Reference to card from action1
            }
          },
          {
            _id: 'action3',
            _class: 'process:Action' as any,
            methodId: process.method.RunSubProcess,
            params: {
              _id: '${@processIdAttr}',
              card: '${context:action1}' // Reference to card from action1
            }
          }
        ] as any[],
        rank: '',
        process: processId,
        from: null,
        to: stateId,
        trigger: process.trigger.OnCardUpdate,
        _id: generateId(),
        space: core.space.Model,
        modifiedOn: 0,
        modifiedBy: core.account.System,
        _class: process.class.Transition
      } as any
    ]

    const slots: Record<string, any> = {}
    const bindings: Record<string, string> = {}

    detectSlots({ masterTag } as any, transitions, slots, bindings, m, h)

    // Expected Slots:
    // 1. 'title' (from DSL in CreateCard params.title)
    // 2. 'relationAttr' (from DSL in AddRelation params._id)
    // 3. 'processIdAttr' (from DSL in RunSubProcess params._id)
    // IMPORTANT: '${context:action1}' should NOT create slots because it's not starting with '${@'
    expect(bindings).toEqual({
      title: 'title',
      relationAttr: 'relationAttr',
      processIdAttr: 'processIdAttr'
    })
    expect(Object.keys(slots).sort()).toEqual(['processIdAttr', 'relationAttr', 'title'])
  })

  test('Test 7: Complex process example (Action 0 logic)', async () => {
    // custom69bc3ed74e7b0466f9490f5e is the attribute used in the user example
    const attrId = 'custom69bc3ed74e7b0466f9490f5e'
    await addAttribute(attrId, 'Action User')
    await addAttribute('field', 'Internal Field') // Just in case it matches

    const transitions: Transition[] = [
      {
        triggerParams: {},
        actions: [
          {
            _id: '__ACTION_0__',
            _class: 'process:Action' as any,
            methodId: process.method.CreateToDo,
            params: {
              field: attrId, // 'field' is NOT in requiredParams of CreateToDo
              title: 'Create action ', // 'title' IS in requiredParams
              user: `\${@${attrId}}`, // 'user' IS in requiredParams, but it has DSL
              withRollback: false
            }
          }
        ] as any[],
        rank: '0|hzzzzz:',
        process: processId,
        from: null,
        to: stateId,
        trigger: 'process:trigger:OnExecutionStart' as any,
        _id: '__TRANSITION_0__',
        space: core.space.Model,
        modifiedOn: 0,
        modifiedBy: core.account.System,
        _class: process.class.Transition
      } as any
    ]

    const slots: Record<string, any> = {}
    const bindings: Record<string, string> = {}

    detectSlots({ masterTag } as any, transitions, slots, bindings, m, h)

    // Expected Slots:
    // 1. 'custom6  ... ' (from DSL in params.user) - gets generic 'slot2' name because it starts with 'custom'
    // 2. 'field' (from key 'field' - not required) - gets 'field' name
    expect(bindings).toEqual({
      field: 'field',
      slot2: attrId
    })
    expect(Object.keys(slots).sort()).toEqual(['field', 'slot2'])
  })

  test('Test 8: Add Actions handler (RunSubProcess with fixed IDs)', async () => {
    const attrId = 'custom69bc3ed74e7b0466f9490f5e'
    const fixedSubProcessId = '69c1c99b7ec0668a177ad5c1'
    await addAttribute(attrId, 'Action User')

    const transitions: Transition[] = [
      {
        _id: '__TRANSITION_0__',
        trigger: 'process:trigger:OnExecutionStart' as any,
        triggerParams: {},
        actions: [
          {
            _id: '__ACTION_0__',
            _class: 'process:Action' as any,
            methodId: process.method.RunSubProcess,
            params: {
              _id: fixedSubProcessId // Required param, fixed value. NO slot.
            }
          }
        ] as any[],
        process: processId,
        from: null,
        to: stateId,
        _class: process.class.Transition
      } as any,
      {
        _id: '__TRANSITION_1__',
        trigger: process.trigger.OnSubProcessesDone,
        triggerParams: {},
        actions: [
          {
            _id: '__ACTION_1__',
            _class: 'process:Action' as any,
            methodId: process.method.RunSubProcess,
            params: {
              _id: fixedSubProcessId // Required param, fixed value. NO slot.
            }
          },
          {
            _id: '__ACTION_2__',
            _class: 'process:Action' as any,
            methodId: process.method.CreateToDo,
            params: {
              field: attrId, // 'field' NOT required, but if no 'field' attribute exists, NO slot.
              title: 'stop add actions',
              user: `\${@${attrId}}`, // 'user' required, but has DSL. YES slot.
              withRollback: false
            }
          }
        ] as any[],
        process: processId,
        from: stateId,
        to: stateId,
        _class: process.class.Transition
      } as any
    ]

    const slots: Record<string, any> = {}
    const bindings: Record<string, string> = {}

    detectSlots({ masterTag } as any, transitions, slots, bindings, m, h)

    // Expected Slots:
    // Only 'custom69bc...' should be a slot (from action 2 user DSL).
    // 'field' is NOT a slot here because we didn't addAttribute('field').
    expect(bindings).toEqual({
      slot1: attrId
    })
    expect(Object.keys(slots)).toEqual(['slot1'])
  })

  test('Test 9: Value-based and Advanced DSL Detection for required params', async () => {
    const attr1Id = '69beeeba92ba480730625f97'
    const attr2Id = '69c1ca4f7ec0668a177ad6d3'

    await addAttribute(attr1Id, 'Target Class')
    await addAttribute(attr2Id, 'Source Attribute')

    const transitions: Transition[] = [
      {
        triggerParams: {},
        actions: [
          {
            _id: '__ACTION_1__',
            _class: 'process:Action' as any,
            methodId: process.method.CreateCard,
            params: {
              _class: attr1Id, // Required key, but VALUE is an attribute ID. SHOULD be a slot.
              title: `\${$userRequest(${attr2Id},title,card:class:Card)}` // Required key, but DSL has attribute ID. SHOULD be a slot.
            }
          }
        ] as any[],
        rank: '0|i00007:',
        process: processId,
        from: stateId,
        to: stateId,
        trigger: 'process:trigger:OnSubProcessesDone' as any,
        _id: '__TRANSITION_1__',
        space: core.space.Model,
        modifiedOn: 0,
        modifiedBy: core.account.System,
        _class: process.class.Transition
      } as any
    ]

    const slots: Record<string, any> = {}
    const bindings: Record<string, string> = {}

    detectSlots({ masterTag } as any, transitions, slots, bindings, m, h)

    // Expected Slots:
    // Both attr1Id and attr2Id should be detected.
    // They get their IDs as slot names because they are passed as 'name' to addAttribute.
    expect(bindings).toEqual({
      [attr1Id]: attr1Id,
      [attr2Id]: attr2Id
    })
    expect(Object.keys(slots).sort()).toEqual([attr1Id, attr2Id].sort())
  })

  test('Test 10: Detection of custom classes (not attributes)', async () => {
    const classId = '69beca1892ba480730625735'
    // Create a Class doc (not an Attribute)
    const classDoc = { _id: classId, _class: 'core:class:Class', name: 'CustomClass' }
    m.findObject = jest.fn().mockImplementation((id) => {
      if (id === classId) return classDoc
      return undefined
    })
    h.findAttribute = jest.fn().mockReturnValue(undefined) // It's a class, not an attribute

    const transitions: Transition[] = [
      {
        triggerParams: {},
        actions: [
          {
            _id: '__ACTION_1__',
            _class: 'process:Action' as any,
            methodId: process.method.CreateCard,
            params: {
              _class: classId
            }
          }
        ] as any[],
        rank: '0|i00007:',
        process: processId,
        from: stateId,
        to: stateId,
        trigger: 'process:trigger:OnSubProcessesDone' as any,
        _id: '__TRANSITION_1__',
        space: core.space.Model,
        modifiedOn: 0,
        modifiedBy: core.account.System,
        _class: process.class.Transition
      } as any
    ]

    const slots: Record<string, any> = {}
    const bindings: Record<string, string> = {}

    detectSlots({ masterTag } as any, transitions, slots, bindings, m, h)

    // Expected Slots:
    // Slot should be detected for the Class ID because it starts with 69 and is found by findObject
    expect(bindings).toEqual({
      [classId]: classId
    })
    expect(Object.keys(slots)).toEqual([classId])
  })

  test('Test 11: Slot Metadata Corruption Check (String Spreading)', async () => {
    const attrId = '69becaf392ba48073062581f'
    // Create an attribute where type is a string reference, not an object
    const attrDoc = {
      _id: attrId,
      _class: 'core:class:Attribute',
      name: 'rootCause',
      type: 'N:N', // This caused the "hell" when spread
      label: 'Root Cause'
    }
    m.findObject = jest.fn().mockImplementation((id) => {
      if (id === attrId) return attrDoc
      return undefined
    })
    h.findAttribute = jest.fn().mockImplementation((tag, id) => {
      if (id === attrId) return attrDoc
      return undefined
    })

    const transitions: Transition[] = [
      {
        triggerParams: {},
        actions: [
          {
            _id: '__ACTION_1__',
            _class: 'process:Action' as any,
            methodId: process.method.AddRelation,
            params: {
              association: attrId
            }
          }
        ] as any[],
        rank: '0|i00007:',
        process: processId,
        from: stateId,
        to: stateId,
        trigger: 'process:trigger:OnSubProcessesDone' as any,
        _id: '__TRANSITION_1__',
        space: core.space.Model,
        modifiedOn: 0,
        modifiedBy: core.account.System,
        _class: process.class.Transition
      } as any
    ]

    const slots: Record<string, any> = {}
    const bindings: Record<string, string> = {}

    detectSlots({ masterTag } as any, transitions, slots, bindings, m, h)

    // Expected Slots:
    // Slot 'rootCause' should be created.
    // The 'type' property in slot metadata should NOT be a spread object like {0: "N", ...}
    expect(bindings).toEqual({
      rootCause: attrId
    })
    expect(slots.rootCause).toEqual({
      _class: 'N:N',
      label: 'Root Cause',
      slotKind: 'attribute',
      memberOf: undefined
    })
    // Ensure no corrupted keys in the slot object
    expect(slots.rootCause['0']).toBeUndefined()
  })

  test('Test 12: System Attribute Normalization (Hex ID Replacement)', async () => {
    const attrId = '69c1c342fe49e50bc1ca7fcf'
    const attrDoc = { _id: attrId, name: 'title', _class: 'core:class:Attribute', label: 'Name' }
    m.findObject = jest.fn().mockImplementation((id) => (id === attrId ? attrDoc : undefined))
    h.findAttribute = jest.fn().mockImplementation((tag, id) => (id === attrId ? attrDoc : undefined))

    const transitions: Transition[] = [
      {
        triggerParams: {},
        actions: [
          {
            _id: '__ACTION_1__',
            _class: 'process:Action' as any,
            methodId: process.method.UpdateCard,
            params: { [attrId]: 'New Title' }
          }
        ] as any,
        process: processId,
        from: stateId,
        to: stateId,
        trigger: 'process:trigger:OnCardUpdate' as any,
        _id: '__TRANSITION_1__',
        _class: process.class.Transition
      } as any
    ]

    const slots: Record<string, any> = {}
    const bindings: Record<string, string> = {}
    detectSlots({ masterTag } as any, transitions, slots, bindings, m, h)

    // normalizeIds is now imported
    const procDoc = {
      _id: processId,
      _class: 'process:class:Process',
      masterTag,
      bindings
    }
    const docs = [procDoc, ...transitions]
    const normalized = normalizeIds(docs as any[])
    const normalizedProc = normalized.find((d: any) => d._id === '__PROCESS__')

    // Bindings key should remain 'title' if we use the refined normalization
    expect((normalizedProc as any).bindings.title).toBeDefined()
    expect((normalizedProc as any).bindings.__SLOT_title__).toBeUndefined()

    // Param key should be replaced
    const normalizedTransition = normalized.find((d: any) => d._id === '__TRANSITION_0__')
    expect((normalizedTransition as any).actions[0].params).toEqual({
      __SLOT_title__: 'New Title'
    })
  })

  test('Test 13: Custom Attribute in DSL (30-char ID)', async () => {
    const attrId = 'custom68f7bb1d9cc1dda7cedf7a49'
    const attrDoc = { _id: attrId, name: attrId, _class: 'core:class:Attribute', label: 'Custom' }
    m.findObject = jest.fn().mockImplementation((id) => (id === attrId ? attrDoc : undefined))
    h.findAttribute = jest.fn().mockImplementation((tag, id) => (id === attrId ? attrDoc : undefined))

    const transitions: Transition[] = [
      {
        triggerParams: {},
        actions: [
          {
            _id: '__ACTION_1__',
            _class: 'process:Action' as any,
            methodId: process.method.UpdateCard,
            params: { title: `\${$userRequest(${attrId})}` }
          }
        ] as any,
        process: processId,
        _id: '__TRANSITION_1__',
        _class: process.class.Transition
      } as any
    ]

    const slots: Record<string, any> = {}
    const bindings: Record<string, string> = {}
    detectSlots({ masterTag } as any, transitions, slots, bindings, m, h)

    // Should detect the custom ID inside DSL and create a slot
    expect(bindings).toEqual({
      slot1: attrId
    })
    expect(slots.slot1).toBeDefined()
  })

  test('Test 14: Class Slot Metadata (Capture extends/kind)', async () => {
    const classId = '69beeeba92ba480730625f97'
    const classDoc = {
      _id: classId,
      _class: 'core:class:Class',
      name: 'MyClass',
      label: 'My Class',
      extends: 'core:class:Doc',
      kind: 'CLASS'
    }
    m.findObject = jest.fn().mockImplementation((id) => (id === classId ? classDoc : undefined))
    h.findAttribute = jest.fn().mockImplementation((tag, id) => (id === classId ? classDoc : undefined))

    const transitions: Transition[] = [
      {
        triggerParams: {},
        actions: [
          {
            _id: '__ACTION_1__',
            _class: 'process:Action' as any,
            methodId: 'process:method:CreateCard',
            params: { _class: classId }
          }
        ] as any,
        process: processId,
        _id: '__TRANSITION_1__',
        _class: process.class.Transition
      } as any
    ]

    const slots: Record<string, any> = {}
    const bindings: Record<string, string> = {}
    detectSlots({ masterTag } as any, transitions, slots, bindings, m, h)

    expect(slots['My Class']).toEqual({
      _class: 'core:class:Class',
      label: 'My Class',
      slotKind: 'class',
      memberOf: undefined
    })
  })

  test('Test 15: Attribute Label Precedence (Preserve Custom Label)', async () => {
    const attrId = 'attempts'
    const attrDoc = {
      _id: attrId,
      name: 'attempts',
      _class: 'core:class:Attribute',
      label: 'Attempts Count',
      type: { _class: 'core:class:TypeNumber', label: 'core:string:Number' }
    }
    m.findObject = jest.fn().mockImplementation((id) => (id === attrId ? attrDoc : undefined))
    h.findAttribute = jest.fn().mockImplementation((tag, id) => (id === attrId ? attrDoc : undefined))

    const transitions: Transition[] = [
      {
        triggerParams: {},
        actions: [
          {
            _id: '__ACTION_1__',
            _class: 'process:Action' as any,
            methodId: process.method.UpdateCard,
            params: { [attrId]: 1 }
          }
        ] as any,
        process: processId,
        _id: '__TRANSITION_1__',
        _class: process.class.Transition
      } as any
    ]

    const slots: Record<string, any> = {}
    const bindings: Record<string, string> = {}
    detectSlots({ masterTag } as any, transitions, slots, bindings, m, h)

    // Label should be 'Attempts Count', NOT 'core:string:Number'
    expect(slots.attempts.label).toBe('Attempts Count')
  })

  test('Test 16: Custom ID as Param Key (Fallback Slotification)', async () => {
    // ID that is NOT in the hierarchy
    const attrId = 'custom68f7bb1d9cc1dda7cedf7a49'
    h.findAttribute = jest.fn().mockReturnValue(undefined)

    const transitions: Transition[] = [
      {
        triggerParams: {},
        actions: [
          {
            _id: '__ACTION_1__',
            _class: 'process:Action' as any,
            methodId: process.method.UpdateCard,
            params: { [attrId]: 'value' }
          }
        ] as any,
        process: processId,
        _id: '__TRANSITION_1__',
        _class: process.class.Transition
      } as any
    ]

    const slots: Record<string, any> = {}
    const bindings: Record<string, string> = {}
    detectSlots({ masterTag } as any, transitions, slots, bindings, m, h)

    // Should slotify even if not found in hierarchy, since it looks like a custom ID
    expect(bindings).toEqual({
      slot1: attrId
    })
    expect(slots.slot1).toBeDefined()
  })

  test('Test 17: Custom ID in DSL Value (30-char ID)', async () => {
    const attrId = 'custom68f75bafbfb5af6eea5c0eaa'
    m.findObject = jest
      .fn()
      .mockImplementation((id) => (id === attrId ? { _id: attrId, label: 'Custom Value' } : undefined))

    const transitions: Transition[] = [
      {
        triggerParams: {},
        actions: [
          {
            _id: '__ACTION_1__',
            _class: 'process:Action' as any,
            methodId: process.method.UpdateCard,
            params: { someField: `\${$context(__CONTEXT_0__, ${attrId})}` }
          }
        ] as any,
        process: processId,
        _id: '__TRANSITION_1__',
        _class: process.class.Transition
      } as any
    ]

    const slots: Record<string, any> = {}
    const bindings: Record<string, string> = {}
    detectSlots({ masterTag } as any, transitions, slots, bindings, m, h)

    // Should detect the 30-char custom ID inside DSL
    expect(bindings).toEqual({
      slot1: attrId
    })
  })

  test('Test 18: Attribute with String Type (Capture primitive _class)', async () => {
    const attrId = 'primitiveField'
    const attrDoc = {
      _id: attrId,
      name: 'primitiveField',
      _class: 'core:class:Attribute',
      label: 'Text',
      type: 'core:class:TypeString' // String type instead of object
    }
    m.findObject = jest.fn().mockReturnValue(attrDoc)
    h.findAttribute = jest.fn().mockReturnValue(attrDoc)

    const transitions: Transition[] = [
      {
        triggerParams: {},
        actions: [
          {
            _id: 'A1',
            _class: 'process:Action' as any,
            methodId: process.method.UpdateCard,
            params: { [attrId]: 'Hello' }
          }
        ] as any,
        process: processId,
        _id: 'T1',
        _class: process.class.Transition
      } as any
    ]

    const slots: Record<string, any> = {}
    const bindings: Record<string, string> = {}
    detectSlots({ masterTag } as any, transitions, slots, bindings, m, h)

    // Slot metadata should have _class: 'core:class:TypeString'
    expect(slots.primitiveField._class).toBe('core:class:TypeString')
  })

  test('Test 19: Class Slot (Capture _class and metadata)', async () => {
    const classId = '69beeeba92ba480730625f97'
    const classDoc = {
      _id: classId,
      _class: 'core:class:Class',
      name: 'MyClass',
      label: 'My Class',
      extends: 'core:class:Doc'
    }
    m.findObject = jest.fn().mockReturnValue(classDoc)
    h.findAttribute = jest.fn().mockReturnValue(classDoc)

    const transitions: Transition[] = [
      {
        triggerParams: {},
        actions: [
          {
            _id: 'A1',
            _class: 'process:Action' as any,
            methodId: 'process:method:CreateCard',
            params: { _class: classId }
          }
        ] as any,
        process: processId,
        _id: 'T1',
        _class: process.class.Transition
      } as any
    ]

    const slots: Record<string, any> = {}
    const bindings: Record<string, string> = {}
    detectSlots({ masterTag } as any, transitions, slots, bindings, m, h)

    expect(slots['My Class']._class).toBe('core:class:Class')
    expect(slots['My Class'].label).toBe('My Class')
  })

  test('Test 20: Multi-Context Attribute Detection (Alternative Class Context)', async () => {
    // Setup Class A (Main) and Class B (Target)
    const masterTag = 'ClassA'
    const classBId = 'ClassB'
    const attrBId = 'attrB'

    const classADoc = { _id: masterTag, _class: 'core:class:Class', name: 'ClassA', label: 'Main Class' }
    const classBDoc = { _id: classBId, _class: 'core:class:Class', name: 'ClassB', label: 'Other Class' }
    const attrBDoc = {
      _id: attrBId,
      _class: 'core:class:Attribute',
      name: 'attrB',
      label: 'Target Attribute',
      type: 'core:class:TypeString'
    }

    m.findObject = jest.fn().mockImplementation((id) => {
      if (id === masterTag) return classADoc
      if (id === classBId) return classBDoc
      if (id === attrBId) return attrBDoc
      if (id === 'process:method:CreateCard') return { _id: 'process:method:CreateCard', requiredParams: ['_class'] }
      return undefined
    })

    // Hierarchy helper needs to find attrB in ClassB
    h.findAttribute = jest.fn().mockImplementation((tag, attrId) => {
      if (tag === classBId && (attrId === 'attrB' || attrId === attrBId)) return attrBDoc
      return undefined
    })

    const transitions: Transition[] = [
      {
        triggerParams: {},
        actions: [
          {
            _id: 'A1',
            _class: 'process:Action' as any,
            methodId: 'process:method:CreateCard',
            params: {
              _class: classBId,
              [attrBId]: 'some value'
            }
          }
        ] as any,
        process: processId,
        _id: 'T1',
        _class: process.class.Transition
      } as any
    ]

    const slots: Record<string, any> = {}
    const bindings: Record<string, string> = {}
    detectSlots({ masterTag } as any, transitions, slots, bindings, m, h)

    // attrB should be detected and slotified with its correct label even though it is NOT in masterTag (ClassA)
    expect(bindings.attrB).toBe(attrBId)
    expect(slots.attrB.label).toBe('Target Attribute')
    expect(slots.attrB._class).toBe('core:class:TypeString')
  })

  test('Test 21: memberOf Slot Metadata (Dependency tracking)', async () => {
    const mainClassId = '69c1c342fe49e50bc1ca7fcf'
    const subClassId = '69beeeba92ba480730625f97'
    const attrBId = 'custom68f7bb1d9cc1dda7cedf7a49'

    const classADoc = { _id: mainClassId, _class: 'core:class:Class', name: 'ClassA', label: 'Main' }
    const classBDoc = { _id: subClassId, _class: 'core:class:Class', name: 'ClassB', label: 'Dependent' }
    const attrBDoc = {
      _id: attrBId,
      _class: 'core:class:Attribute',
      name: 'attrB',
      label: 'Sub Attr',
      type: 'core:class:TypeString'
    }

    m.findObject = jest.fn().mockImplementation((id) => {
      if (id === mainClassId) return classADoc
      if (id === subClassId) return classBDoc
      if (id === attrBId) return attrBDoc
      if (id === 'process:method:CreateCard') return { _id: 'process:method:CreateCard', requiredParams: ['_class'] }
      return undefined
    })

    h.findAttribute = jest.fn().mockImplementation((tag, attrId) => {
      if (tag === subClassId && attrId === attrBId) return attrBDoc
      return undefined
    })

    const transitions: Transition[] = [
      {
        triggerParams: {},
        actions: [
          {
            _id: 'A1',
            _class: 'process:Action' as any,
            methodId: 'process:method:CreateCard',
            params: {
              _class: subClassId, // This becomes slot1 (because ClassB name is 'Dependent' which might be safe, but wait... B usually gets slot1 if it's the first)
              [attrBId]: 'val'
            }
          }
        ] as any,
        process: processId,
        _id: 'T1',
        _class: process.class.Transition
      } as any
    ]

    const slots: Record<string, any> = {}
    const bindings: Record<string, string> = {}
    detectSlots({ masterTag: mainClassId } as any, transitions, slots, bindings, m, h)

    expect(bindings.attrB).toBe(attrBId)

    const classBSlot = 'Dependent'
    const attrBSlot = 'attrB'

    expect(slots[classBSlot]).toBeDefined()
    expect(slots[attrBSlot]).toBeDefined()

    // attrB should have memberOf pointing to ClassB
    expect(slots[attrBSlot].memberOf).toBe(`__SLOT_${classBSlot}__`)
  })

  test('Test 22: Association Direction-Aware Naming', async () => {
    const assocId = '69c1c342fe49e50bc1ca7fcf' // 24 chars
    const assocDoc = {
      _id: assocId,
      _class: 'core:class:Association',
      nameA: 'Related From',
      nameB: 'Detailed Relations',
      label: 'Default Label'
    }

    m.findObject = jest.fn().mockReturnValue(assocDoc)

    const transitions = [
      {
        _id: 'tr1',
        actions: [
          {
            methodId: 'process:method:AddRelation',
            params: { association: assocId, direction: 'B' }
          }
        ]
      }
    ]

    const slots: Record<string, any> = {}
    const bindings: Record<string, string> = {}
    const proc = { masterTag: 'ClassA' } as any
    detectSlots(proc, transitions as any[], slots, bindings, m, h)

    const assocSlot = Object.keys(slots).find((k) => slots[k]._class === 'core:class:Association')
    expect(assocSlot).toBeDefined()
    expect(slots[assocSlot!].name).toBe('Detailed Relations')
  })

  test('Test 23: Sub-Process memberOf linking via context resolution', async () => {
    const classBId = '69beeeba92ba480730625f97' // 24 chars
    const subProcId = '69c1c342fe49e50bc1ca7fcf' // 24 chars
    const classBDoc = { _id: classBId, _class: 'core:class:Class', name: 'ClassB' }
    const subProcDoc = { _id: subProcId, _class: 'process:class:Process', name: 'SubProcess' }

    m.findObject = jest.fn().mockImplementation((id) => {
      if (id === classBId) return classBDoc
      if (id === subProcId) return subProcDoc
      return null
    })

    const transitions = [
      {
        _id: 'tr1',
        actions: [
          {
            _id: 'act1',
            methodId: 'process:method:CreateCard',
            params: { _class: classBId },
            results: [{ _id: '__CONTEXT_B__', type: { _class: 'core:class:RefTo', to: classBId } }]
          },
          {
            _id: 'act2',
            methodId: 'process:method:RunSubProcess',
            params: { _id: subProcId, card: '${$context("__CONTEXT_B__")}' }
          }
        ]
      }
    ]

    const slots: Record<string, any> = {}
    const bindings: Record<string, string> = {}
    const proc = { masterTag: 'ClassA' } as any
    detectSlots(proc, transitions as any[], slots, bindings, m, h)

    const subProcSlot = slots.SubProcess
    expect(subProcSlot).toBeDefined()
    expect(subProcSlot.memberOf).toBeDefined() // It should refer to slot created for ClassB
  })
})
