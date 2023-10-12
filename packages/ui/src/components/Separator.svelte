<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
-->
<script lang="ts">
  import { afterUpdate, onDestroy, onMount } from 'svelte'
  import type { TSeparatedItem, SeparatedItem } from '..'
  import {
    nullSeparatedItem,
    deviceOptionsStore as deviceInfo,
    getSeparators,
    saveSeparator,
    SeparatedElement,
    separatorsStore
  } from '..'

  export let prevElementSize: SeparatedItem | undefined = undefined
  export let nextElementSize: SeparatedItem | undefined = undefined
  export let separatorSize: number = 1
  export let color: string = 'var(--theme-divider-color)'
  export let name: string
  export let disabledWhen: string[] = []
  export let index: number // index = -1 ; for custom sizes without saving to a localStorage

  const direction: 'horizontal' | 'vertical' = 'horizontal'
  let separators: SeparatedItem[] | null = null
  let separatorMap: SeparatedElement[]
  let prevElSize: SeparatedItem
  let nextElSize: SeparatedItem
  let separator: HTMLElement
  let prevElement: HTMLElement | null
  let nextElement: HTMLElement | null
  let mounted: boolean = false
  let isSeparate: boolean = false
  let excludedIndexes: number[] = []
  let correctedIndex: number = index
  let offset: number = 0
  let separatorsSizes: number[] | null = null
  const separatorsWide: { start: number; end: number; total: number } = { start: 0, end: 0, total: 0 }
  const containers: { minStart: number; minEnd: number; maxStart: number; maxEnd: number } = {
    minStart: -1,
    minEnd: -1,
    maxStart: -1,
    maxEnd: -1
  }
  let parentSize: { start: number; end: number; size: number } | null = null
  let disabled: boolean = false

  const fetchSeparators = (): void => {
    separators = getSeparators(name)
    prevElSize = separators !== null ? separators[index] : nullSeparatedItem
    nextElSize = separators !== null ? separators[index + 1] : nullSeparatedItem
  }
  $: if (name) {
    fetchSeparators()
    if (prevElementSize !== undefined) prevElSize = prevElementSize
    if (nextElementSize !== undefined) nextElSize = nextElementSize
    checkSizes()
  }

  $: fs = $deviceInfo.fontSize
  const remToPx = (rem: number): number => rem * fs
  const pxToRem = (px: number): number => px / fs

  const convertSize = (prop: TSeparatedItem): string => (typeof prop === 'number' ? `${prop}px` : '')

  const setSize = (element: HTMLElement, size: TSeparatedItem, next: boolean = false): void => {
    const s = convertSize(size)
    if (direction === 'horizontal') {
      element.style.minWidth = size === 'auto' ? '0' : s
      element.style.maxWidth = s
      element.style.width = s
    } else {
      element.style.minHeight = size === 'auto' ? '0' : s
      element.style.maxHeight = s
      element.style.height = s
    }
    const sizePx = direction === 'horizontal' ? element.clientWidth : element.clientHeight
    element.setAttribute('data-size', `${sizePx}`)
    if (separators) separators[index + (next ? 1 : 0)].size = pxToRem(sizePx)
    if (next) nextElSize.size = typeof size === 'number' ? pxToRem(sizePx) : size
    else prevElSize.size = typeof size === 'number' ? pxToRem(sizePx) : size
  }

  const generateMap = (): void => {
    const parent = separator.parentElement
    if (parent === null) return
    const p = parent.getBoundingClientRect()
    parentSize =
      direction === 'horizontal'
        ? { start: p.left, end: p.right, size: p.width }
        : { start: p.top, end: p.bottom, size: p.height }
    const children: Element[] = Array.from(parent.children)
    if (children.length > 1 && separators !== null) {
      const elements = children.filter(
        (el) =>
          !el.classList.contains('antiSeparator') && (el.hasAttribute('data-size') || el.hasAttribute('data-auto'))
      )
      const hasSep = elements.filter((el) => el.hasAttribute('data-float')).map((el) => el.getAttribute('data-float'))
      const excluded = separators
        .filter((separ) => separ.float !== undefined && !hasSep.includes(separ.float))
        .map((separ) => separ.float)
      excludedIndexes = []
      separators.forEach((separ, i) => {
        if (excluded.includes(separ.float)) excludedIndexes.push(i)
      })
      correctedIndex = index - excludedIndexes.filter((i) => i < index).length
      const sm: SeparatedElement[] = []
      let ind: number = 0
      elements.forEach((element, i) => {
        if (separators && excluded.includes(separators[i].float)) ind++
        const styles = new Map<string, string>()
        const dropStyles = ['min-width', 'max-width', 'width']
        const style = elements[i] ? elements[i].getAttribute('style') : null
        if (style !== null) {
          style
            .replace(/ /g, '')
            .split(';')
            .filter((f) => f !== '')
            .forEach((st) => styles.set(st.split(':')[0], st.split(':')[1]))
          dropStyles.forEach((key) => styles.delete(key))
        }
        const size = direction === 'horizontal' ? elements[i].clientWidth : elements[i].clientHeight
        if (separators) {
          sm.push({
            id: ind,
            element,
            styles,
            minSize:
              typeof separators[ind].minSize === 'number' ? remToPx(separators[ind].minSize as number) : remToPx(20),
            maxSize: typeof separators[ind].maxSize === 'number' ? remToPx(separators[ind].maxSize as number) : -1,
            size,
            begin: i <= correctedIndex,
            resize: false,
            float: separators[ind].float
          })
        }
        ind++
      })
      separatorMap = sm
      const cropIndex = correctedIndex - excludedIndexes.filter((ex) => ex < correctedIndex).length
      const startBoxes = separatorMap.filter((_, i) => i < cropIndex + 1)
      const endBoxes = separatorMap.slice(cropIndex + 1, sm.length)
      containers.minStart = startBoxes.map((box) => box.minSize).reduce((prev, a) => prev + a, 0)
      containers.minEnd = endBoxes.map((box) => box.minSize).reduce((prev, a) => prev + a, 0)
      containers.maxStart =
        startBoxes.filter((box) => box.maxSize === -1).length > 0
          ? -1
          : startBoxes.map((box) => box.maxSize).reduce((prev, a) => prev + a, 0)
      containers.maxEnd =
        endBoxes.filter((box) => box.maxSize === -1).length > 0
          ? -1
          : endBoxes.map((box) => box.maxSize).reduce((prev, a) => prev + a, 0)
    }
  }

  const initSize = (element: HTMLElement, props: SeparatedItem, next: boolean = false): void => {
    const minSizePx = props.minSize === 'auto' ? '0' : convertSize(remToPx(props.minSize))
    const maxSizePx = convertSize(props.maxSize === 'auto' ? 'auto' : remToPx(props.maxSize))
    const sizePx = convertSize(props.size === 'auto' ? 'auto' : remToPx(props.size))

    if (props.size !== 'auto') {
      setSize(element, remToPx(props.size), next)
      return
    }
    if (direction === 'horizontal') {
      element.style.minWidth = minSizePx
      element.style.maxWidth = maxSizePx
      element.style.width = sizePx
      element.setAttribute('data-auto', `${element.clientWidth}`)
    } else {
      element.style.minHeight = minSizePx
      element.style.maxHeight = maxSizePx
      element.style.height = sizePx
      element.setAttribute('data-auto', `${element.clientHeight}`)
    }
  }

  const checkSizes = (): void => {
    if (prevElement) initSize(prevElement, prevElSize)
    if (nextElement) initSize(nextElement, nextElSize, true)
  }

  const applyStyles = (final: boolean = false): void => {
    if (separatorMap === null) return
    const side = direction === 'horizontal' ? 'width' : 'height'
    const sum = separatorMap
      .filter((f) => f.maxSize !== -1)
      .map((el) => el.size)
      .reduce((prev, a) => prev + a, separatorsWide.total)
    separatorMap.forEach((item) => {
      if (item.resize || final) {
        let style: string = `min-${side}:${
          item.maxSize !== -1 ? item.size + 'px' : item.minSize === -1 ? '0' : item.minSize + 'px'
        };`
        style += item.maxSize === -1 ? '' : `max-${side}:${item.size + 'px'};`
        style += item.maxSize !== -1 ? `${side}:${item.size}px;` : `${side}:calc(100% - ${sum}px);`
        if (item.styles !== null) {
          item.styles.forEach((value, key) => {
            if (key !== 'pointer-events' || final) style += `${key}:${value};`
          })
        }
        if (isSeparate) style += 'pointer-events:none;'
        item.element.setAttribute('style', style)
        item.resize = false
      }
    })
  }

  const resizeContainer = (id: number, min: number, max: number, count: number, stretch: boolean = false): number => {
    const diff = max - min
    if (diff) {
      const size = min + (count >= diff ? (stretch ? diff : 0) : stretch ? count : diff - count)
      separatorMap[id].size = size
      separatorMap[id].resize = true
      count = count - diff <= 0 ? 0 : count - diff
    }
    return count
  }
  const stretchContainer = (id: number, size: number): number => {
    separatorMap[id].size = size
    separatorMap[id].resize = true
    return 0
  }

  function mouseMove (event: MouseEvent) {
    if (!isSeparate || separatorMap === null || parentSize === null || separatorsSizes === null) return
    const coord: number = direction === 'horizontal' ? event.x - offset : event.y - offset
    let parentCoord: number = coord - parentSize.start
    let prevCoord: number = separatorMap
      .filter((f) => f.begin)
      .map((m) => m.size)
      .reduce((prev, a) => prev + a, 0)
    for (let i = 0; i < correctedIndex; i++) prevCoord += separatorsSizes[i]
    const startSizeMin = containers.minStart + separatorsWide.start
    const startSizeMax = containers.maxStart === -1 ? -1 : containers.maxStart + separatorsWide.start
    if (parentCoord <= startSizeMin) parentCoord = startSizeMin + 1
    if (startSizeMax !== -1 && parentCoord > startSizeMax) parentCoord = startSizeMax
    const endSizeMin = containers.minEnd + separatorsWide.end
    const endSizeMax = containers.maxEnd === -1 ? -1 : containers.maxEnd + separatorsWide.end
    if (parentCoord > parentSize.size - endSizeMin) parentCoord = parentSize.size - endSizeMin - 1
    if (endSizeMax !== -1 && parentCoord < parentSize.size - endSizeMax) parentCoord = parentSize.size - endSizeMax - 1
    const diff = prevCoord - parentCoord // + <-  - ->
    let remains = diff
    if (remains !== 0) {
      const reverse = remains < 0
      if (reverse) remains = Math.abs(remains)
      const minusId = correctedIndex + (reverse ? 1 : 0)
      const plusId = correctedIndex + (reverse ? 0 : 1)

      const minusAutoBoxes = separatorMap.filter(
        (s, i) => s.maxSize === -1 && ((!reverse && i < correctedIndex) || (reverse && i > correctedIndex + 1))
      )
      const minusBoxes = separatorMap.filter(
        (s, i) => s.maxSize !== -1 && ((!reverse && i < correctedIndex) || (reverse && i > correctedIndex + 1))
      )
      const minusBox = separatorMap[minusId]
      const startMinus = separatorMap[minusId].maxSize === -1
      const plusAutoBoxes = separatorMap.filter(
        (s, i) => s.maxSize === -1 && ((!reverse && i > correctedIndex + 1) || (reverse && i < correctedIndex))
      )
      const plusBoxes = separatorMap.filter(
        (s, i) => s.maxSize !== -1 && ((!reverse && i > correctedIndex + 1) || (reverse && i < correctedIndex))
      )
      const plusBox = separatorMap[plusId]
      const startPlus = separatorMap[plusId].maxSize === -1

      // Find for crop
      if (startMinus && minusBox.size - minusBox.minSize > 0) {
        remains = resizeContainer(minusId, minusBox.minSize, minusBox.size, remains)
      }
      if (remains && minusAutoBoxes.length > 0) {
        minusAutoBoxes.forEach((box) => {
          if (remains) remains = resizeContainer(box.id, box.minSize, box.size, remains)
        })
      }
      if (remains && !startMinus && minusBox.size - minusBox.minSize > 0) {
        remains = resizeContainer(minusId, minusBox.minSize, minusBox.size, remains)
      }
      if (remains && minusBoxes.length > 0) {
        minusBoxes.forEach((box) => {
          if (remains) remains = resizeContainer(box.id, box.minSize, box.size, remains)
        })
      }
      let needAdd: number = Math.abs(diff) - remains
      // Find for stretch
      if (needAdd && startPlus) needAdd = stretchContainer(plusId, plusBox.size + needAdd)
      if (needAdd && plusAutoBoxes.length > 0) {
        const div = needAdd / plusAutoBoxes.length
        plusAutoBoxes.forEach((box) => (needAdd = stretchContainer(box.id, box.size + div)))
      }
      if (needAdd && plusBox.maxSize - plusBox.size > 0) {
        needAdd = resizeContainer(plusId, plusBox.size, plusBox.maxSize, needAdd, true)
      }
      if (needAdd && plusBoxes.length > 0) {
        plusBoxes.forEach((box) => {
          if (needAdd) needAdd = resizeContainer(box.id, box.size, box.maxSize, needAdd, true)
        })
      }
      separatorMap = separatorMap
    }
    applyStyles()
  }

  function mouseUp () {
    isSeparate = false
    applyStyles(true)
    if (index !== -1 && separators && separatorMap) {
      let ind: number = 0
      const sep: SeparatedItem[] = []
      separators.forEach((sm, i) => {
        let save = false
        if (excludedIndexes.includes(i)) {
          save = true
          ind++
        }
        if (save) sep.push(sm)
        else {
          sep.push({
            size: separatorMap[i - ind].maxSize === -1 ? 'auto' : pxToRem(separatorMap[i - ind].size),
            minSize: pxToRem(separatorMap[i - ind].minSize),
            maxSize: separatorMap[i - ind].maxSize === -1 ? 'auto' : pxToRem(separatorMap[i - ind].maxSize),
            float: separatorMap[i - ind].float
          })
        }
      })
      saveSeparator(name, sep)
    }
    document.body.style.userSelect = 'auto'
    document.body.style.webkitUserSelect = 'auto'
    document.body.style.cursor = ''
    document.removeEventListener('mousemove', mouseMove)
    document.removeEventListener('mouseup', mouseUp)
  }

  function mouseDown (event: MouseEvent) {
    if (prevElement === null || nextElement === null) {
      checkSibling()
      return
    }
    offset = direction === 'horizontal' ? event.offsetX : event.offsetY
    generateMap()
    isSeparate = true
    applyStyles(true)
    document.addEventListener('mousemove', mouseMove)
    document.addEventListener('mouseup', mouseUp)
    document.body.style.userSelect = 'none'
    document.body.style.webkitUserSelect = 'none'
    document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize'
  }

  const checkSibling = (start: boolean = false): void => {
    if (prevElement === null || start) prevElement = separator.previousElementSibling as HTMLElement
    if (nextElement === null || start) nextElement = separator.nextElementSibling as HTMLElement
    if (separators && prevElement && separators[index].float !== undefined) {
      prevElement.setAttribute('data-float', separators[index].float ?? '')
    }
    if (separators && nextElement && separators[index + 1].float !== undefined) {
      nextElement.setAttribute('data-float', separators[index + 1].float ?? '')
    }
  }

  onMount(() => {
    if (separator) {
      checkSibling(true)
      const parent = separator.parentElement
      if (parent) {
        const elements: Element[] = Array.from(parent.children)
        separatorsSizes = elements
          .filter((el) => el.classList.contains('antiSeparator'))
          .map((el) => parseInt(el.getAttribute('data-size') ?? '0', 10))
        separatorsWide.total = separatorsSizes.reduce((prev, a) => prev + a, 0)
        separatorsWide.start = separatorsSizes.slice(0, index).reduce((prev, a) => prev + a, 0)
        separatorsWide.end = separatorsSizes.slice(index + 1, separatorsSizes.length).reduce((prev, a) => prev + a, 0)
      }
      checkSizes()
      mounted = true
    }
    document.addEventListener('resize', checkSizes)
    if ($separatorsStore.filter((f) => f === name).length === 0) $separatorsStore = [...$separatorsStore, name]
    disabled = $separatorsStore.filter((f) => disabledWhen.findIndex((d) => d === f) !== -1).length > 0
  })
  onDestroy(() => {
    document.removeEventListener('resize', checkSizes)
    if ($separatorsStore.filter((f) => f === name).length > 0) {
      $separatorsStore = $separatorsStore.filter((f) => f !== name)
    }
  })
  afterUpdate(() => {
    if (mounted) checkSibling()
  })
