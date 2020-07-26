const request = require('request');
const req = request.defaults();
const fs = require('fs');
const uuid = require('uuid');
const qs = require("qs")
const moment = require("moment");

class PaymentTechBanAPI {
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
      
      console.log(_response)
      if(_response.statusCode < 400)
        res(_response)
      else
        err([_response.statusCode, _error])
    }
  };

  getAuthTokenPayments = async() => {
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
          "scope": "payments openid"
        },
        rejectUnauthorized: false
      }, this.handlerCallbackRequest(res, err))
    });

    this.token_bearer = await result
    if(!Array.isArray(this.token_bearer))
      this.token_bearer = JSON.parse(this.token_bearer.body)["access_token"]

    return result
  };

  askGrantToPayments = async() => {
    await this.getAuthTokenPayments()
    
    const result = new Promise((res, err) => {
      req.post({
        uri : this.configs.RESOURCE_ENDPOINT + "/open-banking/v3.1/pisp/domestic-payment-consents",
        key: this.configs.CA_KEY,
        cert: this.configs.CA_CERT,
        headers: {
          'Content-Type' : 'application/json',
          'Accept' : '*/*',
          'x-fapi-customer-ip-address': '10.1.1.10',
          'x-fapi-customer-last-logged-timee8a4b874-d652-49a7-ba59-4dec7855f129': (new Date()).toUTCString(),
          'x-fapi-financial-id': this.configs.OB_PARTICIPANT_ID, 
          'x-fapi-interaction-id': uuid.v4(),
          'Authorization': `Bearer ${this.token_bearer}`
        },
        json: this.payload,
        rejectUnauthorized: false
      }, this.handlerCallbackRequest(res, err))
    });

    this.acess_consent_id = await result
    if(!Array.isArray(this.acess_consent_id))
      this.acess_consent_id = this.acess_consent_id.body["Data"]["ConsentId"]

    return result
  };

  getConsentLinkPayment = async() => {
    await this.askGrantToPayments()
    
    const queryString = qs.stringify({
      'scope': 'payments',
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
          'Authorization' : `Basic ${this.configs.AUTH_HEADER_TOKEN}`
        },
        rejectUnauthorized: false
      }, this.handlerCallbackRequest(res, err))
    });
  };

  getTokenPayment = async(code) => {
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
          "scope": "payments ",
          "redirect_uri": "http://www.google.co.uk"
        },
        rejectUnauthorized: false
      }, this.handlerCallbackRequest(res, err))
    });

    this.token_id = await result
    if(!Array.isArray(this.token_id))
      this.token_id = JSON.parse(this.token_id.body)["access_token"]

    return result
  };

  doPayment = async() => {
    const data = {
      "Data": {
        "ConsentId": this.acess_consent_id, //just will work with cache...
        "Initiation":  this.payload["Data"]["Initiation"]
      },
      "Risk": {}
    }

    const result = new Promise((res, err) => {
      req.post({
        uri : this.configs.RESOURCE_ENDPOINT + "/open-banking/v3.1/pisp/domestic-payments",
        key: this.configs.CA_KEY,
        cert: this.configs.CA_CERT,
        headers: {
          'Content-Type' : 'application/json',
          'Accept' : '*/*',
          'x-fapi-customer-ip-address': '10.1.1.10',
          'x-fapi-customer-last-logged-time': (new Date()).toUTCString(),
          'x-fapi-financial-id': this.configs.OB_PARTICIPANT_ID, 
          'x-fapi-interaction-id': uuid.v4(),
          'Authorization': `Bearer ${this.token_id}`
        },
        json: data,
        rejectUnauthorized: false
      }, this.handlerCallbackRequest(res, err))
    });
    
    return result
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

const DATA = {
  "amount": "20.10",
  "cpf": "12345678904",
  "name": "Ricardao Pauleira Da Silva",
  "initID": "123",
  "endID": "456"
};

const getPaymentPayload = (data) => {
  return({
    "Data": {
      "Initiation": {
        "InstructionIdentification": data.initID,
        "EndToEndIdentification": data.endID,
        "InstructedAmount": {
          "Amount": data.amount,
          "Currency": "BRL"
        },
        "CreditorAccount": {
          "SchemeName": "BR.CPF",
          "Identification": data.cpf,
          "Name": data.name
        }
      }
    },
    "Risk": {}
  })
}

// (async() => {
//   try {
//     const techban = new PaymentTechBanAPI(CONFIGS)
//     techban.payload = getPaymentPayload(DATA)
//     // const a = await techban.getConsentLinkPayment()
//     // console.log(a)
//     const b = await techban.getTokenPayment("606ea802-7e5e-4cac-b070-94a1c5975ea7")
//     console.log(b)
//     const c = await techban.doPayment()
//     console.log(c)
//   } catch (error) {
//     console.log(error)
//   }
// })()

module.exports = {PaymentTechBanAPI, getPaymentPayload}