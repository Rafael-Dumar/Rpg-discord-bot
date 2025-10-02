import pool from "../database.js";
import { EmbedBuilder } from "discord.js";
import { handleMonsterTurn } from "../util/combatHelper.js";

export default {
    customId: 'run_button',
    async execute(interaction, combat) {
        const { playerData: player, monsterData: monster, activeCombats } = combat;
        const escapeChance = Math.max(0.1, 0.8 - (monster.cr * 0.03)); // chance minima de 10% de fugir, diminui 3% para cada CR do monstro
                    if (Math.random() <= escapeChance) {
                        activeCombats.delete(interaction.user.id);
                        await interaction.update({content: 'Você fugiu da batalha!', embeds: [], components:[]});
                    } else {
                        // falha ao fugir, turno do monstro
                        let description = `Você tenta fugir, mas o ${monster.name} é mais rápido e te impede!`;
                        description += await handleMonsterTurn(player, monster, pool);
                        
                        const embed = new EmbedBuilder().setColor(0xFF0000).setTitle(`Fuga Falhou!`).setDescription(description);
                        // verifica se o jogador foi derrotado
                        if (player.current_hp <= 0) {
                            //penalidade -> perde 10% das moedas
                        const lostCoins = Math.ceil(player.coins * 0.1);
                        const finalCoins = Math.max(0, player.coins - lostCoins);

                        await pool.query('UPDATE players SET current_hp = 0, coins = $1 WHERE user_id = $2', [finalCoins, player.user_id])

                        const defeatEmbed = new EmbedBuilder().setColor(0x2b2d31).setTitle('💀 Você foi Derrotado.. 💀')
                        .setDescription(`Você lutou bravamente, mas infelizmente foi derrotado pelo ${monster.name}..`)
                        .addFields(
                            { name: 'Ultima Rodada', value: description},
                            { name: 'Penalidade', value: `Você perdeu **${lostCoins}** moedas na derrota.` },
                            { name: 'Dica', value: 'Use `/descansar` para recuperar suas forças e lutar novamente.'}
                        )
                        .setTimestamp();
                        // finaliza a batalha
                        activeCombats.delete(userId);
                        await interaction.update({embeds: [defeatEmbed], components: []});
                        return;
                        }

                        await interaction.update({embeds: [embed]});
                    }
    }
}