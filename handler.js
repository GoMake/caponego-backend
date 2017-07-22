'use strict';
const rp = require('request-promise');

const firebase = require('firebase');

const TOKEN_URI='https://api-sandbox.capitalone.com/oauth2/token/';
const ACCOUNTS_URI='https://api-sandbox.capitalone.com/rewards/accounts/';
const ACCOUNT_DETAILS_URI='https://api-sandbox.capitalone.com/rewards/accounts/';
const CLIENT_ID='70048ab0247b478baef288dae9f36f98';
const CLIENT_SECRET='cf6e918da6dce17cd4dcf37c8801b3e1';
const REDIRECT_URI='https://huvcyixh0b.execute-api.us-east-1.amazonaws.com/prod/caponego-prod-getCapOneRewards/';

const config = {
  apiKey: 'AIzaSyDAdskDcznIA7L2CjLCyr6YRTdqQrWWRSs',
  authDomain: 'caponego-aa116.firebaseapp.com',
  databaseURL: 'https://caponego-aa116.firebaseio.com/',
  storageBucket: 'gs://caponego-aa116.appspot.com',
};

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
    const opportunities = accountDetails['redemptionOpportunities'];
    const totalPoints = opportunities.reduce((total, opp) => {
      const points = (opp.category !== 'Travel') ? opp.redemptionAmount : 0;
      return total + points;
    }, 0);
    return totalPoints;
  };
}

function writeToFirebase() {
  return (totalPoints) => {
    return '';
    //return firebase.database().ref('caponego/userInfo/rewardPoints').set(totalPoints);
  };
}

module.exports.getCapOneRewards = (event, context, callback) => {
    const done = (err, res) => {
      console.log('RESULTS: ', typeof res);
      return callback(null, {
        statusCode: err ? '400' : '302',
        body: err ? JSON.stringify({message: err.message}) : JSON.stringify(res),
        headers: {
            'Content-Type': 'application/json',
            'Location': 'CapOne-GO://'
        },
      });
    };

    //firebase.initializeApp(config);

    switch (event.httpMethod) {
        case 'GET':
            const queryParams = event.queryStringParameters;
            if(queryParams) {
              const authCode = (queryParams['code'])? queryParams['code'] : '';
              getAccessToken(authCode)
                .then(parseToken())
                .then(getAccounts())
                .then(parseAccounts())
                .then(getAccountDetails())
                .then(getTotalRedemptionOpportunities())
                .then(writeToFirebase())
                .then(()=> {
                  done(null, { success: 'OK' });
                });
            }
            break;
        default:
            done(new Error(`Unsupported method "${event.httpMethod}"`));
    }
};
