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
    }
  });

  socket.on('disconnect', () => {
    if (userName) {
      socket.broadcast.emit('system message', `${userName} ayrıldı.`);
    }
  });
});

http.listen(3000, '0.0.0.0', () => {
  console.log('CyberPenguin Chat çalışıyor — http://0.0.0.0:3000');
});
