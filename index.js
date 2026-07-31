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
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMembers] 
});

const STAFF_ROLE_ID = '1528086960042803390';
const VERIFY_CHANNEL_ID = '1528087160790581368';
const UNVERIFIED_ROLE_ID = '1532817646591017261';
const VERIFIED_ROLE_ID = '1532817700886155415';

// Store active math questions for users in memory: { userId: { num1, num2, answer } }
const activeQuizQuestions = new Map();

client.once('ready', async () => {
    console.log(`[READY] Logged in as ${client.user.tag}`);

    const ticketChannelId = '1528087138225229954';
    
    try {
        // 1. Deploy Ticket Panel
        const ticketChannel = await client.channels.fetch(ticketChannelId);
        if (ticketChannel) {
            const messages = await ticketChannel.messages.fetch({ limit: 10 });
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

                await ticketChannel.send({
                    embeds: [ticketEmbed],
                    components: [row]
                });
                console.log('[SUCCESS] Ticket panel successfully deployed!');
            }
        }

        // 2. Deploy Verify Panel
        const verifyChannel = await client.channels.fetch(VERIFY_CHANNEL_ID);
        if (verifyChannel) {
            const verifyMessages = await verifyChannel.messages.fetch({ limit: 10 });
            const existingVerifyPanel = verifyMessages.find(m => m.author.id === client.user.id && m.components.length > 0);

            if (!existingVerifyPanel) {
                const verifyEmbed = new EmbedBuilder()
                    .setColor('#8A2BE2')
                    .setTitle('DO Verification')
                    .setDescription('Welcome to the server! Click the button below to start your verification process and gain access.');

                const verifyButtonRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('start_verification')
                        .setLabel('Verify')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('✅')
                );

                await verifyChannel.send({
                    embeds: [verifyEmbed],
                    components: [verifyButtonRow]
                });
                console.log('[SUCCESS] Verify panel successfully deployed!');
            }
        }

    } catch (error) {
        console.error('[ERROR] Failed to deploy panels:', error);
    }
});

