exports.run = {
   async: async (m, {
      client,
      body
   }) => {
      try {
         if (m.quoted && m.quoted.text && /Direct\sPersonal/.test(m.quoted.text)) {
            const chat = m.quoted.contextInfo.mentionedJid[0]
            if (/conversation|extendedText/.test(m.mtype)) {
               client.reply(chat, body)
            } else if (m.mtype == 'stickerMessage') {
               const media = await m.download()
               client.sendSticker(chat, media, null, {
                  packname: '',
                  author: '© neoxr-bot'
               })
            } else {
               const media = await m.download()
               client.sendFile(chat, media, '', body ? '@' + person.replace(/@.+/, '') + ' ' + body : '')
            }
         } else if (m.quoted && m.quoted.text && /Direct\sGroup/.test(m.quoted.text)) {
            const chat = m.quoted.text.split('jid :')[1].trim()
            const person = m.quoted.contextInfo.mentionedJid[0]
            if (/conversation|extendedText/.test(m.mtype)) {
               client.reply(chat, body, null, {
                  mentions: [person]
               })
            } else if (m.mtype == 'stickerMessage') {
               const media = await m.download()
               client.sendSticker(chat, media, null, {
                  packname: '',
                  author: 'SELFBOT',
                  mentions: [person]
               })
            } else {
               const media = await m.download()
               client.sendFile(chat, media, '', body ? '@' + person.replace(/@.+/, '') + ' ' + body : '', null, null, {
                  mentionedJid: [person]
               })
            }
         }
      } catch (e) {
         return client.reply(m.chat, Func.jsonFormat(e), m)
      }
   },
   error: false,
   owner: true,
   cache: true,
   location: __filename
}