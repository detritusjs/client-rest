import { Client } from '../lib';


const token = '';
const client = new Client(token);

const channelId = '';
(async () => {
  {
    const raw = await client.fetchMessages(channelId, {limit: 100});
  }

  {
    // fetch ALL of a channel's messages since the beginning of its creation
    const messages: Array<any> = [];

    let atEnd = false;
    let lastMessageId = 0;
    while (!atEnd) {
      const raw = await client.fetchMessages(channelId, {
        after: lastMessageId,
        limit: 100,
      });
      if (raw.length) {
        messages = [...raw, ...messages];
        lastMessageId = raw[0].id;
      } else {
        atEnd = true;
      }
    }

    // messages now has all the messages from a channel, sorted from newest to oldest
  }
})();
