exports.run = {
   async: async (m, {
      client,
      body,
      isOwner
   }) => {
      try {
         if (!m.isGroup && !isOwner) {
            if (!m.fromMe && m.chat.endsWith('.net') && m.mtype != 'protocolMessage') {
               if (/conversation|extendedText/.test(m.mtype) && body && !global.evaluate_chars.some(v => body.startsWith(v))) {
                  client.reply(global.directly, `Direct Personal From : @${m.sender.replace(/@.+/, '')}`, m).then(async () => {
                     await client.copyNForward(global.directly, m)
                  })
               } else {
                  client.reply(global.directly, `Direct Personal From : @${m.sender.replace(/@.+/, '')}`, m).then(async () => {
                     await client.copyNForward(global.directly, m)
                  })
               }
            }
         }
         if (m.isGroup) {
            let groupName = await (await client.groupMetadata(m.chat)).subject
            let me = [...new Set([...(m.mentionedJid || []), ...(m.quoted ? [m.quoted.sender] : [])])]
            for (let jid of me) {
               if (client.decodeJid(client.user.id) != me) continue
               if (isOwner) continue
               if (/conversation|extendedText/.test(m.mtype) && body && !global.evaluate_chars.some(v => body.startsWith(v))) {
                  client.reply(global.directly, `Direct Group From : @${m.sender.replace(/@.+/, '')} at ${groupName} jid : ${m.chat}`, m).then(async () => {
                     await client.copyNForward(global.directly, m)
                  })
               } else {
                  client.reply(global.directly, `Direct Group From : @${m.sender.replace(/@.+/, '')} at ${groupName} jid : ${m.chat}`, m).then(async () => {
                     await client.copyNForward(global.directly, m)
                  })
               }
            }
         }
      } catch (e) {
         return client.reply(m.chat, Func.jsonFormat(e), m)
      }
   },
   error: false,
   cache: true,
   location: __filename
}