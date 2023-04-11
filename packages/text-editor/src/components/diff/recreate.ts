//
// Copyright © 2022 Hardcore Engineering Inc.
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
// Parts of source code is taken from https://github.com/sueddeutsche/prosemirror-recreate-transform
// based on Apache License 2.0
//

import { Change, diffWordsWithSpace } from 'diff'
import { Node, Schema } from 'prosemirror-model'
import { ReplaceStep, Step, Transform } from 'prosemirror-transform'
import { applyPatch, createPatch, Operation } from 'rfc6902'
import { Pointer } from 'rfc6902/pointer'
import { diffArraysPM } from './diff'

/**
 * @public
 */
export function getReplaceStep (fromDoc: Node, toDoc: Node): ReplaceStep | undefined {
  const start = toDoc.content.findDiffStart(fromDoc.content)
  if (start !== null) {
    const pos = toDoc.content.findDiffEnd(fromDoc.content)
    if (pos != null) {
      return getReplaceStepOverlap(pos, start, fromDoc, toDoc)
    }
  }
}
function getReplaceStepOverlap (pos: { a: number, b: number }, start: number, fromDoc: Node, toDoc: Node): ReplaceStep {
  let { a: endA, b: endB } = pos
  const overlap = start - Math.min(endA, endB)
  if (overlap > 0) {
    if (fromDoc.resolve(start - overlap).depth < toDoc.resolve(endA + overlap).depth) {
      start -= overlap
    } else {
      endA += overlap
      endB += overlap
    }
  }
  return new ReplaceStep(start, endB, toDoc.slice(start, endA))
}

export function simplifyTransform (tr: Transform): Transform | undefined {
  if (tr.steps.length === 0) {
    return undefined
  }

  const newTr = new Transform(tr.docs[0])
  const oldSteps = tr.steps.slice()

  while (oldSteps.length > 0) {
    let step = oldSteps.shift()
    while (oldSteps.length > 0 && step?.merge(oldSteps[0]) != null) {
      step = simplifyStep(step, oldSteps.shift(), newTr)
    }
    if (step === undefined) {
      return undefined
    }
    newTr.step(step)
  }
  return newTr
}

function simplifyStep (step: Step | undefined, addedStep: Step | undefined, newTr: Transform): Step | undefined {
  if (step != null && step instanceof ReplaceStep && addedStep != null && addedStep instanceof ReplaceStep) {
    const stepA = step.apply(newTr.doc)
    if (stepA.doc != null) {
      const stepB = addedStep.apply(stepA.doc)
      if (stepB.doc !== null) {
        step = getReplaceStep(newTr.doc, stepB.doc)
      } else {
        step = undefined
      }
    } else {
      step = undefined
    }
  } else if (addedStep !== undefined) {
    step = step?.merge(addedStep) ?? undefined
  }
  return step
}

function getFromPath (obj: any, path: string): any {
  const pathParts = path.split('/')
  pathParts.shift() // remove root
  while (pathParts.length > 0) {
    const property = pathParts.shift()
    obj = obj[property ?? '']
  }
  return obj
}

function removeMarks (doc: Node): Node {
  const tr = new Transform(doc)
  tr.removeMark(0, doc.nodeSize - 2)
  return tr.doc
}

function clone (obj: any): any {
  if (typeof obj === 'function') {
    return obj
  }
  const result: any = Array.isArray(obj) ? [] : {}
  for (const key in obj) {
    // include prototype properties
    const value = obj[key]
    const type = {}.toString.call(value).slice(8, -1)
    if (type === 'Array') {
      result[key] = clone(value)
    } else if (type === 'Object') {
      result[key] = clone(value)
    } else if (type === 'Date') {
      result[key] = new Date(value.getTime())
    } else {
      result[key] = value
    }
  }
  return result
}

export class StepTransform {
  schema: Schema
  tr: Transform
  currentDoc: any
  finalDoc: any
  ops: Operation[] = []

  constructor (readonly fromDoc: Node, readonly toDoc: Node) {
    this.schema = fromDoc.type.schema
    this.tr = new Transform(fromDoc)
  }

  init (): Transform {
    this.currentDoc = removeMarks(this.fromDoc).toJSON()
    this.finalDoc = removeMarks(this.toDoc).toJSON()
    this.ops = createPatch(this.currentDoc, this.finalDoc, (input: any, output: any, ptr: Pointer) => {
      if (Array.isArray(input) && Array.isArray(output)) {
        return diffArraysPM(input, output, ptr)
      }
    })
    this.recreateChangeContentSteps()
    this.recreateChangeMarkSteps()
    this.tr = simplifyTransform(this.tr) ?? this.tr

    return this.tr
  }

  recreateChangeContentSteps (): void {
    // First step: find content changing steps.
    let ops: Operation[] = []
    while (this.ops.length > 0) {
      // get next
      let op = this.ops.shift() as Operation
      ops.push(op)

      let toDoc
      const afterStepJSON = clone(this.currentDoc) // working document receiving patches
      const pathParts = op.path.split('/')

      // collect operations until we receive a valid document:
      // apply ops-patches until a valid prosemirror document is retrieved,
      // then try to create a transformation step or retry with next operation
      while (toDoc == null) {
        applyPatch(afterStepJSON, [op])

        try {
          toDoc = this.schema.nodeFromJSON(afterStepJSON)
          toDoc.check()
        } catch (error: any) {
          toDoc = null
          if (this.ops.length > 0) {
            op = this.ops.shift() as Operation
            ops.push(op)
          } else {
            throw new Error(`No valid diff possible applying ${op.path} ${JSON.stringify(error, undefined, 2)}`)
          }
        }
      }

      // apply operation (ignoring afterStepJSON)
      if (ops.length === 1 && (pathParts.includes('attrs') || pathParts.includes('type'))) {
        // Node markup is changing
        this.addSetNodeMarkup() // a lost update is ignored
        ops = []
      } else if (ops.length === 1 && op.op === 'replace' && pathParts[pathParts.length - 1] === 'text') {
        // Text is being replaced, we apply text diffing to find the smallest possible diffs.
        this.addReplaceTextSteps(op, afterStepJSON)
        ops = []
      } else if (this.addReplaceStep(toDoc, afterStepJSON)) {
        // operations have been applied
        ops = []
      }
    }
  }

