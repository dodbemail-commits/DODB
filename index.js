import { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ChannelType, PermissionFlagsBits, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
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

// Minimum staff role ID required to claim/close tickets
const STAFF_ROLE_ID = '1528086960042803390';

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

// Interaction handler
client.on('interactionCreate', async interaction => {
    // Step 1: When user selects from the main dropdown, check if they already have an active ticket channel
    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_select') {
        const guild = interaction.guild;
        const member = interaction.member;

        // Check if an existing text channel name contains the member's username or if they already have an open ticket
        const existingChannel = guild.channels.cache.find(c => 
            c.type === ChannelType.GuildText && 
            (c.name.includes(`buying-${member.user.username.toLowerCase()}`) || 
             c.name.includes(`report-${member.user.username.toLowerCase()}`) || 
             c.name.includes(`question-${member.user.username.toLowerCase()}`))
        );

        if (existingChannel) {
            return interaction.reply({ 
                content: `You already have an open ticket here: ${existingChannel}. Please close it before opening a new one.`, 
                ephemeral: true 
            });
        }

        const selectedValue = interaction.values[0];

        const modal = new ModalBuilder()
            .setCustomId(`ticket_modal_${selectedValue}`)
            .setTitle('Ticket Reason');

        const reasonInput = new TextInputBuilder()
            .setCustomId('ticket_reason_input')
            .setLabel('Please describe the reason for your ticket:')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Type your reason here...')
            .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
        await interaction.showModal(modal);
        return;
    }

    // Step 2: Handle modal submission and create channel
    if (interaction.isModalSubmit() && interaction.customId.startsWith('ticket_modal_')) {
        const selectedValue = interaction.customId.replace('ticket_modal_', '');
        const reason = interaction.fields.getTextInputValue('ticket_reason_input');
        const guild = interaction.guild;
        const member = interaction.member;

        let ticketName = 'ticket';
        if (selectedValue === 'buying_ticket') ticketName = `buying-${member.user.username.toLowerCase()}`;
        if (selectedValue === 'report_ticket') ticketName = `report-${member.user.username.toLowerCase()}`;
        if (selectedValue === 'question_ticket') ticketName = `question-${member.user.username.toLowerCase()}`;

        try {
            await interaction.deferReply({ ephemeral: true });

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

            // Action row with Claim and Close buttons
            const actionRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('claim_ticket')
                    .setLabel('Claim')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('✋'),
                new ButtonBuilder()
                    .setCustomId('close_ticket')
                    .setLabel('Close Ticket')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🔒')
            );

            const ticketEmbed = new EmbedBuilder()
                .setTitle('OTB Ticket Support')
                .setColor(0xFFA500)
                .setDescription(
                    `Hello ${member},\nThank you for opening a ticket! Staff will be with you shortly.\n\n` +
                    `**Category:** ${selectedValue.replace('_', ' ').toUpperCase()}\n` +
                    `**Reason provided:**\n> ${reason}`
                );

            // Ping the user who opened the ticket alongside the staff role
            await ticketChannel.send({ 
                content: `${member} | <@&${STAFF_ROLE_ID}>`, 
                embeds: [ticketEmbed], 
                components: [actionRow] 
            });

            await interaction.editReply({
                content: `Your ticket has been created: ${ticketChannel}`
            });
        } catch (error) {
            console.error('Error creating ticket channel:', error);
            if (interaction.deferred) {
                await interaction.editReply({ content: `There was an error creating your ticket channel: \`${error.message}\`` });
            } else {
                await interaction.reply({ content: `There was an error creating your ticket channel: \`${error.message}\``, ephemeral: true });
            }
        }
    }

    // Step 3: Handle Button Actions (Claim / Close)
    if (interaction.isButton()) {
        const member = interaction.member;

        // Check if member has the staff role ID or higher/administrator permissions
        const hasStaffRole = member.roles.cache.has(STAFF_ROLE_ID) || member.permissions.has(PermissionFlagsBits.Administrator);

        if (interaction.customId === 'claim_ticket') {
            if (!hasStaffRole) {
                return interaction.reply({ content: 'Only staff members with the designated role or higher can claim tickets!', ephemeral: true });
            }

            // Update button to gray (Secondary) and disabled "Claimed"
            const updatedRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('claimed_disabled')
                    .setLabel('Claimed')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true)
                    .setEmoji('✅'),
                new ButtonBuilder()
                    .setCustomId('close_ticket')
                    .setLabel('Close Ticket')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🔒')
            );

            await interaction.update({ components: [updatedRow] });

            // Send gray/neutral embed saying user claimed the ticket
            const claimedEmbed = new EmbedBuilder()
                .setColor(0x808080) // Gray embed
                .setDescription(`🔒 <@${member.id}> Claimed The Ticket`);

            await interaction.channel.send({ embeds: [claimedEmbed] });
            return;
        }

        if (interaction.customId === 'close_ticket') {
            if (!hasStaffRole) {
                return interaction.reply({ content: 'Only staff members with the designated role or higher can close tickets!', ephemeral: true });
            }

            await interaction.reply({ content: 'Closing ticket in 5 seconds...', ephemeral: false });
            setTimeout(async () => {
                try {
                    await interaction.channel.delete();
                } catch (err) {
                    console.error('Failed to delete channel:', err);
                }
            }, 5000);
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
