import { EmbedBuilder } from "discord.js";
import pool from "../database.js";
import { calculateXp } from "../util/xpFunction.js";
import { handleMonsterTurn, handlePlayerTurn } from "../util/combatHelper.js";
import { rollDice } from "../util/diceRoller.js";
import { getRandomLoot } from "../util/Reward.js";

export default {
    customId: 'attack_button',
    async execute(interaction, combat) {
        // garante que o player certo esta interagindo
        if (!combat || !combat.playerData) {
            return interaction.reply({ content: "Você não está em uma batalha ou ela já terminou.", ephemeral: true });
        }
        const { playerData: player, monsterData: monster, activeCombats } = combat;
        // logica do turno do jogador
        let description = handlePlayerTurn(player, monster);
        // verifica se o monstro foi derrotado
        if (monster.hit_points <= 0){
            const xpGain = calculateXp(monster.cr) // se o monstro não tiver xp definido, calcula baseado no CR
            const coinGain = Math.max(1, Math.floor(xpGain/10) + rollDice('1d10')); // ganha uma quantia de moedas baseada na xp + 1d10
            player.current_xp += xpGain;
            player.coins += coinGain;
            description = `Você derrotou o ${monster.name}!\n\n**Recompensas:**\n✨ **+${xpGain} XP**\n💰 **+${coinGain} Moedas**`;

            // chance de loot baseado no CR do monstro
            const globalChance = monster.cr <= 1 ? 20 : monster.cr <= 4 ? 35 : monster.cr <= 9 ? 50 : 70;
            if (Math.random() * 100 < globalChance) {
                const droppedRarity = getRandomLoot(monster.cr);
                const possibleDrops = await pool.query('SELECT item_id, name, rarity FROM items WHERE rarity = $1 ORDER BY RANDOM() LIMIT 1', [droppedRarity]);

                if (possibleDrops.rowCount > 0) {
                    const droppedItem = possibleDrops.rows[0];
                    // adiciona o item ao inventario do jogador
                    const inventoryCheck = await pool.query('SELECT inventory_id FROM inventories WHERE user_id = $1 AND item_id = $2', [player.user_id, droppedItem.item_id]);
                    if (inventoryCheck.rowCount > 0) {
                        // se o jogador já tem o item, aumenta a quantidade
                        await pool.query('UPDATE inventories SET quantity = quantity + 1 WHERE inventory_id = $1', [inventoryCheck.rows[0].inventory_id]);
                    } else {
                        // se não tem, adiciona um novo item ao inventario
                        await pool.query('INSERT INTO inventories (user_id, item_id, quantity) VALUES ($1, $2, $3)', [player.user_id, droppedItem.item_id, 1]);
                    }
                    description += `\n🎁 **${droppedItem.name} (${droppedItem.rarity})** foi adicionado ao seu inventário!`;
                }
            }

            // verifica se o jogador subiu de level
            let levelUpMessage = '';
            while (player.current_xp >= player.xp_next_level) {
                // sobe de level
                const xpNeededForThisLevel = player.xp_next_level;
                player.level += 1;
                player.current_xp -= xpNeededForThisLevel;
                player.xp_next_level = Math.floor(xpNeededForThisLevel * 1.75);

                // aumenta os status do jogador a cada level
                player.max_hp += 5;
                player.current_hp = player.max_hp;
                player.attack_power += 1;
                player.attribute_points += 5;
                levelUpMessage += `\n\n🎉 Parabéns! Você subiu para o nível ${player.level}! Seus pontos de vida e ataque aumentaram. Você também ganhou 5 pontos de atributo para distribuir.`
            }
            
            try{
                // atualiza os dados do jogador no banco de dados
                await pool.query('UPDATE players SET level = $1, current_xp = $2, xp_next_level = $3, max_hp = $4, current_hp = $5, attack_power = $6, defense = $7, coins = $8, attribute_points = $9 WHERE user_id = $10',
                [player.level, player.current_xp, player.xp_next_level, player.max_hp, player.current_hp, player.attack_power, player.defense, player.coins, player.attribute_points, player.user_id]);
                description += levelUpMessage; // adiciona a mensagem de level up se houver
                            
                const embed = new EmbedBuilder().setColor(0x00FF00).setTitle(`Vitória!`).setDescription(description);
                await interaction.update({embeds: [embed], components: []});
            
            } catch(err) {
                console.error(err);
                await interaction.update({content: 'Ocorreu um erro ao atualizar seus dados após a batalha.', ephemeral: true });
            } finally {
                activeCombats.delete(interaction.user.id); // remove a batalha ativa
            }
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



