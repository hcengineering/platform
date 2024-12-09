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
    separatorsStore,
    SeparatorState
  } from '..'
  import { panelstore } from '../panelup'

  export let prevElementSize: SeparatedItem | undefined = undefined
  export let nextElementSize: SeparatedItem | undefined = undefined
  export let separatorSize: number = 1
  export let color: string = 'var(--theme-divider-color)'
  export let name: string
  export let disabledWhen: string[] = []
  export let index: number // index = -1 ; for custom sizes without saving to a localStorage
  export let float: string | boolean = false // false - default state, true - hidden state for float, name - panel name for resize (float state)
  export let short: boolean = false

  let sState: SeparatorState
  $: sState = typeof float === 'string' ? SeparatorState.FLOAT : float ? SeparatorState.HIDDEN : SeparatorState.NORMAL
  const checkFullWidth = (): boolean =>
    sState === SeparatorState.FLOAT && $deviceInfo.isMobile && $deviceInfo.isPortrait

  const direction: 'horizontal' | 'vertical' = 'horizontal'
  let separators: SeparatedItem[] | null = null
  let separatorMap: SeparatedElement[]
  let prevElSize: SeparatedItem
  let nextElSize: SeparatedItem
  let panel: SeparatedItem
  let separator: HTMLElement
  let prevElement: HTMLElement | null
  let nextElement: HTMLElement | null
  let parentElement: HTMLElement | null
  let mounted: boolean = false
  let isSeparate: boolean = false
  let excludedIndexes: number[] = []
  let correctedIndex: number = index
  let realIndex: number = index
  let offset: number = 0
  let separatorsSizes: number[] | null = null
  const separatorsWide: { before: number, after: number, total: number } = { before: 0, after: 0, total: 0 }
  const containers: { minStart: number, minEnd: number, maxStart: number, maxEnd: number } = {
    minStart: -1,
    minEnd: -1,
    maxStart: -1,
    maxEnd: -1
  }
  let parentSize: { start: number, end: number, size: number } | null = null
  let disabled: boolean = false
  let side: 'start' | 'end' | undefined = undefined

  $: fs = $deviceInfo.fontSize
  const remToPx = (rem: number): number => rem * fs
  const pxToRem = (px: number): number => px / fs

  const fetchSeparators = (): void => {
    const res = getSeparators(name, float)
    if (res !== null && !Array.isArray(res)) panel = res
    else if (Array.isArray(res)) {
      separators = res
      prevElSize = separators !== null ? separators[index] : nullSeparatedItem
      nextElSize = separators !== null ? separators[index + 1] : nullSeparatedItem
    }
  }
  $: if (name || float) {
    fetchSeparators()
    if (sState === SeparatorState.NORMAL) {
      if (prevElementSize !== undefined) prevElSize = prevElementSize
      if (nextElementSize !== undefined) nextElSize = nextElementSize
      setTimeout(() => {
        if (parentElement === null && separator != null) parentElement = separator.parentElement
        checkSibling(true)
        calculateSeparators()
      })
    }
    checkSizes()
  }

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
    const rect = element.getBoundingClientRect()
    const sizePx = direction === 'horizontal' ? rect.width : rect.height
    element.setAttribute('data-size', `${sizePx}`)
    if (sState === SeparatorState.NORMAL) {
      if (separators != null) separators[index + (next ? 1 : 0)].size = pxToRem(sizePx)
      if (next) nextElSize.size = typeof size === 'number' ? pxToRem(sizePx) : size
      else prevElSize.size = typeof size === 'number' ? pxToRem(sizePx) : size
    }
  }

  const getStyles = (
    element: Element | null,
    dropStyles: string[] = ['min-width', 'max-width', 'width']
  ): Map<string, string> => {
    const result = new Map<string, string>()
    const style = element != null ? element.getAttribute('style') : null
    if (style !== null) {
      style
        .replace(/ /g, '')
        .split(';')
        .filter((f) => f !== '')
        .forEach((st) => result.set(st.split(':')[0], st.split(':')[1]))
      dropStyles.forEach((key) => result.delete(key))
    }
    return result
  }

  const generateMap = (): void => {
    if (parentElement == null || separators === null || separatorsSizes === null) return
    const children: Element[] = Array.from(parentElement.children)
    if (children.length > 1) {
      const hasSep = children.filter((el) => el.hasAttribute('data-float')).map((el) => el.getAttribute('data-float'))
      const excluded = separators
        .filter((separ) => separ.float !== undefined && !hasSep.includes(separ.float))
        .map((separ) => separ.float)
      excludedIndexes = []
      separators.forEach((separ, i) => {
        if (excluded.includes(separ.float)) excludedIndexes.push(i)
      })
      correctedIndex = index - excludedIndexes.filter((i) => i < index).length
      realIndex = correctedIndex
      const sm: SeparatedElement[] = []
      let ind: number = 0
      let drop: number = 0
      children.forEach((element, i) => {
        if (separators != null) {
          if (separators[ind]?.float !== undefined && excluded.includes(separators[ind].float)) {
            ind++
            drop++
          }
          const styles: Map<string, string> = getStyles(element)
          const rect = element.getBoundingClientRect()
          const size = direction === 'horizontal' ? rect.width : rect.height
          const sep = element.classList.contains('antiSeparator')
          const extra = !(sep || element.hasAttribute('data-size') || element.hasAttribute('data-auto'))
          if (extra) realIndex++
          if (!sep) {
            sm.push({
              id: extra ? -1 : ind,
              element,
              styles,
              minSize: extra
                ? size
                : typeof separators[ind].minSize === 'number'
                  ? remToPx(separators[ind].minSize as number)
                  : remToPx(20),
              maxSize: extra
                ? size
                : typeof separators[ind].maxSize === 'number'
                  ? remToPx(separators[ind].maxSize as number)
                  : -1,
              size,
              begin: ind - drop <= correctedIndex,
              resize: false,
              float: extra ? undefined : separators[ind].float
            })
            if (!extra) ind++
          }
        }
      })
      separatorMap = sm
      const startBoxes = separatorMap.filter((sm) => sm.begin)
      const endBoxes = separatorMap.filter((sm) => !sm.begin)
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
    isSeparate = true
  }

  const initSize = (element: HTMLElement, props: SeparatedItem, next: boolean = false): void => {
    const minSizePx = props.minSize === 'auto' ? '0' : convertSize(remToPx(props.minSize))
    const maxSizePx = convertSize(props.maxSize === 'auto' ? 'auto' : remToPx(props.maxSize))
    const sizePx = convertSize(props.size === 'auto' ? 'auto' : remToPx(props.size))

    if (props.size !== 'auto') {
      setSize(element, remToPx(props.size), next)
      return
    }
    const rect = element.getBoundingClientRect()
    if (direction === 'horizontal') {
      element.style.minWidth = minSizePx
      element.style.maxWidth = maxSizePx
      element.style.width = sizePx
      element.setAttribute('data-auto', `${rect.width}`)
    } else {
      element.style.minHeight = minSizePx
      element.style.maxHeight = maxSizePx
      element.style.height = sizePx
      element.setAttribute('data-auto', `${rect.height}`)
    }
  }

  const checkSizes = (): void => {
    if (sState === SeparatorState.FLOAT) {
      if (checkFullWidth() && panel != null) {
        const s = pxToRem(window.innerWidth)
        panel.size = s
        panel.maxSize = s
        panel.minSize = s
      }
      if (parentElement != null && panel != null) initSize(parentElement, panel)
    } else if (sState === SeparatorState.NORMAL) {
      if (prevElement != null && prevElSize != null) initSize(prevElement, prevElSize)
      if (nextElement != null && nextElSize != null) initSize(nextElement, nextElSize, true)
    }
  }

  const applyStyles = (final: boolean = false): void => {
    if (separatorMap == null) return
    const side = direction === 'horizontal' ? 'width' : 'height'
    separatorMap.forEach((item) => {
      if (item.resize || final) {
        let style: string = `min-${side}:${
          item.maxSize !== -1 ? item.size + 'px' : item.minSize === -1 ? '0' : item.minSize + 'px'
        };`
        style += item.maxSize === -1 ? '' : `max-${side}:${item.size + 'px'};`
        style += item.maxSize !== -1 ? `${side}:${item.size}px;` : ''
        if (item.styles !== null) {
          item.styles.forEach((value, key) => {
            if (key !== 'pointer-events' || final) style += `${key}:${value};`
          })
        }
        if (isSeparate) style += 'pointer-events:none;'
        item.element.setAttribute('style', style)
        if (final && item.id !== -1) {
          const rect = item.element.getBoundingClientRect()
          item.element.setAttribute(
            item.maxSize === -1 ? 'data-auto' : 'data-size',
            `${direction === 'horizontal' ? rect.width : rect.height}`
          )
        }
        item.resize = false
      }
    })
  }

  const resizeContainer = (id: number, min: number, max: number, count: number, stretch: boolean = false): number => {
    const diff = max - min
    if (diff !== 0) {
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

  function pointerMove (event: PointerEvent): void {
    if (sState === SeparatorState.NORMAL) normalMouseMove(event)
    else if (sState === SeparatorState.FLOAT) floatMouseMove(event)
  }

  const preparePanel = (): void => {
    if (parentElement === null || parentSize === null) return
    setSize(parentElement, panel.size === 'auto' ? 'auto' : remToPx(panel.size))
    const s = separator.getBoundingClientRect()
    if (s) {
      const currentPoint = direction === 'horizontal' ? s.x : s.y
      side =
        parentSize.end - separatorSize === currentPoint
          ? 'end'
          : parentSize.start === currentPoint
            ? 'start'
            : undefined
    }
    if (side !== undefined) isSeparate = true
    parentElement.style.pointerEvents = 'none'
  }

  function floatMouseMove (event: PointerEvent): void {
    if (!isSeparate || parentSize === null || parentElement === null) return
    const coord: number = Math.round(direction === 'horizontal' ? event.x - offset : event.y - offset)
    const parentCoord: number = coord - parentSize.start
    const min = remToPx(panel.minSize === 'auto' ? 10 : panel.minSize)
    const max = remToPx(panel.maxSize === 'auto' ? 30 : panel.maxSize)
    const newCoord =
      side === 'start'
        ? parentSize.size - parentCoord < min - separatorSize
          ? min
          : parentSize.size - parentCoord > max - separatorSize
            ? max
            : parentSize.size - parentCoord
        : parentCoord < min - separatorSize
          ? min
          : parentCoord > max - separatorSize
            ? max
            : parentCoord - separatorSize
    panel.size = pxToRem(newCoord)
    setSize(parentElement, newCoord)
  }

  function normalMouseMove (event: PointerEvent): void {
    if (!isSeparate || separatorMap === undefined || parentSize === null || separatorsSizes === null) return
    const coord: number = Math.round(direction === 'horizontal' ? event.x - offset : event.y - offset)
    let parentCoord: number = coord - parentSize.start
    let prevCoord: number = separatorMap
      .filter((f) => f.begin)
      .map((m) => m.size)
      .reduce((prev, a) => prev + a, 0)
    prevCoord += separatorsWide.before
    const startSizeMin = containers.minStart + separatorsWide.before
    const startSizeMax = containers.maxStart === -1 ? -1 : containers.maxStart + separatorsWide.before
    if (parentCoord <= startSizeMin) parentCoord = startSizeMin + 1
    if (startSizeMax !== -1 && parentCoord > startSizeMax) parentCoord = startSizeMax
    const endSizeMin = containers.minEnd + separatorsWide.after
    const endSizeMax = containers.maxEnd === -1 ? -1 : containers.maxEnd + separatorsWide.after
    if (parentCoord > parentSize.size - endSizeMin - separatorSize) {
      parentCoord = parentSize.size - endSizeMin - separatorSize
    }
    if (endSizeMax !== -1 && parentCoord < parentSize.size - endSizeMax - separatorSize) {
      parentCoord = parentSize.size - endSizeMax - separatorSize
    }
    const diff = prevCoord - parentCoord // + <-  - ->
    let remains = diff
    if (remains !== 0) {
      const reverse = remains < 0
      if (reverse) remains = Math.abs(remains)
      const minusId = realIndex + (reverse ? 1 : 0)
      const plusId = realIndex + (reverse ? 0 : 1)

      const minusAutoBoxes = separatorMap.filter(
        (s, i) => s.maxSize === -1 && ((!reverse && i < realIndex) || (reverse && i > realIndex + 1))
      )
      const minusBoxes = separatorMap.filter(
        (s, i) => s.maxSize !== -1 && ((!reverse && i < realIndex) || (reverse && i > realIndex + 1))
      )
      const minusBox = separatorMap[minusId]
      const startMinus = separatorMap[minusId].maxSize === -1
      const plusAutoBoxes = separatorMap.filter(
        (s, i) => s.maxSize === -1 && ((!reverse && i > realIndex + 1) || (reverse && i < realIndex))
      )
      const plusBoxes = separatorMap.filter(
        (s, i) => s.maxSize !== -1 && ((!reverse && i > realIndex + 1) || (reverse && i < realIndex))
      )
      const plusBox = separatorMap[plusId]
      const startPlus = separatorMap[plusId].maxSize === -1

      // Find for crop
      if (startMinus && minusBox.size - minusBox.minSize > 0) {
        remains = resizeContainer(minusId, minusBox.minSize, minusBox.size, remains)
      }
      if (remains > 0 && minusAutoBoxes.length > 0) {
        minusAutoBoxes.forEach((box) => {
          if (remains > 0) remains = resizeContainer(box.id, box.minSize, box.size, remains)
        })
      }
      if (remains > 0 && !startMinus && minusBox.size - minusBox.minSize > 0) {
        remains = resizeContainer(minusId, minusBox.minSize, minusBox.size, remains)
      }
      if (remains > 0 && minusBoxes.length > 0) {
        minusBoxes.forEach((box) => {
          if (remains > 0) remains = resizeContainer(box.id, box.minSize, box.size, remains)
        })
      }
      let needAdd: number = Math.abs(diff) - remains
      // Find for stretch
      if (needAdd > 0 && startPlus) needAdd = stretchContainer(plusId, plusBox.size + needAdd)
      if (needAdd > 0 && plusAutoBoxes.length > 0) {
        const div = needAdd / plusAutoBoxes.length
        plusAutoBoxes.forEach((box) => (needAdd = stretchContainer(box.id, box.size + div)))
      }
      if (needAdd > 0 && plusBox.maxSize - plusBox.size > 0) {
        needAdd = resizeContainer(plusId, plusBox.size, plusBox.maxSize, needAdd, true)
      }
      if (needAdd > 0 && plusBoxes.length > 0) {
        plusBoxes.forEach((box) => {
          if (needAdd > 0) needAdd = resizeContainer(box.id, box.size, box.maxSize, needAdd, true)
        })
      }
      separatorMap = separatorMap
    }
    applyStyles()
    if ($panelstore.panel?.refit !== undefined) $panelstore.panel.refit()
  }

  function pointerUp (): void {
    finalSeparation()
    document.removeEventListener('pointermove', pointerMove)
    document.removeEventListener('pointerup', pointerUp)
  }
  function finalSeparation (): void {
    isSeparate = false
    if (sState === SeparatorState.NORMAL) {
      applyStyles(true)
      if (index !== -1 && separators != null && separatorMap != null) {
        let ind: number = 0
        const sep: SeparatedItem[] = []
        separatorMap = separatorMap.filter((sm) => sm.id !== -1)
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
        saveSeparator(name, false, sep)
      }
    } else if (sState === SeparatorState.FLOAT && parentElement != null) {
      parentElement.style.pointerEvents = 'all'
      if (!checkFullWidth()) saveSeparator(name, float, panel)
    }
    document.body.style.cursor = ''
  }

  function pointerDown (event: PointerEvent): void {
    if (checkFullWidth()) return
    prepareSeparation(event)
    document.addEventListener('pointermove', pointerMove)
    document.addEventListener('pointerup', pointerUp)
  }
  function prepareSeparation (event: PointerEvent): void {
    if (parentElement == null) return
    if (sState === SeparatorState.FLOAT && parentElement === null) {
      checkParent()
      return
    } else if (sState === SeparatorState.NORMAL && (prevElement === null || nextElement === null)) {
      checkSibling()
      return
    }
    offset = Math.round(direction === 'horizontal' ? event.offsetX : event.offsetY)
    const p = parentElement.getBoundingClientRect()
    parentSize =
      direction === 'horizontal'
        ? { start: p.left, end: p.right, size: p.width }
        : { start: p.top, end: p.bottom, size: p.height }
    if (sState === SeparatorState.NORMAL) {
      calculateSeparators()
      generateMap()
      applyStyles(true)
    } else if (sState === SeparatorState.FLOAT) preparePanel()
    document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize'
  }

  const checkSibling = (start: boolean = false): void => {
    if (separator === null) return
    if ((prevElement === null || start) && separator != null) {
      prevElement = separator.previousElementSibling as HTMLElement
    }
    if ((nextElement === null || start) && separator != null) {
      nextElement = separator.nextElementSibling as HTMLElement
    }
    if (separators != null && prevElement != null && separators[index].float !== undefined) {
      prevElement.setAttribute('data-float', separators[index].float ?? '')
    }
    if (separators != null && nextElement != null && separators[index + 1].float !== undefined) {
      nextElement.setAttribute('data-float', separators[index + 1].float ?? '')
    }
  }
  const checkParent = (): void => {
    if (parentElement === null && separator != null) parentElement = separator.parentElement as HTMLElement
    if (parentElement != null && typeof float === 'string') parentElement.setAttribute('data-float', float)
  }

  const calculateSeparators = (): void => {
    if (parentElement != null) {
      const elements: Element[] = Array.from(parentElement.children)
      separatorsSizes = elements
        .filter((el) => el.classList.contains('antiSeparator'))
        .map((el) => parseInt(el.getAttribute('data-size') ?? '0', 10))
      separatorsWide.total = separatorsSizes.reduce((prev, a) => prev + a, 0)
      separatorsWide.before = separatorsSizes.slice(0, index).reduce((prev, a) => prev + a, 0)
      separatorsWide.after = separatorsSizes.slice(index + 1, separatorsSizes.length).reduce((prev, a) => prev + a, 0)
    }
  }

  let checkElements: boolean = false
  const resizeDocument = (): void => {
    if (checkFullWidth()) checkSizes()
    if (parentElement == null || checkElements || sState !== SeparatorState.NORMAL) return
    checkElements = true
    setTimeout(() => {
      if (parentElement != null && separators != null) {
        const children: Element[] = Array.from(parentElement.children)
        let totalSize: number = 0
        let ind: number = 0
        const rects = new Map<number, { size: number, element: HTMLElement }>()
        const hasSep: string[] = []
        children.forEach((ch) => {
          const rect = ch.getBoundingClientRect()
          if (
            !ch.classList.contains('antiSeparator') &&
            (ch.hasAttribute('data-size') || ch.hasAttribute('data-auto'))
          ) {
            rects.set(ind++, {
              size: direction === 'horizontal' ? rect.width : rect.height,
              element: ch as HTMLElement
            })
          }
          if (ch.hasAttribute('data-float')) hasSep.push(ch.getAttribute('data-float') ?? '')
          totalSize += direction === 'horizontal' ? rect.width : rect.height
        })
        const parentRect = parentElement.getBoundingClientRect()
        let diff = totalSize - (direction === 'horizontal' ? parentRect.width : parentRect.height)
        if (diff > 0) {
          const excluded = separators
            .filter((separ) => separ.float !== undefined && !hasSep.includes(separ.float))
            .map((separ) => separ.float)
          const reverseSep = [...separators].reverse()
          let ind: number = 0
          reverseSep.forEach((separ, i) => {
            const pass = excluded.includes(separ.float)
            if (diff > 0 && !pass && separators != null) {
              const box = rects.get(reverseSep.length - ind - 1)
              if (box != null) {
                const minSize: number = remToPx(separ.minSize === 'auto' ? 20 : separ.minSize)
                const forCrop = box.size - minSize
                if (forCrop > 0) {
                  const newSize = forCrop - diff < 0 ? minSize : box.size - diff
                  diff -= forCrop
                  if (separ.maxSize !== 'auto') {
                    if (direction === 'horizontal') {
                      box.element.style.width = `${newSize}px`
                      box.element.style.minWidth = `${newSize}px`
                      box.element.style.maxWidth = `${newSize}px`
                    } else {
                      box.element.style.height = `${newSize}px`
                      box.element.style.minHeight = `${newSize}px`
                      box.element.style.maxHeight = `${newSize}px`
                    }
                  }
                  separators[separators.length - i - 1].size = newSize
                }
              }
              ind++
            }
          })
        }
      }
      checkElements = false
    }, 100)
  }

  onMount(() => {
    if (separator != null) {
      parentElement = separator.parentElement as HTMLElement
      if (sState === SeparatorState.FLOAT) checkParent()
      else if (sState === SeparatorState.NORMAL) {
        checkSibling(true)
        calculateSeparators()
      }
      checkSizes()
      mounted = true
    }
    window.addEventListener('resize', resizeDocument)
    if (sState !== SeparatorState.FLOAT && $separatorsStore.filter((f) => f === name).length === 0) {
      $separatorsStore = [...$separatorsStore, name]
    }
  })
  onDestroy(() => {
    window.removeEventListener('resize', resizeDocument)
    if (sState !== SeparatorState.FLOAT && $separatorsStore.filter((f) => f === name).length > 0) {
      $separatorsStore = $separatorsStore.filter((f) => f !== name)
    }
  })
  afterUpdate(() => {
    if (mounted) {
      if (sState === SeparatorState.FLOAT) checkParent()
      else if (sState === SeparatorState.NORMAL) checkSibling()
    }
  })
  $: disabled = $separatorsStore.filter((f) => disabledWhen.findIndex((d) => d === f) !== -1).length > 0
</script>

{#if sState !== SeparatorState.HIDDEN}
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div
    bind:this={separator}
    style:--separator-size={`${separatorSize}px`}
    style:background-color={color}
    style:pointer-events={disabled ? 'none' : 'all'}
    class="antiSeparator {direction}"
    class:short
    class:hovered={isSeparate}
    data-size={separatorSize}
    on:pointerdown|stopPropagation={pointerDown}
  />
{/if}

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
      background-color: var(--primary-button-default);
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
      max-width: var(--separator-size, 1px);
      cursor: col-resize;

      &:not(.short) {
        height: 100%;
      }
      &.short {
        height: calc(100% - 1rem);
        margin-top: 0.5rem;
      }
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
      height: var(--separator-size, 1px);
      max-height: var(--separator-size, 1px);
      cursor: row-resize;

      &:not(.short) {
        width: 100%;
      }
      &.short {
        width: calc(100% - 1rem);
        margin-left: 0.5rem;
      }
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
