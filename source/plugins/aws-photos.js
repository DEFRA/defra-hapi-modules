const Boom = require('@hapi/boom')
const { Photos, utils } = require('defra-hapi-utils')
let photos

const register = async function (server, options = {}) {
  const { path = '/photos', originalType = 'original', alternativeSizes = [], maxMb, minKb, payloadMaxBytes, region, apiVersion, bucket, tags = [], enabled = true } = options

  const sizesAllowed = alternativeSizes.map(({ type: size }) => size)
  sizesAllowed.push(originalType)

  photos = new Photos({ region, apiVersion, bucket, originalType, alternativeSizes, maxMb, minKb, payloadMaxBytes, enabled })

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
  pkg: require('../../package.json')
}

exports.Photos = Photos

exports.getPhotos = async () => {
  await utils.until(() => photos)
  return photos
}
