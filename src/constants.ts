export const Package = Object.freeze({
  URL: 'https://github.com/detritusjs/client-rest',
  VERSION: '0.3.14',
});


export const ApiVersion = 7;

export enum AuthTypes {
  USER = 'user',
  BOT = 'bot',
  OAUTH = 'oauth',
};

export const ActivityActionTypes = Object.freeze({
  JOIN: 1,
  SPECTATE: 2,
  LISTEN: 3,
  WATCH: 4,
  JOIN_REQUEST: 5,
});
