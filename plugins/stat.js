exports.run = {
   usage: ['stat'],
   async: async (m, {
      client
   }) => {
      try {
         const users = Object.entries(global.db.users).length
         const chats = Object.keys(global.db.chats).filter(v => v.endsWith('.net')).length
         const groups = await (await client.groupList()).map(v => v.id).length
         const stats = {
            users,
            chats,
            groups,
            mimic: (global.db.setting.mimic).length,
            uptime: Func.toTime(process.uptime() * 1000)
         }
         const system = global.db.setting
         client.reply(m.chat, statistic(stats, system), m)
      } catch (e) {
         client.reply(m.chat, Func.jsonFormat(e), m)
      }
   },
   error: false,
   owner: true,
   cache: true,
   location: __filename
}

const statistic = (stats, system) => {
   return `◦  ${Func.texted('bold', stats.groups)} Groups Joined
◦  ${Func.texted('bold', stats.chats)} Personal Chats
◦  ${Func.texted('bold', stats.users)} Users In Database
◦  ${Func.texted('bold', stats.mimic)} Mimics
◦  ${Func.switcher(system.chatbot, '[ √ ]', '[ × ]')}  Chat AI
◦  ${Func.switcher(system.debug, '[ √ ]', '[ × ]')}  Debug Mode
◦  ${Func.switcher(system.online, '[ √ ]', '[ × ]')}  Always Online
◦  ${Func.switcher(system.self, '[ √ ]', '[ × ]')}  Self Mode
◦  Prefix : ${Func.texted('bold', system.multiprefix ? '( ' + system.prefix.map(v => v).join(' ') + ' )' : '( ' + system.onlyprefix + ' )')}
◦  Runtime : ${Func.texted('bold', stats.uptime)}`
}