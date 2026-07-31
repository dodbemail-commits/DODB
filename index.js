import { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    ChannelType, 
    PermissionFlagsBits, 
    ButtonBuilder, 
    ButtonStyle 
} from 'discord.js';
import http from 'http';

const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot is running!');
}).listen(PORT, () => {
    console.log(`[HTTP] Server is listening on port ${PORT}`);
});

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] 
});

const STAFF_ROLE_ID = '1528086960042803390';

client.once('ready', async () => {
    console.log(`[READY] Logged in as ${client.user.tag}`);

    const channelId = '1528087138225229954';
    
    try {
        const channel = await client.channels.fetch(channelId);

        if (!channel) {
            console.error(`[ERROR] Channel ID ${channelId} not found.`);
            return;
        }

        const messages = await channel.messages.fetch({ limit: 10 });
        const existingPanel = messages.find(m => m.author.id === client.user.id && m.components.length > 0);

        if (!existingPanel) {
            const ticketEmbed = new EmbedBuilder()
                .setColor('#8A2BE2')
                .setTitle('DO')
                .addFields(
                    {
                        name: 'Buying/Free access',
                        value: 'Choose this option if you want to purchase a paid access role. Staff will help you either get ranked or pay in the right way!'
                    },
                    {
                        name: 'Report Tickets',
                        value: 'Use this option to report anyone breaking rules or causing issues. Please have proof ready so staff, higher-ups, and reviewers can properly look into the situation.'
                    },
                    {
                        name: 'Question Ticket',
                        value: 'Choose this option if u want to ask a question or want to know if someone if ok to or not'
                    }
                );

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('ticket_select_menu')
                .setPlaceholder('Select a ticket option...')
                .addOptions([
                    {
                        label: 'Buying/Free access',
                        description: 'Purchase a paid access role',
                        value: 'buying_access',
                    },
                    {
                        label: 'Report Tickets',
                        description: 'Report someone breaking rules',
                        value: 'report_ticket',
                    },
                    {
                        label: 'Question Ticket',
                        description: 'Ask a question',
                        value: 'question_ticket',
                    },
                ]);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await channel.send({
                embeds: [ticketEmbed],
                components: [row]
            });
            
            console.log('[SUCCESS] Ticket panel successfully deployed!');
        } else {
            console.log('[INFO] Panel already exists in the channel.');
        }
    } catch (error) {
        console.error('[ERROR] Failed to deploy panel:', error);
    }
});

