# Overview

Package allow to create fully functuional client for platform. This

## Usage

```ts
  import clientResources from '@anticrm/client-resources'
  import core, { Client } from '@anticrm/core'

  // ...

  const token = ... // Token obtained somehow.

  const connection: Client = await (await clientResources()).function.GetClient(token, transactorUrl)

  // Now client is usable

  // Use close, to shutdown connection.
  await connection.close()
```

## Node JS

For NodeJS enviornment it is required to configure ClientSocketFactory using 'ws' package.

```ts
// We need to override default WebSocket factory with 'ws' one.
setMetadata(client.metadata.ClientSocketFactory, (url) => new WebSocket(url))

const connection: Client = await (await clientResources()).function.GetClient(token, transactorUrl)
...
```
