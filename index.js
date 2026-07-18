import 'dotenv/config';
import {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
  Events,
  TextChannel,
} from 'discord.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';

// ─── Config ───────────────────────────────────────────────────────────────────
const TICKET_PANEL_CHANNEL_ID = '1528087138225229954';
const STAFF_ROLE_ID = '1528086960042803390';

// ─── Persistence ──────────────────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'tickets.json');

function loadTickets() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Failed to load tickets.json:', e);
  }
  return {};
}

function saveTickets(tickets) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(tickets, null, 2));
  } catch (e) {
    console.error('Failed to save tickets.json:', e);
  }
}

let openTickets = loadTickets();

// ─── Keep-alive HTTP server (required for Render web services) ────────────────
const PORT = process.env.PORT || 3000;
createServer((_, res) => {
  res.writeHead(200);
  res.end('Bot is running.');
}).listen(PORT, () => {
  console.log(`✅ HTTP keep-alive listening on port ${PORT}`);
});

// ─── Client ───────────────────────────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
  ],
});

// ─── Ready ────────────────────────────────────────────────────────────────────
client.once(Events.ClientReady, async (c) => {
  console.log(`✅ Logged in as ${c.user.tag}`);

  c.user.setPresence({
    activities: [{ name: 'DO On Top', type: 0 }],
    status: 'online',
  });

  await sendTicketPanel();
});

// ─── Send ticket panel ────────────────────────────────────────────────────────
async function sendTicketPanel() {
  try {
    const channel = await client.channels.fetch(TICKET_PANEL_CHANNEL_ID);
    if (!channel || !(channel instanceof TextChannel)) {
      console.error('❌ Could not find ticket panel channel:', TICKET_PANEL_CHANNEL_ID);
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x9B59B6)
      .setDescription(
        '** # __DO__ **\n\n' +
        '**Buying/Free access**\n' +
        'Choose this option if you want to purchase a paid access role. Staff will help you either get ranked or pay in the right way!\n\n' +
        '**Report Tickets**\n' +
        'Use this option to report anyone breaking rules or causing issues. Please have proof ready so staff, higher-ups, and reviewers can properly look into the situation.\n\n' +
        '**Question Ticket**\n' +
        'Choose this option if u want to ask a question or want to know if someone if ok to or not'
      )
      .setImage('https://cdn.discordapp.com/attachments/1528087128112763011/1528111148069814323/62fe53cab2b2481a063654faa9fc4c6c.webp?ex=6a5d1be8&is=6a5bca68&hm=09de90bda87120f4566764bd899a5bee02076c8f2ac3ce62d97a03027d5b5b29&')
      .setFooter({ text: 'DO Management • Ticket System' })
      .setTimestamp();

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('ticket_select')
      .setPlaceholder('Select a ticket option...')
      .addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel('💵 Cash Ticket (All Payment Methods)')
          .setDescription('Open a Cash ticket.')
          .setValue('cash_ticket'),
        new StringSelectMenuOptionBuilder()
          .setLabel('🎮 Robux Ticket')
          .setDescription('Open a Robux ticket.')
          .setValue('robux_ticket'),
      );

    const row = new ActionRowBuilder().addComponents(selectMenu);

    await channel.send({ embeds: [embed], components: [row] });
    console.log('✅ Ticket panel sent to channel', TICKET_PANEL_CHANNEL_ID);
  } catch (err) {
    console.error('❌ Failed to send ticket panel:', err);
  }
}

// ─── Staff permission check ───────────────────────────────────────────────────
async function hasStaffPermission(member) {
  const staffRole =
    member.guild.roles.cache.get(STAFF_ROLE_ID) ??
    (await member.guild.roles.fetch(STAFF_ROLE_ID));
  if (!staffRole) return false;
  return member.roles.cache.some((role) => role.position >= staffRole.position);
}

// ─── Interactions ─────────────────────────────────────────────────────────────
client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_select') {
      await handleTicketCreate(interaction);
      return;
    }

    if (interaction.isButton()) {
      if (interaction.customId.startsWith('claim_')) await handleClaim(interaction);
      else if (interaction.customId.startsWith('close_')) await handleClose(interaction);
    }
  } catch (err) {
    console.error('Interaction error:', err);
  }
});

