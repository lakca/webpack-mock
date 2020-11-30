const vm = require('vm')
const { mock } = require('mockjs')
const { watch } = require('chokidar')

/**
 * @typedef {import('express').Request} Req
 *
 * @typedef {import('express').Response} Res
 *
 * @typedef {<T>(req: Req, res: Res, args: { repeatTimes: number, render: render<T> }) => *} ResponseFunction
 *
 * @typedef {string|number|boolean|null|undefined} Primitive
 *
 * @typedef {(string|number|boolean|null|undefined|PlainObject)[]} PlainArray
 *
 * @typedef {{[k: string]: Primitive|PlainArray|PlainObject}} PlainObject
 */
/**
 * @typedef ObjectRouteItem
 *
 * @property {string} [method=get]
 *
 * @property {string} url
 *
 * @property {Exclude<*, ResponseFunction>|ResponseFunction} [response]
 * If response is `any type` except `function`, will be treated as a mockable response data,
 * and emitted with `res.send`.
 *
 * @property {string} [range]
 * Set the repeat times of a response mock,
 * if set this argument, returned data will be an array of the response mock.
 *
 * Example:
 *
 *  - `1..`, length is not less than 1.
 *  - `1..10`, length is between 1 and 10, including 1 and 10.
 *  - `..10`, the same as `0..10`
 *
 * @property {object} args
 * Additional arguments `object` for parameters in interpolation.
 *
 * @property {(responseDataOrResponseFunctionReturn: *, req: Req, res: Res) => void} [processResponse]
 * Post processing response.
 *
 * @typedef {Array<ObjectRouteItem[keyof ObjectRouteItem]>} ArrayRouteItem
 *
 * @typedef {ObjectRouteItem|ArrayRouteItem} RouteItem
 */

/**
 * @param {object} options
 *
 * @param {string|string[]} options.routeFiles
 *  Specify mock routes definition file/files, regarded as absolute path/paths where mock routes definition files are;
 *
 * @param {string|string[]} [options.watch]
 *  Watch mock folders/files to refresh mock routes.
 *  if any folder will effect the mock data, it should be included.
 */
module.exports = options => {
  const routeFiles = Array.isArray(options.routeFiles) ? options.routeFiles : [options.routeFiles]
  return app => {
    app.lazyrouter()
    const stack = app._router.stack
    const anchor = stack.length
    let count = mountRoutes(app)
    watch(options.watch, { ignoreInitial: true })
      .on('all', (event, filepath) => {
        stack.splice(anchor, count)
        const start = stack.length
        delete require.cache[filepath]
        count = mountRoutes(app)
        // move to the original position.
        stack.splice(anchor, 0, ...stack.splice(start, count))
        app.emit('routeReloaded')
      })
  }
  /**
   * mount routes.
   *
   * @author lakca<912910011@qq.com>
   * @param {import('express').Application} app
   * @returns
   */
  function mountRoutes(app) {
    /** @type {RouteItem[]} */
    const items = []
    for (const file of routeFiles) {
      items.push.apply(items, require(file))
    }
    for (const item of items) {
      let method, url, response, range, args, processResponse, j
      if (Array.isArray(item)) {
        switch (item.length) {
          case 0:
          case 1:
            continue
          case 2:
            [url, response] = item // get
            break
          case 3:
            [method, url, response] = item
            break
          default:
            [method, url, response] = item
            j = 3
            while (j < item.length) {
              switch (typeof item[j]) {
                case 'function':
                  processResponse = item[j]
                  break
                case 'object':
                  args = item[j]
                  break
                case 'string':
                  range = item[j]
                  break
                default:
              }
              j++
            }
        }
      } else {
        ({ method, url, response, range, args, processResponse } = item)
      }
      app[method || 'get'](url, function(req, res) {
        const count = range ? random(range) : 1
        let r = typeof response === 'function'
          ? response(req, res, { count, render })
          : range
            ? new Array(count).fill(null).map((e, i) => mock(render(response, Object.assign({ req, i }, args))))
            : mock(render(response, Object.assign({ req }, args)))
        if (processResponse) r = processResponse(r, req, res)
        if (r === res) {
          res.end()
        } else if (r !== void 0) {
          res.send(r)
        }
      })
    }
    return items.length
  }
}

/**
 * Generate random integer.
 *
 * Examples:
 *
 *    // integer not less than 1
 *    random('1..')
 *    // integer not more than 10 and not less than 1
 *    random('1..10')
 *    // same as `random('0..10')`
 *    random('..10')
 *
 * @param {string} str integer joined with `..`,
 *  the left one is minimum and the other is maximum.
 * @return {number}
 */
function random(str) {
  let [min, max] = str.split('..')
  min |= 0
  max |= 0
  if (min >= max) return min
  return Math.round(Math.random() * (max - min)) + min
}

function interpolate(str, ctx) {
  let r = str.match(/^\$\{([^\}]+)\}$/)
  if (r) {
    return vm.runInNewContext(r[1], ctx)
  } else {
    return vm.runInNewContext('`' + str + '`', ctx)
  }
}

/**
 * Render data with arguments from template.
 *
 * @author lakca<912910011@qq.com>
 * @template {string|object|array} T
 * @param {T} tpl data template with using parameters.
 * @param {object} ctx interpolation arguments.
 * @returns {T}
 */
function render(tpl, ctx) {
  let r, type = typeof tpl
  if (tpl && type === 'object') {
    type = toString.call(tpl).match(/\S+(?=])/)[0]
    if ((type === 'Array' && (r = []))
    || (type === 'Object') && (r = {})) {
      for (const k in tpl) {
        r[k] = render(tpl[k], ctx)
      }
    } else {
      r = tpl
    }
  } else if (type === 'string') {
    r = interpolate(tpl, ctx)
  } else {
    r = tpl
  }
  return r
}
