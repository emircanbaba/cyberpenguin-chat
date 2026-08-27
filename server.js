const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const fs = require('fs');
const path = require('path');

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// ===== IP LOGGING =====
const ipLogFile = path.join(__dirname, 'iplog.txt');

function logIP(ip, username = 'anon') {
  const entry = `[${new Date().toISOString()}] ${username} | IP: ${ip}\n`;
  fs.appendFile(ipLogFile, entry, (err) => {
    if (err) console.error('IP log yazılamadı amk:', err);
  });
  console.log(`📡 IP yakalandı: ${ip} (${username})`);
}

// ===== KULLANICI VERİLERİ =====
const users = {}; // socket.id => { name, socket, ip }

io.on('connection', (socket) => {
  // ===== IP YAKALAMA =====
  const clientIP = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
  console.log(`🔌 Bağlandı: ${socket.id} | IP: ${clientIP}`);

  let userName = '';

  socket.on('user joined', (name) => {
    userName = name;
    users[socket.id] = { name, socket, ip: clientIP };
    
    // IP'yi logla
    logIP(clientIP, name);

    // Özel oda
    socket.join(`room-${socket.id}`);
    socket.broadcast.emit('new user', { id: socket.id, name });
    socket.emit('system message', `🐧 Hoş geldin ${name}. IP'n loglandı amk.`);
    
    const userList = Object.keys(users).map(id => ({ 
      id, 
      name: users[id].name,
      ip: users[id].ip // Admin görebilsin diye
    }));
    socket.emit('user list', userList);
  });

  // ===== ADMIN KOMUTLARI (Gizli) =====
  socket.on('admin get iplog', () => {
    if (userName === 'Alpha') { // Sadece Alpha görebilir
      fs.readFile(ipLogFile, 'utf8', (err, data) => {
        if (err) {
          socket.emit('system message', 'Log dosyası okunamadı amk');
          return;
        }
        socket.emit('system message', `📋 IP Log:\n${data}`);
      });
    }
  });

  socket.on('admin get users', () => {
    if (userName === 'Alpha') {
      const list = Object.keys(users).map(id => ({
        id,
        name: users[id].name,
        ip: users[id].ip
      }));
      socket.emit('system message', `👥 Kullanıcılar:\n${JSON.stringify(list, null, 2)}`);
    }
  });

  // ===== NORMAL MESAJ =====
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
  console.log('🐧 CyberPenguin Chat — IP logger aktif http://0.0.0.0:3000');
});
