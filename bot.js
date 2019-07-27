require("dotenv").config();
const Discord = require("discord.js");
const client = new Discord.Client();

const targetChannel = "575993879837409290";

const db = require("./firestore");

client.on("ready", async () => {
  console.log(`Logged in as ${client.user.tag}!`);
  client.user.setActivity("Peppa Pig 4D", { type: "WATCHING" });
  await updateDatabase();
});

client.on("message", handleMessage);

client.on("messageUpdate", async (oldMessage, newMessage) => {
  await handleMessage(newMessage);
});

async function handleMessage(message) {
  console.log("GOT MESSAGE!");
  if (message.channel === targetChannel) {
    return await updateDatabase();
  }
}

async function updateDatabase() {
  let messages = await getMessages(targetChannel);

  let docsToBeDeleted = {};

  let authors = {};

  await db
    .collection("posts")
    .get()
    .then(snapshot => {
      snapshot.forEach(doc => {
        docsToBeDeleted[doc.id] = true;
      });
    });

  await Promise.all(
    messages.map(message => {
      let attachments = message.attachments.array().map(attachment => {
        return attachment.url;
      });

      let data = {
        content: message.content,
        author: message.author.id,
        attachments,
        timestamp: new Date(message.createdTimestamp)
      };

      docsToBeDeleted[message.id] = false;

      authors[message.author.id] = {
        username: message.author.username,
        avatar: message.author.avatar,
        id: message.author.id,
        avatar_url: `https://cdn.discordapp.com/avatars/${message.author.id}/${message.author.avatar}.png?size=256`
      };

      return db
        .collection("posts")
        .doc(message.id)
        .set(data);
    })
  );

  await Promise.all([
    ...Object.entries(authors).map(entry => {
      let [id, author] = entry;

      return db
        .collection("authors")
        .doc(id)
        .set(author);
    }),
    ...Object.entries(docsToBeDeleted).map(entry => {
      if (entry[1]) {
        return db
          .collection("posts")
          .doc(entry[0])
          .delete();
      }
    })
  ]);
}

async function getMessages(channelId) {
  let channel = client.channels.get(channelId);
  let messages = await channel.fetchMessages();

  return messages;
}

client.login(process.env.DISCORD_TOKEN);
