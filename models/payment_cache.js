const mongoose = require("mongoose")
const moment = require("moment")
const Schema = mongoose.Schema

const getUnixEpoch = () => moment.utc().unix()

const paymentCacheSchema = new Schema({
  easyID: {type : Schema.Types.Mixed},
  obParticipantID: {type : Schema.Types.Mixed},
  rsBearerTokenID: {type : Schema.Types.Mixed},
  consentID: {type : Schema.Types.Mixed},
  paymentPayload: {type : Schema.Types.Mixed},
  updatedAtUnixEpoch: {type: Number, default: getUnixEpoch},
  cratedAtUnixEpoch: {type: Number, default: getUnixEpoch} //utc in seconds scala
},
{timestamps: true})

paymentCacheSchema.index({createdAt: 1}, {expireAfterSeconds: 60 * 5})
const paymentCacheModel = mongoose.model("payments_cache", paymentCacheSchema)

module.exports = paymentCacheModel