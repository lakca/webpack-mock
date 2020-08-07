
/** @type {import('../../index').RouteItem[]} */
module.exports = [
  [], // ignored
  [''], // ignored
  ['/url-response/:name', '${req.params.name}'],
  ['get', '/method-url-response/:name', '${req.params.name}'],
  ['get', '/last_value_selected/:name', '${req.params.name}${arg0}',,,,,,,{ arg0: 'hello' }, { arg0: 'HELLO' }],
  ['get', '/method-url-response-range/:name', '${req.params.name}', '1..2'],
  ['get', '/method-url-response-range_min_greater_max/:name', '${req.params.name}', '3..2'],
  ['get', '/method-url-response-args/:name', '${req.params.name}${arg0}', { arg0: 'hello' }],
  ['get', '/method-url-response-process_return/:name', '${req.params.name}', (r, req, res) => r + req.method],
  ['get', '/method-url-response-process_no_return/:name', '${req.params.name}', (r, req, res) => res.send(r + req.method)],
  ['get', '/response_is_function/:name', (req, res, {count, render}) => render('${req.params.name}', {req})],
  {
    method: 'get',
    url: '/object/:name',
    args: { arg0: 'hello' },
    range: '..10',
    response: {
      int: 10,
      null: null,
      true: true,
      date: new Date(0), // raw
      name: '${req.params.name}',
      arg0: '${arg0}',
      index: ['${i}'] // `i` is the index of which, provided by default.
    }
  }
]
