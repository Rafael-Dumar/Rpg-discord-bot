import {Events, EmbedBuilder} from 'discord.js'
import pool from '../database.js';
import { handleMonsterTurn } from '../util/combatHelper.js';

export default {
    name: Events.InteractionCreate,
    async execute(interaction, activeCombats) {
        // se a interação for um comando de barra
            if (interaction.isChatInputCommand()) {
                const command = interaction.client.commands.get(interaction.commandName);
                if (!command) {
                    console.error(`Nenhum comando correspondente a ${interaction.commandName} foi encontrado.`);
                    return;
                }
                
                try{
                    await command.execute(interaction, activeCombats);
                } catch(error) {
                    console.error(error);
                    await interaction.reply({content: 'Ocorreu um erro ao executar esse comando.', ephemeral: true});
                }
            }
            //se a interação for um clique de botão
            else if (interaction.isButton()) {
                const combat = activeCombats.get(interaction.user.id);
                const customId = interaction.customId;

                // botões que precisam de uma sessão de combate para funcionar
                const combatButtonIds = ['attack_button', 'run_button', 'item_button'];
                const isCombatButton = combatButtonIds.includes(customId) || customId.startsWith('use_revive_');

                // Se for um botão de combate E não houver uma sessão de combate para este usuário
                if (isCombatButton && !combat) {
                    return interaction.reply({ content: "Você não está em uma batalha ou ela já terminou.", ephemeral: true });
                }
                //procura por um botão pelo ID
                let button = interaction.client.buttons.get(interaction.customId);

                //se não encontrar, procura por um que comece com o prefixo
                if (!button) {
                    for (const btn of interaction.client.buttons.values()) {
                        //Verifica se o ID do botão clicado começa com o ID customizado do arquivo do botão
                        if(interaction.customId.startsWith(btn.customId)) {
                            button = btn;
                            break;
                        }
                    }
                }

                //se um botão foi encontrado
                if (button) {
                    try{
                        if(combat) {
                            combat.activeCombats = activeCombats;
                            await button.execute(interaction, combat);
                        } else {
                            await button.execute(interaction);
                        }
                    } catch(err) {
                        console.error(`Erro ao executar o botão ${interaction.customId}:`, err);
                    }
                }

            }
            //se a interação for uma seleção de menu
            else if (interaction.isStringSelectMenu()) {
                //teste
                if(interaction.customId === 'select_potion') {
                    const selectedInventoryId = interaction.values[0];
                    const userId = interaction.user.id;
                    const combat = activeCombats.get(userId);

                    if (!combat || !combat.playerData) {
                        return interaction.reply({ content: "Você não está em uma batalha ou ela já terminou.", ephemeral: true });
                    }
                    const { playerData: player, monsterData: monster} = combat
                    // garante que o player certo esta interagindo
                    const client = await pool.connect();
                    try{
                        await client.query('BEGIN');
                        // busca a poção selecionada no inventario do jogador
                        const potionResult = await client.query(
                            `SELECT i.name, i.effect_type, i.effect_duration, i.effect_value FROM inventories inv JOIN items i ON inv.item_id = i.item_id WHERE inv.inventory_id = $1`, [selectedInventoryId]
                        );
                        const potion = potionResult.rows[0];

                        await client.query('UPDATE inventories SET quantity = quantity - 1 WHERE inventory_id = $1', [selectedInventoryId]);
                        await client.query('DELETE FROM inventories WHERE inventory_id = $1 AND quantity <= 0', [selectedInventoryId])
                        let description = `🧪 Você usou **${potion.name}**!`;

                        switch(potion.effect_type) {
                            case 'HEAL':
                                player.current_hp = Math.min(player.max_hp, player.current_hp + potion.effect_value)
                                description += `\n❤️ Você recuperou **${potion.effect_value} HP**!`;
                                break;
                            case 'DAMAGE_BOOST':
                                combat.playerBuff= { type: 'DAMAGE_BOOST', duration: potion.effect_duration, value: potion.effect_value};
                                description += `\n⚔️ Seu poder de ataque aumentou por **${potion.effect_duration} turnos**!`;
                                break;
                            case 'DEFENSE_BOOST':
                                combat.playerBuff = { type: 'DEFENSE_BOOST', duration: potion.effect_duration, value: potion.effect_value};
                                description += `\n🛡️ Sua defesa aumentou por **${potion.effect_duration} turnos**!`
                                break;
                            case 'ARMOR_BOOST':
                                combat.playerBuff = { type: 'ARMOR_BOOST', duration: potion.effect_duration, value: potion.effect_value};
                                description += `\n🪖 Sua armadura aumentou por **${potion.effect_duration} turnos**!`
                                break;
                            case 'GUARANTEED_CRIT':
                                combat.playerBuff = { type: 'GUARANTEED_CRIT', duration: potion.effect_duration};
                                description += `\n💥 Seus ataques causarão acertos críticos por **${potion.effect_duration} turnos**!`
                                break;
                            case 'GUARANTEED_FLEE':
                                activeCombats.delete(interaction.user.id);
                                await interaction.update({content: 'Você usou a poção e fugiu da batalha!', embeds: [], components:[]});
                                return;
                            case 'DOUBLE_ATTACK':
                                combat.playerBuff = { type: 'DOUBLE_ATTACK', duration: potion.effect_duration};
                                description += `\n⚡ Você poderá atacar duas vezes por **${potion.effect_duration} turnos**!`
                                break;
                            case 'TRIPLE_ATTACK':
                                combat.playerBuff = { type: 'TRIPLE_ATTACK', duration: potion.effect_duration};
                                description += `\n⚡⚡ Você poderá atacar três vezes por **${potion.effect_duration} turnos**!`
                                break;
                            case 'FLEE_BOOST':
                                combat.playerBuff = { type: 'FLEE_BOOST', duration: potion.effect_duration, value: potion.effect_value};
                                description += `\n🏃 Sua chance de fuga aumentou por **${potion.effect_duration} turnos**!`
                                break;
                            case 'BERSERK':
                                combat.playerBuff = { type: 'BERSERK', duration: potion.effect_duration, value: potion.effect_value};
                                description += `\n😡 Seu poder de ataque aumentou, mas sua defesa diminuiu por **${potion.effect_duration} turnos**!`
                                break;
                            case 'INVULNERABILITY':
                                combat.playerBuff = { type: 'INVULNERABILITY', duration: potion.effect_duration};
                                description += `\n🛡️ Todo dano será reduzido por **${potion.effect_duration} turnos**!`
                                break;
                            case 'FULL_HEAL':
                                player.current_hp = player.max_hp;
                                description += `\n❤️ Você recuperou todo o seu HP!`;
                                break;
                            case 'TRIPLE_TURN':
                                combat.playerBuff = { type: 'TRIPLE_TURN', duration: potion.effect_duration};
                                description += `\n⏳ Você terá três turnos consecutivos por **${potion.effect_duration} turnos**!`
                                break;
                            case 'ETHEREAL':
                                combat.playerBuff = { type: 'ETHEREAL', duration: potion.effect_duration};
                                description += `\n👻 Você se tornou etéreo e evitará todo dano por **${potion.effect_duration} turnos**!`
                                break;

                            default:
                                description += `\n❓ Efeito desconhecido. Nada aconteceu.`
                                break;
                            
                        }

                        // turno do monstro
                        description += await handleMonsterTurn(player, monster, client, combat)

                        await client.query('COMMIT');

                        if (player.current_hp <= 0) {
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

                        if (combat.playerBuff && combat.playerBuff.duration != null && ['ETHEREAL' || 'DEFENSE_BOOST' || 'INVULNERABILITY' || 'ARMOR_BOOST'].includes(combat.playerBuff.type) ){
                            combat.playerBuff.duration -= 1;
                            if (combat.playerBuff.duration <= 0) {
                                combat.playerBuff = null; 
                            }
                        }

                        const embed = new EmbedBuilder()
                            .setColor(0x36393F)
                            .setTitle(`Batalha contra ${monster.name}!`)
                            .setDescription(description);
                        
                        await combat.interaction.editReply({ embeds: [embed] });
                        await interaction.message.delete();

                    } catch(err) {
                        await client.query('ROLLBACK');
                        console.error('Erro ao usar a poção:', err);
                        await interaction.reply({ content: 'Ocorreu um erro ao usar a poção.', ephemeral: true });
                    } finally {
                        client.release();
                    }
                
                }

            }

    },
};