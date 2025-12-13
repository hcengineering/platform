import { type Ref } from '@hcengineering/core'
import documents from '../index'
import { type DocumentBundle, emptyBundle, ProjectDocumentTree } from '../utils'

describe('ProjectDocumentTree', () => {
  it('builds tree and keeps ProjectDocument in node', () => {
    const bundle: DocumentBundle = {
      ...emptyBundle(),
      DocumentMeta: [
        {
          _id: '693664706ac26535cbf869f7' as Ref<any>,
          _class: 'documents:class:DocumentMeta' as any,
          space: '693664706ac26535cbf869f9' as Ref<any>,
          modifiedBy: '1117577364368982017',
          createdBy: '1117577364368982017',
          modifiedOn: 1765172350395,
          createdOn: 1765172336999,
          attachedTo: null,
          documents: 2,
          title: 'CC-7 Test doc'
        }
      ],
      ProjectMeta: [
        {
          _id: '693664726ac26535cbf869fb' as Ref<any>,
          _class: 'documents:class:ProjectMeta' as any,
          space: '693664706ac26535cbf869f9' as Ref<any>,
          modifiedBy: '1117577364368982017',
          createdBy: '1117577364368982017',
          modifiedOn: 1765172345130,
          createdOn: 1765172338338,
          attachedTo: null,
          documents: 1,
          meta: '693664706ac26535cbf869f7' as Ref<any>,
          parent: documents.ids.NoParent,
          path: [],
          rank: '0|hzzzzz:',
          project: documents.ids.NoProject
        }
      ],
      ProjectDocument: [
        {
          _id: '693664786ac26535cbf869fd' as Ref<any>,
          _class: 'documents:class:ProjectDocument' as any,
          space: '693664706ac26535cbf869f9' as Ref<any>,
          modifiedBy: '1117577364368982017',
          createdBy: '1117577364368982017',
          modifiedOn: 1765172345130,
          createdOn: 1765172345130,
          attachedTo: '693664726ac26535cbf869fb' as Ref<any>,
          attachedToClass: 'documents:class:ProjectMeta' as any,
          collection: 'documents',
          document: '6936646f6ac26535cbf869f6' as Ref<any>,
          initial: documents.ids.NoProject,
          project: documents.ids.NoProject
        }
      ],
      ControlledDocument: [
        {
          _id: '6936646f6ac26535cbf869f6' as Ref<any>,
          _class: 'documents:class:ControlledDocument' as any,
          space: '693664706ac26535cbf869f9' as Ref<any>,
          modifiedBy: '1117577364368982017',
          createdBy: '1117577364368982017',
          modifiedOn: 1765172350395,
          createdOn: 1765172350395,
          attachedTo: '693664706ac26535cbf869f7' as Ref<any>,
          abstract: '',
          approvers: [],
          attachedToClass: 'documents:class:DocumentMeta' as any,
          author: '68fef390c8789c1970919ae9',
          category: 'documents:category:DOC - CC' as any,
          changeControl: '6936647c6ac26535cbf869ff' as Ref<any>,
          coAuthors: [],
          code: 'CC-7',
          collection: 'documents',
          commentSequence: 0,
          content: null,
          docUpdateMessages: 2,
          externalApprovers: [],
          labels: 0,
          major: 1,
          minor: 0,
          owner: '68fef390c8789c1970919ae9',
          plannedEffectiveDate: 0,
          prefix: 'CC',
          requests: 0,
          reviewInterval: 12,
          reviewers: [],
          seqNumber: 7,
          snapshots: 0,
          state: 'draft' as any,
          template: 'documents:template:ProductChangeControl' as any,
          title: 'Test doc'
        }
      ]
    } as any

    const tree = new ProjectDocumentTree(bundle, { keepRemoved: true })
    const node = tree.bundleOf('693664706ac26535cbf869f7' as Ref<any>)

    expect(node).toBeDefined()
    expect(node?.DocumentMeta[0]?._id).toBe('693664706ac26535cbf869f7')
    expect(node?.ProjectMeta[0]?._id).toBe('693664726ac26535cbf869fb')
  })
})
