const moment = require('moment-timezone')
moment.tz.setDefault('Asia/Jakarta').locale('id')
exports.run = {
   usage: ['reader'],
   async: async (m, {
      client
   }) => {
      try {
         if (!m.quoted) return client.reply(m.chat, Func.texted('bold', `🚩 Reply to message from me.`), m)
         if (client.decodeJid(client.user.id) != m.quoted.sender) return client.reply(m.chat, Func.texted('bold', `🚩 Reply to message from me.`), m)
         const msg = await m.quoted.info()
         if (msg.userReceipt.length == 0) return client.reply(m.chat, Func.texted('bold', `🚩 No one has read the message yet.`), m)
         let text = ''
         msg.userReceipt.map(v => {
        	let read = v.readTimestamp
			let unread = v.receiptTimestamp
			let time = typeof read != 'undefined' ? read : unread
		    text += `◦ @${v.userJid.replace(/@.+/, '')}\n`
			text += `◦ At : ${moment(time * 1000).format('DD/MM/YY HH:mm:ss')}\n`
			text += `◦ Status : *${typeof read != 'undefined' ? 'Read' : 'Receive'}*\n`
         }).join('\n')
         client.reply(m.chat, text.trim(), m)
      } catch (e) {
         client.reply(m.chat, `🚩 Can't load message.`, m)
      }
   },
   error: false,
   cache: true,
   location: __filename
}