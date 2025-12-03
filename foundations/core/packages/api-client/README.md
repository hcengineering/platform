# Huly Platform API Client

A TypeScript client library for interacting with the Huly Platform API.

## Installation

In order to be able to install required packages, you will need to obtain GitHub access token. You can create a token by following the instructions [here](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry#authenticating-with-a-personal-access-token).

```bash
npm install @hcengineering/api-client
```

## WebSocket Client vs REST Client

The api client package provides two main client variants: a WebSocket client and a REST client. The WebSocket client holds persistent connection to the Huly Platform API. The REST client uses standard HTTP requests to perform operations.

### WebSocket Client

```ts
import { connect } from '@hcengineering/api-client'

// Connect to Huly
const client = await connect('https://huly.app', {
  email: 'johndoe@example.com',
  password: 'password',
  workspace: 'my-workspace',
})

// Use the client to perform operations
...

// Close the client when done
await client.close()
```

### REST Client

```ts
import { connectRest } from '@hcengineering/api-client'

// Connect to Huly
const client = await connectRest('https://huly.app', {
  email: 'johndoe@example.com',
  password: 'password',
  workspace: 'my-workspace'
})

// Use the client to perform operations
...

```

## Authentication

The client supports two authentication methods: using email and password, or using a token.
When authenticated, the client will have access to the same resources as the user.

> Note: The examples below use the WebSocket client (`connect`). To use the REST client instead, import and call `connectRest` with the same options.

Parameters:

- `url`: URL of the Huly instance, for Huly Cloud use `https://huly.app`
- `options`: Connection options
  - `workspace`: Name of the workspace to connect to, the workspace name can be found in the URL of the workspace: `https://huly.app/workbench/<workspace-name>`
  - `token`: Optional authentication token
  - `email`: Optional user email
  - `password`: Optional user password

### Using Email and Password

```ts
import { connect } from '@hcengineering/api-client'

const client = await connect('https://huly.app', {
  email: 'johndoe@example.com',
  password: 'password',
  workspace: 'my-workspace'
})

...

await client.close()
```

### Using Token

```ts
import { connect } from '@hcengineering/api-client'

const client = await connect('https://huly.app', {
  token: '...',
  workspace: 'my-workspace'
})

...

await client.close()
```

## Client API

The client provides a set of methods for interacting with the Huly Platform API. This section describes the main methods available in the client.

### Fetch API

The client provides two main methods for retrieving documents: `findOne` and `findAll`.

#### findOne

Retrieves a single document matching the query criteria.

Parameters:

- `_class`: Class of the object to find, results will include all subclasses of the target class
- `query`: Query criteria
- `options`: Find options
  - `limit`: Limit the number of results returned
  - `sort`: Sorting criteria
  - `lookup`: Lookup criteria
  - `projection`: Projection criteria
  - `total`: If specified total will be returned

Example:

```ts
import contact from '@hcengineering/contact'

...

const person = await client.findOne(
  contact.class.Person,
  {
    _id: 'person-id'
  }
)
```

#### findAll

Retrieves multiple document matching the query criteria.

Parameters:

- `_class`: Class of the object to find, results will include all subclasses of the target class
- `query`: Query criteria
- `options`: Find options
  - `limit`: Limit the number of results returned
  - `sort`: Sorting criteria
  - `lookup`: Lookup criteria
  - `projection`: Projection criteria
  - `total`: If specified total will be returned

Example:

```ts
import { SortingOrder } from '@hcengineering/core'
import contact from '@hcengineering/contact'

..

const persons = await client.findAll(
  contact.class.Person,
  {
    city: 'New York'
  },
  {
    limit: 10,
    sort: {
      name: SortingOrder.Ascending
    }
  }
)
```

### Documents API

The client provides three main methods for managing documents: `createDoc`, `updateDoc`, and `removeDoc`. These methods allow you to perform CRUD operations on documents.

#### createDoc

Creates a new document in the specified space.

Parameters:

- `_class`: Class of the object
- `space`: Space of the object
- `attributes`: Attributes of the object
- `id`: Optional id of the object, if not provided, a new id will be generated

Example:

```ts
import contact, { AvatarType } from '@hcengineering/contact'

..

const personId = await client.createDoc(
  contact.class.Person,
  contact.space.Contacts,
  {
    name: 'Doe,John',
    city: 'New York',
    avatarType: AvatarType.COLOR
  }
)
```

#### updateDoc

Updates existing document.

Parameters:

- `_class`: Class of the object
- `space`: Space of the object
- `objectId`: Id of the object
- `operations`: Attributes of the object to update

Example:

```ts
import contact from '@hcengineering/contact'

..

await client.updateDoc(
  contact.class.Person,
  contact.space.Contacts,
  personId,
  {
    city: 'New York',
  }
)
```

#### removeDoc

Removes existing document.

Parameters:

- `_class`: Class of the object
- `space`: Space of the object
- `objectId`: Id of the object

Example:

```ts
import contact from '@hcengineering/contact'

..

await client.removeDoc(
  contact.class.Person,
  contact.space.Contacts,
  personId
)
```

### Collections API

#### addCollection

Creates a new attached document in the specified collection.

Parameters:

- `_class`: Class of the object to create
- `space`: Space of the object to create
- `attachedTo`: Id of the object to attach to
- `attachedToClass`: Class of the object to attach to
- `collection`: Name of the collection containing attached documents
- `attributes`: Attributes of the object
- `id`: Optional id of the object, if not provided, a new id will be generated

Example:

```ts
import contact, { AvatarType } from '@hcengineering/contact'

..

const personId = await client.createDoc(
  contact.class.Person,
  contact.space.Contacts,
  {
    name: 'Doe,John',
    city: 'New York',
    avatarType: AvatarType.COLOR
  }
)

await client.addCollection(
  contact.class.Channel,
  contact.space.Contacts,
  personId,
  contact.class.Person,
  'channels',
  {
    provider: contact.channelProvider.Email,
    value: 'john.doe@example.com'
  }
)
```

#### updateCollection

Updates existing attached document in collection.

Parameters:

- `_class`: Class of the object to update
- `space`: Space of the object to update
- `objectId`: Space of the object to update
- `attachedTo`: Id of the parent object
- `attachedToClass`: Class of the parent object
- `collection`: Name of the collection containing attached documents
- `attributes`: Attributes of the object to update

Example:

```ts
import contact from '@hcengineering/contact'

..

await client.updateCollection(
  contact.class.Channel,
  contact.space.Contacts,
  channelId,
  personId,
  contact.class.Person,
  'channels',
  {
    city: 'New York',
  }
)
```

#### removeCollection

Removes existing attached document from collection.

Parameters:

- `_class`: Class of the object to remove
- `space`: Space of the object to remove
- `objectId`: Space of the object to remove
- `attachedTo`: Id of the parent object
- `attachedToClass`: Class of the parent object
- `collection`: Name of the collection containing attached documents

Example:

```ts
import contact from '@hcengineering/contact'

..

await client.removeCollection(
  contact.class.Channel,
  contact.space.Contacts,
  channelId,
  personId,
  contact.class.Person,
  'channels'
)
```

### Mixins API

The client provides two methods for managing mixins: `createMixin` and `updateMixin`.

#### createMixin

Creates a new mixin for a specified document.

Parameters:

- `objectId`: Id of the object the mixin is attached to
- `objectClass`: Class of the object the mixin is attached to
- `objectSpace`: Space of the object the mixin is attached to
- `mixin`: Id of the mixin type to update
- `attributes`: Attributes of the mixin

```ts
import contact, { AvatarType } from '@hcengineering/contact'

..

const personId = await client.createDoc(
  contact.class.Person,
  contact.space.Contacts,
  {
    name: 'Doe,John',
    city: 'New York',
    avatarType: AvatarType.COLOR
  }
)

await client.createMixin(
  personId,
  contact.class.Person,
  contact.space.Contacts,
  contact.mixin.Employee,
  {
    active: true,
    position: 'CEO'
  }
)
```

#### updateMixin

Updates an existing mixin.

Parameters:

- `objectId`: Id of the object the mixin is attached to
- `objectClass`: Class of the object the mixin is attached to
- `objectSpace`: Space of the object the mixin is attached to
- `mixin`: Id of the mixin type to update
- `attributes`: Attributes of the mixin to update

```ts
import contact, { AvatarType } from '@hcengineering/contact'

..

const person = await client.findOne(
  contact.class.Person,
  {
    _id: 'person-id'
  }
)

await client.updateMixin(
  personId,
  contact.class.Person,
  contact.space.Contacts,
  contact.mixin.Employee,
  {
    active: false
  }
)
```
