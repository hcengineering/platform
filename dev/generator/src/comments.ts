import chunter, { Comment } from '@hcengineering/chunter'
import { AttachedData, Class, Doc, generateId, Ref, Space, TxOperations } from '@hcengineering/core'
import faker from 'faker'

export interface CommentOptions {
  min: number
  max: number
  paragraphMin: number
  paragraphMax: number
  updateFactor: number // 0-100 value, will generate random value and if value is less updateFactor it will be updated.
}

export async function addComments<T extends Doc> (
  options: CommentOptions,
  client: TxOperations,
  space: Ref<Space>,
  objectId: Ref<T>,
  _class: Ref<Class<T>>,
  collection: string
): Promise<void> {
  const commentsCount = options.min + faker.datatype.number(options.max)
  for (let i = 0; i < commentsCount; i++) {
    const commentId = `candidate-comment-${generateId()}-${i}` as Ref<Comment>

    const commentData: AttachedData<Comment> = {
      message: faker.lorem.paragraphs(options.paragraphMin + faker.datatype.number(options.paragraphMax))
    }
    await client.addCollection(chunter.class.Comment, space, objectId, _class, collection, commentData, commentId)

    if (faker.datatype.number(100) > options.updateFactor) {
      const updateMsg = faker.lorem.paragraphs(options.paragraphMin + faker.datatype.number(options.paragraphMax))

      await client.updateCollection(chunter.class.Comment, space, commentId, objectId, _class, collection, {
        message: updateMsg
      })
    }
  }
}
