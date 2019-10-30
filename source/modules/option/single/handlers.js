const Joi = require('@hapi/joi')
const utils = require('../../../utils/utils')

class SingleOptionHandlers extends require('../../handlers') {
  get referenceData () {
    const { config } = utils
    return config.referenceData[this.fieldname] || {}
  }

  get choices () {
    return this.referenceData.choices || []
  }

  get items () {
    return this.choices
      .map(({ label: text, shortName: value, hint, value: storedValue }) => {
        return { text, value, hint, storedValue }
      })
  }

  get schema () {
    const validValues = this.items.map(({ value }) => value)
    return {
      [this.fieldname]: Joi.string().valid(...validValues).required()
    }
  }

  get errorMessages () {
    return {
      [this.fieldname]: {
        'any.required': this.selectError
      }
    }
  }

  async getData (request) {
    return await this.Model.get(request) || {}
  }

  async setData (request, registration) {
    return this.Model.set(request, registration)
  }

  // Overrides parent class handleGet
  async handleGet (request, h, errors) {
    const data = await this.getData(request)
    const { hint } = this.referenceData

    // Use the payload in this special case to force the items to be displayed even when there is an error
    this.viewData = {
      hint: hint ? { text: hint } : undefined,
      items: this.items.map(({ value, text, hint, storedValue }) => {
        return {
          value: value.toString(),
          text,
          hint: hint ? { text: hint } : undefined,
          checked: storedValue === data[this.fieldname]
        }
      })
    }
    return super.handleGet(request, h, errors)
  }

  // Overrides parent class handlePost
  async handlePost (request, h) {
    const data = await this.getData(request)
    const choice = this.choices.find(({ shortName }) => {
      return request.payload[this.fieldname] === shortName
    })
    if (this.onChange && data[this.fieldname] !== choice.value) {
      await this.onChange(data)
    }
    data[this.fieldname] = choice.value
    await this.setData(request, data)
    return super.handlePost(request, h)
  }
}

module.exports = SingleOptionHandlers
