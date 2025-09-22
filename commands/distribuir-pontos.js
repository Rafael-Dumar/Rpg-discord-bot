import { SlashCommandBuilder } from "discord.js";
import pool from "../database.js";

export default {
    data: new SlashCommandBuilder()
        .setName('distribuir-pontos')
        .setDescription('Distribui pontos de atributos para seu personagem.')
        .addIntegerOption(option =>
            option.setName('quantidade')
                .setDescription('Quantidade de pontos você quer gastar')
                .setRequired(true))
                
        .addStringOption(option =>
            option.setName('status')
            .setDescription('o atributo que você quer aumentar')
            .setRequired(true)
            .addChoices(
                { name: 'Vida', value: 'vida'},
                { name: 'Ataque', value: 'ataque'},
                { name: 'Defesa', value: 'defesa'},
                { name: 'Chance de Critico', value: 'critico'}
            )
    ),
    async execute(interaction) {
        const userId = interaction.user.id;
        const amount = interaction.options.getInteger('quantidade');
        const stat = interaction.options.getString('status');

        try {
            const playerCheck = await pool.query('SELECT * FROM players WHERE user_id = $1', [userId]);
            if (playerCheck.rowCount === 0) {
                return await interaction.reply({ content: 'Você ainda não tem um personagem.', ephemeral: true});
            }
            const availablePoints = playerCheck.rows[0].attribute_points;

            if ( amount <= 0){
                return await interaction.reply({ content: 'Você deve distribuir pelo menos 1 ponto.', ephemeral: true});
            }
            if (amount > availablePoints) {
                return await interaction.reply({ content: `Você não tem pontos suficientes! Você só tem ${availablePoints} pontos para distribuir.`, ephemeral: true })
            }
            let statColumn;
            let statName;
            switch(stat) {
                case 'vida':
                    statColumn = 'max_hp';
                    statName = 'Vida';
                    break;
                case 'ataque':
                    statColumn = 'attack_power';
                    statName = 'Ataque';
                    break;
                case 'defesa':
                    statColumn = 'defense';
                    statName = 'Defesa';
                    break;
                case 'critico':
                    statColumn = 'crit_chance';
                    statName = 'Chance de Crítico';
                    break;
                
            }
            // atualiza o status do jogador no banco de dados
            await pool.query (`UPDATE players SET ${statColumn} = ${statColumn} + $1, attribute_points = attribute_points - $1 WHERE user_id = $2`, [amount, userId]);
            await interaction.reply({ content: `Você distribuiu ${amount} pontos para ${statName}.`, ephemeral: true});

        } catch (err) {
        console.error(err);
        await interaction.reply({ content: 'Ocorreu um erro ao tentar distribuir seus pontos.', ephemeral: true});
        }
    },
};