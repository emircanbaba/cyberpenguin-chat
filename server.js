const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

const users = {}; // socket.id => { name, socket }

io.on('connection', (socket) => {
  console.log('Bağlandı:', socket.id);
  let userName = '';

  socket.on('user joined', (name) => {
    userName = name;
    users[socket.id] = { name, socket };
    socket.join(`room-${socket.id}`);
    socket.broadcast.emit('new user', { id: socket.id, name });
    socket.emit('system message', `🐧 Hoş geldin ${name}. CyberPenguin ile özel sohbettesin.`);
    const userList = Object.keys(users).map(id => ({ id, name: users[id].name }));
    socket.emit('user list', userList);
  });

  socket.on('private message', (data) => {
    if (data.to === 'CyberPenguin') {
      socket.broadcast.emit('cyberpenguin private', {
        from: userName,
        fromId: socket.id,
        msg: data.msg
      });
      socket.emit('chat message', {
        from: userName,
        msg: data.msg,
        isOwn: true
      });
    }
  });

  socket.on('cyberpenguin reply', (data) => {
    const target = users[data.to];
    if (target) {
      target.socket.emit('chat message', {
        from: 'CyberPenguin',
        msg: data.msg,
        isCyberPenguin: true
      });
    }
  });

  socket.on('disconnect', () => {
    if (userName) {
      delete users[socket.id];
      socket.broadcast.emit('user left', socket.id);
      socket.broadcast.emit('system message', `${userName} ayrıldı.`);
    }
  });
});

http.listen(3000, '0.0.0.0', () => {
  console.log('CyberPenguin Chat çalışıyor — http://0.0.0.0:3000');
});
