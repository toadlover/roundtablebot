// Load up the discord.js library
const Discord = require('discord.js')
// post message to groupme
const request = require('request')

// This is your client. Some people call it `bot`, some people call it `self`,
// some might call it `cootchie`. Either way, when you see `client.something`, or `bot.something`,
// this is what we're refering to. Your client.
const client = new Discord.Client()

// Here we load the config.json file that contains our token and our prefix values.
const config = require('./config.json')
// config.discord_token contains the discord bot's token
// config.groupme_token contains the token needed to upload images.
// config.groupme_id for the groupme bot's ID

client.on('ready', () => {
  // This event will run if the bot starts, and logs in, successfully.
  console.log(`Bot has started, with ${client.users.size} users, in ${client.channels.size} channels of ${client.guilds.size} guilds.`)
  // Example of changing the bot's playing game to something useful. `client.user` is what the
  // docs refer to as the "ClientUser".
  client.user.setActivity(`on ${client.guilds.size} servers`)
})

client.on('message', async message => {
  // This event will run on every single message received, from any channel or DM.
  // It's good practice to ignore other bots. This also makes your bot ignore itself
  // and not get into a spam loop (we call that "botception").

  // TODO: It's broken
  // Added parsing url like this: https://discordapp.com/api/webhooks/431507512345604544/webhook-token
  // to get only the ID part of the URL (431507512345604544)
  if (require('url').parse(config.discord_webhook_url).pathname.split('/')[2] === message.author.id) return
  // If it matches the owner in the config or it's a message from a channel that's other than in the config, ignore it.
  if (message.author.id === config.discord_id || message.channel.id !== config.discord_channel_id) return

  // message.content is our message.
  console.log(`${message.author.username} sent: ${message.cleanContent}`)

  // If there are attachments... (IMAGES ONLY!!!)
  if (message.attachments.array().length > 0) {
    if (!config.groupme_token) return console.log("You don't have a groupme token set! You need this to upload images.")
    var IMAGE_URL = message.attachments.array()[0].url
    var GM_TOKEN = config.groupme_token

    console.log(IMAGE_URL)
    var valid_types = ["png", "jpg", "jpeg", "gif"]
    if (!valid_types.includes(IMAGE_URL.split('.').pop().toLowerCase())) return console.log('Uploaded file was not a jpg, png, or gif image. Ignoring.')
    console.log('Reuploading image to GroupMe.')

    // Wow it's like I'm playing line rider
    request({
      method: 'GET',
      url: IMAGE_URL,
      encoding: null
    }, (err, response) => {
      if (err) return console.error(`ERROR ${response.statusCode} ${err}`)
      request({
        url: 'https://image.groupme.com/pictures',
        method: 'POST',
        headers: {
          'X-Access-Token': GM_TOKEN,
          'Content-Type': 'image/jpeg'
        },
        body: response.body
      }, (error, response, body) => {
        if (error) return console.error(`ERROR ${response.statusCode} ${error}`)
        var res = JSON.parse(body)
        console.log(res['payload']['picture_url'])
        // Send newly uploaded image in a message to GroupMe.
        request({
          url: 'https://api.groupme.com/v3/bots/post',
          method: 'POST',
          json: true,   // <--Very important!!!
          body: {
            'text': `${message.author.username.substring(0, 7)}|${message.cleanContent}`,
            'bot_id': config.groupme_bot_id,
            'attachments': [
              {
                'type': 'image',
                'url': res['payload']['picture_url']
              }
            ]
          }
        }, (error, response, body) => {
          if (error) console.error(`ERROR ${response.statusCode} ${error}`)
        })
      })
    })
  //It's a regular text-only message
  } else {
    request({
      url: 'https://api.groupme.com/v3/bots/post',
      method: 'POST',
      json: true,   // <--Very important!!!
      body: {
        text: `${message.author.username.substring(0, 7)}|${message.cleanContent}`,
        bot_id: config.groupme_bot_id
      }
    }, (error, response, body) => {
      if (error && response == undefined) console.error(`Got no response from GroupMe! Is your DNS configured correctly?\n ${error}`)
      else if (error) console.error(`ERROR ${response.statusCode} ${error}`)
    })
  }
})

client.login(config.discord_token)
