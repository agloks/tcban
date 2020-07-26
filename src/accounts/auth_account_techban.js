const request = require('request');
const req = request.defaults();
const fs = require('fs');
const uuid = require('uuid');
const qs = require("qs");
const moment = require("moment");

class AuthAccountTechBanAPI {
  constructor(configs) {
    this.configs = configs,
    this.token_bearer = ""
    this.acess_consent_id = ""
    this.token_id = ""
  };

  handlerCallbackRequest = (res, err) => {
    return function _callbackRequest(error, response, body) {
      const _error = error;
      const _response = response;
      
      if(_response.statusCode < 400)
        res(_response)
      else
        err([_response.statusCode, _error])
    }
  };

  getAuthTokenAccounts = async() => {
    await this.redirectURI()

    const result = new Promise((res, err) => {
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
          "scope": "accounts openid"
        },
        rejectUnauthorized: false
      }, this.handlerCallbackRequest(res, err))
    });

    this.token_bearer = await result
    if(!Array.isArray(this.token_bearer))
      this.token_bearer = JSON.parse(this.token_bearer.body)["access_token"]

    return result
  };

  validateConsentStatus = async() => {
    return new Promise((res, err) => {
      req.get({
        uri : this.configs.RESOURCE_ENDPOINT + `/open-banking/v3.1/aisp/account-access-consents/${this.acess_consent_id}`,
        key: this.configs.CA_KEY,
        cert: this.configs.CA_CERT,
        headers: {
          'Content-Type' : 'application/json',
          'Accept' : '*/*',
          'x-fapi-financial-id': this.configs.OB_PARTICIPANT_ID, 
          'x-fapi-interaction-id': uuid.v4(), 
          'Authorization': `Bearer ${this.token_bearer}`
        },
        rejectUnauthorized: false
      }, this.handlerCallbackRequest(res, err))
    });
  };

  askGrantToAccount = async() => {
    await this.getAuthTokenAccounts()

    const payload = {
      "Data": {
          "Permissions": [
              "ReadAccountsBasic",
              "ReadAccountsDetail",
              "ReadBalances",
              "ReadBeneficiariesBasic",
              "ReadBeneficiariesDetail",
              "ReadDirectDebits",
              "ReadTransactionsBasic",
              "ReadTransactionsCredits",
              "ReadTransactionsDebits",
              "ReadTransactionsDetail",
              "ReadProducts",
              "ReadStandingOrdersDetail",
              "ReadProducts",
              "ReadStandingOrdersDetail",
              "ReadStatementsDetail",
              "ReadParty",
              "ReadOffers",
              "ReadScheduledPaymentsBasic",
              "ReadScheduledPaymentsDetail",
              "ReadPartyPSU"],
          "ExpirationDateTime": moment.utc().add(12, 'h'),
          "TransactionFromDateTime": moment.utc().add(12, 'h'),
          "TransactionToDateTime": moment.utc().add(12, 'h')
      }, 
      "Risk": {}
    }

    const result = new Promise((res, err) => {
      req.post({
        uri : this.configs.RESOURCE_ENDPOINT + "/open-banking/v3.1/aisp/account-access-consents",
        key: this.configs.CA_KEY,
        cert: this.configs.CA_CERT,
        headers: {
          'Content-Type' : 'application/json',
          'Accept' : '*/*',
          'x-fapi-financial-id': this.configs.OB_PARTICIPANT_ID, 
          'x-fapi-interaction-id': uuid.v4(), 
          'Authorization': `Bearer ${this.token_bearer}`
        },
        json: payload,
        rejectUnauthorized: false
      }, this.handlerCallbackRequest(res, err))
    });

    this.acess_consent_id = await result
    if(!Array.isArray(this.acess_consent_id))
      this.acess_consent_id = this.acess_consent_id.body["Data"]["ConsentId"]

    return result
  };

  getConsentLinkAccount = async() => {
    await this.askGrantToAccount()
    
    const queryString = qs.stringify({
      'scope': 'accounts',
      'alg': 'none'
    })

    return new Promise((res, err) => {
      req.get({
        uri : this.configs.RESOURCE_ENDPOINT + `/ozone/v1.0/auth-code-url/${this.acess_consent_id}?${queryString}` ,
        key: this.configs.CA_KEY,
        cert: this.configs.CA_CERT,
        headers: {
          'Content-Type' : 'application/json',
          'Accept' : '*/*',
          'x-fapi-financial-id': this.configs.OB_PARTICIPANT_ID, 
          'x-fapi-interaction-id': uuid.v4(), 
          'Authorization' : `Basic ${this.configs.AUTH_HEADER_TOKEN}`,
          "redirect_uri": "https://relaxed-austin-d32a73.netlify.app"
        },
        rejectUnauthorized: false
      }, this.handlerCallbackRequest(res, err))
    });
  };

  getTokenAccounts = async(code) => {
    const result = new Promise((res, err) => {
      req.post({
        uri : this.configs.TOKEN_ENDPOINT,
        key: this.configs.CA_KEY,
        cert: this.configs.CA_CERT,
        headers: {
          'Content-Type' : 'application/x-www-form-urlencoded',
          'Authorization' : `Basic ${this.configs.AUTH_HEADER_TOKEN}`
        },
        form: {
          "code": code,
          "grant_type": "authorization_code", 
          "scope": "accounts ",
          "redirect_uri": "https://relaxed-austin-d32a73.netlify.app"
        },
        rejectUnauthorized: false
      }, this.handlerCallbackRequest(res, err))
    });

    this.token_id = await result
    if(!Array.isArray(this.token_id))
      this.token_id = JSON.parse(this.token_id.body)["access_token"]

    return result
  };

  getAllATM = async() => {
    return new Promise((res, err) => {
      req.get({
        uri : this.configs.RESOURCE_ENDPOINT + "/open-banking/v2.3/atms",
        key: this.configs.CA_KEY,
        cert: this.configs.CA_CERT,
        headers: {
          'Content-Type' : 'application/json',
          'Accept' : 'application/json',
          'Authorization' : `Basic ${this.configs.AUTH_HEADER_TOKEN}`
        },
        rejectUnauthorized: false
      }, this.handlerCallbackRequest(res, err))
    })
  };

  redirectURI = async() => {
    return new Promise((res, err) => {
      req.put({
        uri : this.configs.RESOURCE_ENDPOINT + "/ozone/v1.0/redirect-url-update",
        key: this.configs.CA_KEY,
        cert: this.configs.CA_CERT,
        headers: {
          'Content-Type' : 'application/x-www-form-urlencoded',
          'Accept' : 'application/json',
          'Authorization' : `Basic ${this.configs.AUTH_HEADER_TOKEN}`
        },
        form: {
          redirectURL: "https://relaxed-austin-d32a73.netlify.app"
        },
        rejectUnauthorized: false
      }, this.handlerCallbackRequest(res, err))
    })
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
//     const techban = new AuthAccountTechBanAPI(CONFIGS)
//     // const a = await techban.getAuthTokenAccounts()
//     // const a = await techban.getAllATM()
//     // const a = await techban.askGrantToAccount()
//     const a = await techban.redirectURI()
//     console.log(a.body)
//     // const a = await techban.getConsentLinkAccount()
//     // const b = await techban.validateConsentStatus()
//     // console.log(a.body)
//     // console.log(b.body)
//     // const c = await techban.getTokenAccounts("835ea6ab-d2cc-4d15-b9c9-a61df3ab7759")
//     // console.log(c)

//   } catch (error) {
//     console.log(error)
//   }
// })()

module.exports = AuthAccountTechBanAPI