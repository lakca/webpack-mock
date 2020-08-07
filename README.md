# Webpack Dev Server Mock Middleware

> Add mocked routes to webpack dev server. Also, this is just an [express][express] middleware, you can use this in any [express][express] used.

## Usage

See detail in [tests](test/main.js).

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

# LICENSE

MIT

[express]: https://github.com/expressjs/express
