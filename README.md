# Webpack Dev Server Mock Middleware

> Add mocked routes to webpack dev server. Also, this is just an [express][express] middleware, you can use this in any [express][express] used.

## Usage

> See detail in [test](test/main.js).

```js
const mock = require('@lakca/webpack-mock')

module.exports = {
  devServer: {
    before(app) {
      mock(options)(app)
    }
  }
}
```

```js
const mock = require('@lakca/webpack-mock')
const app = express()
mock(options)(app)
```

## Options

### `options.routeFiles` {string|string[]}

Specify mock routes definition file/files, regarded as absolute path/paths where mock routes definition files are.

### `options.watch` {string|string[]}

Watch mock folders/files to refresh mock routes. if any folder will effect the mock data, it should be included.

## Mock Route Example

> See more examples in [test](test/data/mock.js).

```js
['get', '/url-response/:name', '${req.params.name}']
```
```js
['get', '/method-url-response-range/:name', '${req.params.name}', '1..2'],
```
```js
['get', '/method-url-response-args/:name', '${req.params.name}${arg0}', { arg0: 'hello' }],
```
```js
['get', '/method-url-response-process_return/:name', '${req.params.name}', (r, req, res) => r + req.method],
```
```js
['get', '/response_is_function/:name', (req, res, {count, render}) => render('${req.params.name}', { req })],
```

## LICENSE

MIT

[express]: https://github.com/expressjs/express
