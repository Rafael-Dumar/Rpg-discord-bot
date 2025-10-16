import pool from '../database.js'
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js'

export async function reviveHelper(interaction, player, monster, description, activeCombats) {
    try {
        const revivePotionResult = await pool.query(
            `SELECT inv.inventory_id, i.name, i.effect_type, i.effect_value FROM inventories inv JOIN items i ON inv.item_id = i.item_id WHERE inv.user_id = $1 AND i.effect_type IN ('REBIRTH', 'AUTO_REVIVE') AND inv.quantity > 0 `, [interaction.user.id]
        )

        if (revivePotionResult.rowCount > 0) {
            const combat = activeCombats.get(interaction.user.id);
            if (combat) {
                combat.finalTurnLog = description;
            }
            const reviveEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('❗ Você foi Derrotado!')
                .setDescription('Seu HP chegou a zero... mas você tem itens em sua mochila que podem te salvar. Escolha uma ação:')
            const row = new ActionRowBuilder()

            revivePotionResult.rows.forEach(potion => {
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`use_revive_${potion.inventory_id}_${potion.effect_value}`)
                        .setLabel(`Usar ${potion.name}`)
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('💖')
                );
            } 
        )
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId('decline_revive')
                    .setLabel('Derrota...')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('💀')
            );
            await interaction.update({embeds: [reviveEmbed], components: [row]});

                

        } else {
            // se não tiver poção de revive
            //penalidade -> perde 10% das moedas
            const lostCoins = Math.ceil(player.coins * 0.1);
            const finalCoins = Math.max(0, player.coins - lostCoins);

            await pool.query('UPDATE players SET current_hp = 0, coins = $1 WHERE user_id = $2', [finalCoins, interaction.user.id])

            const defeatEmbed = new EmbedBuilder().setColor(0x2b2d31).setTitle('💀 Você foi Derrotado.. 💀')
            .setDescription(`Você lutou bravamente, mas infelizmente foi derrotado pelo ${monster.name}..`)
            .addFields(
                { name: 'Ultima Rodada', value: description},
                { name: 'Penalidade', value: `Você perdeu **${lostCoins}** moedas na derrota.` },
                { name: 'Dica', value: 'Use `/descansar` para recuperar suas forças e lutar novamente.'}
            )
            .setTimestamp();
            // finaliza a batalha
            activeCombats.delete(interaction.user.id);
            await interaction.update({embeds: [defeatEmbed], components: []});
            return;

        }
    } catch (err) {
        console.error('Erro ao buscar poção de revive:', err);
    }
}