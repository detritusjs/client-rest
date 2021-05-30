import { Client } from '../lib';


const token = '';
const client = new Client(token);

client.on('request', ({request, restRequest}) => {
  // request is the request object from `detritus-rest` while restRequest is our wrapped one
});

client.on('response', ({response, restRequest}) => {
  const path = (response.request.route) ? response.request.route.path : null;
  if (response.ok) {
    console.log(`Response OK ${response.statusCode} ${response.request.url} ${(path) ? `(${path})` : ''}`);
  } else {
    console.log(`Response NOT OK ${response.statusCode} ${response.request.url} ${(path) ? `(${path})` : ''}`);
  }
});

const userIds = [''];
(async () => {
  for (let userId of userIds) {
    await client.fetchUser(userId);
  }
})();
