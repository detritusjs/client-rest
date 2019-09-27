const { Client } = require('../lib');

const token = '';
const client = new Client(token);

const channelId = '';
(async () => {
  {
    const raw = await client.createMessage(channelId, 'Some Message');
    // raw is the raw message from discord's api

    setTimeout(async () => {
      await client.deleteMessage(channelId, raw.id);
    }, 5000);
  }

  {
    const raw = await client.createMessage(channelId, {
      content: 'Some Message',
      embed: {
        description: 'A custom embed!',
      },
    });
  }

  {
    const raw = await client.createMessage(channelId, {
      file: {
        data: Buffer.from('Some file content'),
        filename: 'file.txt',
      },
      files: [
        {data: Buffer.from('file #2'), filename: 'file2.txt'},
      ],
    });
  }
})();
