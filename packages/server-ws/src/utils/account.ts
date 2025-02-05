import config from "../config.ts";


type WorkspaceInfo = {
workspaceId: string
}

export async function getWorkspaceInfo (token: string): Promise<WorkspaceInfo | undefined> {
    const accountsUrl = config.AccountsUrl
    const response = await fetch(accountsUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + token
        },
        body: JSON.stringify({
            method: 'getWorkspaceInfo',
            params: []
        })
    })
    const result = await response.json()
    return result.result as WorkspaceInfo | undefined
}