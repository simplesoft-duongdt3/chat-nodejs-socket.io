const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);


app.use('/', express.static('static'))

// app.get('/', (req, res) => {
//   res.sendFile(__dirname + '/index.html');
// });

// app.get('/user-chat', (req, res) => {
//   res.sendFile(__dirname + '/user.html');
// });

// app.get('/cs-chat', (req, res) => {
//   res.sendFile(__dirname + '/cs.html');
// });

function getUserId(socket) {
  return socket.userId;
}

function checkIsCs(socket) {
  return socket.role == "cs";
}

var numUser = 0;

io.use((socket, next) => {
  // const token = socket.handshake.auth.token;
  // if (!token) {
  //   return next(new Error("invalid user, need login"));
  // }
  numUser ++;
  socket.userId = numUser;

  console.log("interceptor numUser: " + numUser + " socket.userId: " + socket.userId + " socket.id: " + socket.id)
  if(numUser != 1) {
    socket.role = "cs";
  } else {
    socket.role = "user";
  }
  
  next();
});

io.on('connection', (socket) => {
    //JWT token
    //console.log(socket.handshake.auth);
    console.log('a user connected', socket.id);
    //broadcast to anyone else, not this socket
    socket.broadcast.emit('newuser', socket.id);
    //broadcast to all user
    //io.emit('newuser', 'a user connected ' + socket.id);
    
    var userId = getUserId(socket)

    console.log("getUserId userId: " + userId + " socket.id: " + socket.id)
    var isCs = checkIsCs(socket)

    io.to(socket.id).emit('user_id', { userId: userId });

    if(isCs) {
      socket.join("room_cs");
    } else {
      socket.join("room_user_" + userId);
    }
    //socket.join("room_private_" + userId);

    socket.on('chat', (msg) => {
      if(isCs) {
        io.to(socket.id).emit('news', { msg: msg.msg, receiverUserId: msg.receiverUserId, sender: userId });
        io.to("room_user_" + msg.receiverUserId).emit('news', { msg: msg.msg, sender: userId });
      } else {
        io.to(socket.id).to("room_cs").emit('news', { msg: msg.msg, sender: userId });
      }
    });
    
    socket.on('disconnect', () => {
      console.log('user disconnected');
    });
  });

server.listen(3000, () => {
  console.log('listening on *:3000');
});