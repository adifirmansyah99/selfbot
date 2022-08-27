module.exports = (m) => {
   const isNumber = x => typeof x === 'number' && !isNaN(x)
   let user = global.db.users[m.sender]
   if (user) {
      if (!isNumber(user.lastseen)) user.lastseen = 0
      if (!isNumber(user.spam)) user.spam = 0
   } else {
      global.db.users[m.sender] = {
         lastseen: 0,
         spam: 0
      }
   }

   if (m.isGroup) {
      let group = global.db.groups[m.chat]
      if (group) {
         if (!('autoread' in group)) group.autoread = true
         if (!('left' in group)) group.left = false
         if (!('text_left' in group)) group.text_left = ''
         if (!('text_welcome' in group)) group.text_welcome = ''
         if (!('welcome' in group)) group.welcome = false
      } else {
         global.db.groups[m.chat] = {
            autoread: true,
            left: false,
            text_left: '',
            text_welcome: '',
            welcome: false
         }
      }
   }

   let chat = global.db.chats[m.chat]
   if (chat) {
      if (!isNumber(chat.chat)) chat.chat = 0
      if (!isNumber(chat.lastchat)) chat.lastchat = 0
      if (!isNumber(chat.command)) chat.command = 0
      if (!('messages' in chat)) chat.messages = []
   } else {
      global.db.chats[m.chat] = {
         chat: 0,
         lastchat: 0,
         command: 0,
         messages: []
      }
   }

   let setting = global.db.setting
   if (setting) {
      if (!('chatbot' in setting)) setting.chatbot = true
  	if (!('debug' in setting)) setting.debug = false
      if (!('self' in setting)) setting.self = true
      if (!('mimic' in setting)) setting.mimic = []
      if (!('multiprefix' in setting)) setting.multiprefix = true
      if (!('prefix' in setting)) setting.prefix = ['.', '/', '!', '#']
      if (!('online' in setting)) setting.online = true
      if (!('onlyprefix' in setting)) setting.onlyprefix = '`'
      if (!('owners' in setting)) setting.owners = []
      if (!('msg' in setting)) setting.msg = 'Currently offline right now ...'
      if (!('cover' in setting)) setting.cover = 'https://telegra.ph/file/da25bb27d4575704efd18.jpg'
      if (!('password' in setting)) setting.password= '221100'
   } else {
      global.db.setting = {
         chatbot: true,
         debug: false,
         self: true,
         mimic: [],
         multiprefix: true,
         prefix: ['.', '#', '!', '/'],
         online: true,
         onlyprefix: '`',
         owners: [],
         msg: 'Currently offline right now ...',
         cover: 'https://telegra.ph/file/da25bb27d4575704efd18.jpg',
         password: '221100'
      }
   }
}