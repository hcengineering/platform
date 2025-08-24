# Hulypulse

Hulypulse is a service that enables clients to share information on a “whiteboard”. Clients connected to the same “whiteboard” see data provided by other clients to the whiteboard.

The service is exposed as REST and WebSocket API.

**Usage scenarios:**

- user presence in a document
- user is “typing” event
- user cursor position in editor or drawing board
- service posts a process status

## Key

Key is a string that consists of one or multiple segments separated by ‘/’. Example: foo/bar/baz.
Key may not end with ‘/’
Segment may not contain special characters (‘*’, ‘?’, ‘[’, ‘]’,‘\’,‘\x00..\xF1’,‘\x7F’,‘"’,‘'’)
Segment may not be empty
Key segment may be private (prefixed with ‘$’)

    Query

May not contain special characters (‘*’, ‘?’, ‘[’, ‘]’,‘\’,‘\x00..\xF1’,‘\x7F’,‘"’,‘'’)
It is possible to use prefix, for listings / subscriptions  (prefix ends with segment separator ‘/’)

- GET/SUBSCRIBE/..   a/b → single key
- GET/SUBSCRIBE/..   a/b/c/ → multiple

    If multiple

select all keys starting with prefix
skip keys, containing private segments to the right from the prefix

    example

- 1. /a/b/$c/$d,  2. /a/b/c,  3. /a/b/$c, 4. /a/b/$c/$d/e
- / → [2]
- /a/b/ → [2]
- /a/b/$c/ → [3]
- /a/b/$c/$d/ → [4]
- /a/b/$c/$d → [1]


## Data
“Data” is an arbitrary JSON document.
Size of data is limited to some reasonable size

## HTTP API

```GET /status``` - server status and websockets count
- Answer: `{"status":"OK","websockets":2}`


```PUT /{workspace}/{key}``` - Save key
- Input
    - Body - data
    - Content-Type: application/json
    - Content-Length: optional
    - Headers: TTL or absolute expiration time
	- `HULY-TTL` — autodelete in N seconds
	- or `HULY-EXPIRE-AT` — autodelete in UnixTime
	- default max_ttl = 3600 (settings in config/default.toml)
    - Conditional Headers:
	- `If-Match: *` — update only if the key exists
	- `If-Match: <md5>` — update only if current value's MD5 matches
	- `If-None-Match: *` — insert only if the key does not exist
- Output
    - Status:
	- `201` if inserted with `If-None-Match: *`
	- `204` on successful insert or update
	- `412` if the condition is not met
	- `400` if headers are invalid
    - Body: `DONE`

```DELETE /{workspace}/{key}``` - Delete key
- Output
    - Status: `204 No content`, no body
    - `404 Not Found` if nothing to do

```GET /{workspace}/{key}``` - Read one key
- Output
    - Status 200
    - Content-type: application/json
    - Header: `Etag: <md5>`
    - Body:
        - workspace (copy of input)
	- key (copy of input)
        - data (copy of input)
        - expiresAt / TTL (copy of input, optional)
	- etag <md5>

```GET /{workspace}/{key}/``` - Read array of keys
- Output
    - Status 200
    - Content-type: application/json
    - Body (array):
	- [{"key","data","expires_at","etag"}, ...]

## WebSocket API

**Client to Server**

```PUT```
    - type: "put"
    - correlation id (optional)
    - key:
	- “workspace/foo/bar“ - shared key
	- “workspace/foo/bar/$/secret“ - secret key
    - data
    ** time control (optional) **
	- `TTL` — autodelete in N seconds
	- `ExpireAt` — autodelete in UnixTime
	- or default max_ttl = 3600 (settings in config/default.toml)
    ** Conditional (optional) **
	- `ifMatch: *` — update only if the key exists
	- `ifMatch: <md5>` — update only if current value's MD5 matches
	- `ifNoneMatch: *` — insert only if the key does not exist

- Answer: `{"action":"put","correlation":"abc123","result":"OK"}`


```GET```
    - type: "get"
    - correlation id (optional)
    - key:
	- “workspace/foo/bar“ - one shared key
	- “workspace/foo/bar/$/secret“ - one secret key

- Answer: `{"action":"get","result":{"data":"hello","etag":"5d41402abc4b2a76b9719d911017c592","expires_at":3599,"key":"00000000-0000-0000-0000-000000000001/foo/bar"}}`


```LIST```
    - type: "list"
    - correlation id (optional)
    - key:
	- “workspace/foo/bar/“ - keys from public space
	- “workspace/foo/bar/$/secret/“ - keys from secret space

- Answer: `{"action":"list","result":[{"data":"hello 1","etag":"df0649bc4f1be901c85b6183091c1d83","expires_at":3570,"key":"00000000-0000-0000-0000-000000000001/foo/bar1"},{"data":"hello 2","etag":"bb21ec8394b75795622f61613a777a8b","expires_at":3555,"key":"00000000-0000-0000-0000-000000000001/foo/bar2"}]}`


```DELETE```
    - type: "delete"
    - correlation id (optional)
    - key: “workspace/foo/bar“
    ** Conditional (optional) **
	- `ifMatch: <md5>` — delete only if current value's MD5 matches
	- `ifMatch: *` — return error if key does not exist

- Answer: `{"action":"delete","result":"OK"}`


```SUBSCRIBE```
    type: "sub"
    key:
	- “workspace/foo/bar“ - subscribe one shared key
	- “workspace/foo/bar/“ - subscribe all keys started with
	- “workspace/foo/bar/$/my_secret“ - subscribe one secret key
	- “workspace/foo/bar/$/my_secret/“ - subscribe all keys started with secret

- Answer: `{"action":"sub","result":"OK"}`


```UNSUBSCRIBE```
    - type: "unsub"
    - key:
	- “workspace/foo/bar“ - unsubscribe subscribed key
	- “*“ - unsubscribe all

- Answer: `{"action":"unsub","result":"OK"}`

```MY SUBSCRIBES```
    - type: "sublist"

- Answer: `{"action":"list","result":["00000000-0000-0000-0000-000000000001/foo/bar1","00000000-0000-0000-0000-000000000001/foo/bar2"]}`


** Server to Client ** subscribed events:

    - `{"message":"Set","key":"00000000-0000-0000-0000-000000000001/foo/bar","value":"hello"}`

    - `{"message":"Expired","key":"00000000-0000-0000-0000-000000000001/foo/bar"}`

    - `{"message":"Del","key":"00000000-0000-0000-0000-000000000001/foo/bar"}`

## Special options in config/default.toml
    - ```memory_mode = true``` Use native memory storage instead Redis
    - ```no_authorization = true``` Don't check authorization
    - ```max_size = 100``` Max value size in bytes


## Running

Pre-build docker images is available at: hardcoreeng/service_hulypulse:{tag}.

You can use the following command to run the image locally:
```bash
docker run -p 8095:8095 -it --rm hardcoreeng/service_hulypulse:{tag}"
```

If you want to run the service as a part of local huly development environment use the following command:
```bash
 export HULY_REDIS_URLS="redis://huly.local:6379"
 docker run --rm -it --network dev_default -p 8095:8095 hardcoreeng/service_hulypulse:{tag}
```
This will run Hulypulse in the same network as the rest of huly services, and set the redis connection string to the one matching the local dev redis instance.

You can then access hulypulse at http://localhost:8095.


## Authetication
Hulypulse uses bearer JWT token authetication. At the moment, it will accept any token signed by the hulypulse secret. The secret is set in the environment variable HULY_TOKEN_SECRET variable. 

## Configuration
The following environment variables are used to configure hulypulse:
   - ```HULY_BIND_HOST```: host to bind the server to (default: 0.0.0.0)
   - ```HULY_BIND_PORT```: port to bind the server to (default: 8094)
   - ```HULY_TOKEN_SECRET```: secret used to sign JWT tokens (default: secret)
   - ```HULY_REDIS_URLS```: redis connection string (default: redis://huly.local:6379)
   - ```HULY_REDIS_PASSWORD```: redis password (default: "&lt;invalid&gt;")
   - ```HULY_REDIS_MODE```: redis mode "direct" or "sentinel" (default: "direct")
   - ```HULY_REDIS_SERVICE```: redis service (default: "mymaster")
   - ```HULY_MAX_TTL```: maximum storage time (default: 3600)
   - TODO: ```HULY_PAYLOAD_SIZE_LIMIT```: maximum size of the payload (default: 2Mb)

## Todo (in no particular order)
- [ ] Optional value encryption
- [ ] Support for open telemetry
- [ ] Concurrency control for database migration (several instances of hulypulse are updated at the same time)
- [ ] TLS support
- [ ] Liveness/readiness probe endpoint

## Contributing
Contributions are welcome! Please open an issue or a pull request if you have any suggestions or improvements.

## License
This project is licensed under EPL-2.0