  addSetNodeMarkup (): boolean {
    const fromDoc = this.schema.nodeFromJSON(this.currentDoc)
    const toDoc = this.schema.nodeFromJSON(this.finalDoc)
    const start = toDoc.content.findDiffStart(fromDoc.content)
    // @note start is the same (first) position for current and target document
    const fromNode = fromDoc.nodeAt(start ?? 0)
    const toNode = toDoc.nodeAt(start ?? 0)

    if (start != null) {
      // @note this completly updates all attributes in one step, by completely replacing node
      const nodeType = fromNode?.type === toNode?.type ? null : toNode?.type
      try {
        this.tr.setNodeMarkup(start, nodeType, toNode?.attrs, toNode?.marks)
      } catch (e: any) {
        if (nodeType != null && (e.message as string).includes('Invalid content')) {
          // @todo add test-case for this scenario
          if (fromNode != null && toNode != null) {
            this.tr.replaceWith(start, start + fromNode.nodeSize, toNode)
          }
        } else {
          throw e
        }
      }
      this.currentDoc = removeMarks(this.tr.doc).toJSON()
      // setting the node markup may have invalidated the following ops, so we calculate them again.
      this.ops = createPatch(this.currentDoc, this.finalDoc)
      return true
    }
    return false
  }

  recreateChangeMarkSteps (): void {
    // Now the documents should be the same, except their marks, so everything should map 1:1.
    // Second step: Iterate through the toDoc and make sure all marks are the same in tr.doc
    this.toDoc.descendants((tNode, tPos) => {
      if (!tNode.isInline) {
        return true
      }

      this.tr.doc.nodesBetween(tPos, tPos + tNode.nodeSize, (fNode, fPos) => {
        if (!fNode.isInline) {
          return true
        }
        const from = Math.max(tPos, fPos)
        const to = Math.min(tPos + tNode.nodeSize, fPos + fNode.nodeSize)
        fNode.marks.forEach((nodeMark) => {
          if (!nodeMark.isInSet(tNode.marks)) {
            this.tr.removeMark(from, to, nodeMark)
          }
        })
        tNode.marks.forEach((nodeMark) => {
          if (!nodeMark.isInSet(fNode.marks)) {
            this.tr.addMark(from, to, nodeMark)
          }
        })
      })
    })
  }

  addReplaceStep (toDoc: Node, afterStepJSON: any): boolean {
    const fromDoc = this.schema.nodeFromJSON(this.currentDoc)
    const step = getReplaceStep(fromDoc, toDoc)

    if (step == null) {
      return false
    } else if (this.tr.maybeStep(step).failed === null) {
      this.currentDoc = afterStepJSON
      return true // @change previously null
    }

    throw new Error('No valid step found.')
  }

  addReplaceTextSteps (op: any, afterStepJSON: any): void {
    // We find the position number of the first character in the string
    const op1 = { ...op, value: 'xx' }
    const op2 = { ...op, value: 'yy' }
    const afterOP1JSON = clone(this.currentDoc)
    const afterOP2JSON = clone(this.currentDoc)
    applyPatch(afterOP1JSON, [op1])
    applyPatch(afterOP2JSON, [op2])
    const op1Doc = this.schema.nodeFromJSON(afterOP1JSON)
    const op2Doc = this.schema.nodeFromJSON(afterOP2JSON)

    // get text diffs
    const finalText = op.value
    const currentText = getFromPath(this.currentDoc, op.path)
    const textDiffs = diffWordsWithSpace(currentText, finalText)

    let offset = op1Doc.content.findDiffStart(op2Doc.content) as number
    const marks = op1Doc.resolve(offset + 1).marks()

    while (textDiffs.length > 0) {
      const diff = textDiffs.shift() as Change

      if (diff.added === true) {
        const textNode = this.schema.nodeFromJSON({ type: 'text', text: diff.value }).mark(marks)

        if (textDiffs.length > 0 && textDiffs[0].removed === true) {
          const nextDiff = textDiffs.shift() as Change
          this.tr.replaceWith(offset, offset + nextDiff.value.length, textNode)
        } else {
          this.tr.insert(offset, textNode)
        }
        offset += diff.value.length
      } else if (diff.removed === true) {
        if (textDiffs.length > 0 && textDiffs[0].added === true) {
          const nextDiff = textDiffs.shift() as Change
          const textNode = this.schema.nodeFromJSON({ type: 'text', text: nextDiff.value }).mark(marks)
          this.tr.replaceWith(offset, offset + diff.value.length, textNode)
          offset += nextDiff.value.length
        } else {
          this.tr.delete(offset, offset + diff.value.length)
        }
      } else {
        offset += diff.value.length
      }
    }

    this.currentDoc = afterStepJSON
  }
}

export function recreateTransform (fromDoc: Node, toDoc: Node): Transform {
  const recreator = new StepTransform(fromDoc, toDoc)
  return recreator.init()
}
