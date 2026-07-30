const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');

// Inside your bot's ready event or an interaction command:
async function sendTicketPanel(client) {
    const channelId = '1528087138225229954';
    const channel = await client.channels.fetch(channelId);

    if (!channel) {
        return console.error('Channel not found!');
    }

    // Create the purple embed
    const ticketEmbed = new EmbedBuilder()
        .setColor('#8A2BE2') // Purple color hex
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

    // Create the select menu dropdown
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

    // Send the panel to the specified channel
    await channel.send({
        embeds: [ticketEmbed],
        components: [row]
    });
}
