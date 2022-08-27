const { getContentType } = require('@adiwajshing/baileys')
exports.run = {
   usage: ['sw', 'story'],
   async: async (m, {
      client,
      text,
      isPrefix,
      command,
      participants
   }) => {
      let number = isNaN(text) ? (text.startsWith('+') ? text.replace(/[()+\s-]/g, '') : (text).split`@` [1]) : text
      if (!text && !m.quoted) return client.reply(m.chat, Func.texted('bold', `🚩 Mention or Reply chat target.`), m)
      if (isNaN(number)) return client.reply(m.chat, Func.texted('bold', `🚩 Invalid number.`), m)
      if (number.length > 15) return client.reply(m.chat, Func.texted('bold', `🚩 Invalid format.`), m)
      try {
         if (text) {
            var user = number + '@s.whatsapp.net'
         } else if (m.quoted.sender) {
            var user = m.quoted.sender
         } else if (m.mentionedJid) {
            var user = number + '@s.whatsapp.net'
         }
      } catch (e) {} finally {
         const find = typeof global.db.chats['status@broadcast'] != 'undefined' ? global.db.chats['status@broadcast'].messages.filter(v => v.sender == user) : false
         if (find) {
            const msg = find.filter(v => /extended|conver|video|image/.test(getContentType(v.message)))
            if (!msg) return client.reply(m.chat, Func.texted('bold', `🚩 Stories not found.`), m)
            for (let i = 0; i < msg.length; i++) {
               await client.copyNForward(m.chat, msg[i])
               await Func.delay(1500)
            }
         } else return client.reply(m.chat, Func.texted('bold', `🚩 Stories not found.`), m)
      }
   },
   owner: true
}