import { Mark } from '@tiptap/core'

const NAME = 'node-uuid'

/**
 * @public
 */
export const QMSInlineCommentMark = Mark.create({
  name: NAME,
  inline: true,

  parseHTML () {
    return [
      {
        tag: `span[${NAME}]`
      }
    ]
  },

  renderHTML ({ HTMLAttributes }) {
    return ['span', HTMLAttributes, 0]
  }
})
