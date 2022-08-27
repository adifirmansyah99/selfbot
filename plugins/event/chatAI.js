exports.run = {
   async: async (m, {
      client,
      body,
      chats,
      setting,
      prefixes
   }) => {
      try {
         if (body && !global.evaluate_chars.some(v => body.startsWith(v))) {
            var json = await scrap.simsimi(body)
            if (!json.status) {
               var json = await scrap.chatAI(global.chatai_bid, global.chatai_key, body)
            }
            if (!m.isGroup) {
               if (!m.fromMe && setting.chatbot && json.status) {
                  client.reply(m.chat, json.msg, null)
               } else if (!m.fromMe && !setting.chatbot) {
                  // return client.reply(m.chat, setting.msg, m).then(() => {
                   //  try {
                    //    chats.chat += 1
                       // chats.lastchat = new Date() * 1
                  //   } catch {
                  //      global.db.chats[m.chat] = {}
                   //     global.db.chats[m.chat].command = new Date() * 1
                   //     global.db.chats[m.chat].chat = 1
                    //    global.db.chats[m.chat].lastchat = new Date() * 1
                  //   }
                //  })
               }
            } else {
               let me = [...new Set([...(m.mentionedJid || []), ...(m.quoted ? [m.quoted.sender] : [])])]
               for (let jid of me) {
                  if (client.decodeJid(client.user.id) != me) continue
                  if (!m.fromMe && setting.chatbot && json.status) {
                     client.reply(m.chat, json.msg, m)
                  }
               }
            }
         }
      } catch (e) {
         console.log(e)
      }
   },
   error: false,
   cache: true,
   location: __filename
}