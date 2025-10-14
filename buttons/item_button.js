import { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } from "discord.js";
import pool from "../database.js";

export default {
    customId: 'item_button',
    async execute(interaction, combat) {
        // garante que o player certo esta interagindo
        if (!combat || !combat.playerData) {
            return interaction.reply({ content: "Você não está em uma batalha ou ela já terminou.", ephemeral: true });
        }

        const userId = interaction.user.id;

        // busca os itens tipo 'potion' no inventario do jogador
        const potionResult = await pool.query(
            `SELECT inv.inventory_id, i.name, i.description, inv.quantity FROM inventories inv JOIN items i ON inv.item_id = i.item_id WHERE inv.user_id = $1 AND i.type = 'potion' AND inv.quantity > 0`, [userId] 
        );

        if (potionResult.rowCount === 0) {
            return interaction.reply({content: 'Você não tem poções no seu inventário para usar.', ephemeral: true});
        }

        const potionOptions = potionResult.rows.map(potion => ({
            label: `${potion.name} (x${potion.quantity})`,
            description: potion.description.substring(0, 100),
            value: potion.inventory_id.toString(), // usa o inventory_id como valor
        }));

        // cria o menu de seleção
        const potionMenu = new StringSelectMenuBuilder()
            .setCustomId('select_potion')
            .setPlaceholder('Selecione uma poção para usar...')
            .addOptions(potionOptions);
        // cria o botão de cancelar
        const cancelButton = new ButtonBuilder()
            .setCustomId('cancel_action')
            .setLabel('Cancelar')
            .setStyle(ButtonStyle.Danger);

        // monta as linhas de componentes
        const potionRow = new ActionRowBuilder().addComponents(potionMenu);
        const cancelRow = new ActionRowBuilder().addComponents(cancelButton);

        await interaction.reply({content: 'Qual item você quer usar?', components: [potionRow, cancelRow]});
    }
};