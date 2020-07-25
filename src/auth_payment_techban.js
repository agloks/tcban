const request = require('request');
const req = request.defaults();
const fs = require('fs');
const uuid = require('uuid');
const qs = require("qs")

class AuthAccountTechBanAPI {
  constructor(configs) {
    this.configs = configs,
    this.token_bearer = ""
    this.acess_consent_id = ""
  };

  handlerCallbackRequest = (res, err) => {
    return function _callbackRequest(error, response, body) {
      const _error = error;
      const _response = response;
      
      // console.log(_response)
      if(_response.statusCode < 400)
        res(_response)
      else
        err([_response.statusCode, _error])
    }
  };

  getTokenPayments = async() => {
    return new Promise((res, err) => {
      req.post({
        uri : this.configs.TOKEN_ENDPOINT,
        key: this.configs.CA_KEY,
        cert: this.configs.CA_CERT,
        headers: {
          'Content-Type' : 'application/json',
          'Accept' : 'application/json',
          'Authorization' : `Basic ${this.configs.AUTH_HEADER_TOKEN}`
        },
        form: {
          "grant_type": "client_credentials", 
          "scope": "payments openid"
        },
        rejectUnauthorized: false
      }, this.handlerCallbackRequest(res, err))
    });
  };
};

const CONFIGS = {
  CA_KEY: fs.readFileSync("./assets/Banco_1/certs/client_private_key.key"),
  CA_CERT: fs.readFileSync("./assets/Banco_1/certs/client_certificate.crt"),
  TOKEN_ENDPOINT: "https://as1.tecban-sandbox.o3bank.co.uk/token",
  RESOURCE_ENDPOINT: "https://rs1.tecban-sandbox.o3bank.co.uk",
  AUTH_HEADER_TOKEN: "YmFkOGI0ZDktMjA3Zi00NmM1LTkyNTEtODQxOTU5YTFiMDI2OmY5NWFhODBkLTE5ODYtNDdiOC05NjY2LThkZDM2NDRlMTMxNw==",
  OB_PARTICIPANT_ID: "c3c937c4-ab71-427f-9b59-4099b7c680ab"
};

(async() => {
  try {
    const techban = new AuthAccountTechBanAPI(CONFIGS)
    const a = await techban.getTokenPayments()
    console.log(a.body)
  } catch (error) {
    console.log(error)
  }
})()
