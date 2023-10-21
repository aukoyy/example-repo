# Create an order system for payments

Create a HTTP REST api in typescript that support following endpoints:

- `POST /orders` -
- `GET /orders/{id}/payment-redirect` - Update order from payment redirect
- `GET /orders` - List orders with current payment status

## `POST /orders` - Create new order

The endpoint creates a new order from the request and creates a new
Dintero Checkout Session and saves the result to database

### Example request/response

```
POST http://localhost:3000/orders
content-type: application/json

{
  "amount": 29900,
  "currency": "NOK",
  "receipt": "receipt#1"
}

HTTP/2 200
content-type: application/json
{
  "id": "3eacc06f-c9e7-4343-adbe-f3bbfa6cc7a9",
  "created_at": "2023-03-08T13:24:40.818Z",
  "amount": 29900,
  "currency": "NOK",
  "receipt": "receipt#1"
  "status": "PENDING",
  "links": [
    {
      "rel": "session_link",
      "href":"https://checkout.test.dintero.com/v1/view/..."
    }
  ]
}
```

## `GET /orders/{id}/redirect` - Update order from payment redirect

The endpoint should handle the redirect from payeer completing the payment
session. The order should be updated with new status and a success message
should be returned to the client

## `GET /orders/` - List orders with current payment status

List all orders that have been created, including the current status
of payment

```
GET http://localhost:3000/orders

{
  "orders": [
    {
      "id": "3eacc06f-c9e7-4343-adbe-f3bbfa6cc7a9",
      "created_at": "2023-03-08T13:24:40.818Z",
      "amount": 29900,
      "currency": "NOK",
      "receipt": "receipt#1"
      "status": "AUTHORIZED",
    }
  ]
}
```

# Documentation

Link to API documentation that is needed to create a Checkout session

- https://docs.dintero.com/

## Example request

Use `client_id/client_secret` to get a JWT token

**Account:** `T11223674`
**Client ID:** `a55e97bd-7c97-4d01-84b7-838c2815104e`
**Client Secret:** `0352307c-b87b-4f3d-b813-d4f5a6ebecf6`

### Authorization

Use the secrets to get an access token to use for authorization

```shell
curl -u "${CLIENT_ID}:${CLIENT_SECRET}" \
-X POST https://test.dintero.com/v1/accounts/T11223674/auth/token \
-H 'Content-Type: application/json' \
-d '{
 "grant_type":"client_credentials",
 "audience":"https://test.dintero.com/v1/accounts/T11223674"
}'
```

```json
{
	"access_token": "eyJhbGciO...",
	"expires_in": 14400,
	"token_type": "Bearer"
}
```

### Create session

Short example for how to create an session, see API spec for more options

- https://docs.dintero.com/checkout-api.html#operation/checkout_session_profile_post

```shell
curl --oauth2-bearer "${ACCESS_TOKEN}" \
-X POST https://checkout.test.dintero.com/v1/sessions-profile \
-H 'Content-Type: application/json' \
-d '{
 "url": {
   "return_url": "http://localhost:3000/orders/3eacc06f-c9e7-4343-adbe-f3bbfa6cc7a9/redirect"
 },
 "order": {
   "amount": 29900,
   "currency": "NOK",
   "merchant_reference": "MREF1"
 },
 "profile_id": "default"
}'
```

```json
{
	"id": "P11223674.5jKXwLMJzSqanGZSLemYWp",
	"url": "https://checkout.test.dintero.com/v1/view/..."
}
```
