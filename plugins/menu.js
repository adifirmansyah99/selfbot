exports.run = {
   usage: ['m'],
   async: async (m, {
      client,
      isPrefix
   }) => {
      client.reply(m.chat, menu(isPrefix), m)
   },
   error: false
}

const menu = prefix => {
return `◦  ${prefix}ava *mention or reply*
◦  ${prefix}get *url*
◦  ${prefix}bc *text or reply media*
◦  ${prefix}bcgc *text or reply media*
◦  ${prefix}del *reply message*
◦  ${prefix}response *url*
◦  ${prefix}hidetag *text*
◦  ${prefix}left *on / off*
◦  ${prefix}welcome *on / off*
◦  ${prefix}setleft *text*
◦  ${prefix}setwelcome *text*
◦  ${prefix}autoread *on / off*
◦  ${prefix}backup
◦  ${prefix}block *mention or reply*
◦  ${prefix}unblock *mention or reply*
◦  ${prefix}changename *text*
◦  ${prefix}chatbot *on / off*
◦  ${prefix}debug *on / off*
◦  ${prefix}prefix *symbol*
◦  ${prefix}-prefix *symbol*
◦  ${prefix}+prefix *symbol*
◦  ${prefix}cmdstic
◦  ${prefix}-cmdstic *reply sticker*
◦  ${prefix}+cmdstic *reply sticker*  
◦  ${prefix}multiprefix *on / off*
◦  ${prefix}q *reply chat*
◦  ${prefix}runtime
◦  ${prefix}reader
◦  ${prefix}restart
◦  ${prefix}story *mention or reply*
◦  ${prefix}self *on / off*
◦  ${prefix}setcover *reply photo*
◦  ${prefix}setpp *reply photo*
◦  ${prefix}setmsg *text*
◦  ${prefix}-mimic *mention or reply*
◦  ${prefix}+mimic *mention or reply*
◦  ${prefix}online *on / off*
◦  ${prefix}-owner *mention or reply*
◦  ${prefix}+owner *mention or reply*`}