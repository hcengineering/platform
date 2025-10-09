//
// Copyright © 2024 Hardcore Engineering Inc.
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

import { Doc as YDoc, XmlElement as YXmlElement, XmlText as YXmlText } from 'yjs'
import { yDocFromBuffer, yDocToBuffer, yDocCopyXmlField, yXmlElementClone } from '../ydoc'

describe('ydoc', () => {
  describe('yDocFromBuffer and yDocToBuffer', () => {
    it('should convert YDoc to buffer and back', () => {
      const ydoc = new YDoc()
      const ymap = ydoc.getMap('test')
      ymap.set('key', 'value')
      ymap.set('number', 42)
      ymap.set('boolean', true)

      const buffer = yDocToBuffer(ydoc)
      expect(buffer).toBeInstanceOf(Buffer)
      expect(buffer.length).toBeGreaterThan(0)

      const restoredDoc = yDocFromBuffer(buffer)
      const restoredMap = restoredDoc.getMap('test')
      expect(restoredMap.get('key')).toBe('value')
      expect(restoredMap.get('number')).toBe(42)
      expect(restoredMap.get('boolean')).toBe(true)
    })

    it('should preserve XML fragments', () => {
      const ydoc = new YDoc()
      const fragment = ydoc.getXmlFragment('content')
      const element = new YXmlElement('p')
      element.setAttribute('id', 'test-paragraph')
      fragment.insert(0, [element])

      const buffer = yDocToBuffer(ydoc)
      const restoredDoc = yDocFromBuffer(buffer)
      const restoredFragment = restoredDoc.getXmlFragment('content')
      
      expect(restoredFragment.length).toBe(1)
      const restoredElement = restoredFragment.get(0) as YXmlElement
      expect(restoredElement.nodeName).toBe('p')
      expect(restoredElement.getAttribute('id')).toBe('test-paragraph')
    })

    it('should work with provided YDoc instance', () => {
      const sourceDoc = new YDoc()
      sourceDoc.getMap('data').set('test', 'value')

      const buffer = yDocToBuffer(sourceDoc)
      const targetDoc = new YDoc()
      
      const restoredDoc = yDocFromBuffer(buffer, targetDoc)
      expect(restoredDoc).toBe(targetDoc)
      expect(restoredDoc.getMap('data').get('test')).toBe('value')
    })

    it('should handle empty YDoc', () => {
      const ydoc = new YDoc()
      const buffer = yDocToBuffer(ydoc)
      
      expect(buffer).toBeInstanceOf(Buffer)
      const restoredDoc = yDocFromBuffer(buffer)
      expect(restoredDoc).toBeInstanceOf(YDoc)
    })

    it('should throw error on invalid buffer', () => {
      const invalidBuffer = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF])
      
      expect(() => {
        yDocFromBuffer(invalidBuffer)
      }).toThrow('Failed to apply ydoc update')
    })

    it('should preserve array data', () => {
      const ydoc = new YDoc()
      const yarray = ydoc.getArray('items')
      yarray.push(['item1', 'item2', 'item3'])

      const buffer = yDocToBuffer(ydoc)
      const restoredDoc = yDocFromBuffer(buffer)
      const restoredArray = restoredDoc.getArray('items')
      
      expect(restoredArray.length).toBe(3)
      expect(restoredArray.toArray()).toEqual(['item1', 'item2', 'item3'])
    })

    it('should preserve text data', () => {
      const ydoc = new YDoc()
      const ytext = ydoc.getText('note')
      ytext.insert(0, 'Hello World')

      const buffer = yDocToBuffer(ydoc)
      const restoredDoc = yDocFromBuffer(buffer)
      const restoredText = restoredDoc.getText('note')
      
      expect(String(restoredText)).toBe('Hello World')
    })
  })

  describe('yDocCopyXmlField', () => {
    it('should copy XML fragment from source to target', () => {
      const ydoc = new YDoc()
      const source = ydoc.getXmlFragment('source')
      const target = ydoc.getXmlFragment('target')

      const elem1 = new YXmlElement('p')
      const text1 = new YXmlText('Hello')
      elem1.insert(0, [text1])
      elem1.setAttribute('class', 'paragraph')
      
      const elem2 = new YXmlElement('div')
      elem2.setAttribute('id', 'container')
      
      source.insert(0, [elem1, elem2])

      yDocCopyXmlField(ydoc, 'source', 'target')

      expect(target.length).toBe(2)
      const copiedElem1 = target.get(0) as YXmlElement
      const copiedElem2 = target.get(1) as YXmlElement
      
      expect(copiedElem1.nodeName).toBe('p')
      expect(copiedElem1.getAttribute('class')).toBe('paragraph')
      expect(copiedElem2.nodeName).toBe('div')
      expect(copiedElem2.getAttribute('id')).toBe('container')
    })

    it('should overwrite existing target content', () => {
      const ydoc = new YDoc()
      const sourceFragment = ydoc.getXmlFragment('source')
      const target = ydoc.getXmlFragment('target')

      // Add content to target
      const oldElem = new YXmlElement('old')
      target.insert(0, [oldElem])
      expect(target.length).toBe(1)

      // Add content to source
      const newElem = new YXmlElement('new')
      sourceFragment.insert(0, [newElem])

      yDocCopyXmlField(ydoc, 'source', 'target')

      expect(target.length).toBe(1)
      const copiedElem = target.get(0) as YXmlElement
      expect(copiedElem.nodeName).toBe('new')
    })

    it('should handle empty source', () => {
      const ydoc = new YDoc()
      const source = ydoc.getXmlFragment('source')
      const target = ydoc.getXmlFragment('target')

      const elem = new YXmlElement('test')
      target.insert(0, [elem])

      yDocCopyXmlField(ydoc, 'source', 'target')

      expect(target.length).toBe(0)
    })

    it('should copy nested XML structures', () => {
      const ydoc = new YDoc()
      const source = ydoc.getXmlFragment('source')

      const parent = new YXmlElement('div')
      const child = new YXmlElement('span')
      child.setAttribute('class', 'child')
      parent.insert(0, [child])
      parent.setAttribute('class', 'parent')
      
      source.insert(0, [parent])

      yDocCopyXmlField(ydoc, 'source', 'target')

      const target = ydoc.getXmlFragment('target')
      const copiedParent = target.get(0) as YXmlElement
      
      expect(copiedParent.nodeName).toBe('div')
      expect(copiedParent.getAttribute('class')).toBe('parent')
      expect(copiedParent.length).toBe(1)
      
      const copiedChild = copiedParent.get(0) as YXmlElement
      expect(copiedChild.nodeName).toBe('span')
      expect(copiedChild.getAttribute('class')).toBe('child')
    })
  })

  describe('yXmlElementClone', () => {
    it('should clone simple XML element', () => {
      const elem = new YXmlElement('p')
      elem.setAttribute('class', 'text')
      elem.setAttribute('id', 'paragraph-1')

      const clone = yXmlElementClone(elem)

      expect(clone.nodeName).toBe('p')
      expect(clone.getAttribute('class')).toBe('text')
      expect(clone.getAttribute('id')).toBe('paragraph-1')
    })

    it('should clone element with text content', () => {
      const elem = new YXmlElement('p')
      const text = new YXmlText('Hello World')
      elem.insert(0, [text])

      const clone = yXmlElementClone(elem)

      expect(clone.nodeName).toBe('p')
      expect(clone.length).toBe(1)
      const clonedText = clone.get(0) as YXmlText
      expect(clonedText.toString()).toBe('Hello World')
    })

    it('should clone nested XML elements', () => {
      const parent = new YXmlElement('div')
      parent.setAttribute('class', 'container')

      const child1 = new YXmlElement('p')
      child1.setAttribute('id', 'para-1')
      
      const child2 = new YXmlElement('span')
      child2.setAttribute('id', 'span-1')

      parent.insert(0, [child1, child2])

      const clone = yXmlElementClone(parent)

      expect(clone.nodeName).toBe('div')
      expect(clone.getAttribute('class')).toBe('container')
      expect(clone.length).toBe(2)
      
      const clonedChild1 = clone.get(0) as YXmlElement
      expect(clonedChild1.nodeName).toBe('p')
      expect(clonedChild1.getAttribute('id')).toBe('para-1')
      
      const clonedChild2 = clone.get(1) as YXmlElement
      expect(clonedChild2.nodeName).toBe('span')
      expect(clonedChild2.getAttribute('id')).toBe('span-1')
    })

    it('should clone deeply nested structure', () => {
      const root = new YXmlElement('div')
      const level1 = new YXmlElement('section')
      const level2 = new YXmlElement('article')
      const level3 = new YXmlElement('p')
      const text = new YXmlText('Deep text')

      level3.insert(0, [text])
      level2.insert(0, [level3])
      level1.insert(0, [level2])
      root.insert(0, [level1])

      root.setAttribute('data-root', 'true')
      level1.setAttribute('data-level', '1')
      level2.setAttribute('data-level', '2')
      level3.setAttribute('data-level', '3')

      const clone = yXmlElementClone(root)

      expect(clone.getAttribute('data-root')).toBe('true')
      const clonedLevel1 = clone.get(0) as YXmlElement
      expect(clonedLevel1.getAttribute('data-level')).toBe('1')
      
      const clonedLevel2 = clonedLevel1.get(0) as YXmlElement
      expect(clonedLevel2.getAttribute('data-level')).toBe('2')
      
      const clonedLevel3 = clonedLevel2.get(0) as YXmlElement
      expect(clonedLevel3.getAttribute('data-level')).toBe('3')
      
      const clonedText = clonedLevel3.get(0) as YXmlText
      expect(clonedText.toString()).toBe('Deep text')
    })

    it('should handle empty element', () => {
      const elem = new YXmlElement('div')
      const clone = yXmlElementClone(elem)

      expect(clone.nodeName).toBe('div')
      expect(clone.length).toBe(0)
    })

    it('should clone all attribute types', () => {
      const elem = new YXmlElement('div')
      elem.setAttribute('string', 'text')
      elem.setAttribute('number', 42 as any)
      elem.setAttribute('boolean', true as any)
      elem.setAttribute('null', null as any)

      const clone = yXmlElementClone(elem)

      expect(clone.getAttribute('string')).toBe('text')
      expect(clone.getAttribute('number')).toBe(42)
      expect(clone.getAttribute('boolean')).toBe(true)
      expect(clone.getAttribute('null')).toBe(null)
    })

    it('should clone mixed content (elements and text)', () => {
      const elem = new YXmlElement('p')
      const text1 = new YXmlText('Start ')
      const span = new YXmlElement('span')
      span.setAttribute('class', 'bold')
      const spanText = new YXmlText('bold')
      span.insert(0, [spanText])
      const text2 = new YXmlText(' end')
      
      elem.insert(0, [text1, span, text2])

      const clone = yXmlElementClone(elem)

      expect(clone.length).toBe(3)
      const clonedText1 = clone.get(0) as YXmlText
      expect(clonedText1.toString()).toBe('Start ')
      
      const clonedSpan = clone.get(1) as YXmlElement
      expect(clonedSpan.nodeName).toBe('span')
      expect(clonedSpan.getAttribute('class')).toBe('bold')
      
      const clonedText2 = clone.get(2) as YXmlText
      expect(clonedText2.toString()).toBe(' end')
    })
  })
})
