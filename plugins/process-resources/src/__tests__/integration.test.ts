/* eslint-disable no-template-curly-in-string, @typescript-eslint/no-non-null-assertion */
import core, { generateId, Hierarchy, ModelDb } from '@hcengineering/core'
import { exportProcess, importProcess } from '../exporter'
import { createDoc, genMinModel } from './minmodel'
import cardPlugin from '@hcengineering/card'
import { getEmbeddedLabel } from '@hcengineering/platform'
import process, { type Process, type State } from '@hcengineering/process'
import { getClient } from '@hcengineering/presentation'

jest.mock('@hcengineering/presentation', () => ({
  getClient: jest.fn()
}))

describe('Process Export/Import Integration', () => {
  let h: Hierarchy
  let m: ModelDb
  const processId = generateId<Process>()
  const stateId = generateId<State>()
  const masterTag = cardPlugin.class.Card

  beforeEach(async () => {
    h = new Hierarchy()
    m = new ModelDb(h)
    const txes = genMinModel()

    // Mock getClient to return our test model/hierarchy
    ;(getClient as jest.Mock).mockReturnValue({
      getModel: () => m,
      getHierarchy: () => h,
      apply: () => ({
        createDoc: jest.fn().mockResolvedValue(undefined),
        commit: jest.fn().mockResolvedValue(undefined)
      })
    })

    for (const tx of txes) {
      h.tx(tx)
    }
    for (const tx of txes) {
      await m.tx(tx)
    }

    const _processTx = createDoc(
      process.class.Process,
      {
        masterTag,
        name: 'Integration Process',
        context: {
          __CONTEXT_0__: {
            _class: process.class.ProcessToDo,
            _id: '__CONTEXT_0__',
            name: 'Task 1'
          }
        } as any,
        description: ''
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

    h.tx(_processTx)
    h.tx(stateTx)
    await m.tx(_processTx)
    await m.tx(stateTx)
  })

  async function addAttribute (id: string, name: string, label: string): Promise<void> {
    const attrTx = createDoc(
      core.class.Attribute,
      {
        name,
        attributeOf: masterTag,
        type: { _class: core.class.TypeString, label: core.string.String },
        label: getEmbeddedLabel(label)
      },
      id as any
    )
    h.tx(attrTx)
    await m.tx(attrTx)
  }

  test('DSL string with slot and context should survive export/import cycle', async () => {
    const attrId = '69c1c342fe49e50bc1ca7fcf'
    await addAttribute(attrId, 'sourceAttr', 'Source Attribute')

    const proc = m.findObject(processId) as Process
    const transition: any = {
      _id: generateId(),
      _class: process.class.Transition,
      process: processId,
      from: null,
      to: stateId,
      trigger: process.trigger.OnExecutionStart,
      triggerParams: {},
      actions: [
        {
          _id: generateId(),
          _class: 'process:Action',
          methodId: process.method.CreateCard,
          params: {
            title: `\${$userRequest(${attrId},title,card:class:Card)}`,
            contextRef: '${$context(__CONTEXT_0__)}'
          }
        }
      ],
      rank: '0'
    }

    m.findAllSync = jest.fn().mockImplementation((_class, filter) => {
      if (_class === process.class.Process) return [proc]
      if (_class === process.class.State) return [m.findObject(stateId)]
      if (_class === process.class.Transition) return [transition]
      return []
    })

    // 1. Export
    const { docs } = exportProcess(proc)
    const json = JSON.stringify(docs, null, 2)

    // Verify normalization
    expect(json).toContain('__SLOT_')
    expect(json).toContain('__CONTEXT_')
    expect(json).not.toContain(attrId) // Should be replaced by slot placeholder

    // 2. Import
    const newMasterTag = generateId()
    const bindings = { sourceAttr: attrId } // Correct binding for the slot name

    const mockApply = {
      createDoc: jest.fn().mockResolvedValue(undefined),
      commit: jest.fn().mockResolvedValue(undefined)
    }
    ;(getClient as jest.Mock).mockReturnValue({
      getModel: () => m,
      getHierarchy: () => h,
      apply: () => mockApply
    })

    await importProcess(newMasterTag as any, json, bindings)

    // Check if importProcess called createDoc with the correctly restored DSL
    const createDocCalls = mockApply.createDoc.mock.calls
    const transitionCall = createDocCalls.find((call) => call[0] === process.class.Transition)

    expect(transitionCall).toBeDefined()
    const importedParams = transitionCall![2].actions[0].params

    // CRITICAL: Check if DSL restored the REAL attribute ID
    expect(importedParams.title).toContain(attrId)
    expect(importedParams.title).not.toContain('__SLOT_')

    // Check if context was restored (it gets a NEW ID, not the placeholder)
    expect(importedParams.contextRef).toContain('${$context(')
    expect(importedParams.contextRef).not.toContain('__CONTEXT_')
    const restoredCtxId = importedParams.contextRef.match(/\$\{?\$context\(([^)]+)\)\}/)![1]
    expect(restoredCtxId).toHaveLength(24) // Should be a real generated ID
  })
})
