import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import pool from "../database.js";

const items_per_page = 5;

export default{
    data: new SlashCommandBuilder()
        .setName('loja')
        .setDescription('Mostra os itens disponíveis na loja'),
    
    async execute(interaction) {
        try {
            const allItemsResult = await pool.query('SELECT * FROM items WHERE for_sale = true ORDER BY price ASC');
            const allItems = allItemsResult.rows;

            if (allItems.length === 0) {
                return interaction.reply({content: 'A loja está vazia no momento', ephemeral: true})
            }

            const totalPages = Math.ceil(allItems.length / items_per_page);
            const page = 0;

            // pega os itens para a pagina atual
            const currentPageItems = allItems.slice(page * items_per_page, (page + 1) * items_per_page)

            const shopEmbed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle('🛒 Loja do Aventureiro')
                .setFooter({text: `Página ${page+1} de ${totalPages}   | Use /comprar para comprar um item`});
            
            //campo para cada item da loja
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

            //Botões de navegação
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`shop_prev_${page}`)
                        .setLabel('⬅️ Anterior')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(page === 0), // desabilitado se estiver na primeira página
                    new ButtonBuilder()
                        .setCustomId(`shop_next_${page}`)
                        .setLabel('Próxima ➡️')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(page + 1 >= totalPages) // desabilitado se estiver na ultima página
                );
            await interaction.reply({embeds: [shopEmbed], components: [row]});

        } catch(err) {
            console.error(err);
            await interaction.reply({content: 'Ocorreu um erro ao abrir a loja', ephemeral: true});
        }
    },
};