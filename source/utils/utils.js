let _config

class Utils {
  static get config () {
    if (_config) {
      return _config
    }
    throw new Error('Config not set in common modules')
  }

  static setConfig (config) {
    _config = config
  }
}

module.exports = Utils
