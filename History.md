## 1.0.0

- add watching custom files support.
- add dynamic routes reload support.
- add both array and object types routes definition support.
- add random length of array type response data support.
- add value interpolation and expression support.
- add `mockjs` support.
- add post process of response data support.

## 1.1.0

- **refactor: watching files, handling error and mounting routes.**
- remove `watch` option, due to dynamic dependences watcher in the new release.
- add `ignore` option, which is a regular expression, to match files to exclusion.
- support `delay` parameter in route definition.
- support multiple `processResponse` in route definition.
