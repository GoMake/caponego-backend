'use strict';
const rp = require('request-promise');

const TOKEN_URI='https://api-sandbox.capitalone.com/oauth2/token/';
const ACCOUNTS_URI='https://api-sandbox.capitalone.com/rewards/accounts/';
const ACCOUNT_DETAILS_URI='https://api-sandbox.capitalone.com/rewards/accounts/';
const CLIENT_ID='70048ab0247b478baef288dae9f36f98';
const CLIENT_SECRET='cf6e918da6dce17cd4dcf37c8801b3e1';
const REDIRECT_URI='https://huvcyixh0b.execute-api.us-east-1.amazonaws.com/prod/caponego-prod-getCapOneRewards/';

function getAccessToken(authCode) {
  const options = {
    method: 'POST',
    uri: TOKEN_URI,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    form: {
      code: authCode,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'authorization_code',
      redirect_uri: REDIRECT_URI
    },
    json: true
  };
  return rp(options);
}

function parseToken() {
  return (body) => {
    if(body) {
      let accessToken = (body['access_token']) ? body['access_token'] : '';
      return accessToken;
    }
    throw false;
  };
}

function getAccounts() {
  return (accessToken) => {
    const options = {
      uri: ACCOUNTS_URI,
      headers: {
        'Accepts': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      json: true
    };
    if(accessToken) {
      return rp(options).then((rewardsAccounts) => {
        return { rewardsAccounts: rewardsAccounts, accessToken: accessToken };
      });
    }
    throw false;
  };
}

function parseAccounts() {
  return (body) => {
    const rewardsAccounts = body['rewardsAccounts'];
    if(rewardsAccounts) {
      const account = (rewardsAccounts['rewardsAccounts']) ? rewardsAccounts['rewardsAccounts'][0] : false;
      return { referenceId: account.rewardsAccountReferenceId, accessToken: body['accessToken'] };
    }
    throw false;
  };
}

function getAccountDetails() {
    return (body) => {
      const referenceId = encodeURIComponent(body.referenceId);
      const options = {
        uri: `${ACCOUNT_DETAILS_URI}${referenceId}`,
        headers: {
          'Accepts': 'application/json',
          'Authorization': `Bearer ${body.accessToken}`
        },
        json: true
      };
      if(body['referenceId']) {
        return rp(options);
      }
      throw false;
    };
}

function getTotalRedemptionOpportunities() {
  return (accountDetails) => {
    const opportunities = {};
  };
}
module.exports.getCapOneRewards = (event, context, callback) => {

    const done = (err, res) => callback(null, {
        statusCode: err ? '400' : '200',
        body: err ? JSON.stringify({message: err.message}) : JSON.stringify(res),
        headers: {
            'Content-Type': 'application/json',
        },
    });
    switch (event.httpMethod) {
        case 'GET':
            const queryParams = event.queryStringParameters
            if(queryParams) {
              const authCode = (queryParams['code'])? queryParams['code'] : '';
              getAccessToken(authCode)
                .then(parseToken())
                .then(getAccounts())
                .then(parseAccounts())
                .then(getAccountDetails())
                .then((details)=> done(null, details));
            }
            break;
        default:
            done(new Error(`Unsupported method "${event.httpMethod}"`));
    }
};
