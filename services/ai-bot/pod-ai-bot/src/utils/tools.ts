import { AccountUuid, MarkupBlobRef, Ref } from '@hcengineering/core'
import document, { Document, getFirstRank, Teamspace } from '@hcengineering/document'
import { makeRank } from '@hcengineering/rank'
import { markdownToMarkup } from '@hcengineering/text-markdown'
import {
  BaseFunctionsArgs,
  RunnableFunctionWithoutParse,
  RunnableFunctionWithParse,
  RunnableToolFunction,
  RunnableToolFunctionWithoutParse,
  RunnableToolFunctionWithParse,
  RunnableTools
} from 'openai/lib/RunnableFunction'
import { Stream } from 'stream'
import { v4 as uuid } from 'uuid'
import config from '../config'
import { WorkspaceClient } from '../workspace/workspaceClient'

async function stream2buffer (stream: Stream): Promise<Buffer> {
  return await new Promise<Buffer>((resolve, reject) => {
    const _buf = Array<any>()
    stream.on('data', (chunk) => {
      _buf.push(chunk)
    })
    stream.on('end', () => {
      resolve(Buffer.concat(_buf))
    })
    stream.on('error', (err) => {
      reject(new Error(`error converting stream - ${err}`))
    })
  })
}

async function pdfToMarkdown (
  workspaceClient: WorkspaceClient,
  fileId: string,
  name: string | undefined
): Promise<string | undefined> {
  if (config.DataLabApiKey !== '') {
    try {
      const stat = await workspaceClient.storage.stat(workspaceClient.ctx, workspaceClient.wsIds, fileId)
      if (stat?.contentType !== 'application/pdf') {
        return
      }
      const file = await workspaceClient.storage.get(workspaceClient.ctx, workspaceClient.wsIds, fileId)
      const buffer = await stream2buffer(file)

      const url = 'https://www.datalab.to/api/v1/marker'
      const formData = new FormData()
      formData.append('file', new Blob([buffer], { type: 'application/pdf' }), name ?? 'test.pdf')
      formData.append('force_ocr', 'false')
      formData.append('paginate', 'false')
      formData.append('output_format', 'markdown')
      formData.append('use_llm', 'false')
      formData.append('strip_existing_ocr', 'false')
      formData.append('disable_image_extraction', 'false')

      const headers = { 'X-Api-Key': config.DataLabApiKey }

      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        headers
      })

      const data = await response.json()

      if (data.request_check_url !== undefined) {
        for (let attempt = 0; attempt < 10; attempt++) {
          const resp = await fetch(data.request_check_url, { headers })
          const result = await resp.json()
          if (result.status === 'complete' && result.markdown !== undefined) {
            return result.markdown
          }
          await new Promise((resolve) => setTimeout(resolve, 2000))
        }
      }
    } catch (e) {
      console.error(e)
    }
  }
}

async function saveFile (
  workspaceClient: WorkspaceClient,
  user: AccountUuid | undefined,
  args: { fileId: string, folder: string | undefined, parent: string | undefined, name: string }
): Promise<string> {
  console.log('Save file', args)
  const content = await pdfToMarkdown(workspaceClient, args.fileId, args.name)
  if (content === undefined) {
    return 'Error while converting pdf to markdown'
  }
  const converted = JSON.stringify(markdownToMarkup(content))

  const client = await workspaceClient.opClient
  const fileId = uuid()
  await workspaceClient.storage.put(workspaceClient.ctx, workspaceClient.wsIds, fileId, converted, 'application/json')

  const teamspaces = await client.findAll(document.class.Teamspace, {})
  const parent = await client.findOne(document.class.Document, { _id: args.parent as Ref<Document> })
  const teamspaceId = getTeamspace(args.folder, parent, teamspaces)
  const parentId = parent?._id ?? document.ids.NoParent
  const lastRank = await getFirstRank(client, teamspaceId, parentId)
  const rank = makeRank(lastRank, undefined)
  const _id = await client.createDoc(document.class.Document, teamspaceId, {
    title: args.name,
    parent: parentId,
    content: fileId as MarkupBlobRef,
    rank
  })

  return `File saved as ${args.name} with id ${_id}, always provide mention link as: [](ref://?_class=document%3Aclass%3ADocument&_id=${_id}&label=${args.name})`
}

