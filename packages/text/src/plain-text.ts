import { SaxesParser } from "saxes"

const blockTags = [ 'address', 'article', 'aside', 'blockquote', 'canvas', 'dd', 'div', 'dl', 'dt', 'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'header', 'hr', 'li', 'main', 'nav', 'ol', 'p', 'pre', 'section', 'table', 'tfoot', 'ul', 'video' ]
const ELLIPSIS_CHAR = '…'
const WHITESPACE = ' '

export function stripTags(htmlString: string, textLimit = 0): string {
  const parser = new SaxesParser()
  let plainList: string[] = []
  let charCount = 0
  let isHardStop = false

  parser.on('text', (text: string) => {
    if (isHardStop) {
      return
    }

    if (textLimit > 0 && (charCount + text.length) > textLimit) {
      const toAddCount = textLimit - charCount
      const textPart = text.substring(0, toAddCount)
      plainList.push(textPart)
      plainList.push(ELLIPSIS_CHAR)
      isHardStop = true
      return
    }

    charCount += text.length
    plainList.push(text)
  })

  parser.on("opentag", (node) => {
    if (isHardStop) {
      return
    }

    const tagName = node.name.toLowerCase()
    if (blockTags.indexOf(tagName) > -1) {
      if (plainList.length > 0 && plainList[plainList.length - 1] !== WHITESPACE) {
        plainList.push(WHITESPACE)
        charCount++
      }
    }
  })

  parser.write(htmlString).close()

  const text = plainList.join('')
  // TODO: remove repetetibe white spaces
  return text
}