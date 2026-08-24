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
    socket.emit('system message', `🐧 Hoş geldin ${name}. Alpha ile özel sohbettesin.`);
    // Alpha'ya bildirim
    socket.broadcast.emit('alpha notification', `${name} bağlandı.`);
  });

  // Herkese genel mesaj (sadece Alpha kullanır)
  socket.on('global message', (data) => {
    io.emit('chat message', data);
  });

  // Özel mesaj (Alpha'dan kullanıcıya veya kullanıcıdan Alpha'ya)
  socket.on('private message', (data) => {
    if (data.to === 'Alpha') {
      // Kullanıcı Alpha'ya yazdı
      socket.broadcast.emit('alpha private', {
        from: userName,
        msg: data.msg
      });
      // Kendisine de göster
      socket.emit('chat message', {
        from: userName,
        msg: data.msg,
        isOwn: true
      });
    } else {
      // Alpha'dan belirli bir kullanıcıya
      const targetSocket = io.sockets.sockets.get(data.to);
      if (targetSocket) {
        targetSocket.emit('chat message', {
          from: 'Alpha',
          msg: data.msg,
          isAlpha: true
        });
      }
    }
  });

  socket.on('disconnect', () => {
    if (userName) {
      socket.broadcast.emit('alpha notification', `${userName} ayrıldı.`);
    }
  });
});

http.listen(3000, '0.0.0.0', () => {
  console.log('CyberPenguin Chat çalışıyor — http://0.0.0.0:3000');
});
