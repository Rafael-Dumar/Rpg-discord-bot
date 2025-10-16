import { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } from "discord.js";
import {monsterPools} from "../util/monsterCache.js";
import pool from "../database.js";
import { getEquippedBonuses } from "../util/equippedBonuses.js";

export default{
    data: new SlashCommandBuilder()
        .setName('dungeon')
        .setDescription('Entra em uma dungeon para lutar contra monstros')
        .addStringOption(option =>
            option.setName('dificuldade')
                .setDescription('o nivel de dificuldade da dungeon')
                .setRequired(true)
                .addChoices(
                    {name: 'Fácil', value: 'facil'},
                    {name: 'Médio', value: 'medio'},
                    {name: 'Difícil', value: 'dificil'},
                    {name: 'Lendário', value: 'lendario'}
                )
        ),
    async execute(interaction, activeCombats) {
        try{
            const userId = interaction.user.id;
            const playercheck = await pool.query(
                'SELECT user_id, level, current_xp, xp_next_level, attribute_points, coins, current_hp, max_hp, attack_power, defense, armor_class, crit_chance FROM players WHERE user_id = $1',
                [userId]
            );
            if (playercheck.rowCount === 0) {
                return interaction.reply({content:'Você precisa criar um personagem para poder lutar!', ephemeral: true})
            }

            let playerData = playercheck.rows[0];
            // busca os itens equipados
            const equippedItemsResult = await pool.query(
                'SELECT i.bonuses FROM equipped_items ei JOIN inventories inv ON ei.inventory_id = inv.inventory_id JOIN items i ON inv.item_id = i.item_id WHERE ei.player_id = $1', [userId]
            )
            const bonuses = await getEquippedBonuses(userId, pool);
            
            // Aplica os bônus dos itens equipados
            if (equippedItemsResult.rowCount > 0) {
                const combatPlayerData = { ...playerData}; // cópia dos dados do jogador para a batalha
                for (const [stat, value] of Object.entries(bonuses)) {
                    if (combatPlayerData.hasOwnProperty(stat)) {
                        combatPlayerData[stat] += value;
                    }
                }   
                playerData = combatPlayerData; // usa os dados modificados para a batalha
            }
            
            const difficulty = interaction.options.getString('dificuldade');

            // seleciona um monstro aleatorio baseado na dificuldade
            const monsterPool = monsterPools[difficulty];

            if (!monsterPool || monsterPool.length === 0) {
                return interaction.reply('Não há monstros disponíveis para essa dificuldade. Tente novamente mais tarde.');
            }

            const monsterData = monsterPool[Math.floor(Math.random() * monsterPool.length)];
            if (!monsterData) {
                return interaction.reply('Não foi possivel encontrar um monstro para a batalha. Tente novamente.')
            }

            //cria os botões de ação
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('attack_button')
                        .setLabel('Atacar')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('⚔️'),
                    new ButtonBuilder()
                        .setCustomId('item_button')
                        .setLabel('Usar Item')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🧪'),
                    new ButtonBuilder()
                        .setCustomId('run_button')
                        .setLabel('Fugir')
                        .setStyle(ButtonStyle.Secondary)
                
                );
            
            // cria o embed para monstrar o monstro
            const monsterembed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle(`Um ${monsterData.name} selvagem apareceu!`)
                .setDescription(`HP: ${monsterData.hit_points}`)
                .setFooter({text: 'O que você faz?'});
            await interaction.reply({embeds: [monsterembed], components: [row]});

            //salva os dados da batalha no mapa, usando o id do usuario
            activeCombats.set(interaction.user.id, {
                playerData: playerData,
                monsterData: monsterData,
                interaction: interaction // Guarda a interação original para poder editar depois
            });
            // Adiciona um coletor para remover os botões depois de um tempo
            const collector = interaction.channel.createMessageComponentCollector({time: 300000}); 
            collector.on('end', () => {
                activeCombats.delete(interaction.user.id); // Limpa a batalha do mapa
            });

        } catch(err){
        console.log(err)
        await interaction.reply('❌ Ocorreu um erro ao iniciar a sua dungeon.')
        }
        
    }
};