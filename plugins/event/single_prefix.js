exports.run = {
   async: async (m, {
      client,
      body,
      setting
   }) => {
      try {
         if (!body) return
         if (!setting.multiprefix) {
            let isPrefix = setting.onlyprefix
            if (body.length == 5) {
               let command = body.slice(1, 5)
               if (/menu|help/.test(command)) {
                  let prefix = body.charAt(0)
                  // if (prefix != isPrefix) return client.reply(m.chat, Func.texted('bold', `🚩 This bot uses prefix ( ${isPrefix} ), send ${isPrefix}bot or ${isPrefix}menu to show menu.`), m)
               }
            } else if (body.length == 4) {
               let command = body.slice(1, 4)
               if (/bot/.test(command)) {
                  let prefix = body.charAt(0)
                  if (prefix != isPrefix) return client.reply(m.chat, Func.texted('bold', `🚩 This bot uses prefix ( ${isPrefix} ), send ${isPrefix}bot or ${isPrefix}menu to show menu.`), m)
               }
            }
         }
      } catch (e) {
         return client.reply(m.chat, Func.jsonFormat(e), m)
      }
   },
   cache: true,
   location: __filename
}