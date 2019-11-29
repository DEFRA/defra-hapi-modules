const Boom = require('@hapi/boom')
const { Photos } = require('defra-hapi-utils')
let photos

const register = async function (server, options = {}) {
  const { path = '/photos', originalType = 'original', alternativeSizes = [], region, apiVersion, bucket, tags = [], enabled = true } = options

  const sizesAllowed = alternativeSizes.map(({ type: size }) => size)

  photos = new Photos({ region, apiVersion, bucket, originalType, alternativeSizes, enabled })

  const handler = async (request, h) => {
    const filename = encodeURIComponent(request.params.filename)
    const size = encodeURIComponent(request.params.size)

    if (sizesAllowed.includes(size)) {
      // Get the photo and return with headers
      const photo = await photos.get(filename, size)
      return h.response(photo.Body).type(photo.ContentType)
    } else {
      return Boom.notFound()
    }
  }

  server.route({
    method: 'GET',
    path: `${path}/{size}/{filename}`,
    handler,
    options: { tags }
  })
}

exports.plugin = {
  name: 'defra-aws-photos',
  register,
  once: true,
  pkg: require('../../package.json'),
  getPhotos: () => photos
}
