const glob = require("glob")
const testFiles = glob.sync('source/**/*.test.js')
const config = {
  paths: testFiles,
  coverage: true,
  threshold: 95,
  'coverage-exclude': testFiles.concat(['test-helper.js', 'model-test-helper.js']),
  globals: '__core-js_shared__'
}

module.exports = config
