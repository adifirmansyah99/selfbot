exports.run = {
   usage: ['bc', 'bctag'],
   async: async (m, {
      client,
      text,
      command
   }) => {
      try {
         let q = m.quoted ? m.quoted : m
         let mime = (q.msg || q).mimetype || ''
         let id = await (await client.groupList()).map(v => v.id)
         let status = global.db.groups
         if (text) {
            for (let jid of id) {
               await Func.delay(1500)
               await client.sendMessageModify(jid, text, null, {
                  thumbnail: 'https://telegra.ph/file/dedbead1dd6e984abf705.jpg',
                  largeThumb: true,
                  mentionedJid: command == 'bctag' ? await (await client.groupMetadata(jid)).participants.map(v => v.id) : []
               })
            }
            client.reply(m.chat, Func.texted('bold', `🚩 Berhasil mengirim broadcast ke dalam ${id.length} grup.`), m)
         } else if (/image\/(webp)/.test(mime)) {
            for (let jid of id) {
               await Func.delay(1500)
               let media = await q.download()
               await client.sendSticker(jid, media, null, {
                  packname: global.db.setting.sk_pack,
                  author: global.db.setting.sk_author,
                  mentions: command == 'bctag' ? await (await client.groupMetadata(jid)).participants.map(v => v.id) : []
               })
            }
            client.reply(m.chat, Func.texted('bold', `🚩 Berhasil mengirim broadcast sticker ke dalam ${id.length} grup.`), m)
         } else if (/video|image\/(jpe?g|png)/.test(mime)) {
            for (let jid of id) {
               await Func.delay(1500)
               let media = await q.download()
               await client.sendFile(jid, media, '', q.text ? '乂  *B R O A D C A S T*\n\n' + q.text : '', null, null, command == 'bctag' ? {
                  mentions: await (await client.groupMetadata(jid)).participants.map(v => v.id)
               } : {})
            }
            client.reply(m.chat, Func.texted('bold', `🚩 Berhasil mengirim broadcast media ke dalam ${id.length} grup.`), m)
         } else if (/audio/.test(mime)) {
            for (let jid of id) {
               await Func.delay(1500)
               let media = await q.download()
               await client.sendFile(jid, media, '', '', null, {
                  ptt: m.quoted.ptt
               }, command == 'bctag' ? {
                  mentions: await (await client.groupMetadata(jid)).participants.map(v => v.id)
               } : {})
            }
            client.reply(m.chat, Func.texted('bold', `🚩 Berhasil mengirim broadcast audio ke dalam ${id.length} grup.`), m)
         } else client.reply(m.chat, Func.texted('bold', `🚩 Sistem tidak menemukan sesuat / media tidak di dukung.`), m)
      } catch (e) {
         client.reply(m.chat, Func.jsonFormat(e), m)
      }
   },
   owner: true
}