const register = function (server, options = {}) {
  const { path, directories, tags } = options

  server.route({
    method: 'GET',
    path,
    handler: {
      directory: {
        path: directories
      }
    },
    options: { tags }
  })
}

exports.plugin = {
  name: 'defra-public',
  register,
  once: true,
  pkg: require('../../package.json')
}
