const request = require('request');
const req = request.defaults();
const fs = require('fs');
const uuid = require('uuid');
const qs = require("qs")
const AuthAccountTechBanAPI = require("./auth_account_techban")

class AccountTechBanAPI extends AuthAccountTechBanAPI {

  constructor(configs) {
    super(configs)
    //temp overwrite
    this.token_id = "454ae28a-348f-417e-ae6c-3fa3e3826f2d"
  }

  getAllAccount = async() =>{
    return new Promise((res, err) => {
      req.get({
        uri : this.configs.RESOURCE_ENDPOINT + '/open-banking/v3.1/aisp/accounts',
        key: this.configs.CA_KEY,
        cert: this.configs.CA_CERT,
        headers: {
          'Content-Type' : 'application/json',
          'Accept' : '*/*',
          'x-fapi-financial-id': this.configs.OB_PARTICIPANT_ID, 
          'x-fapi-interaction-id': uuid.v4(), 
          'Authorization': `Bearer ${this.token_id}`
        },
        rejectUnauthorized: false
      }, this.handlerCallbackRequest(res, err))
    });
  }

  getAllBalance = async() =>{
    return new Promise((res, err) => {
      req.get({
        uri : this.configs.RESOURCE_ENDPOINT + '/open-banking/v3.1/aisp/balances',
        key: this.configs.CA_KEY,
        cert: this.configs.CA_CERT,
        headers: {
          'Content-Type' : 'application/json',
          'Accept' : '*/*',
          'x-fapi-financial-id': this.configs.OB_PARTICIPANT_ID, 
          'x-fapi-interaction-id': uuid.v4(), 
          'Authorization': `Bearer ${this.token_id}`
        },
        rejectUnauthorized: false
      }, this.handlerCallbackRequest(res, err))
    });
  }
};

// const CONFIGS = {
//   CA_KEY: fs.readFileSync("./assets/Banco_1/certs/client_private_key.key"),
//   CA_CERT: fs.readFileSync("./assets/Banco_1/certs/client_certificate.crt"),
//   TOKEN_ENDPOINT: "https://as1.tecban-sandbox.o3bank.co.uk/token",
//   RESOURCE_ENDPOINT: "https://rs1.tecban-sandbox.o3bank.co.uk",
//   AUTH_HEADER_TOKEN: "YmFkOGI0ZDktMjA3Zi00NmM1LTkyNTEtODQxOTU5YTFiMDI2OmY5NWFhODBkLTE5ODYtNDdiOC05NjY2LThkZDM2NDRlMTMxNw==",
//   OB_PARTICIPANT_ID: "c3c937c4-ab71-427f-9b59-4099b7c680ab"
// };

// (async() => {
//   try {
//     const techban = new AccountTechBanAPI(CONFIGS)
//     // console.log(await techban.getTokenAccounts("bed0f9b3-d718-4e1e-a2c5-9a230935fbbe"))
//     const a = await techban.getAllAccount()
//     console.log(a)
//   } catch (error) {
//     console.log(error)
//   }
// })()

module.exports = AccountTechBanAPI