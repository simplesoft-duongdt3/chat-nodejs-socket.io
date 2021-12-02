import Sequelize from 'sequelize';


export class Message {
  constructor(senderId, receiverId, msg, roomId, sendTime = Date.now()) {
    this.senderId = senderId;
    this.receiverId = receiverId;
    this.msg = msg;
    this.roomId = roomId;
    this.sendTime = sendTime;
  }
}

export class MessageStore {
  async init() { }
  async saveMessage(message) { }
  async findMessagesForUser(userId) { }
}

export class InMemoryMessageStore extends MessageStore {
  constructor() {
    super();
    this.messages = [];
  }

  async init() {

  }

  async saveMessage(message) {
    this.messages.push(message);

    console.log("save msg " + JSON.stringify(message));
  }

  async findMessagesForUser(userId) {
    return this.messages.filter(
      ({ senderId, receiverId }) => senderId === userId || receiverId === userId
    );
  }
}

export class SqliteMessageStore extends MessageStore {

  constructor() {
    super();

    this.sequelize = new Sequelize.Sequelize({
      dialect: 'sqlite',
      storage: 'msg.sqlite'
    });
  }

  async init() {
    this.Message = this.sequelize.define('Message', {
      msgId: {
        type: Sequelize.DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      senderId: {
        type: Sequelize.DataTypes.BIGINT,
        allowNull: false,
      },
      receiverId: {
        type: Sequelize.DataTypes.BIGINT,
        allowNull: true,
      },
      msg: {
        type: Sequelize.DataTypes.STRING,
        allowNull: false,
      },
      roomId: {
        type: Sequelize.DataTypes.BIGINT,
        allowNull: true,
      },
      sendTime: {
        type: Sequelize.DataTypes.BIGINT,
        allowNull: false,
      }
    }, {
      tableName: 'Message'
    });

    await this.sequelize.sync();
  }

  async saveMessage(message) {

    const msgDb = await this.Message.create({
      senderId: message.senderId, 
      receiverId: message.receiverId, 
      msg: message.msg, 
      roomId: message.roomId, 
      sendTime: message.sendTime,
    });

    console.log("save msg to db:" + JSON.stringify(msgDb));
  }

  async findMessagesForUser(userId) {

    return await this.Message.findAll({
      where: {
        [Sequelize.Op.or]: [
          { senderId: userId },
          { receiverId: userId }
        ]
      }
    });
  }
}