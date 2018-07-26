const DetritusRest = require('detritus-client-rest');

const client = new DetritusRest.Client('BOT_TOKEN', {authType: 'bot'});
client.fetchUser('@me').then(console.log).catch(console.error);