import pool from "../database.js";
import { EmbedBuilder } from "discord.js";

export default{
    customId: 'decline_revive',
    async execute(interaction, combat) {
        const {playerData: player, monsterData: monster, activeCombats, finalTurnLog} = combat;
        
        const lostCoins = Math.ceil(player.coins * 0.1);
            const finalCoins = Math.max(0, player.coins - lostCoins);

            await pool.query('UPDATE players SET current_hp = 0, coins = $1 WHERE user_id = $2', [finalCoins, interaction.user.id])

            const defeatEmbed = new EmbedBuilder().setColor(0x2b2d31).setTitle('💀 Você foi Derrotado.. 💀')
            .setDescription(`Você lutou bravamente, mas infelizmente foi derrotado pelo ${monster.name}..`)
            .addFields(
                { name: 'Ultima Rodada', value: finalTurnLog},
                { name: 'Penalidade', value: `Você perdeu **${lostCoins}** moedas na derrota.` },
                { name: 'Dica', value: 'Use `/descansar` para recuperar suas forças e lutar novamente.'}
            )
            .setTimestamp();
            // finaliza a batalha
            activeCombats.delete(interaction.user.id);
            await interaction.update({embeds: [defeatEmbed], components: []});
            return;
    }
}