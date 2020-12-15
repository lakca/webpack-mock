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
 * @property {number|[number, number]} delay
 * delay seconds(or array providing min and max delay seconds) to send response.
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
 *
 * @param {RegExp} [options.ignore]
 * ignore pattern.
 *
 * @param {boolean} [options.silent]
 * ignore pattern.
 *
 * @return {function (import('express').Application): void}
 */
module.exports = options => {
  const routeFiles = Array.isArray(options.routeFiles) ? options.routeFiles : [options.routeFiles]
  const ignoreRegExp = options.ignore
  return app => {
    app.lazyrouter()
    const watcher = watch([], { ignoreInitial: true })
    const stack = app._router.stack
    const addedLayers = []
    let anchor = -1
    loadRoutes()
    watcher.on('all', (event, filepath) => {
      unwatchRequireChain(filepath)
      clearRequireCache(filepath)
      loadRoutes()
    })

    function loadRoutes() {
      try {
        mountRoutes()
      } catch (e) {
        if (options.silent) {
          app.emit('reloadRouteFailed', e)
        } else {
          throw e
        }
        return
      }
      app.emit('reloadRouteSuccess')
    }
    /**
     * 1. remove previous added routes.
     * 2. reset `anchor` and `routeCount`.
     * 3. add new routes one by one with increasing `routeCount`.
     * 4. rebase added routes to original position.
     */
    function mountRoutes() {
      // remove previous added routes.
      for (let i = addedLayers.length; i--;) {
        const layer = addedLayers[i]
        const index = stack.indexOf(layer)
        if (~index) {
          stack.splice(index, 1)
          anchor = index
        }
      }
      // empty saved layers.
      addedLayers.length = 0
      // add new routes one by one with updating 'routeCount' in the meantime.
      let err
      try {
        for (const file of routeFiles) {
          const definitions = loadRouteModule(file)
          for (const def of definitions) {
            let method, url, response, range, delay, args, processResponse
            if (Array.isArray(def)) {
              let j
              switch (def.length) {
                case 0:
                case 1:
                  continue
                case 2:
                  [url, response] = def
                  break
                case 3:
                  [method, url, response] = def
                  break
                default:
                  [method, url, response] = def
                  processResponse = []
                  j = 3
                  while (j < def.length) {
                    switch (typeof def[j]) {
                      case 'function':
                        processResponse.push(def[j])
                        break
                      case 'object':
                        args = def[j]
                        break
                      case 'string':
                        range = def[j]
                        break
                      case 'number':
                        delay = def[j]
                        break
                      default:
                    }
                    j++
                  }
              }
            } else if (def) {
              method = def.method
              url = def.url
              response = def.response
              range = def.range
              delay = def.delay
              args = def.args
              processResponse = Array.isArray(def.processResponse) ? def.processResponse : [def.processResponse]
            } else {
              continue
            }
            processResponse = (processResponse || []).filter(e => typeof e === 'function')
            app[method || 'get'](url, function(req, res) {
              const count = range ? random(range) : 1
              let r
              if (typeof response === 'function') {
                r = response(req, res, { count, render, mock, delayCall })
              } else if (range) {
                r = new Array(count).fill(null).map((e, i) => mock(render(response, Object.assign({ req, i }, args))))
              } else {
                r = mock(render(response, Object.assign({ req }, args)))
              }

              processResponse.forEach(e => {
                r = e(r, req, res, { count, render, mock, delayCall })
              })

              if (r === res) {
                delayCall(delay, () => res.end())
              } else if (r !== void 0) {
                delayCall(delay, () => res.send(r))
              }
            })
            // save new layers
            addedLayers.push(stack.pop())
          }
        }
      } catch (e) {
        err = e
      }
      // add new layers
      if (~anchor) {
        stack.splice(anchor, 0, ...addedLayers)
      } else {
        stack.push(...addedLayers)
      }
      if (err) {
        throw err
      }
    }

    function loadRouteModule(file) {
      try {
        const definitions = require(file)
        watchRequireChain(file)
        return definitions
      } catch (e) {
        watchRequireChain(file)
        throw e
      }
    }

    function watchRequireChain(id) {
      eachRequire(id, function(mod) {
        if (ignoreRegExp && ignoreRegExp.test(mod.id)) {
          return
        }
        watcher.add(mod.id)
      })
    }

    function unwatchRequireChain(id) {
      eachRequire(id, function(mod) {
        if (mod.id !== id) {
          watcher.unwatch(mod.id)
        }
      })
    }

    // delete cache from entry(route file) to changed file
    function clearRequireCache(id) {
      if (require.cache[id]) {
        let parentId
        if (require.cache[id].parent) {
          parentId = require.cache[id].parent.id
          removeEle(require.cache[id].parent.children, require.cache[id])
        }
        delete require.cache[id]
        clearRequireCache(parentId)
      }
    }
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

function delayCall(seconds, cb) {
  if (Array.isArray(seconds)) {
    seconds = Math.random() * (seconds[1] - seconds[0]) + seconds[0]
  }
  setTimeout(cb, seconds * 1000)
}

function eachRequire(id, handler) {
  const mod = require.cache[id]
  if (mod) {
    const terminated = handler(mod)
    if (!terminated) {
      if (mod.children) {
        mod.children.forEach(childMod => {
          eachRequire(childMod.id, handler)
        })
      }
    }
  }
}

function removeEle(arr, el) {
  const index = arr.indexOf(el)
  if (~index) {
    arr.splice(index, 1)
  }
}
