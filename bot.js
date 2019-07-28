require("dotenv").config();
const Discord = require("discord.js");
const client = new Discord.Client();

const targetChannel = "575993879837409290";

const db = require("./firestore");
const firestore = require("firebase-admin").firestore;
const http = require("http");

const server = http.createServer((req, res) => {
  res.writeHead(302, {
    Location: "https://discord.gg/4hEnTpd"
  });
  return res.end();
});

client.on("ready", async () => {
  console.log(`Logged in as ${client.user.tag}!`);
  client.user.setActivity("Peppa Pig 4D", { type: "WATCHING" });
  await updateDatabase();
});

client.on("message", handleMessage);

client.on("messageUpdate", async (oldMessage, newMessage) => {
  await handleMessage(newMessage);
});

client.on("messageReactionAdd", async reaction => incrementReaction(reaction, 1));

client.on("messageReactionRemove", async reaction => incrementReaction(reaction, -1));

/**
 * 
 * @param {Discord.MessageReaction} reaction 
 * @param {number} step
 * 
 * @returns {Promise<void>}
 */
async function incrementReaction(reaction, step) {
  let data = {};
  let {emoji, message} = reaction;

  data["reactions." + emoji.toString()] = firestore.FieldValue.increment(step);

  db.collection("posts")
    .doc(message.id)
    .update(data);
}

client.on("messageReactionRemoveAll", async message => {
  db.collection("posts")
    .doc(message.id)
    .update({
      reactions: {}
    });
});

/**
 *
 * @param {Discord.Message} message
 * @returns {Promise<void>}
 */
async function handleMessage(message) {
  console.log("GOT MESSAGE!");
  if (message.channel === targetChannel) {
    return await updateDatabase();
  }
}

/**
 * @returns {Promise<void>}
 */
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
      let { reactions, content, author, createdTimestamp } = message;

      let attachments = message.attachments.array().map(attachment => {
        return attachment.url;
      });

      let data = {
        content,
        author: author.id,
        attachments,
        timestamp: new Date(createdTimestamp),
        reactions: parseReactions(reactions)
      };

      docsToBeDeleted[message.id] = false;

      authors[author.id] = {
        username: author.username,
        avatar: author.avatar,
        id: author.id,
        avatar_url: `https://cdn.discordapp.com/avatars/${message.author.id}/${
          message.author.avatar
        }.png?size=256`
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

/**
 *
 * @param {Discord.Snowflake} channelId
 * @returns {Promise<Discord.Collection<Discord.Snowflake, Discord.Message>>}
 */
async function getMessages(channelId) {
  let channel = client.channels.get(channelId);
  let messages = await channel.fetchMessages();

  return messages;
}

/**
 *
 * @param {Discord.Collection<Discord.Snowflake, Discord.MessageReaction>} reactions
 */
function parseReactions(reactions) {
  return reactions.reduce((result, reaction, index, array) => {
    result[reaction.emoji.toString()] = reaction.count;
    return result;
  }, {});
}

client.login(process.env.DISCORD_TOKEN);
server.listen(process.env.PORT || 8080);

console.log(`Listening on port ${process.env.PORT || 8080}`);
