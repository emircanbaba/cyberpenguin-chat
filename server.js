const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const fs = require('fs');
const path = require('path');

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

const ipLogFile = path.join(__dirname, 'iplog.txt');

// ===== GİZLİ LOG =====
function logIP(ip, username = 'anon') {
  const entry = `[${new Date().toISOString()}] ${username} | IP: ${ip}\n`;
  fs.appendFile(ipLogFile, entry, (err) => {
    if (err) console.error('Log yazılamadı:', err);
  });
  // SADECE SUNUCU KONSOLUNDA GÖRÜNÜR - KULLANICIYA HİÇBİR ŞEY YOK
  console.log(`📡 GİZLİ LOG: ${username} -> ${ip}`);
}

const users = {};

io.on('connection', (socket) => {
  const clientIP = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
  console.log(`🔌 Bağlandı: ${socket.id}`);

  let userName = '';

  socket.on('user joined', (name) => {
    userName = name;
    users[socket.id] = { name, socket, ip: clientIP };
    
    // ===== GİZLİ LOG - KULLANICI BİLMEZ =====
    logIP(clientIP, name);

    socket.join(`room-${socket.id}`);
    
    // ===== KULLANICIYA NORMAL KARŞILAMA - IP'DEN BAHIS YOK =====
    socket.emit('system message', `🐧 Hoş geldin ${name}. CyberPenguin ile sohbet ediyorsun.`);
    
    // Diğer kullanıcılara sadece isim gönder - IP yok
    socket.broadcast.emit('new user', { id: socket.id, name });
    
    const userList = Object.keys(users).map(id => ({
      id,
      name: users[id].name
      // IP GÖNDERMİYORUZ - sadece Alpha görecek
    }));
    socket.emit('user list', userList);
  });

  // ===== ALPHA ÖZEL KOMUTLAR =====
  socket.on('admin get iplog', () => {
    // SADECE ALPHA (isim kontrolü)
    if (userName === 'Alpha') {
      fs.readFile(ipLogFile, 'utf8', (err, data) => {
        if (err) {
          socket.emit('admin iplog response', 'Log dosyası okunamadı.');
          return;
        }
        socket.emit('admin iplog response', data || 'Henüz log yok.');
      });
    }
  });

  socket.on('admin get users', () => {
    if (userName === 'Alpha') {
      const list = Object.keys(users).map(id => ({
        id,
        name: users[id].name,
        ip: users[id].ip // SADECE ALPHA'YA GÖNDERİLİR
      }));
      socket.emit('admin users response', JSON.stringify(list, null, 2));
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
  console.log('🐧 CyberPenguin Chat çalışıyor — http://0.0.0.0:3000');
  console.log('👑 Alpha giriş yapıp /iplog veya /users yazabilir.');
});
