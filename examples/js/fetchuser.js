const { Client } = require('../lib');


const token = '';
const client = new Client(token);

const userId = '';
(async () => {
  const user = await client.fetchUser(userId);
  console.log(user);
})();
