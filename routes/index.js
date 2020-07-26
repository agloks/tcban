const util = require("util")
const fs = require('fs');
const app  = require("../app")
const accountCacheModel = require("../models/account_cache")
const AccountTechBanAPI = require("../src/accounts/resource_account_techban")

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

//it's important to use async here else will break
app.get('/', async () => ({ hello: 'Rélou Moro' }));

//get auth to get resource to manager account
app.post('/api/V1/account/authGrant', async (req, res) => {
  try {
    const techban = new AccountTechBanAPI(req.CONFIGS)
    const linkToCodeConcent = await techban.getConsentLinkAccount()
    
    res.status(200)
    return res.send({link: linkToCodeConcent.body})
  } catch (error) {
    console.log(error)
    return res.error(req, res)
  }
});

//insert permission code to get resources
app.post('/api/V1/account/codeConcent', async (req, res) => {
  try {
    const { code, easyID } = req.json

    const techban = new AccountTechBanAPI(req.CONFIGS)
    await techban.getTokenAccounts(code)

    let cacheToCreate = {
      easyID: easyID,
      obParticipantID: techban.configs.OB_PARTICIPANT_ID,
      rsBearerTokenID: techban.token_id
    }

    const accountCache = await new accountCacheModel(cacheToCreate)
    await accountCache.save(true)

    res.status(200)
    return res.send({token: techban.token_id})
  } catch (error) {
    console.log(error)
    return res.error(req, res)
  } 
})

//insert permission code to get resources
app.post('/api/V1/account/getFullDetailAccount', async (req, res) => {
  try {
    const { easyID } = req.json
    if(easyID == undefined) {
      res.status(400)
      return res.send({"ERROR": "Missing easyID"})
    }

    const techban = new AccountTechBanAPI(req.CONFIGS)
    const accountCache = await accountCacheModel.findOne({easyID: easyID})
    console.log(accountCache)
    
    techban.token_id = accountCache["rsBearerTokenID"]

    const result = await techban.getAllAccount()

    res.status(200)
    return res.send({accounts: result})
  } catch (error) {
    console.log(error)
    return res.error(req, res)
  } 
})