import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import pool from "../database.js";

export default {
    data: new SlashCommandBuilder()
        .setName('atributos')
        .setDescription('Mostra os pontos de atributos disponíveis para distribuir.'),

        async execute(interaction) {
        const userId = interaction.user.id;

        try {
            // Verifica se o jogador existe e busca seus atributos
            const playerCheck = await pool.query(
                'SELECT attack_power, defense, crit_chance, attribute_points FROM players WHERE user_id = $1',
                [userId]
            );

            if (playerCheck.rowCount === 0) {
                return interaction.reply({ content: 'Você precisa criar um personagem primeiro! Use `/criar-personagem`.', ephemeral: true });
            }

            const player = playerCheck.rows[0];

            // Criamos o embed focado na evolução do personagem
            const attributesEmbed = new EmbedBuilder()
                .setColor(0x9966CC) 
                .setTitle(`✨ Atributos de ${interaction.user.username} ✨`)
                .setDescription(`Você tem **${player.attribute_points}** pontos para distribuir.`)
                .addFields(
                    { name: '⚔️ Ataque', value: `**${player.attack_power}**`, inline: true },
                    { name: '🛡️ Defesa', value: `**${player.defense}**`, inline: true },
                    { name: '💥 Crítico', value: `**${player.crit_chance}** Pontos`, inline: true }
                )
                .setFooter({ text: 'Use /distribuir-pontos para ficar mais forte!' });

            await interaction.reply({ embeds: [attributesEmbed] });

        } catch (err) {
            console.error(err);
            await interaction.reply({ content: 'Ocorreu um erro ao buscar seus atributos.', ephemeral: true });
        }
    },
};
