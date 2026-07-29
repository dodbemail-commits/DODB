import { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ChannelType, PermissionFlagsBits, ButtonBuilder, ButtonStyle } from 'discord.js';
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

        const embed = new EmbedBuilder()
            .setTitle('OTB')
            .setColor(0xFFA500)
            .setDescription(
                '**Buying/Free access**\n' +
                'Choose this option if you want to purchase a paid access role. Staff will help you either get ranked or pay in the right way!\n\n' +
                '**Report Tickets**\n' +
                'Use this option to report anyone breaking rules or causing issues. Please have proof ready so staff, higher-ups, and reviewers can properly look into the situation.\n\n' +
                '**Question Ticket**\n' +
                'Choose this option if u want to ask a question or want to know if someone if ok to or not'
            );

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
                    }
                ])
        );

        await channel.send({ embeds: [embed], components: [row] });
        console.log('Ticket panel successfully sent!');
    } catch (error) {
        console.error('Error sending ticket panel:', error);
    }
});

// Interaction handler for opening and closing tickets
client.on('interactionCreate', async interaction => {
    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_select') {
        const selectedValue = interaction.values[0];
        const guild = interaction.guild;
        const member = interaction.member;

        let ticketName = 'ticket';
        if (selectedValue === 'buying_ticket') ticketName = `buying-${member.user.username}`;
        if (selectedValue === 'report_ticket') ticketName = `report-${member.user.username}`;
        if (selectedValue === 'question_ticket') ticketName = `question-${member.user.username}`;

        try {
            const ticketChannel = await guild.channels.create({
                name: ticketName,
                type: ChannelType.GuildText,
                permissionOverwrites: [
                    {
                        id: guild.id,
                        deny: [PermissionFlagsBits.ViewChannel]
                    },
                    {
                        id: member.id,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
                    },
                    {
                        id: client.user.id,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels]
                    }
                ]
            });

            const closeButton = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('close_ticket')
                    .setLabel('Close Ticket')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🔒')
            );

            const ticketEmbed = new EmbedBuilder()
                .setTitle('OTB Ticket Support')
                .setColor(0xFFA500)
                .setDescription(`Hello ${member},\nThank you for opening a ticket! Staff will be with you shortly.\n\nReason: **${selectedValue.replace('_', ' ').toUpperCase()}**`);

            await ticketChannel.send({ content: `${member}`, embeds: [ticketEmbed], components: [closeButton] });

            await interaction.reply({
                content: `Your ticket has been created: ${ticketChannel}`,
                ephemeral: true
            });
        } catch (error) {
            console.error('Error creating ticket channel:', error);
            await interaction.reply({
                content: `There was an error creating your ticket channel: \`${error.message}\``,
                ephemeral: true
            });
        }
    }

    if (interaction.isButton() && interaction.customId === 'close_ticket') {
        await interaction.reply({ content: 'Closing ticket in 5 seconds...', ephemeral: false });
        setTimeout(async () => {
            try {
                await interaction.channel.delete();
            } catch (err) {
                console.error('Failed to delete channel:', err);
            }
        }, 5000);
    }
});

client.login(process.env.DISCORD_TOKEN);
