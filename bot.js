require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  EmbedBuilder,
} = require("discord.js");

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = "1336732532816740363";
const API_KEY = process.env.API_KEY;
const ATTENDEE_API_URL = process.env.ATTENDEE_API_URL;

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

// Define the /hello command
const commands = [
  new SlashCommandBuilder()
    .setName("refer")
    .setDescription(
      "Refer friends to Scrapyard Silicon Valley and get rewarded! Details in #refer"
    ),
].map((command) => command.toJSON());

// Register the slash command
const rest = new REST({ version: "10" }).setToken(TOKEN);
async function registerCommands() {
  try {
    console.log("Registering slash command...");
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    console.log("Slash command registered!");
  } catch (error) {
    console.error(error);
  }
}

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`);
  registerCommands();
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  if (interaction.commandName === "refer") {
    try {
      // Defer the reply as ephemeral (only visible to the command user)
      await interaction.deferReply({ ephemeral: true });

      const response = await fetch(ATTENDEE_API_URL, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }

      const data = await response.json();

      // Handle the API response here
      for (const attendee of data) {
        if (attendee.organizerNotes.discord === interaction.user.id) {
          console.log("Found user:", attendee.fullName);
          const refers = attendee.organizerNotes.refers;
          // console.log("Refers:", refers);

          // Remove duplicates from refers array
          const uniqueRefers = [...new Set(refers)];

          const embed = new EmbedBuilder()
            .setColor(0x477b78)
            .setTitle("Referral Status")
            .setDescription(
              `Hey there! You can view your referral status below. You'll find more information about this in <#1342391547538444319>.`
            )
            .addFields({
              name: "Refers",
              value: `${uniqueRefers.length}`,
              inline: true,
            })
            .addFields({
              name: "Share this link to refer friends!",
              value: `https://scrapyard.hackclub.com/silicon-valley?refer=${attendee.id}`,
              inline: false,
            })
            .addFields({
              name: "",
              value: `Make sure your friends use the link above and sign up on the website! We will not be able to count their referral if they don't sign up on the website with your referral link.`,
              inline: false,
            })
            .addFields({
              name: "",
              value:
                "Please note that refers will only be officially counted if the attendee shows up for the event. More details in <#1342391547538444319>.",
              inline: false,
            })
            .setTimestamp();

          await interaction.editReply({
            content: `Howdy, **${attendee.preferredName}**!`,
            embeds: [embed],
          });
          return;
        }
      }

      await interaction.editReply({
        content:
          "You need to verify your Discord first! Check <#1341937729163886663> for instructions on how to do so.",
        ephemeral: true,
      });
    } catch (error) {
      console.error("API Error:", error);
      await interaction.editReply({
        content:
          "Looks like *someone* messed up. I'm going to ping <@773996537414942763> to fix this. Hopefully it'll be fixed soon!",
        ephemeral: true,
      });
      await interaction.channel.send(
        "<@773996537414942763> i broke :skull:\npls fix me :pray:"
      );
    }
  }
});

client.login(TOKEN);