function getTeamspace (
  folder: string | undefined,
  parent: Document | undefined,
  teamspaces: Teamspace[]
): Ref<Teamspace> {
  if (parent !== undefined) return parent.space
  if (folder !== undefined) {
    const teamspace = teamspaces.find(
      (p) => p.name.trim().toLowerCase() === folder.trim().toLowerCase() || p._id === folder
    )
    if (teamspace !== undefined) return teamspace._id
  }
  return teamspaces[0]._id
}

async function getFoldersForDocuments (
  workspaceClient: WorkspaceClient,
  user: AccountUuid | undefined,
  args: Record<string, any>
): Promise<string> {
  const client = await workspaceClient.opClient
  // TODO: need a set of user PersonIds here
  const spaces = await client.findAll(
    document.class.Teamspace,
    user !== undefined ? { members: user, archived: false } : { archived: false }
  )
  let res = 'Folders:\n'
  for (const space of spaces) {
    res += `Id: ${space._id} Name: ${space.name}\n`
  }
  res += 'Parents:\n'
  const parents = await client.findAll(document.class.Document, { space: { $in: spaces.map((p) => p._id) } })
  for (const parent of parents) {
    res += `Id: ${parent._id} Name: ${parent.title}\n`
  }
  return res
}

type ChangeFields<T, R> = Omit<T, keyof R> & R
type PredefinedTool<T extends object | string> = ChangeFields<
RunnableToolFunction<T>,
{
  function: PredefinedToolFunction<T>
}
>
type PredefinedToolFunction<T extends object | string> = Omit<
T extends string ? RunnableFunctionWithoutParse : RunnableFunctionWithParse<any>,
'function'
>
type ToolFunc = (workspaceClient: WorkspaceClient, user: AccountUuid | undefined, args: any) => Promise<string> | string

const tools: [PredefinedTool<any>, ToolFunc][] = []

export function registerTool<T extends object | string> (tool: PredefinedTool<T>, func: ToolFunc): void {
  tools.push([tool, func])
}

registerTool(
  {
    type: 'function',
    function: {
      name: 'getDataBeforeImport',
      parameters: {
        type: 'object',
        properties: {}
      },
      description:
        'Get folders and parents for documents. This step necessery before saveFile tool. YOU MUST USE IT BEFORE import file.'
    }
  },
  getFoldersForDocuments
)

registerTool<object>(
  {
    type: 'function',
    function: {
      name: 'saveFile',
      parse: JSON.parse,
      parameters: {
        type: 'object',
        required: ['fileId, folder, name'],
        properties: {
          fileId: { type: 'string', description: 'File id to parse' },
          folder: {
            type: 'string',
            default: '',
            description:
              'Folder, id from getDataBeforeImport. If not provided you can guess by file name and folder name, or by another file names, if you can`t, just ask user. Don`t provide empty, this field is required. If no folders at all, you should stop pipeline execution and ask user to create teamspace'
          },
          parent: {
            type: 'string',
            default: '',
            description:
              'Parent document, use id from getDataBeforeImport, leave empty string if not provided, it is not necessery, please feel free to pass empty string'
          },
          name: {
            type: 'string',
            description: 'Name for file, try to recognize from user input, if not provided use attached file name'
          }
        }
      },
      description:
        'Parse pdf to markdown and save it, using for import files. Use only if provide file in current message and user require to import/save, if file not provided ask user to attach it. You MUST call getDataBeforeImport tool before for get ids. Use file name as name if user not provide it, don`t use old parameters. You can ask user about folder if you have not enough data to get folder id'
    }
  },
  saveFile
)

export function getTools (
  workspaceClient: WorkspaceClient,
  user: AccountUuid | undefined
): RunnableTools<BaseFunctionsArgs> {
  const result: (RunnableToolFunctionWithoutParse | RunnableToolFunctionWithParse<any>)[] = []
  for (const tool of tools) {
    const res: RunnableToolFunctionWithoutParse | RunnableToolFunctionWithParse<any> = {
      ...tool[0],
      function: {
        ...tool[0].function,
        function: (args: any) => tool[1](workspaceClient, user, args)
      }
    }
    result.push(res)
  }
  return result
}