// Event listener to handle interactions
client.on('interactionCreate', async interaction => {
    // --- VERIFICATION BUTTON & MODAL HANDLING ---
    if (interaction.isButton() && interaction.customId === 'start_verification') {
        const member = interaction.member;

        const hasUnverifiedRole = member.roles.cache.has(UNVERIFIED_ROLE_ID);
        const hasNoRoles = member.roles.cache.size <= 1;

        if (!hasUnverifiedRole && !hasNoRoles) {
            return interaction.reply({ 
                content: '❌ You are already verified or do not meet the requirements to verify.', 
                ephemeral: true 
            });
        }

        try {
            const dmEmbed = new EmbedBuilder()
                .setColor('#8A2BE2')
                .setTitle('DO Verification Quiz')
                .setDescription('A quick easy math quiz to know if you are a bot or not. Click the button below to solve the math question!');

            const dmButtonRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('open_verify_modal')
                    .setLabel('Solve Math Question')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🔢')
            );

            await member.send({
                embeds: [dmEmbed],
                components: [dmButtonRow]
            });

            await interaction.reply({ 
                content: '📩 I have sent you a private message with a math verification check!', 
                ephemeral: true 
            });
        } catch (error) {
            console.error('[ERROR] Failed to send DM to user:', error);
            await interaction.reply({ 
                content: '❌ Could not send you a private message. Please make sure your DMs are open!', 
                ephemeral: true 
            });
        }
        return;
    }

    if (interaction.isButton() && interaction.customId === 'open_verify_modal') {
        // Generate random math numbers (e.g. addition between 1 and 20)
        const num1 = Math.floor(Math.random() * 15) + 5;
        const num2 = Math.floor(Math.random() * 15) + 1;
        const correctAnswer = num1 + num2;

        activeQuizQuestions.set(interaction.user.id, correctAnswer);

        const verifyModal = new ModalBuilder()
            .setCustomId('verification_quiz_modal')
            .setTitle('DO Verification Quiz');

        const answerInput = new TextInputBuilder()
            .setCustomId('verify_answer_input')
            .setLabel(`What is ${num1} + ${num2}?`)
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(5);

        verifyModal.addComponents(new ActionRowBuilder().addComponents(answerInput));
        await interaction.showModal(verifyModal);
        return;
    }

    if (interaction.isModalSubmit() && interaction.customId === 'verification_quiz_modal') {
        await interaction.deferReply({ ephemeral: true });

        const user = interaction.user;
        const userAnswer = interaction.fields.getTextInputValue('verify_answer_input').trim();
        const expectedAnswer = activeQuizQuestions.get(user.id);

        if (expectedAnswer === undefined || parseInt(userAnswer, 10) !== expectedAnswer) {
            return interaction.editReply({ content: '❌ Incorrect math answer! Please click the verification button again to retry.' });
        }

        // Clean up memory
        activeQuizQuestions.delete(user.id);

        const guild = await client.guilds.fetch(interaction.guildId || process.env.GUILD_ID).catch(() => null);
        
        let member;
        try {
            const fetchedGuild = guild || client.guilds.cache.first();
            member = await fetchedGuild.members.fetch(user.id);
        } catch (e) {
            return interaction.editReply({ content: '❌ Could not find your user profile in the server.' });
        }

        const hasUnverifiedRole = member.roles.cache.has(UNVERIFIED_ROLE_ID);
        const hasNoRoles = member.roles.cache.size <= 1;

        if (!hasUnverifiedRole && !hasNoRoles) {
            return interaction.editReply({ content: '❌ You are already verified or do not meet requirements.' });
        }

        try {
            await member.roles.add(VERIFIED_ROLE_ID);
            if (member.roles.cache.has(UNVERIFIED_ROLE_ID)) {
                await member.roles.remove(UNVERIFIED_ROLE_ID);
            }

            const successEmbed = new EmbedBuilder()
                .setColor('#8A2BE2')
                .setTitle('DO Verification Complete')
                .setDescription('✅ Correct answer! You have successfully verified and unlocked server access.');

            await interaction.editReply({ embeds: [successEmbed] });
        } catch (error) {
            console.error('[ERROR] Failed to update roles for verification:', error);
            await interaction.editReply({ content: '❌ There was an error completing your verification. Please contact an admin.' });
        }
        return;
    }

    // --- TICKET SELECT MENU HANDLING ---
    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_select_menu') {
        const selectedValue = interaction.values[0];

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

    // --- TICKET MODAL SUBMIT HANDLING ---
    if (interaction.isModalSubmit() && interaction.customId.startsWith('ticket_modal_')) {
        const selectedValue = interaction.customId.replace('ticket_modal_', '');
        const reason = interaction.fields.getTextInputValue('ticket_reason_input');

        await interaction.deferReply({ ephemeral: true });

        const guild = interaction.guild;
        const member = interaction.member;

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

    // --- TICKET BUTTON ACTIONS (CLAIM / CLOSE) ---
    if (interaction.isButton() && (interaction.customId === 'ticket_claim' || interaction.customId === 'ticket_close')) {
        const member = interaction.member;
        
        const hasStaffRole = member.roles.cache.has(STAFF_ROLE_ID) || member.permissions.has(PermissionFlagsBits.Administrator);

        if (!hasStaffRole) {
            return interaction.reply({ content: '❌ Only staff members with the required role or higher can claim or close tickets.', ephemeral: true });
        }

        if (interaction.customId === 'ticket_claim') {
            const message = interaction.message;
            const currentEmbed = message.embeds[0];

            const claimButton = message.components[0].components.find(c => c.customId === 'ticket_claim');
            if (claimButton && claimButton.data.disabled) {
                return interaction.reply({ content: '❌ This ticket has already been claimed!', ephemeral: true });
            }

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

            const claimedEmbed = new EmbedBuilder()
                .setColor('#2F3136') 
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
