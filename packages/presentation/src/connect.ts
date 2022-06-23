import client from '@anticrm/client'
import contact from '@anticrm/contact'
import view from '@anticrm/view'
import core, { Class, Client, Doc, Ref, setCurrentAccount, Version } from '@anticrm/core'
import login from '@anticrm/login'
import { getMetadata, getResource } from '@anticrm/platform'
import {
  fetchMetadataLocalStorage,
  getCurrentLocation,
  navigate,
  setMetadataLocalStorage,
  location as loc
} from '@anticrm/ui'
import presentation from './plugin'

export let versionError: string | undefined = ''

export async function connect (title: string): Promise<Client | undefined> {
  const token = fetchMetadataLocalStorage(login.metadata.LoginToken)
  const endpoint = fetchMetadataLocalStorage(login.metadata.LoginEndpoint)
  const email = fetchMetadataLocalStorage(login.metadata.LoginEmail)

  if (token === null || endpoint === null || email === null) {
    navigate({
      path: [login.component.LoginApp],
      query: { navigateUrl: encodeURIComponent(JSON.stringify(getCurrentLocation())) }
    })
    return
  }

  const getClient = await getResource(client.function.GetClient)
  const instance = await getClient(token, endpoint, () => {
    location.reload()
  })
  console.log('logging in as', email)

  const me = await instance.findOne(contact.class.EmployeeAccount, { email })
  if (me !== undefined) {
    console.log('login: employee account', me)
    setCurrentAccount(me)
  } else {
    console.error('WARNING: no employee account found.')
    setMetadataLocalStorage(login.metadata.LoginToken, null)
    setMetadataLocalStorage(login.metadata.LoginEndpoint, null)
    setMetadataLocalStorage(login.metadata.LoginEmail, null)
    setMetadataLocalStorage(login.metadata.CurrentWorkspace, null)
    navigate({
      path: [login.component.LoginApp],
      query: { navigateUrl: encodeURIComponent(JSON.stringify(getCurrentLocation())) }
    })
    return
  }

  try {
    const version = await instance.findOne<Version>(core.class.Version, {})
    console.log('Model version', version)

    const requirdVersion = getMetadata(presentation.metadata.RequiredVersion)
    if (requirdVersion !== undefined) {
      console.log('checking min model version', requirdVersion)
      const versionStr = `${version?.major as number}.${version?.minor as number}.${version?.patch as number}`

      if (version === undefined || requirdVersion !== versionStr) {
        versionError = `${versionStr} => ${requirdVersion}`
        return undefined
      }
    }
  } catch (err: any) {
    console.log(err)
    const requirdVersion = getMetadata(presentation.metadata.RequiredVersion)
    console.log('checking min model version', requirdVersion)
    if (requirdVersion !== undefined) {
      versionError = `'unknown' => ${requirdVersion}`
      return undefined
    }
  }

  // Update window title
  function setDocumentTitle (title?: string): void {
    document.title =
      title ?? [fetchMetadataLocalStorage(login.metadata.CurrentWorkspace), title].filter((it) => it).join(' - ')
  }
  loc.subscribe((location) => {
    if (location.fragment == null || location.fragment.length === 0) return setDocumentTitle()
    const hierarchy = instance.getHierarchy()
    const [, _id, _class] = decodeURIComponent(location.fragment).split('|')
    if (_class == null) return setDocumentTitle()
    const clazz = hierarchy.getClass(_class as Ref<Class<Doc>>)
    const mixin = hierarchy.as(clazz, view.mixin.ObjectTitle)
    if (mixin == null) return setDocumentTitle()
    void getResource(mixin.getTitle)
      .then(async (getTitle) => await getTitle(instance, _id as Ref<Doc>))
      .then(setDocumentTitle, () => setDocumentTitle())
  })

  return instance
}
