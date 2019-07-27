require("dotenv").config();
const Discord = require("discord.js");
const client = new Discord.Client();

const picChannel = "575993879837409290";

client.commands = new Discord.Collection();
global.roles = {
  admin: "575994137292046337"
};

client.on("ready", async () => {
  console.log(`Logged in as ${client.user.tag}!`);
  client.user.setActivity("Peppa Pig 4D", { type: "WATCHING" });

  await refreshCache();
});

client.on("message", handleMessage);

client.on("messageUpdate", async (oldMessage, newMessage) => {
  await handleMessage(newMessage);
});

async function handleMessage(message) {
  let { id } = message.channel;

  if (id === picChannel) {
    return await refreshCache();
  }
}

client.login(process.env.DISCORD_TOKEN);

async function refreshCache() {
  let messages = await getMessages(picChannel);

  cache = messages;

  return cache;
}

async function getMessages(id) {
  let channel = client.channels.get(id);
  let messages = await channel.fetchMessages();

  let pics = [];

  let attachments = messages
    .map(message => {
      let attachments = message.attachments.array();

      let files = attachments.map(attachment => attachment.url);

      return {
        message,
        files
      };
    })
    .filter(({ files }) => files.length > 0);

  for (let attachment of attachments) {
    for (let file of attachment.files) {
      let {
        message: { createdTimestamp, author, content }
      } = attachment;

      pics.push(
        new Pic({
          timestamp: createdTimestamp,
          author: author.username,
          caption: content,
          url: file
        })
      );
    }
  }

  cache = pics;

  return pics;
}

async function getPics() {
  return cache;
}