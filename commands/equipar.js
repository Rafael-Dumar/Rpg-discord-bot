import { SlashCommandBuilder } from "discord.js";
import pool from "../database.js";

export default {
    data: new SlashCommandBuilder()
        .setName('equipar')
        .setDescription('Equipa um item do seu inventário')
        .addIntegerOption(option =>
            option.setName('inventory_id')
            .setDescription('O ID do item no seu inventário que você quer equipar.')
            .setRequired(true)
        ),
    async execute(interaction) {
        const userId = interaction.user.id;
        const itemId = interaction.options.getInteger('inventory_id');

        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const inventoryResult = await client.query('SELECT inv.inventory_id, i.type, i.name FROM inventories inv JOIN items i ON inv.item_id = i.item_id WHERE inv.item_id = $1 AND inv.user_id = $2', [itemId, userId]);

            if (inventoryResult.rowCount === 0) {
                await client.query('ROLLBACK');
                return interaction.reply({content: `Item com ID \`${itemId}\` não foi encontrado no seu inventário.`, ephemeral: true});
            }

            const itemToEquip = inventoryResult.rows[0];
            const inventoryId = itemToEquip.inventory_id;

            if (!['weapon', 'armor', 'ring'].includes(itemToEquip.type)) {
                await client.query('ROLLBACK');
                return interaction.reply({content: `O item \`${itemToEquip.name}\` não pode ser equipado. Apenas armas, armaduras e anéis podem ser equipados.`, ephemeral: true});
            }

            // verifica quantos itens já estão equipados
            const equippedCountResult = await client.query('SELECT COUNT(*) FROM equipped_items WHERE player_id = $1', [userId]);
            const equippedCount = parseInt(equippedCountResult.rows[0].count);

            if (equippedCount >= 2) {
                await client.query('ROLLBACK');
                return interaction.reply({content: 'Você já está com 2 itens equipados. Remova um item antes de equipar outro.', ephemeral: true});
            }

            // verifica se o item específico já está equipado
            const alreadyEquipped = await client.query('SELECT * FROM equipped_items WHERE inventory_id = $1', [inventoryId]);
            if (alreadyEquipped.rowCount > 0) {
                await client.query('ROLLBACK');
                return interaction.reply({content: `O item \`${itemToEquip.name}\` já está equipado.`, ephemeral: true});
            }

            // equipa o item
            await client.query('INSERT INTO equipped_items (player_id, inventory_id) VALUES ($1, $2)', [userId, inventoryId]);
            await client.query('COMMIT');
            const itemtypeEmoji = itemToEquip.type === 'weapon' ? '🗡️' : itemToEquip.type === 'armor' ? '🛡️' : '💍';
            return interaction.reply({content: `Você equipou o item ${itemtypeEmoji} **${itemToEquip.name}** com sucesso!`, ephemeral: false});
        } catch (err) {
            await client.query('ROLLBACK');
            console.error(err);
            await interaction.reply({content: 'Ocorreu um erro ao tentar equipar o item. Tente novamente mais tarde.', ephemeral: true});
        }finally {
            client.release();
        }
    },
};