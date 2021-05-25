const { Client } = require('../lib');


const token = '';
const client = new Client(token);

const channelId = '';
const messageId = '';
const emojis = ['👍🏿', '👌🏿', '👃🏿'];
(async () => {
  for (let emoji of emojis) {
    await client.createReaction(channelId, messageId, emoji);
  }
  const rawMessage = await client.fetchMessage(channelId, messageId);
  console.log(rawMessage);
})();
