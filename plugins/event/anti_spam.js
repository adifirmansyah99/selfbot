exports.run = {
   async: async (m, {
      client,
      users
   }) => {
      try {
         if (!m.isGroup && !m.fromMe) {
            users.spam += 1
            let spam = users.spam
            if (spam >= 2) setTimeout(() => {
               users.spam = 0
            }, global.cooldown * 1000)
            if (spam == 3) return client.reply(m.chat, `🚩 System detects you are spamming, please cooldown for *${global.cooldown} seconds*.`, m)
            if (spam >= 4) return client.updateBlockStatus(m.sender, 'block')
         } else return
      } catch (e) {
         console.log(e)
         // return client.reply(m.chat, Func.jsonFormat(e), m)
      }
   },
   error: false,
   cache: true,
   location: __filename
}