# Mock Middleware of Webpack Dev Server

> Add mocked routes to webpack dev server. Also, this is just an ordinary [express][express] middleware.

[![Build Status](https://travis-ci.org/lakca/webpack-mock.svg?branch=master)](https://travis-ci.org/lakca/webpack-mock)
[![codecov](https://codecov.io/gh/lakca/webpack-mock/branch/master/graph/badge.svg)](https://codecov.io/gh/lakca/webpack-mock)

## Usage

> See detail in [test](test/main.js#L11).

```js
const mock = require('@lakca/webpack-mock')

module.exports = {
  devServer: {
    before(app) {
      mock({
        routeFiles: require.resolve('./src/mock'),
        ignore: /node_modules/,
        silent: true,
      })(app)
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

### `options.ignore` {RegExp}

Specify pattern of watching file path to be excluded

## Mock Route Example

> See more examples in [test](test/data/mock.js), and template structure detail in [source code](index.js#L125)

### Object

```js
{
    method: 'get',
    url: '/object/:name',
    args: { arg0: 'hello' },
    range: '..10', // String
    delay: 1,
    response: {
      int: 10,
      null: null,
      true: true,
      date: new Date(0), // raw
      name: '${req.params.name}',
      arg0: '${arg0}',
      index: ['${i}'] // `i` is the index, provided by default.
    },
    processResponse: [unifyResponse],
  }
```

### Array

```js
// method is 'get'
[
  '/url-response/:name', // url
  '${req.params.name}' // response
]
```
```js
// random length
[
  'get',
  '/method-url-response-range/:name',
  '${req.params.name}',
  // String
  '1..2' // response is an array of response template, array length is within 1 and 2.
],
```
```js
// additional arguments
[
  'get',
  '/method-url-response-args/:name',
  '${req.params.name}${arg0}',
   // Object
  { arg0: 'hello' } // additional arguments of template interpolation.
],
```
```js
// post processor
[
  'get',
  '/method-url-response-process_return/:name',
  '${req.params.name}',
  // Function
  function processResponse(r/** generated response data */, req, res) => r + req.method
],
```
```js
// response function
[
  'get',
  '/response_is_function/:name',
  // determine response by function instead of template structure.
  function response(req, res, {
    count /** an exact array length in the range */,
    render /** function to render template structure */,
    mock /** mock function in `mockjs`*/,
    delayCall /** call function after delay */
  }) => render('${req.params.name}', { req })
],
```

## LICENSE

MIT

[express]: https://github.com/expressjs/express
