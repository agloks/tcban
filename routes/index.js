
const util = require("util")
const AuthAccountTechBanAPI = require("../src/auth_account_techban")
const app  = require("../app")

const ERROR_INTERN = async (req, res) => {
  res.status(500)
  return res.send({status: "ERROR_INTERN"})
}

app.use((req, res, next) => {
  req.util = util
  res.error = ERROR_INTERN
  
  if(req.headers["content-type"] == "application/json")
    req.json = JSON.parse(req.body)

  next()
})

//it's important to use async here else will break
app.get('/', async () => ({ hello: 'world' }));

//get auth to get resource to manager account
app.post('/api/V1/account/authGrant', async (req, res) => {
  try {
    const CONFIGS = {
      CA_KEY: fs.readFileSync("./assets/Banco_1/certs/client_private_key.key"),
      CA_CERT: fs.readFileSync("./assets/Banco_1/certs/client_certificate.crt"),
      TOKEN_ENDPOINT: "https://as1.tecban-sandbox.o3bank.co.uk/token",
      RESOURCE_ENDPOINT: "https://rs1.tecban-sandbox.o3bank.co.uk",
      AUTH_HEADER_TOKEN: "YmFkOGI0ZDktMjA3Zi00NmM1LTkyNTEtODQxOTU5YTFiMDI2OmY5NWFhODBkLTE5ODYtNDdiOC05NjY2LThkZDM2NDRlMTMxNw==",
      OB_PARTICIPANT_ID: "c3c937c4-ab71-427f-9b59-4099b7c680ab"
    };
    const techban = new AuthAccountTechBanAPI(Configs)
    const linkToCodeConcent = await techban.getConsentLinkAccount()
    
    res.status(200)
    return res.send({link: linkToCodeConcent})
  } catch (error) {
    console.log(error)
    return res.error(req, res)
  }
});

//insert permission code to get resources
app.post('/api/V1/account/codeConcent', async (req, res) => {
  try {
    const { code } = req.json

    const techban = new AuthAccountTechBanAPI(Configs)
    const token_id = await techban.getTokenAccounts(code)

    res.status(200)
    return res.send({token: token_id})
  } catch (error) {
    console.log(error)
    return res.error(req, res)
  } 
})