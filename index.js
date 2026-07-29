import { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ChannelType } from 'discord.js';
import express from 'express';

// Setup Express web server for Render
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('OTB Ticket Bot is alive and running!');
});

app.listen(port, () => {
    console.log(`Web server listening on port ${port}`);
});

// Setup Discord Bot client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers
    ]
});

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);

    try {
        const channelId = '1528087138225229954';
        const channel = await client.channels.fetch(channelId);

        if (!channel || channel.type !== ChannelType.GuildText) {
            console.error('Target channel not found or is not a text channel.');
            return;
        }

        // Create the orange embed matching the layout (OTB, no footer)
        const embed = new EmbedBuilder()
            .setTitle('OTB')
            .setColor(0xFFA500) // Orange color
            .setDescription(
                '**Buying/Free access**\n' +
                'Choose this option if you want to purchase a paid access role. Staff will help you either get ranked or pay in the right way!\n\n' +
                '**Report Tickets**\n' +
                'Use this option to report anyone breaking rules or causing issues. Please have proof ready so staff, higher-ups, and reviewers can properly look into the situation.\n\n' +
                '**Question Ticket**\n' +
                'Choose this option if u want to ask a question or want to know if someone if ok to or not'
            );

        // Create the select menu containing all options
        const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('ticket_select')
                .setPlaceholder('Select a ticket option...')
                .addOptions([
                    {
                        label: 'Buying/Free access',
                        description: 'Purchase paid access role or get ranked.',
                        value: 'buying_ticket',
                        emoji: '🛒'
                    },
                    {
                        label: 'Report Tickets',
                        description: 'Report rules breakers or issues with proof.',
                        value: 'report_ticket',
                        emoji: '⚠️'
                    },
                    {
                        label: 'Question Ticket',
                        description: 'Ask a question or check status.',
                        value: 'question_ticket',
                        emoji: '❓'
                    },
                    {
                        label: 'Cash Ticket (All Payment Methods)',
                        description: 'Open a Cash ticket.',
                        value: 'cash_ticket',
                        emoji: '💵'
                    },
                    {
                        label: 'Robux Ticket',
                        description: 'Open a Robux ticket.',
                        value: 'robux_ticket',
                        emoji: '🎮'
                    }
                ])
        );

        await channel.send({ embeds: [embed], components: [row] });
        console.log('Ticket panel successfully sent!');
    } catch (error) {
        console.error('Error sending ticket panel:', error);
    }
});

// Basic interaction handler
client.on('interactionCreate', async interaction => {
    if (!interaction.isStringSelectMenu()) return;
    if (interaction.customId === 'ticket_select') {
        const selectedValue = interaction.values[0];
        await interaction.reply({
            content: `You selected: **${selectedValue}**. Ticket creation logic goes here!`,
            ephemeral: true
        });
    }
});

client.login(process.env.DISCORD_TOKEN);
