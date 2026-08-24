const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
  console.log('Bağlandı:', socket.id);
  socket.on('user joined', (name) => {
    socket.broadcast.emit('user joined', name);
  });
  socket.on('chat message', (data) => {
    io.emit('chat message', data);
  });
  socket.on('disconnect', () => {
    console.log('Ayrıldı:', socket.id);
  });
});

http.listen(3000, '0.0.0.0', () => {
  console.log('CyberPenguin Chat çalışıyor — http://0.0.0.0:3000');
});
