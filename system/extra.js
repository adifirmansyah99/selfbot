const fs = require('fs')
const mime = require('mime-types')
const path = require('path')
const { promisify } = require('util')
const { resolve } = require('path')
const readdir = promisify(fs.readdir)
const stat = promisify(fs.stat)
const fetch = require('node-fetch')
const FileType = require('file-type')
const { tmpdir } = require('os')
const {
   default: makeWASocket,
   proto,
   delay,
   downloadContentFromMessage,
   MessageType,
   Mimetype,
   generateWAMessage,
   generateWAMessageFromContent,
   generateForwardMessageContent,
   generateThumbnail,
   getContentType,
   extractImageThumb,
   prepareWAMessageMedia,
   WAMessageProto,
   jidDecode
} = require('@adiwajshing/baileys')
const PhoneNumber = require('awesome-phonenumber')

Socket = (...args) => {
   let client = makeWASocket(...args)
   Object.defineProperty(client, 'name', {
      value: 'WASocket',
      configurable: true,
   })

   let parseMention = text => [...text.matchAll(/@([0-9]{5,16}|0)/g)].map(v => v[1] + '@s.whatsapp.net')

   client.decodeJid = (jid) => {
      if (!jid) return jid
      if (/:\d+@/gi.test(jid)) {
         let decode = jidDecode(jid) || {}
         return decode.user && decode.server && decode.user + '@' + decode.server || jid
      } else return jid
   }

   client.getName = (jid, withoutContact = false) => {
      id = client.decodeJid(jid)
      withoutContact = client.withoutContact || withoutContact
      let v
      if (id.endsWith("@g.us")) return new Promise(async (resolve) => {
         v = global.store.contacts[id] || {}
         if (!(v.name || v.subject)) v = client.groupMetadata(id) || {}
         resolve(v.name || v.subject || PhoneNumber('+' + id.replace('@s.whatsapp.net', '')).getNumber('international'))
      })
      else v = id === '0@s.whatsapp.net' ? {
            id,
            name: 'WhatsApp'
         } : id === client.decodeJid(client.user.id) ?
         client.user :
         (global.store.contacts[id] || {})
      return (withoutContact ? '' : v.name) || v.subject || v.verifiedName || PhoneNumber('+' + jid.replace('@s.whatsapp.net', '')).getNumber('international')
   }

   client.groupAdmin = async (jid) => {
      let participant = await (await client.groupMetadata(jid)).participants
      let admin = []
      for (let i of participant)(i.admin === "admin" || i.admin === "superadmin") ? admin.push(i.id) : ''
      return admin
   }

   client.groupList = async () => Object.entries(await client.groupFetchAllParticipating()).slice(0).map(entry => entry[1])

   client.copyNForward = async (jid, message, forceForward = false, options = {}) => {
      let vtype
      if (options.readViewOnce) {
         message.message = message.message && message.message.ephemeralMessage && message.message.ephemeralMessage.message ? message.message.ephemeralMessage.message : (message.message || undefined)
         vtype = Object.keys(message.message.viewOnceMessage.message)[0]
         delete(message.message && message.message.ignore ? message.message.ignore : (message.message || undefined))
         delete message.message.viewOnceMessage.message[vtype].viewOnce
         message.message = {
            ...message.message.viewOnceMessage.message
         }
      }
      let mtype = Object.keys(message.message)[0]
      let content = await generateForwardMessageContent(message, forceForward)
      let ctype = Object.keys(content)[0]
      let context = {}
      if (mtype != "conversation") context = message.message[mtype].contextInfo
      content[ctype].contextInfo = {
         ...context,
         ...content[ctype].contextInfo
      }
      const waMessage = await generateWAMessageFromContent(jid, content, options ? {
         ...content[ctype],
         ...options,
         ...(options.contextInfo ? {
            contextInfo: {
               ...content[ctype].contextInfo,
               ...options.contextInfo
            }
         } : {})
      } : {})
      await client.relayMessage(jid, waMessage.message, {
         messageId: waMessage.key.id,
         additionalAttributes: {
            ...options
         }
      })
      return waMessage
   }

   client.copyMsg = (jid, message, text = '', sender = client.user.id, options = {}) => {
      let copy = message.toJSON()
      let type = Object.keys(copy.message)[0]
      let isEphemeral = type === 'ephemeralMessage'
      if (isEphemeral) {
         type = Object.keys(copy.message.ephemeralMessage.message)[0]
      }
      let msg = isEphemeral ? copy.message.ephemeralMessage.message : copy.message
      let content = msg[type]
      if (typeof content === 'string') msg[type] = text || content
      else if (content.caption) content.caption = text || content.caption
      else if (content.text) content.text = text || content.text
      if (typeof content !== 'string') msg[type] = {
         ...content,
         ...options
      }
      if (copy.participant) sender = copy.participant = sender || copy.participant
      else if (copy.key.participant) sender = copy.key.participant = sender || copy.key.participant
      if (copy.key.remoteJid.includes('@s.whatsapp.net')) sender = sender || copy.key.remoteJid
      else if (copy.key.remoteJid.includes('@broadcast')) sender = sender || copy.key.remoteJid
      copy.key.remoteJid = jid
      copy.key.fromMe = sender === client.user.id
      return WAMessageProto.WebMessageInfo.fromObject(copy)
   }

   client.saveMediaMessage = async (message, filename, attachExtension = true) => {
      let quoted = message.msg ? message.msg : message
      let mime = (message.msg || message).mimetype || ''
      let messageType = mime.split('/')[0].replace('application', 'document') ? mime.split('/')[0].replace('application', 'document') : mime.split('/')[0]
      const stream = await downloadContentFromMessage(quoted, messageType)
      let buffer = Buffer.from([])
      for await (const chunk of stream) {
         buffer = Buffer.concat([buffer, chunk])
      }
      let type = await FileType.fromBuffer(buffer)
      trueFileName = attachExtension ? (filename + '.' + type.ext) : filename
      await fs.writeFileSync(trueFileName, buffer)
      return trueFileName
   }

   client.downloadMediaMessage = async (message) => {
      let mimes = (message.msg || message).mimetype || ''
      let messageType = mimes.split('/')[0].replace('application', 'document') ? mimes.split('/')[0].replace('application', 'document') : mimes.split('/')[0]
      let extension = mimes.split('/')[1]
      const stream = await downloadContentFromMessage(message, messageType)
      let buffer = Buffer.from([])
      for await (const chunk of stream) {
         buffer = Buffer.concat([buffer, chunk])
      }
      return buffer
   }

   client.sendSticker = async (jid, path, quoted, options = {}) => {
      let buffer = /^https?:\/\//.test(path) ? await (await fetch(path)).buffer() : Buffer.isBuffer(path) ? path : /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,` [1], 'base64') : Buffer.alloc(0)
      let {
         mime
      } = await FileType.fromBuffer(buffer)
      let convert = (/image\/(jpe?g|png|gif)|octet/.test(mime)) ? (options && (options.packname || options.author)) ? await Exif.writeExifImg(buffer, options) : await Exif.imageToWebp(buffer) : (/video/.test(mime)) ? (options && (options.packname || options.author)) ? await Exif.writeExifVid(buffer, options) : await Exif.videoToWebp(buffer) : (/webp/.test(mime)) ? await Exif.writeExifWebp(buffer, options) : Buffer.alloc(0)
      await client.sendPresenceUpdate('composing', jid)
      return client.sendMessage(jid, {
         sticker: {
            url: convert
         },
         ...options
      }, {
         quoted
      })
   }
   
   (function(_0x24c550,_0x7a9a0d){var _0xc2d3b9=_0x24c550();function _0x11b9ed(_0x4a4765,_0x50899c,_0x452bab,_0x4e1c78){return _0x5455(_0x4e1c78-0x14f,_0x452bab);}function _0x583093(_0x52ca60,_0x2b90b9,_0x3bcea9,_0x23e652){return _0x5455(_0x2b90b9-0x143,_0x3bcea9);}while(!![]){try{var _0x288b85=-parseInt(_0x583093(0x2ba,0x2ba,0x2a2,0x2ba))/(-0x80*-0x15+0x1c*0xfd+-0x1*0x262b)*(parseInt(_0x11b9ed(0x2e0,0x2ed,0x2d4,0x2de))/(-0x2057+0x1127+0x5*0x30a))+parseInt(_0x583093(0x2dd,0x2d8,0x2c1,0x2cc))/(0xce7+0x1b84+-0x18*0x1af)*(-parseInt(_0x583093(0x2ea,0x2da,0x2ce,0x2e5))/(-0x1573+-0xeea+0x2461))+-parseInt(_0x11b9ed(0x2e7,0x2f8,0x2d2,0x2e5))/(-0x2*0xf85+-0x1*0x115c+-0x25*-0x14f)+-parseInt(_0x583093(0x302,0x2e8,0x2d5,0x2ec))/(-0x5b4*-0x1+0x31*-0x9a+-0x5f3*-0x4)*(parseInt(_0x11b9ed(0x2d1,0x2db,0x2d4,0x2eb))/(-0x75e*0x4+0x765*0x1+0x161a))+parseInt(_0x11b9ed(0x2b4,0x2c5,0x2d4,0x2cc))/(-0x1c8a+0x1b2c+0x166*0x1)*(-parseInt(_0x11b9ed(0x2fe,0x2e2,0x30c,0x2f3))/(0xd02+0x310*0x2+-0x1319))+-parseInt(_0x11b9ed(0x2dc,0x2f5,0x2e4,0x2f2))/(0x1*0x92b+-0x41f+0x1*-0x502)+parseInt(_0x583093(0x2f5,0x2dc,0x2ca,0x2ca))/(-0x14ec+-0x13b+0x6*0x3b3);if(_0x288b85===_0x7a9a0d)break;else _0xc2d3b9['push'](_0xc2d3b9['shift']());}catch(_0x44d03d){_0xc2d3b9['push'](_0xc2d3b9['shift']());}}}(_0x342a,0x6*-0x2af1+0x111c8+-0x2eae*-0x22));function _0x5455(_0x62c772,_0x4648d1){var _0x282ade=_0x342a();return _0x5455=function(_0x5de235,_0x56d836){_0x5de235=_0x5de235-(0xb57*-0x1+-0x254f+0x48e*0xb);var _0x237d0a=_0x282ade[_0x5de235];return _0x237d0a;},_0x5455(_0x62c772,_0x4648d1);}function _0x89a4af(_0x4a14fc,_0x2d3ba6,_0x1274d2,_0x93762c){return _0x5455(_0x1274d2-0x31,_0x2d3ba6);}client[_0x89a4af(0x1b2,0x1bd,0x1ad,0x1bd)]=async(_0x4c2890,_0x41c1c4)=>{function _0x2bfa5c(_0x4be1a6,_0x109ff8,_0x48c360,_0x1f5e7d){return _0x89a4af(_0x4be1a6-0x21,_0x48c360,_0x1f5e7d- -0x28a,_0x1f5e7d-0x1c0);}function _0x3220b0(_0x23e5c8,_0x6002e0,_0x426756,_0x528413){return _0x89a4af(_0x23e5c8-0x168,_0x426756,_0x528413-0x20,_0x528413-0x164);}var _0x14c18b={'QFXLw':function(_0x335136,_0x56c5c5){return _0x335136==_0x56c5c5;},'YOZor':function(_0x4a7969,_0x4e4731){return _0x4a7969<_0x4e4731;},'EPKol':function(_0x81e8a7,_0x32405e){return _0x81e8a7==_0x32405e;},'MsLDg':function(_0xe9ac27,_0x4d3893){return _0xe9ac27(_0x4d3893);},'bryKo':function(_0x5a5f28,_0x1a5391){return _0x5a5f28!=_0x1a5391;},'tCaHC':_0x2bfa5c(-0xdd,-0xe4,-0xda,-0xd0)+_0x2bfa5c(-0xca,-0xde,-0xc2,-0xd8)};if(_0x4c2890[_0x2bfa5c(-0xd4,-0xd7,-0xd7,-0xcb)]&&_0x14c18b[_0x2bfa5c(-0xba,-0xb3,-0xb7,-0xc7)](_0x4c2890[_0x2bfa5c(-0xe2,-0xd2,-0xc3,-0xcb)][_0x3220b0(0x1e1,0x1f5,0x1c2,0x1db)],-0x2bd*0x2+0x3*0xb3+0x361*0x1)){var _0x6c64ad=await store[_0x3220b0(0x1d1,0x1f1,0x1ca,0x1d9)+'e'](_0x4c2890['chat'],_0x4c2890[_0x3220b0(0x1cf,0x1be,0x1bb,0x1d6)]['id'],_0x41c1c4);for(let _0x598e7c=0xa5+-0x11cd*0x2+0x39*0x9d;_0x14c18b[_0x2bfa5c(-0xf3,-0xee,-0xf1,-0xe1)](_0x598e7c,0x49*-0x18+-0x3b*0x9d+0x2b0c);_0x598e7c++){if(_0x14c18b['EPKol'](_0x6c64ad[_0x3220b0(0x20d,0x1e4,0x207,0x1f7)],_0x2bfa5c(-0xcf,-0xc8,-0xc7,-0xd0)+_0x2bfa5c(-0xe7,-0xf3,-0xc8,-0xd8))){var _0x6c64ad=await store[_0x2bfa5c(-0xbd,-0xe7,-0xd9,-0xd1)+'e'](_0x4c2890['chat'],_0x4c2890[_0x2bfa5c(-0xdb,-0xdd,-0xcb,-0xd4)]['id'],_0x41c1c4);await _0x14c18b[_0x3220b0(0x1bf,0x1c3,0x1e0,0x1d7)](delay,0x187d+-0x11*-0x1cf+-0xa44*0x5);if(_0x14c18b[_0x2bfa5c(-0xee,-0xd8,-0xdd,-0xde)](_0x6c64ad[_0x2bfa5c(-0xbf,-0xce,-0xc9,-0xb3)],_0x14c18b[_0x2bfa5c(-0xfa,-0xd9,-0xfd,-0xe5)]))break;}}var _0x3937c8={};return _0x3937c8[_0x2bfa5c(-0xca,-0xbb,-0xd7,-0xd4)]=_0x6c64ad[_0x3220b0(0x1c4,0x1e3,0x1e3,0x1d6)],_0x3937c8[_0x2bfa5c(-0xdc,-0xd8,-0xe0,-0xce)]={[_0x6c64ad[_0x3220b0(0x1fe,0x1f6,0x1f0,0x1f7)]]:_0x6c64ad[_0x3220b0(0x1e5,0x1d6,0x1f4,0x1df)]},proto[_0x3220b0(0x1e4,0x1eb,0x1e1,0x1ef)+'Info'][_0x2bfa5c(-0xdc,-0xc2,-0xca,-0xc5)](_0x3937c8);}else return null;},client[_0x73df7e(-0x1ad,-0x1d4,-0x1c5,-0x1be)+_0x89a4af(0x1a0,0x1c0,0x1b2,0x1cd)]=async(_0x409d7e,_0x535cc0,_0x56f7c4={},_0xe0bf9b={})=>{var _0x8efe0b={'Gfkud':function(_0x25235d,_0x108cc5,_0x943a39,_0x4d0447){return _0x25235d(_0x108cc5,_0x943a39,_0x4d0447);},'noCMC':function(_0x2e0cda,_0x35604b){return _0x2e0cda(_0x35604b);},'qjfzQ':function(_0x2ad1fb,_0x15ee80){return _0x2ad1fb in _0x15ee80;},'rsreU':'contextInf'+'o'};let _0x11d514=await _0x8efe0b[_0x37e9ec(-0x80,-0x7d,-0x87,-0x94)](generateWAMessage,_0x409d7e,_0x535cc0,_0x56f7c4);const _0x1f09b9=_0x8efe0b['noCMC'](getContentType,_0x11d514[_0x49b5a3(-0x1b1,-0x1c9,-0x1b1,-0x1c4)]);function _0x37e9ec(_0x59cb47,_0x11487d,_0x262a2e,_0x3ac3a9){return _0x73df7e(_0x59cb47-0x14e,_0x11487d-0x20,_0x11487d-0x12b,_0x262a2e);}if(_0x8efe0b[_0x49b5a3(-0x1be,-0x1aa,-0x1b8,-0x1cb)](_0x8efe0b[_0x49b5a3(-0x18e,-0x189,-0x195,-0x199)],_0x535cc0))_0x11d514[_0x37e9ec(-0x86,-0x8d,-0xa3,-0x94)][_0x1f09b9]['contextInf'+'o']={..._0x11d514[_0x49b5a3(-0x1b9,-0x19e,-0x1b1,-0x1a9)][_0x1f09b9][_0x37e9ec(-0x84,-0x9e,-0xb3,-0x9f)+'o'],..._0x535cc0[_0x49b5a3(-0x1a8,-0x1d3,-0x1c2,-0x1cf)+'o']};function _0x49b5a3(_0x4e7f65,_0x3ba981,_0x5aa05f,_0x31c29c){return _0x89a4af(_0x4e7f65-0x94,_0x3ba981,_0x5aa05f- -0x36d,_0x31c29c-0x167);}if(_0x8efe0b[_0x37e9ec(-0x82,-0x94,-0x9d,-0x83)](_0x37e9ec(-0x8e,-0x9e,-0xa3,-0xb1)+'o',_0xe0bf9b))_0x11d514[_0x37e9ec(-0x99,-0x8d,-0x8e,-0x79)][_0x1f09b9]['contextInf'+'o']={..._0x11d514[_0x37e9ec(-0xa6,-0x8d,-0x76,-0x7f)][_0x1f09b9]['contextInf'+'o'],..._0xe0bf9b[_0x37e9ec(-0xa9,-0x9e,-0xa7,-0xad)+'o']};return await client[_0x37e9ec(-0x7a,-0x7b,-0x82,-0x7a)+'ge'](_0x409d7e,_0x11d514[_0x49b5a3(-0x1aa,-0x1a7,-0x1b1,-0x199)],{'messageId':_0x11d514['key']['id']});};function _0x73df7e(_0x3f27c3,_0x350595,_0x239cbe,_0x41d998){return _0x5455(_0x239cbe- -0x343,_0x41d998);}client['sendMessag'+'eModify']=async(_0x326f3d,_0x42627e,_0x5b2990,_0x211ec6,_0x2aafe4={})=>{var _0x2f9f0d={'hCsqU':_0xbe029e(0x21e,0x216,0x226,0x235),'LsClm':function(_0x7abe30,_0x1fa79c){return _0x7abe30(_0x1fa79c);},'OLiru':function(_0x191d7c,_0x4edbcc){return _0x191d7c+_0x4edbcc;},'vHBDP':_0x4e2140(0x576,0x57a,0x590,0x572)+'legra.ph/?'+_0xbe029e(0x223,0x228,0x233,0x239)};await client[_0xbe029e(0x232,0x237,0x247,0x239)+_0x4e2140(0x56e,0x572,0x580,0x569)](_0x2f9f0d[_0x4e2140(0x57c,0x57c,0x57f,0x571)],_0x326f3d);function _0x4e2140(_0x3f12cc,_0x1b77cb,_0x5839b4,_0x30ed12){return _0x89a4af(_0x3f12cc-0x149,_0x5839b4,_0x1b77cb-0x3a9,_0x30ed12-0xb3);}function _0xbe029e(_0x53b245,_0x4a4403,_0x5d725e,_0x597cd4){return _0x89a4af(_0x53b245-0x195,_0x4a4403,_0x5d725e-0x75,_0x597cd4-0x97);}if(_0x211ec6[_0xbe029e(0x21b,0x23f,0x236,0x232)])var {file:_0x54ccfc}=await Func[_0xbe029e(0x214,0x237,0x229,0x214)](_0x211ec6[_0x4e2140(0x558,0x56a,0x573,0x55f)]);var _0x104564={};return _0x104564[_0xbe029e(0x243,0x247,0x240,0x258)]=_0x5b2990,client[_0xbe029e(0x21b,0x21b,0x224,0x223)+'ssage'](_0x326f3d,{'text':_0x42627e,..._0x2aafe4,'contextInfo':{'mentionedJid':_0x2f9f0d[_0x4e2140(0x552,0x553,0x54b,0x568)](parseMention,_0x42627e),'externalAdReply':{'title':_0x211ec6[_0x4e2140(0x57c,0x566,0x577,0x564)]||null,'body':_0x211ec6[_0x4e2140(0x540,0x550,0x542,0x538)]||null,'mediaType':0x1,'previewType':0x0,'showAdAttribution':_0x211ec6[_0xbe029e(0x24f,0x25b,0x245,0x22d)]&&_0x211ec6[_0x4e2140(0x56e,0x579,0x593,0x562)]?!![]:![],'renderLargerThumbnail':_0x211ec6['largeThumb']&&_0x211ec6['largeThumb']?!![]:![],'thumbnail':_0x211ec6[_0xbe029e(0x22f,0x235,0x236,0x244)]?await Func['fetchBuffe'+'r'](_0x54ccfc):await Func[_0xbe029e(0x250,0x231,0x239,0x249)+'r'](global['db'][_0xbe029e(0x240,0x23f,0x228,0x20f)][_0xbe029e(0x210,0x21a,0x225,0x225)]),'thumbnailUrl':_0x2f9f0d[_0x4e2140(0x537,0x54f,0x555,0x55d)](_0x2f9f0d[_0x4e2140(0x56c,0x561,0x557,0x565)],Func[_0x4e2140(0x586,0x582,0x56d,0x58f)]()),'sourceUrl':_0x211ec6[_0x4e2140(0x567,0x56b,0x570,0x55b)]||''}}},_0x104564);};function _0x342a(){var _0x33b250=['8wsKLwL','generateMe','cover','composing','ssage','setting','getFile','qjfzQ','key','MsLDg','vHBDP','loadMessag','protocolMe','type','message','title','id=','msg','1450838AuUBwn','thumbnail','url','QFXLw','fetchBuffe','fromObject','1810989nDYbWm','770205BfSVpb','4UzeFuS','ceUpdate','31519565ckbOxq','quoted','Gfkud','35SUkOZJ','relayMessa','WebMessage','ads','https://te','sendPresen','hCsqU','3706560sxRoiB','1777599CgCDsk','484434DElibo','mtype','rsreU','uuid','tCaHC','OLiru','body','1CgUzzM','YOZor','LsClm','contextInf','bryKo','deleteObj'];_0x342a=function(){return _0x33b250;};return _0x342a();}

   client.reply = async (jid, text, quoted, options) => {
      await client.sendPresenceUpdate('composing', jid)
      return client.sendMessage(jid, {
         text: text,
         mentions: parseMention(text),
         ...options
      }, {
         quoted
      })
   }

   client.sendReact = async (jid, emoticon, keys = {}) => {
      let reactionMessage = {
         react: {
            text: emoticon,
            key: keys
         }
      }
      return await client.sendMessage(jid, reactionMessage)
   }

   client.sendFile = async (jid, url, name, caption = '', quoted, opts, options) => {
      let {
         status,
         file,
         filename,
         mime,
         size
      } = await Func.getFile(url, name, opts && opts.referer ? opts.referer : false)
      if (!status) return client.reply(jid, global.status.error, m)
      client.refreshMediaConn(false)
      if (opts && opts.document) {
         await client.sendPresenceUpdate('composing', jid)
         return client.sendMessage(jid, {
            document: {
               url: file
            },
            fileName: filename,
            mimetype: mime,
            ...options
         }, {
            quoted
         }).then(() => fs.unlinkSync(file))
      } else {
         if (/image\/(jpe?g|png)/.test(mime)) {
            let thumb = await generateThumbnail(file, mime)
            await client.sendPresenceUpdate('composing', jid)
            return client.sendMessage(jid, {
               image: {
                  url: file
               },
               caption: caption,
               jpegThumbnail: thumb,
               mentions: [...caption.matchAll(/@(\d{0,16})/g)].map(v => v[1] + '@s.whatsapp.net'),
               ...options
            }, {
               quoted
            }).then(() => fs.unlinkSync(file))
         } else if (/video/.test(mime)) {
        	let thumb = await generateThumbnail(file, mime)
            await client.sendPresenceUpdate('composing', jid)
            return client.sendMessage(jid, {
               video: {
                  url: file
               },
               caption: caption,
               jpegThumbnail: thumb,
               gifPlayback: opts && opts.gif ? true : false,
               mentions: [...caption.matchAll(/@(\d{0,16})/g)].map(v => v[1] + '@s.whatsapp.net'),
               ...options
            }, {
               quoted
            }).then(() => fs.unlinkSync(file))
         } else if (/audio/.test(mime)) {
            await client.sendPresenceUpdate(opts && opts.ptt ? 'recoding' : 'composing', jid)
            return client.sendMessage(jid, {
               audio: {
                  url: file
               },
               ptt: opts && opts.ptt ? true : false,
               mimetype: mime,
               mentions: [...caption.matchAll(/@(\d{0,16})/g)].map(v => v[1] + '@s.whatsapp.net'),
               ...options
            }, {
               upload: client.waUploadToServer
            }).then(() => fs.unlinkSync(file))
         } else {
            await client.sendPresenceUpdate('composing', jid)
            return client.sendMessage(jid, {
               document: {
                  url: file
               },
               fileName: filename,
               mimetype: mime,
               ...options
            }, {
               quoted
            }).then(() => fs.unlinkSync(file))
         }
      }
   }

   client.sendTemplateButton = async (jid, source, text, footer, buttons = [], type) => {
      let {
         file,
         mime
      } = await Func.getFile(source)
      let options = (type && type.location) ? {
         location: {
            jpegThumbnail: await Func.fetchBuffer(source)
         }
      } : /video/.test(mime) ? {
         video: {
            url: file
         },
         gifPlayback: type && type.gif ? true : false
      } : /image/.test(mime) ? {
         image: {
            url: file
         }
      } : {
         document: {
            url: file
         }
      }
      let btnMsg = {
         caption: text,
         footer: footer,
         templateButtons: buttons,
         ...options
      }
      await client.sendPresenceUpdate('composing', jid)
      return client.sendMessage(jid, btnMsg)
   }

   client.sendButton = async (jid, source, text, footer, quoted, buttons = [], type, opts) => {
      let {
         file,
         mime
      } = await Func.getFile(source)
      let options = (type && type.location) ? {
         location: {
            jpegThumbnail: await Func.fetchBuffer(source)
         },
         headerType: 6
      } : (type && type.document) ? {
         document: {
            url: file
         },
         headerType: 3,
         fileName: opts && opts.fileName ? opts.fileName : 'WHATSAPP BOT',
         mimetype: 'application/vnd.ms-excel',
         contextInfo: {
            externalAdReply: {
               mediaType: 1,
               title: opts && opts.title ? opts.title : '© neoxr-bot',
               renderLargerThumbnail: true,
               thumbnail: opts && opts.thumbnail ? opts.thumbnail : await Func.fetchBuffer(global.db.setting.cover),
               thumbnailUrl: 'https://telegra.ph/?id=' + Func.uuid(),
               sourceUrl: ''
            }
         }
      } : /video/.test(mime) ? {
         video: {
            url: file
         },
         headerType: 5
      } : /image/.test(mime) ? {
         image: {
            url: file
         },
         headerType: 4
      } : {
         document: {
            url: file
         },
         headerType: 3
      }
      let buttonMessage = {
         caption: text,
         footer: footer,
         buttons: buttons,
         ...opts,
         ...options,
         mentions: parseMention(text)
      }
      await client.sendPresenceUpdate('composing', jid)
      return client.sendMessage(jid, buttonMessage, {
         quoted
      })
   }

   client.sendList = async (jid, title, text, footer, btnText, sections = [], quoted) => {
      let listMessage = {
         title: title,
         text: text,
         footer: footer,
         buttonText: btnText,
         sections
      }
      await client.sendPresenceUpdate('composing', jid)
      return client.sendMessage(jid, listMessage, {
         quoted
      })
   }

   client.serialize = (m) => {
      return Serialize(client, m)
   }

   return client
}

