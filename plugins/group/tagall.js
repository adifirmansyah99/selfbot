exports.run = {
   usage: ['tagall', 'everyone'],
   async: async (m, {
      client,
      text,
      participants
   }) => {
      try {
         let member = participants.map(v => v.id)
         let teks = `乂  *E V E R Y O N E*\n\n`
         teks += (!text) ? `Info! bot tagall *${member.length}* members in *${await (await client.groupMetadata(m.chat)).subject}* group.` : text
         teks += `\n${readmore}\n`
         teks += member.map(v => '	◦  @' + v.replace(/@.+/, '')).join('\n')
         teks += `\n\n${global.footer}`
         client.sendMessageModify(m.chat, teks, m, {
            thumbnail: './media/image/everyone.jpg',
            largeThumb: true
         })
      } catch (e) {
         console.log(e)
         return client.reply(m.chat, global.status.error, m)
      }
   },
   admin: true,
   group: true
}

const readmore = String.fromCharCode(8206).repeat(4001)