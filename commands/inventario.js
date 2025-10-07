import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import pool from "../database.js";

const items_per_page = 5;
export default{
    data: new SlashCommandBuilder()
        .setName('inventario')
        .setDescription('Mostra os itens do seu inventario'),
    async execute(interaction){
        const userId = interaction.user.id;
        try{
            //verifica se o jogador existe
            const playerCheck = await pool.query('SELECT user_id FROM players WHERE user_id = $1', [userId]);
            if (playerCheck.rowCount === 0) {
                return interaction.reply('Você precisa criar um personagem para usar o inventario!');
            }
            // pega os itens do inventario
            const inventoryResult = await pool.query(
                'SELECT i.item_id, i.name, i.rarity, i.type, i.bonuses, i.description, inv.quantity FROM inventories inv JOIN items i ON inv.item_id = i.item_id WHERE inv.user_id = $1 ORDER BY i.name ASC', [userId]);
            
            if (inventoryResult.rowCount === 0) {
                return interaction.reply({content: '🎒 Sua mochila está vazia.', ephemeral: true});
            }
            // itens do inventario
            const allItems = inventoryResult.rows;
            // paginação
            const totalPages = Math.ceil(allItems.length / items_per_page);
            const page = 0;

            // pega os itens para a pagina atual
            const currentPageItems = allItems.slice(page * items_per_page, (page + 1) * items_per_page)
            const inventoryEmbed = new EmbedBuilder()
                .setColor(0xCD853F)
                .setTitle(`🎒 Inventário de ${interaction.user.username}`)
                .setFooter({text: `Página ${page+1} de ${totalPages} `});
            
            // adiciona um campo para cada item
            for (const item of currentPageItems) {
                let bonusesText = '-';
                if (item.type === 'potion') {
                    bonusesText = item.description;
                }
                else if (item.bonuses && Object.keys(item.bonuses).length > 0) {
                    bonusesText = Object.entries(item.bonuses).map(([stat, value]) => {
                        const sign = value > 0 ? '+' : '';
                        return `${sign}${value} ${stat.replace('_', ' ')}`;
                    }).join('\n');
                }
                // adiciona o campo ao embed
                inventoryEmbed.addFields(
                    {name: `[${item.item_id}] ${item.name} (${item.rarity})`,value: '✨ Bônus / Efeito', inline: true},
                    {name: 'Quantidade', value: `**${item.quantity}**`, inline:true},
                    {name: bonusesText, value: `\u200B`, inline:false}
                );  
            }

            //Botões de navegação
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`inventory_prev_${page}`)
                        .setLabel('⬅️ Anterior')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(page === 0), // desabilitado se estiver na primeira página
                    new ButtonBuilder()
                        .setCustomId(`inventory_next_${page}`)
                        .setLabel('Próxima ➡️')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(page + 1 >= totalPages) // desabilitado se estiver na ultima página
            );

            await interaction.reply({embeds: [inventoryEmbed], components: [row]});
            
        } catch(err){
            console.log(err);
            await interaction.reply('❌ Ocorreu um erro ao buscar seu inventario.');
        }

    },
};