// Step 1: When user selects a menu option, pop up a modal asking for a reason
client.on('interactionCreate', async interaction => {
    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_select_menu') {
        const selectedValue = interaction.values[0];

        // Check if user already has an open ticket channel in the guild
        const existingChannel = interaction.guild.channels.cache.find(
            c => c.topic === `ticket-owner-${interaction.user.id}`
        );

        if (existingChannel) {
            return interaction.reply({ 
                content: `❌ You already have an open ticket: ${existingChannel}. Please close it before opening a new one.`, 
                ephemeral: true 
            });
        }

        const modal = new ModalBuilder()
            .setCustomId(`ticket_modal_${selectedValue}`)
            .setTitle('DO Ticket Support');

        const reasonInput = new TextInputBuilder()
            .setCustomId('ticket_reason_input')
            .setLabel('Please type your reason for opening a ticket:')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMaxLength(1000);

        modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
        await interaction.showModal(modal);
        return;
    }

    // Step 2: Handle modal submission and create the ticket
    if (interaction.isModalSubmit() && interaction.customId.startsWith('ticket_modal_')) {
        const selectedValue = interaction.customId.replace('ticket_modal_', '');
        const reason = interaction.fields.getTextInputValue('ticket_reason_input');

        await interaction.deferReply({ ephemeral: true });

        const guild = interaction.guild;
        const member = interaction.member;

        // Double check open ticket count upon submission
        const existingChannel = guild.channels.cache.find(
            c => c.topic === `ticket-owner-${member.id}`
        );

        if (existingChannel) {
            return interaction.editReply({ content: `❌ You already have an open ticket: ${existingChannel}.` });
        }

        let ticketTypeFormatted = 'SUPPORT';
        if (selectedValue === 'buying_access') ticketTypeFormatted = 'BUYING ACCESS';
        else if (selectedValue === 'report_ticket') ticketTypeFormatted = 'REPORT TICKET';
        else if (selectedValue === 'question_ticket') ticketTypeFormatted = 'QUESTION TICKET';

        try {
            let category = guild.channels.cache.find(c => c.name === 'TICKETS' && c.type === ChannelType.GuildCategory);
            if (!category) {
                category = await guild.channels.create({
                    name: 'TICKETS',
                    type: ChannelType.GuildCategory,
                });
            }

            // Set permissions: only staff role & user & bot can view. @everyone denied.
            const ticketChannel = await guild.channels.create({
                name: `${selectedValue}-${member.user.username}`,
                type: ChannelType.GuildText,
                parent: category.id,
                topic: `ticket-owner-${member.id}`,
                permissionOverwrites: [
                    {
                        id: guild.id,
                        deny: [PermissionFlagsBits.ViewChannel],
                    },
                    {
                        id: member.id,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
                    },
                    {
                        id: STAFF_ROLE_ID,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageMessages],
                    },
                    {
                        id: client.user.id,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels],
                    },
                ],
            });

            const ticketEmbed = new EmbedBuilder()
                .setColor('#8A2BE2')
                .setTitle('DO Ticket Support')
                .setDescription(`Hello ${member},\nThank you for opening a ticket! Staff will be with you shortly.\n\n**Category:** ${ticketTypeFormatted}\n**Reason provided:**\n> ${reason}`);

            const actionRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('ticket_claim')
                    .setLabel('Claim')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('✋'),
                new ButtonBuilder()
                    .setCustomId('ticket_close')
                    .setLabel('Close Ticket')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🔒')
            );

            await ticketChannel.send({
                content: `${member} <@&${STAFF_ROLE_ID}>`,
                embeds: [ticketEmbed],
                components: [actionRow]
            });

            await interaction.editReply({ content: `Your ticket has been created: ${ticketChannel}` });
        } catch (error) {
            console.error('[ERROR] Failed to create ticket channel:', error);
            await interaction.editReply({ content: 'There was an error creating your ticket. Please contact an admin.' });
        }
    }

    // Step 3: Handle Button Actions (Claim / Close)
    if (interaction.isButton() && (interaction.customId === 'ticket_claim' || interaction.customId === 'ticket_close')) {
        const member = interaction.member;
        
        // Check if member has the staff role or is administrator
        const hasStaffRole = member.roles.cache.has(STAFF_ROLE_ID) || member.permissions.has(PermissionFlagsBits.Administrator);

        if (!hasStaffRole) {
            return interaction.reply({ content: '❌ Only staff members with the required role or higher can claim or close tickets.', ephemeral: true });
        }

        if (interaction.customId === 'ticket_claim') {
            const message = interaction.message;
            const currentEmbed = message.embeds[0];

            // Check if already claimed by looking at button state
            const claimButton = message.components[0].components.find(c => c.customId === 'ticket_claim');
            if (claimButton && claimButton.data.disabled) {
                return interaction.reply({ content: '❌ This ticket has already been claimed!', ephemeral: true });
            }

            // Disable claim button and turn it secondary (gray), keep close button red
            const updatedClaimButton = new ButtonBuilder()
                .setCustomId('ticket_claim')
                .setLabel('Claimed')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('✋')
                .setDisabled(true);

            const closeButton = new ButtonBuilder()
                .setCustomId('ticket_close')
                .setLabel('Close Ticket')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🔒');

            const updatedRow = new ActionRowBuilder().addComponents(updatedClaimButton, closeButton);

            await message.edit({
                embeds: [currentEmbed],
                components: [updatedRow]
            });

            // Send gray embed notification message that the user claimed it
            const claimedEmbed = new EmbedBuilder()
                .setColor('#2F3136') // Dark gray / neutral tone
                .setDescription(`${member} Claimed The Ticket`);

            await interaction.channel.send({ embeds: [claimedEmbed] });
            await interaction.reply({ content: '✅ You have successfully claimed this ticket.', ephemeral: true });

        } else if (interaction.customId === 'ticket_close') {
            await interaction.reply({ content: '🔒 Closing ticket in 3 seconds...' });
            setTimeout(async () => {
                try {
                    await interaction.channel.delete();
                } catch (err) {
                    console.error('Failed to delete channel:', err);
                }
            }, 3000);
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
