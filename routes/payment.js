const util = require("util")
const fs = require('fs');
const app  = require("../app")
const paymentCacheModel = require("../models/payment_cache")
const {PaymentTechBanAPI, getPaymentPayload} = require("../src/payments/payment_techban")

const ERROR_INTERN = async (req, res) => {
  res.status(500)
  return res.send({status: "ERROR_INTERN"})
}

app.use((req, res, next) => {
  req.util = util
  req.CONFIGS = {
    CA_KEY: fs.readFileSync("./assets/Banco_1/certs/client_private_key.key"),
    CA_CERT: fs.readFileSync("./assets/Banco_1/certs/client_certificate.crt"),
    TOKEN_ENDPOINT: "https://as1.tecban-sandbox.o3bank.co.uk/token",
    RESOURCE_ENDPOINT: "https://rs1.tecban-sandbox.o3bank.co.uk",
    AUTH_HEADER_TOKEN: "YmFkOGI0ZDktMjA3Zi00NmM1LTkyNTEtODQxOTU5YTFiMDI2OmY5NWFhODBkLTE5ODYtNDdiOC05NjY2LThkZDM2NDRlMTMxNw==",
    OB_PARTICIPANT_ID: "c3c937c4-ab71-427f-9b59-4099b7c680ab"
  }
  res.error = ERROR_INTERN
  
  if(req.headers["content-type"] == "application/json")
    req.json = JSON.parse(req.body)

  next()
})

//get auth to get resource to manager payment
app.post('/api/V1/payment/authGrant', async (req, res) => {
  try {
    const { 
      amount, cpf, name,
      initID, endID, easyID
    } = req.json

    const dataToPayment = {
      "amount": amount,
      "cpf": cpf, // maximum 11 number
      "name": name,
      "initID": initID,
      "endID": endID
    };

    const techban = new PaymentTechBanAPI(req.CONFIGS)
    techban.payload = getPaymentPayload(dataToPayment)
    const linkToCodeConcent = await techban.getConsentLinkPayment()

    let cacheToCreate = {
      easyID: easyID,
      consentID: techban.acess_consent_id,
      paymentPayload: techban.payload
    }

    const paymentCache = await new paymentCacheModel(cacheToCreate)
    await paymentCache.save(true)
    
    res.status(200)
    return res.send({link: linkToCodeConcent.body})
  } catch (error) {
    console.log(error)
    return res.error(req, res)
  }
});

//insert permission code to get resources
app.post('/api/V1/payment/codeConcent', async (req, res) => {
  try {
    const { code, easyID } = req.json

    const techban = new PaymentTechBanAPI(req.CONFIGS)
    await techban.getTokenPayment(code)

    let cacheToCreate = {
      easyID: easyID,
      obParticipantID: techban.configs.OB_PARTICIPANT_ID,
      rsBearerTokenID: techban.token_id
    }

    const paymentCache = await paymentCacheModel.findOneAndUpdate(
      {easyID: easyID},
      cacheToCreate,
      {new: true}
    )
    console.log(paymentCache)

    res.status(200)
    return res.send({token: techban.token_id})
  } catch (error) {
    console.log(error)
    return res.error(req, res)
  } 
})

//insert permission code to can do the payment
app.post('/api/V1/payment/orderPayment', async (req, res) => {
  try {
    const { easyID } = req.json
    if(easyID == undefined) {
      res.status(400)
      return res.send({"ERROR": "Missing easyID"})
    }

    const techban = new PaymentTechBanAPI(req.CONFIGS)
    const paymentCache = await paymentCacheModel.findOne({easyID: easyID})
   
    techban.token_id = paymentCache["rsBearerTokenID"]
    techban.payload = paymentCache["paymentPayload"]
    techban.acess_consent_id = paymentCache["consentID"]
    
    const result = await techban.doPayment()

    res.status(200)
    return res.send({payment: result})
  } catch (error) {
    console.log(error)
    return res.error(req, res)
  } 
})