</script>

<div
  bind:this={separator}
  style:--separator-size={`${separatorSize}px`}
  style:background-color={color}
  style:pointer-events={disabled ? 'none' : 'all'}
  class="antiSeparator {direction}"
  class:hovered={isSeparate}
  data-size={separatorSize}
  on:mousedown|stopPropagation={mouseDown}
/>

<style lang="scss">
  .antiSeparator {
    position: relative;
    flex-shrink: 0;

    &::after,
    &::before {
      position: absolute;
      content: '';
      z-index: 402;
    }
    &::after {
      background-color: var(--theme-primary-default);
      transform-origin: center;
      transition-property: transform;
      transition-timing-function: ease-in-out;
      transition-duration: 0.1s;
      transition-delay: 0s;
    }
    &.hovered::after,
    &:hover::after {
      transition-duration: 0.15s;
      transition-delay: 0.25s;
    }
    &.horizontal {
      width: var(--separator-size, 1px);
      height: 100%;
      max-width: var(--separator-size, 1px);
      cursor: col-resize;

      &::after,
      &::before {
        top: 0;
        left: -2px;
        width: calc(4px + var(--separator-size, 1px));
        height: 100%;
      }
      &::after {
        transform: scaleX(0);
      }
      &.hovered::after,
      &:hover::after {
        transform: scaleX(1);
      }
    }
    &.vertical {
      width: 100%;
      height: var(--separator-size, 1px);
      max-height: var(--separator-size, 1px);
      cursor: row-resize;

      &::after,
      &::before {
        top: -2px;
        left: 0;
        width: 100%;
        height: calc(4px + var(--separator-size, 1px));
      }
      &::after {
        transform: scaleY(0);
      }
      &.hovered::after,
      &:hover::after {
        transform: scaleY(1);
      }
    }
  }
</style>
