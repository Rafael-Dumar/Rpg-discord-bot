import { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } from "discord.js";
import fetchMonster from "../util/monsterFetcher.js";
import pool from "../database.js";


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
                )
        ),
    async execute(interaction, activeCombats) {
        try{
            const playercheck = await pool.query('SELECT * FROM players WHERE user_id=$1', [interaction.user.id])
            if (playercheck.rowCount === 0) {
                return interaction.reply('Você precisa criar um personagem para poder lutar!')
            }

            const difficulty = interaction.options.getString('dificuldade');
            let monsterName;

            // escolhe um monstro baseado na dificuldade
            if (difficulty === 'facil') {
                monsterName = 'goblin'; //teste inicial
            } else if (difficulty === 'medio'){
                monsterName = 'acolyte';
            } else if(difficulty === 'dificil') {
                monsterName = 'ancient-gold-dragon'
            }
            const monsterData = await fetchMonster(monsterName);
            if (!monsterData){
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
                playerData: playercheck.rows[0],
                monsterData: monsterData,
                interaction: interaction // Guarda a interação original para poder editar depois
            });
            // Adiciona um coletor para remover os botões depois de um tempo
            const collector = interaction.channel.createMessageComponentCollector({time: 60000});
            collector.on('end', () => {
                activeCombats.delete(interaction.user.id); // Limpa a batalha do mapa
            });

        } catch(err){
        console.log(err)
        await interaction.reply('❌ Ocorreu um erro ao iniciar a sua dungeon.')
        }
        
    }
};