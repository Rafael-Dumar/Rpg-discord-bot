import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import pool from "../database.js";


export default {
    customId: 'use_revive_',
    async execute(interaction, combat) {
        const [_, __, inventoryId, hpPercent] = interaction.customId.split('_');
        const {playerData: player, monsterData: monster} = combat;
        let healAmount = 0
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            await client.query('UPDATE inventories SET quantity = quantity - 1 WHERE inventory_id = $1', [inventoryId]);
            healAmount = Math.floor(player.max_hp * (parseInt(hpPercent) / 100));
            player.current_hp = healAmount
            await client.query('UPDATE players SET current_hp = $1 WHERE user_id = $2', [healAmount, player.user_id]);
            await client.query('DELETE FROM inventories WHERE inventory_id = $1 AND quantity <= 0', [inventoryId]);
            await client.query('COMMIT');
        } catch (err) {
            await client.query('ROLLBACK');
            console.error('Erro ao usar poção de reviver:', err);
            return interaction.update({ content: 'Ocorreu um erro ao usar a poção de reviver. Tente novamente mais tarde.', components: [], embeds: [] });

        } finally {
            client.release();
        }
        const monsterCurrentHp = monster.hit_points > 0 ? monster.hit_points : 0;
        const combatEmbed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle(`Batalha contra ${monster.name}!`)
            .setDescription(
                `💖 Você usou a poção e voltou à vida com **${healAmount}** de HP! É o seu turno.`+
                `\n\n👹 O ${monster.name} ainda tem **${monsterCurrentHp}** de HP restante.` 
            )
            .setFooter({text: 'O que você faz?'});
        const combatRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('attack_button').setLabel('Atacar').setStyle(ButtonStyle.Danger).setEmoji('⚔️'),
            new ButtonBuilder().setCustomId('item_button').setLabel('Usar Item').setStyle(ButtonStyle.Primary).setEmoji('🧪'),
            new ButtonBuilder().setCustomId('run_button').setLabel('Fugir').setStyle(ButtonStyle.Secondary)
        );
        await interaction.update({ embeds: [combatEmbed], components: [combatRow] });

    }
}