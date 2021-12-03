import express from 'express';
import { createServer } from 'http';
import { SqliteMessageStore, Message } from './message_store.js';

import { Server } from "socket.io";

async function main() {
  const app = express();
  const server = createServer(app);
  const io = new Server(server);


  const messageStore = new SqliteMessageStore();
  await messageStore.init();
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

  function checkIsCs(socket) {
    return socket.role == "cs";
  }

  var numUser = 0;

  io.use((socket, next) => {
    //console.log("auth " + socket.handshake.auth);
    //const token = socket.handshake.auth.token;
    //console.log("auth token " + socket.handshake.auth.token);
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

  io.on('connection', async (socket) => {
      //JWT token
      //console.log(socket.handshake.auth);
      console.log('a user connected', socket.id);
      //broadcast to anyone else, not this socket
      socket.broadcast.emit('newuser', socket.id);
      //broadcast to all user
      //io.emit('newuser', 'a user connected ' + socket.id);
      
      console.log("getUserId userId: " + socket.userId + " socket.id: " + socket.id)
      var isCs = checkIsCs(socket)

      io.to(socket.id).emit('user_id', { userId: socket.userId });

      if(isCs) {
        socket.join("room_cs");
      } else {
        socket.join("room_user_" + socket.userId);

        const msgList = await messageStore.findMessagesForUser(socket.userId)
        io.to(socket.id).emit('old_news', msgList)
      }
      //socket.join("room_private_" + userId);

      socket.on('chat', (msg) => {
        console.log("chat msg " + JSON.stringify(msg));
        var roomId = socket.userId;
        if(isCs) {
          roomId = msg.receiverUserId;
        }

        var message = new Message(
          socket.userId, msg.receiverUserId,  msg.msg, roomId
        );

        messageStore.saveMessage(message);
        io.to("room_user_" + roomId).to("room_cs").emit('news', [ message ]);
      });
      
      socket.on('disconnect', () => {
        console.log('user disconnected');
      });
    });

  server.listen(3000, () => {
    console.log('listening on *:3000');
  });
}

main();