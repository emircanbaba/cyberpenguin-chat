const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
  console.log('Bağlandı:', socket.id);
  let userName = '';

  socket.on('user joined', (name) => {
    userName = name;
    socket.join(`room-${socket.id}`);
    socket.emit('system message', `🐧 Hoş geldin ${name}. CyberPenguin ile özel sohbettesin.`);
    socket.broadcast.emit('cyberpenguin notification', `${name} bağlandı.`);
  });

  socket.on('global message', (data) => {
    io.emit('chat message', data);
  });

  socket.on('private message', (data) => {
    if (data.to === 'CyberPenguin') {
      socket.broadcast.emit('cyberpenguin private', {
        from: userName,
        msg: data.msg
      });
      socket.emit('chat message', {
        from: userName,
        msg: data.msg,
        isOwn: true
      });
    } else {
      const targetSocket = io.sockets.sockets.get(data.to);
      if (targetSocket) {
        targetSocket.emit('chat message', {
          from: 'CyberPenguin',
          msg: data.msg,
          isCyberPenguin: true
        });
      }
    }
  });

  socket.on('disconnect', () => {
    if (userName) {
      socket.broadcast.emit('cyberpenguin notification', `${userName} ayrıldı.`);
    }
  });
});

http.listen(3000, '0.0.0.0', () => {
  console.log('CyberPenguin Chat çalışıyor — http://0.0.0.0:3000');
});
