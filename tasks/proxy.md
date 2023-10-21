# Proxy test.dintero.com

Write a http proxy in nodejs using typescript with the following properties

- All requests to the server are relayed to https://test.dintero.com
- Log all incoming requests and responses
- Create a dedicated endpoint `/logs` where an API user can see the last 10
  requests/responses they did with the same `Authentication` header

## Documentations

Link to API documentation that will be available from the Proxy

- https://docs.dintero.com/

## Example requests

Use `client_id/client_secret` to get a JWT token

**Account:** `T11223674`
**Client ID:** `a55e97bd-7c97-4d01-84b7-838c2815104e`
**Client Secret:** `0352307c-b87b-4f3d-b813-d4f5a6ebecf6`

### Direct

```shell
curl -u 'a55e97bd-7c97-4d01-84b7-838c2815104e:0352307c-b87b-4f3d-b813-d4f5a6ebecf6' \
  -H 'Content-Type: application/json' \
  https://test.dintero.com/v1/accounts/P11223674/auth/token \
  -d '{"grant_type":"client_credentials","audience":"https://test.dintero.com/v1/accounts/T11223674"}'
```

```json
{
  "access_token": "eyJhbGciO...",
  "expires_in": 14400,
  "token_type": "Bearer"
}
```

### Via Proxy

```shell
curl -u 'a55e97bd-7c97-4d01-84b7-838c2815104e:0352307c-b87b-4f3d-b813-d4f5a6ebecf6' \
  -H 'Content-Type: application/json' \
  http://localhost:3000/v1/accounts/T11223674/auth/token \
  -d '{"grant_type":"client_credentials","audience":"https://test.dintero.com/v1/accounts/T11223674"}'
```

```json
{
  "access_token": "eyJhbGciO...",
  "expires_in": 14400,
  "token_type": "Bearer"
}
```

Use the `access_token` in the response to get other resources with the proxy

**List Customer users**

```shell
export TOKEN="eyJhbGciO..."
curl --oauth2-bearer $TOKEN http://localhost:3000/v1/accounts/T11223674/customers/users
```

## Delivery

Create a pull-request with a solution or just email the solution as zip archive

```
git archive --format zip --output proxy.zip master
```

> `git archive` requires the changes to be committed locally to master branch
