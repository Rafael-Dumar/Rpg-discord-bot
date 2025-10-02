import pool from "../database.js";
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

const items_per_page = 5
export default {
    customId: 'shop_',
    async execute(interaction) {
        try {
            const [_, action, pageStr] = interaction.customId.split('_');
            let currentPage = parseInt(pageStr)

            //busca os itens
            const allItemsResult = await pool.query('SELECT * FROM items WHERE for_sale = true ORDER BY price ASC');
            const allItems = allItemsResult.rows;
            const totalPages = Math.ceil(allItems.length / items_per_page);

            //calcula a nova página
            if (action === 'next') {
                currentPage++;
            } else if (action === 'prev'){
                currentPage--;
            }

            //pega os itens da nova pagina
            const currentPageItems = allItems.slice(currentPage * items_per_page, (currentPage + 1)* items_per_page);

            const shopEmbed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle('🛒 Loja do Aventureiro')
                .setFooter({ text: `Página ${currentPage + 1} de ${totalPages}` });
            
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

                shopEmbed.addFields(
                    {name: `🛍️ [${item.item_id}] ${item.name} (${item.rarity})`,value: '✨ Bônus / Efeito', inline: true},
                    {name: '💰 Preço', value: `**${item.price}** moedas`, inline:true},
                    {name: bonusesText, value: `\u200B`, inline:false}
                    
                );

            }

            const newRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`shop_prev_${currentPage}`)
                        .setLabel('⬅️ Anterior')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(currentPage === 0),
                    new ButtonBuilder()
                        .setCustomId(`shop_next_${currentPage}`)
                        .setLabel('Próxima ➡️')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(currentPage + 1 >= totalPages)
                );
            
            await interaction.update({embeds: [shopEmbed], components: [newRow]});
        
        } catch(err){
            console.error(err);
            interaction.reply({content: 'ocorreu um erro!', ephemeral: true});
        }

    }
}