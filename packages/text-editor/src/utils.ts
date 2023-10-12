import { TiptapCollabProvider } from "./provider";
import * as Y from 'yjs'

type ProviderData = ({
  provider: TiptapCollabProvider
} | {
  collaboratorURL: string
  token: string
}) & { ydoc?: Y.Doc }

function getProvider (documentId: string, providerData: ProviderData, initialContentId?: string): TiptapCollabProvider {
  let provider: TiptapCollabProvider

  if (!('provider' in providerData)) {
    return new TiptapCollabProvider({
      url: providerData.collaboratorURL,
      name: documentId,
      document: providerData.ydoc ?? new Y.Doc(),
      token: providerData.token,
      parameters: {
        initialContentId: initialContentId ?? ''
      }
    })
  } else {
    return providerData.provider
  }
}

export function copyDocumentField (documentId: string, srcFieldId: string, dstFieldId: string, providerData: ProviderData, initialContentId?: string): void {
  const provider = getProvider(documentId, providerData, initialContentId)
  provider.copyField(documentId, srcFieldId, dstFieldId)
}

export function copyDocumentContent (documentId: string, snapshotId: string, providerData: ProviderData, initialContentId?: string): void {
  const provider = getProvider(documentId, providerData, initialContentId)
  provider.copyContent(documentId, snapshotId)
}