// ─── Create ticket ────────────────────────────────────────────────────────────
async function handleTicketCreate(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const userId = interaction.user.id;

  if (openTickets[userId]) {
    const existingId = openTickets[userId];
    try {
      await interaction.guild.channels.fetch(existingId);
      await interaction.editReply({
        content:
          `❌ You already have an open ticket! → <#${existingId}>\n` +
          `Please wait until your current ticket is closed before opening a new one.`,
      });
      return;
    } catch {
      delete openTickets[userId];
      saveTickets(openTickets);
    }
  }

  const isRobux = interaction.values[0] === 'robux_ticket';
  const ticketLabel = isRobux ? 'Robux' : 'Cash';
  const ticketPrefix = isRobux ? 'robux' : 'cash';
  const ticketEmoji = isRobux ? '🎮' : '💵';

  const guild = interaction.guild;
  const safeUsername = interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20);

  const ticketChannel = await guild.channels.create({
    name: `${ticketPrefix}-${safeUsername}`,
    type: ChannelType.GuildText,
    permissionOverwrites: [
      { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
      {
        id: userId,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
        ],
      },
      {
        id: STAFF_ROLE_ID,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
        ],
      },
      {
        id: client.user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ManageChannels,
          PermissionFlagsBits.ReadMessageHistory,
        ],
      },
    ],
  });

  openTickets[userId] = ticketChannel.id;
  saveTickets(openTickets);

  const ticketEmbed = new EmbedBuilder()
    .setColor(0x9B59B6)
    .setTitle(`${ticketEmoji} ${ticketLabel} Ticket`)
    .setDescription(
      `Welcome ${interaction.user}! 👋\n\n` +
      `Thank you for opening a **${ticketLabel} Ticket**.\n` +
      `A member of **DO Management** will be with you shortly!\n\n` +
      `**Please share:**\n` +
      `• What you'd like to purchase\n` +
      `• Your payment details / budget\n` +
      `• Any other relevant information\n\n` +
      `*Do not ping staff repeatedly — we'll get to you as soon as possible!*`
    )
    .setFooter({ text: 'DO Management • Ticket System' })
    .setTimestamp();

  const claimBtn = new ButtonBuilder()
    .setCustomId(`claim_${userId}`)
    .setLabel('Claim')
    .setStyle(ButtonStyle.Success)
    .setEmoji('✋');

  const closeBtn = new ButtonBuilder()
    .setCustomId(`close_${userId}`)
    .setLabel('Close')
    .setStyle(ButtonStyle.Danger)
    .setEmoji('🔒');

  const buttonRow = new ActionRowBuilder().addComponents(claimBtn, closeBtn);

  await ticketChannel.send({
    content: `<@${userId}> | <@&${STAFF_ROLE_ID}>`,
    embeds: [ticketEmbed],
    components: [buttonRow],
  });

  await interaction.editReply({
    content: `✅ Your ${ticketLabel} ticket has been created! → <#${ticketChannel.id}>`,
  });
}

// ─── Claim ticket ─────────────────────────────────────────────────────────────
async function handleClaim(interaction) {
  const member = interaction.member;

  if (!(await hasStaffPermission(member))) {
    await interaction.reply({
      content: '❌ You do not have permission to claim tickets.',
      ephemeral: true,
    });
    return;
  }

  const userId = interaction.customId.replace('claim_', '');
  const claimedBtn = new ButtonBuilder()
    .setCustomId(`claim_${userId}`)
    .setLabel('Claimed')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('✋')
    .setDisabled(true);

  const closeBtn = new ButtonBuilder()
    .setCustomId(`close_${userId}`)
    .setLabel('Close')
    .setStyle(ButtonStyle.Danger)
    .setEmoji('🔒');

  const updatedRow = new ActionRowBuilder().addComponents(claimedBtn, closeBtn);

  await interaction.update({ components: [updatedRow] });

  const claimEmbed = new EmbedBuilder()
    .setColor(0x2ECC71)
    .setDescription(
      `✋ **Ticket Claimed!**\n\n` +
      `This ticket has been claimed by ${interaction.user}.\n` +
      `They will be assisting you shortly!`
    )
    .setTimestamp();

  await interaction.followUp({ embeds: [claimEmbed] });
}

// ─── Close ticket ─────────────────────────────────────────────────────────────
async function handleClose(interaction) {
  const member = interaction.member;

  if (!(await hasStaffPermission(member))) {
    await interaction.reply({
      content: '❌ You do not have permission to close tickets.',
      ephemeral: true,
    });
    return;
  }

  const userId = interaction.customId.replace('close_', '');

  const closeEmbed = new EmbedBuilder()
    .setColor(0xE74C3C)
    .setDescription(
      `🔒 **Ticket Closing**\n\n` +
      `This ticket is being closed by ${interaction.user}.\n` +
      `The channel will be deleted in **5 seconds**.`
    )
    .setTimestamp();

  await interaction.reply({ embeds: [closeEmbed] });

  delete openTickets[userId];
  saveTickets(openTickets);

  setTimeout(async () => {
    try {
      await interaction.channel?.delete();
    } catch (err) {
      console.error('Failed to delete ticket channel:', err);
    }
  }, 5000);
}

// ─── Login ────────────────────────────────────────────────────────────────────
const token = process.env.DISCORD_BOT_TOKEN;
if (!token) {
  console.error('❌ DISCORD_BOT_TOKEN is not set. Add it to your .env file.');
  process.exit(1);
}

client.login(token);