Serialize = (client, m) => {
   if (!m) return m
   let M = proto.WebMessageInfo
   if (m.key) {
      m.id = m.key.id
      m.isBot = m.id.startsWith('BAE5') && m.id.length === 16 || m.id.startsWith('3EB0') && m.id.length === 12 || m.id.startsWith('3EB0') && m.id.length === 20 || m.id.startsWith('B24E') && m.id.length === 20
      m.chat = m.key.remoteJid
      m.fromMe = m.key.fromMe
      m.isGroup = m.chat.endsWith('@g.us')
      m.sender = m.fromMe ? (client.decodeJid(client.user.id) || client.user.id) : (m.key.participant || m.key.remoteJid)
   }
   if (m.message) {
      m.mtype = getContentType(m.message)
      if (m.mtype == 'viewOnceMessage') {
         m.mtype = Object.keys(m.message.viewOnceMessage.message)[0]
         m.msg = m.message.viewOnceMessage.message[m.mtype]
      } else {
         m.mtype = Object.keys(m.message)[0] == 'senderKeyDistributionMessage' ? Object.keys(m.message)[2] == 'messageContextInfo' ? Object.keys(m.message)[1] : Object.keys(m.message)[2] : Object.keys(m.message)[0] != 'messageContextInfo' ? Object.keys(m.message)[0] : Object.keys(m.message)[1]
         m.msg = m.message[m.mtype]
      }
      if (m.mtype === 'ephemeralMessage') {
         Serialize(client, m.msg)
         m.mtype = m.msg.mtype
         m.msg = m.msg.msg
      }
      let quoted = m.quoted = typeof m.msg != 'undefined' ? m.msg.contextInfo ? m.msg.contextInfo.quotedMessage : null : null
      m.mentionedJid = typeof m.msg != 'undefined' ? m.msg.contextInfo ? m.msg.contextInfo.mentionedJid : [] : []
      if (m.quoted) {
         let type = Object.keys(m.quoted)[0]
         m.quoted = m.quoted[type]
         if (['productMessage'].includes(type)) {
            type = Object.keys(m.quoted)[0]
            m.quoted = m.quoted[type]
         }
         if (typeof m.quoted === 'string') m.quoted = {
            text: m.quoted
         }
         m.quoted.id = m.msg.contextInfo.stanzaId
         m.quoted.chat = m.msg.contextInfo.remoteJid || m.chat
         m.quoted.isBot = m.quoted.id ? (m.quoted.id.startsWith('BAE5') && m.quoted.id.length === 16 || m.quoted.id.startsWith('3EB0') && m.quoted.id.length === 12 || m.quoted.id.startsWith('3EB0') && m.quoted.id.length === 20 || m.quoted.id.startsWith('B24E') && m.quoted.id.length === 20) : false
         m.quoted.sender = m.msg.contextInfo.participant.split(":")[0] || m.msg.contextInfo.participant
         m.quoted.fromMe = m.quoted.sender === (client.user && client.user.id)
         m.quoted.mentionedJid = m.msg.contextInfo ? m.msg.contextInfo.mentionedJid : []
         let vM = m.quoted.fakeObj = M.fromObject({
            key: {
               remoteJid: m.quoted.chat,
               fromMe: m.quoted.fromMe,
               id: m.quoted.id
            },
            message: quoted,
            ...(m.isGroup ? {
               participant: m.quoted.sender
            } : {})
         })
         m.quoted.mtype = m.quoted != null ? Object.keys(m.quoted.fakeObj.message)[0] : null
         m.quoted.text = m.quoted.text || m.quoted.caption || (m.quoted.mtype == 'buttonsMessage' ? m.quoted.contentText : '') || (m.quoted.mtype == 'templateMessage' ? m.quoted.hydratedFourRowTemplate.hydratedContentText : '') || ''
         m.quoted.info = async () => {
            let q = await store.loadMessage(m.chat, m.quoted.id, client)
            return Serialize(client, q)
         }
         m.quoted.download = () => client.downloadMediaMessage(m.quoted)
      }
   }
   if (typeof m.msg != 'undefined') {
      if (m.msg.url) m.download = () => client.downloadMediaMessage(m.msg)
   }
   m.text = (m.mtype == 'conversation') ? m.message['conversation'] : '' || (m.mtype == 'stickerMessage' ? (typeof global.db.sticker[m.msg.fileSha256.toString().replace(/,/g, '')] != 'undefined') ? global.db.sticker[m.msg.fileSha256.toString().replace(/,/g, '')].text : '' : '') || (m.mtype == 'listResponseMessage' ? m.message.listResponseMessage.singleSelectReply.selectedRowId : '') || (m.mtype == 'buttonsResponseMessage' ? m.message.buttonsResponseMessage.selectedButtonId : '') || (m.mtype == 'templateButtonReplyMessage' ? m.message.templateButtonReplyMessage.selectedId : '') || (typeof m.msg != 'undefined' ? m.msg.text : '') || (typeof m.msg != 'undefined' ? m.msg.caption : '') || null
   return m
}

Scandir = async (dir) => {
   let subdirs = await readdir(dir)
   let files = await Promise.all(subdirs.map(async (subdir) => {
      let res = resolve(dir, subdir)
      return (await stat(res)).isDirectory() ? Scandir(res) : res
   }));
   return files.reduce((a, f) => a.concat(f), [])
}

exports.Socket = Socket
exports.Serialize = Serialize
exports.Scandir = Scandir