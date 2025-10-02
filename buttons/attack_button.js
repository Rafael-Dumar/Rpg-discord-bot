import { EmbedBuilder } from "discord.js";
import pool from "../database.js";
import { calculateXp } from "../util/xpFunction.js";
import { handleMonsterTurn, handlePlayerTurn } from "../util/combatHelper.js";


export default {
    customId: 'attack_button',
    async execute(interaction, combat) {
        const { playerData: player, monsterData: monster, activeCombats } = combat;
        // logica do turno do jogador
        let description = await handlePlayerTurn(player, monster);
        
        // verifica se o monstro foi derrotado
        if (monster.hit_points <= 0){
            const xpGain = calculateXp(monster.cr) // se o monstro não tiver xp definido, calcula baseado no CR
            const coinGain = Math.floor(xpGain/10); // ganha uma quantia de moedas baseada na xp + 1d10
            player.current_xp += xpGain;
            player.coins += coinGain;
            description = `Você derrotou o ${monster.name}!\n\n**Recompensas:**\n✨ **+${xpGain} XP**\n💰 **+${coinGain} Moedas**`;
            
            let levelUpMessage = '';
            // sistema de level
            while (player.current_xp >= player.xp_to_next_level) {
                player.level += 1;
                player.current_xp -= player.xp_to_next_level;
                player.xp_to_next_level = Math.floor(player.xp_to_next_level * 1.75);
                player.max_hp += 5;
                player.current_hp = player.max_hp;
                player.attack_power += 1;
                player.attribute_points += 5;
                levelUpMessage += `\n\n🎉 Parabéns! Você subiu para o nível ${player.level}! Seus pontos de vida, ataque e defesa aumentaram. Você também ganhou 5 pontos de atributo para distribuir.`
            }
                
            // atualiza os dados do jogador no banco de dados
            await pool.query('UPDATE players SET level = $1, current_xp = $2, xp_next_level = $3, max_hp = $4, current_hp = $5, attack_power = $6, defense = $7, coins = $8, attribute_points = $9 WHERE user_id = $10',
            [player.level, player.current_xp, player.xp_next_level, player.max_hp, player.current_hp, player.attack_power, player.defense, player.coins, player.attribute_points, player.user_id]);
            
            description += levelUpMessage; // adiciona a mensagem de level up se houver
            activeCombats.delete(interaction.user.id); // remove a batalha ativa
                        
            const embed = new EmbedBuilder().setColor(0x00FF00).setTitle(`Vitória!`).setDescription(description);
            await interaction.update({embeds: [embed], components: []});
            return;
        }
        // turno do monstro
        description += await handleMonsterTurn(player, monster, pool)

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
            activeCombats.delete(interaction.user.id);
            await interaction.update({embeds: [defeatEmbed], components: []});
            return;
        }

        // atualiza o estado da batalha
        const embed = new EmbedBuilder()
            .setColor(0x36393F)
            .setTitle(`Batalha contra ${monster.name}!`)
            .setDescription(description);

        await interaction.update({ embeds: [embed] });

        
    }
};



