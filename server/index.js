const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

const path = require('path');

app.use(express.static(path.join(__dirname, '../build')));

const client = jwksClient({
  jwksUri: 'https://dev-6b879145.us.auth0.com/.well-known/jwks.json'
});

const players = [];

const verifyPlayer = (token, cb) => {
  const uncheckedToken = jwt.decode(token, {complete: true});

  const kid = uncheckedToken.header.kid;

  client.getSigningKey(kid, (err, key) => {
    const signingKey = key.publicKey || key.rsaPublicKey;

    jwt.verify(token, signingKey, cb);
  });
};

const newMaxScoreHandler = (payload) => {
  let foundPlayer = false;
  players.forEach((player) => {
    if (player.id === payload.id) {
      foundPlayer = true;
      player.maxScore = Math.max(player.maxScore, payload.maxScore);
    }
  });

  if (!foundPlayer) {
    players.push(payload);
  }

  io.emit('players', players);
};

io.on('connection', (socket) => {
  const { token } = socket.handshake.query;

  verifyPlayer(token, (err) => {
    if (err) socket.disconnect();
    io.emit('players', players);
  });

  socket.on('new-max-score', newMaxScoreHandler);
});

http.listen(9000, () => {
  console.log('listening on port 9000');
});
