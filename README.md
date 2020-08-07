# Webpack Dev Server Mock Middleware

> Add mocked routes to webpack dev server. Also, this is just an [express][express] middleware, you can use this in any [express][express] used.

## Usage

> See detail in [test](test/main.js#L11).

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

> See more examples in [test](test/data/mock.js), and template structure detail in [source code](index.js#L85)

```js
[
  'get', // method
  '/url-response/:name', // url
  '${req.params.name}' // response
]
```
```js
[
  'get',
  '/method-url-response-range/:name',
  '${req.params.name}',
  '1..2' // response is an array of response template, array length is within 1 and 2.
],
```
```js
[
  'get',
  '/method-url-response-args/:name',
  '${req.params.name}${arg0}',
  { arg0: 'hello' } // additional arguments of template interpolation.
],
```
```js
[
  'get',
  '/method-url-response-process_return/:name',
  '${req.params.name}',
  // additional processor of response data.
  (r/** generated response data */, req, res) => r + req.method
],
```
```js
[
  'get',
  '/response_is_function/:name',
  // determine response by function instead of template structure.
  (req, res, {count /** exact array length */, render /** render function of template structure */}) => render('${req.params.name}', { req })
],
```

## LICENSE

MIT

[express]: https://github.com/expressjs/express
