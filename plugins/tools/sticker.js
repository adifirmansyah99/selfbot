exports.run = {
   usage: ['s', 'sk', 'stiker', 'sticker', 'sgif'],
   async: async (m, {
      client
   }) => {
      try {
         if (m.quoted ? m.quoted.message : m.msg.viewOnce) {
            let type = m.quoted ? Object.keys(m.quoted.message)[0] : m.mtype
            let q = m.quoted ? m.quoted.message[type] : m.msg
            let img = await client.downloadMediaMessage(q)
            if (/video/.test(type)) {
               if (q.seconds > 10) return client.reply(m.chat, Func.texted('bold', `🚩 Maximum video duration is 10 seconds.`), m)
               return await client.sendSticker(m.chat, img, m, {
                  packname: '',
                  author: m.pushName
               })
            } else if (/image/.test(type)) {
               return await client.sendSticker(m.chat, img, m, {
                  packname: '',
                  author: m.pushName
               })
            }
         } else {
            let q = m.quoted ? m.quoted : m
            let mime = (q.msg || q).mimetype || ''
            if (/image\/(jpe?g|png)/.test(mime)) {
               let img = await q.download()
               if (!img) return client.reply(m.chat, global.status.wrong, m)
               return await client.sendSticker(m.chat, img, m, {
                  packname: '',
                  author: m.pushName
               })
            } else if (/video/.test(mime)) {
               if ((q.msg || q).seconds > 10) return client.reply(m.chat, Func.texted('bold', `🚩 Maximum video duration is 10 seconds.`), m)
               let img = await q.download()
               if (!img) return client.reply(m.chat, global.status.wrong, m)
               return await client.sendSticker(m.chat, img, m, {
                  packname: '',
                  author: m.pushName
               })
            } else client.reply(m.chat, Func.texted('bold', `Stress ??`), m)
         }
      } catch (e) {
         console.log(e)
         return client.reply(m.chat, Func.jsonFormat(e), m)
      }
   },
   error: false
}