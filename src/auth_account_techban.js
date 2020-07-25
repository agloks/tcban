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

  getTokenAccounts = async() => {
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
    await this.getTokenAccounts()

    // TODO: change the glue time to moment.utc
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
          "ExpirationDateTime": "2020-07-26T14:53:43Z",
          "TransactionFromDateTime": "2020-07-26T14:53:43Z",
          "TransactionToDateTime": "2020-07-26T14:53:43Z"
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
  };

  getConsentLinkAccount = async() => {
    await this.askGrantToAccount()
    
    const queryString = qs.stringify({
      'scope': 'accounts',
      'alg': 'none'
    })

    console.log(queryString)
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
          'Authorization' : `Basic ${this.configs.AUTH_HEADER_TOKEN}`
        },
        rejectUnauthorized: false
      }, this.handlerCallbackRequest(res, err))
    });
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
};

const CONFIGS = {
  CA_KEY: fs.readFileSync("../assets/Banco_1/certs/client_private_key.key"),
  CA_CERT: fs.readFileSync("../assets/Banco_1/certs/client_certificate.crt"),
  TOKEN_ENDPOINT: "https://as1.tecban-sandbox.o3bank.co.uk/token",
  RESOURCE_ENDPOINT: "https://rs1.tecban-sandbox.o3bank.co.uk",
  AUTH_HEADER_TOKEN: "YmFkOGI0ZDktMjA3Zi00NmM1LTkyNTEtODQxOTU5YTFiMDI2OmY5NWFhODBkLTE5ODYtNDdiOC05NjY2LThkZDM2NDRlMTMxNw==",
  OB_PARTICIPANT_ID: "c3c937c4-ab71-427f-9b59-4099b7c680ab"
};

(async() => {
  try {
    const techban = new AuthAccountTechBanAPI(CONFIGS)
    // const a = await techban.getTokenAccounts()
    // const a = await techban.getAllATM()
    const a = await techban.askGrantToAccount()
    // console.log(a.body)
    // const a = await techban.getConsentLinkAccount()
    const b = await techban.validateConsentStatus()
    console.log(b.body)
    // console.log(a.token_bearer)
  } catch (error) {
    console.log(error)
  }
})()
