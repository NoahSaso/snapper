# snapper

Snapper is an API caching layer built on Redis and HyperExpress in TypeScript.
It makes it easy to snapshot API requests and serve them from an intermediary
server to help reduce redundant API calls and navigate externally imposed rate
limits.

If a query does not exist in the cache, or it has expired, it will be fetched
directly, cached, and then returned.

## Setup

1. Install [Redis](https://redis.io/docs/install/install-redis/).

2. Install the server's packages:

   ```sh
   npm install
   ```

3. Copy .env.example to .env and configure the environment variables.

   ```sh
   cp .env.example .env
   ```

### Configure server

The available environment variables and their defaults are shown below.

```
# set server host and port
HOST=0.0.0.0
PORT=3000

# set redis connection URL
REDIS_URL=redis://localhost:6379
```

### Configure queries

Add your own queries to the `src/server/queries` directory, and make sure to add
them to the `src/server/queries/index.ts` file.

#### Adding a new query

Adding a new query is very simple. You just need to set its name, any
parameters, URL, and cache TTL. You can optionally configure queries further,
such as adding headers or transforming the response body. See the type in the
`src/types.ts` file for more details.

**`name`** is the name of the query, which will be used in the query route and
also in the cache key.

**`parameters`** are the query parameters that are required by the query. If a
query takes parameters, a separate response will be cached for each unique set
of parameters. You likely want to use these parameters in the URL function.

**`validate`** is an optional function that validates the parameters. If it
throws or returns an error, the query will not be fetched and the error will be
returned in the response. If it returns `false`, a generic error will be
returned.

**`method`** is the optional HTTP method for the request. Defaults to `GET`.

**`url`** is the URL for the request. If it's a function (instead of a string),
it will be called with the query's parameters as arguments and the result will
be used.

**`headers`** are the optional headers for the request. If it's a function
(instead of an object), it will be called with the query's parameters as
arguments and the result will be used.

**`transform`** is an optional function that transforms the query's response
body. Its second argument is the query's parameters.

**`ttl`** is the cache TTL in seconds. If it's a function (instead of a number),
it will be called with the query's parameters as arguments and the result will
be used.

**`revalidate`** is an optional boolean that determines whether or not this
query should be revalidated by the revalidate script. Defaults to `true`.

## Usage

Run the server:

```sh
npm run serve
```

Perform a query:

```sh
curl -X GET http://localhost:3000/q/query_name?parameter=value
```

Run the revalidator:

```sh
npm run revalidate
```

Run the server and revalidator with pm2:

```sh
npm run start
```

### Production

Run the server and revalidator with pm2 in production (daemon mode):

```sh
npm run start:prod
```

## Testing

Run the tests:

```sh
npm run test
```
