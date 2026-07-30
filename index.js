import { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages 
    ] 
});

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);

    const channelId = '1528087138225229954';
    
    try {
        const channel = await client.channels.fetch(channelId);

        if (!channel) {
            console.error('Error: Channel not found!');
            return;
        }

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
        
        console.log('SUCCESS: Ticket panel sent to the channel!');
    } catch (error) {
        console.error('Failed to send ticket panel:', error);
    }
});

client.login(process.env.DISCORD_TOKEN);
