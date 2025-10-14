import { SlashCommandBuilder } from "discord.js";
import pool from "../database.js";

export default {
    data: new SlashCommandBuilder()
        .setName('desequipar')
        .setDescription('Desequipa um item que você está usando')
        .addIntegerOption(option =>
            option.setName('item_id')
            .setDescription('O ID do item no seu inventário que você quer desequipar.')
            .setRequired(true)
        ),
    
    async execute(interaction) {
        const userId = interaction.user.id;
        const itemId = interaction.options.getInteger('item_id');

        try {
            // verifica se o item existe no inventario do jogador
            const itemNameResult = await pool.query('SELECT i.name FROM inventories inv JOIN items i ON inv.item_id = i.item_id WHERE inv.item_id = $1 AND inv.user_id = $2', [itemId, userId]);
            if (itemNameResult.rowCount === 0) {
                return interaction.reply({content: `Item com ID \`${itemId}\` não foi encontrado no seu inventário.`, ephemeral: true});
            }
            // nome do item
            const itemName = itemNameResult.rows[0].name;
            // verifica se o item está realmente equipado
            const deleteResult = await pool.query('DELETE FROM equipped_items WHERE player_id = $1 AND inventory_id = (SELECT inventory_id from inventories WHERE player_id = $1 AND item_id = $2) RETURNING *', [userId, itemId]);
            // se não estiver equipado, avisa o jogador
            if (deleteResult.rowCount === 0) {
                return interaction.reply({content: `Você não está com \`${itemName}\` equipado.`, ephemeral: true});
            }
            // se estiver, remove o item da tabela de itens equipados
            const itemtypeEmoji = itemToEquip.type === 'weapon' ? '🗡️' : itemToEquip.type === 'armor' ? '🛡️' : '💍';
            await interaction.reply({content: `✅ Você desequipou ${itemtypeEmoji} **${itemName}** com sucesso!`, ephemeral: true});
        } catch (err) {
            console.error(err);
            await interaction.reply({content: '❌ Ocorreu um erro ao tentar desequipar o item. Tente novamente mais tarde.', ephemeral: true});
        }
    },
};