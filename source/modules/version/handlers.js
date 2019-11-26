const { Persistence } = require('defra-hapi-utils')
const moment = require('moment')
const git = require('git-last-commit')
const findUp = require('find-up')

class VersionHandlers extends require('../handlers') {
  async getServiceVersions () {
    const { serviceApi } = this
    if (serviceApi) {
      const persistence = new Persistence({ path: `${serviceApi}/version` })
      return [await persistence.restore()]
    }
    return []
  }

  // Overrides parent class handleGet
  async handleGet (request, h, errors) {
    const { info: instance } = request.server
    const commit = await new Promise((resolve, reject) => {
      git.getLastCommit((err, commit) => {
        if (err) {
          reject(err)
        } else {
          resolve(commit)
        }
      }, { dst: this.repoPath })
    })
    const { name, homepage, version } = require(await findUp('package.json', this.repoPath))
    Object.assign(commit, { name, version, commit: homepage.replace('#readme', `/commit/${commit.hash}`), instance })
    const services = ([commit].concat(await this.getServiceVersions()).map((service) => {
      const { instance, name, version, commit, hash } = service
      const startedTimestamp = moment(instance.started).format('DD/MM/YYYY HH:mm:ss')
      return { startedTimestamp, name, version, commit, hash }
    }))
    this.viewData = { services, renderTimestamp: moment().format('DD/MM/YYYY HH:mm:ss') }
    return super.handleGet(request, h, errors)
  }
}

module.exports = VersionHandlers
