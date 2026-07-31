import { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ChannelType, PermissionFlagsBits } from 'discord.js';
import http from 'http';

// Render requires web services to bind to a port to stay alive
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

// Event listener to handle the ticket creation when someone uses the dropdown
client.on('interactionCreate', async interaction => {
    if (!interaction.isStringSelectMenu()) return;
    if (interaction.customId !== 'ticket_select_menu') return;

    await interaction.deferReply({ ephemeral: true });

    const guild = interaction.guild;
    const member = interaction.member;
    const selectedValue = interaction.values[0];

    let categoryName = 'TICKETS';
    let ticketType = '';

    if (selectedValue === 'buying_access') ticketType = 'buying-access';
    else if (selectedValue === 'report_ticket') ticketType = 'report';
    else if (selectedValue === 'question_ticket') ticketType = 'question';

    try {
        // Find or create a ticket category
        let category = guild.channels.cache.find(c => c.name === categoryName && c.type === ChannelType.GuildCategory);
        if (!category) {
            category = await guild.channels.create({
                name: categoryName,
                type: ChannelType.GuildCategory,
            });
        }

        // Create the private ticket channel
        const ticketChannel = await guild.channels.create({
            name: `${ticketType}-${member.user.username}`,
            type: ChannelType.GuildText,
            parent: category.id,
            permissionOverwrites: [
                {
                    id: guild.id, // Hide from @everyone
                    deny: [PermissionFlagsBits.ViewChannel],
                },
                {
                    id: member.id, // Allow the user who clicked
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
                },
                {
                    id: client.user.id, // Allow the bot
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels],
                },
            ],
        });

        const welcomeEmbed = new EmbedBuilder()
            .setColor('#8A2BE2')
            .setTitle(`Ticket: ${ticketType.toUpperCase()}`)
            .setDescription(`Hello ${member}, staff will be with you shortly.\nPlease describe your issue or request.`);

        await ticketChannel.send({
            content: `${member}`,
            embeds: [welcomeEmbed]
        });

        await interaction.editReply({ content: `Your ticket has been created: ${ticketChannel}` });
    } catch (error) {
        console.error('[ERROR] Failed to create ticket channel:', error);
        await interaction.editReply({ content: 'There was an error creating your ticket. Please contact an admin.' });
    }
});

client.login(process.env.DISCORD_TOKEN);
