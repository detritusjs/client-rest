import { Client } from '../lib';


const token = '';
const client = new Client(token);

const userId = '';
(async () => {
  const rawUser = await client.fetchUser(userId);
  console.log(rawUser);
})();
