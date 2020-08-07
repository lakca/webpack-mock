const request = require('supertest')
const express = require('express')
const path = require('path')
const fs = require('fs')
const mock = require('..')
const mockFile = path.join(__dirname, 'data/mock.js')
const tmpMockFile = path.join(__dirname, 'data/mock.tmp.js')

fs.writeFileSync(tmpMockFile, fs.readFileSync(mockFile))

function start(options) {
  const app = express()
  mock(options)(app)
  return app
}

function basicTests(app, name) {
  it('Array: url, response', function(done) {
    request(app)
      .get('/url-response/' + name)
      .expect(name, done)
  })

  it('Array: method, url, response', function(done) {
    request(app)
      .get('/method-url-response/' + name)
      .expect(name, done)
  })

  it('Array: method, url, response, range', function(done) {
    request(app)
      .get('/method-url-response-range/' + name)
      .end((err, res) => {
        should(res.body).be.an.Array
        should(res.body.length).within(1, 2)
        for (const e of res.body) {
          should(e).equal(name)
        }
        return done()
      })
  })

  it('Array: method, url, response, range(min >= max, should be min)', function(done) {
    request(app)
      .get('/method-url-response-range_min_greater_max/' + name)
      .end((err, res) => {
        should(res.body).be.an.Array().length(3)
        for (const e of res.body) {
          should(e).equal(name)
        }
        return done()
      })
  })

  it('Array: method, url, response, args', function(done) {
    request(app)
      .get('/method-url-response-args/' + name)
      .expect(name + 'hello', done)
  })

  it('Array: method, url, response, process with return', function(done) {
    request(app)
      .get('/method-url-response-process_return/' + name)
      .expect(name + 'GET', done)
  })

  it('Array: method, url, response, process without return', function(done) {
    request(app)
      .get('/method-url-response-process_no_return/' + name)
      .expect(name + 'GET', done)
  })

  it('Array: response is function', function(done) {
    request(app)
      .get('/response_is_function/' + name)
      .expect(name, done)
  })

  it('Array: last value is applied', function(done) {
    request(app)
      .get('/last_value_selected/' + name)
      .expect(name + 'HELLO', done)
  })

  it('Object', function(done) {
    request(app)
      .get('/object/' + name)
      .end((err, res) => {
        should(res.body).be.an.Array()
        should(res.body.length).within(0, 10)
        for (let i = 0; i < res.body.length; i++) {
          should(res.body[i]).eql({
            name: name,
            arg0: 'hello',
            index: [i],
            int: 10,
            null: null,
            true: true,
            date: new Date(0).toISOString()
          })
        }
        return done()
      })
  })
}

describe('main', function() {
  const app = start({
    routeFiles: tmpMockFile,
    watch: tmpMockFile
  })

  // initial load
  basicTests(app, 'jack')

  after(function(done) {
    // change mock file later with adding extra cases.
    fs.writeFileSync(tmpMockFile, fs.readFileSync(tmpMockFile).toString('utf8') + `
      module.exports.push(['/additional', 'ok'])
    `)

    app.once('routeReloaded', function() {
      describe('Tests after mock file change', function() {

        basicTests(app, 'lily')

        it('additional', function(done) {
          request(app).get('/additional').expect('ok', done)
        })
      })
      done()
    })
  })
})

describe('up to 100%', function() {
  const app = start({
    routeFiles: [tmpMockFile],
    watch: [tmpMockFile]
  })
  basicTests(app, 'mary')
})
