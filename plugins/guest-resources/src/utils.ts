import client from '@hcengineering/client'
import { type Doc } from '@hcengineering/core'
import { getMetadata, getResource, setMetadata } from '@hcengineering/platform'
import presentation from '@hcengineering/presentation'
import { getCurrentLocation, navigate } from '@hcengineering/ui'
import view from '@hcengineering/view'
import { getObjectLinkFragment } from '@hcengineering/view-resources'
import { workbenchId } from '@hcengineering/workbench'

export async function checkAccess (doc: Doc): Promise<void> {
  const loc = getCurrentLocation()
  const ws = loc.path[1]
  // TODO
  // const tokens: Record<string, string> = fetchMetadataLocalStorage(login.metadata.LoginTokens) ?? {}
  // const token = tokens[ws]
  const token = undefined

  const endpoint = getMetadata(presentation.metadata.Endpoint)
  if (token === undefined || endpoint === undefined) return
  const clientFactory = await getResource(client.function.GetClient)
  const _client = await clientFactory(token, endpoint)

  const res = await _client.findOne(doc._class, { _id: doc._id })
  const hierarchy = _client.getHierarchy()
  await _client.close()
  if (res !== undefined) {
    const panelComponent = hierarchy.classHierarchyMixin(doc._class, view.mixin.ObjectPanel)
    const comp = panelComponent?.component ?? view.component.EditDoc
    const loc = await getObjectLinkFragment(hierarchy, doc, {}, comp)
    loc.path[0] = workbenchId
    loc.path[1] = ws
    // We have access, let's set correct tokens and redirect)
    setMetadata(presentation.metadata.Token, token)
    navigate(loc)
  }
}
