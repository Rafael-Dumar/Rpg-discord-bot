import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import pool from "../database.js";
import { getEquippedBonuses } from "../util/equippedBonuses.js";

export default {
    data: new SlashCommandBuilder()
        .setName('atributos')
        .setDescription('Mostra os pontos de atributos disponíveis para distribuir.'),

        async execute(interaction) {
        const userId = interaction.user.id;

        try {
            // Verifica se o jogador existe e busca seus atributos
            const playerCheck = await pool.query(
                'SELECT max_hp, attack_power, defense, crit_chance, attribute_points FROM players WHERE user_id = $1',
                [userId]
            );

            if (playerCheck.rowCount === 0) {
                return interaction.reply({ content: 'Você precisa criar um personagem primeiro! Use `/criar-personagem`.', ephemeral: true });
            }

            const player = playerCheck.rows[0];
            const bonuses = await getEquippedBonuses(userId, pool);
            // Aplica os bônus dos itens equipados
            const formatStat = (base, bonus) => {
                return bonus > 0 ? `**${base}** + **${bonus}**` : `**${base}**`;
            }

            // Criamos o embed focado na evolução do personagem
            const attributesEmbed = new EmbedBuilder()
                .setColor(0x9966CC) 
                .setTitle(`✨ Atributos de ${interaction.user.username} ✨`)
                .setDescription(`Você tem **${player.attribute_points}** pontos para distribuir.`)
                .addFields(
                    { name: '❤️ HP (Vida)', value: formatStat(player.max_hp, bonuses.max_hp), inline: false},
                    { name: '⚔️ Ataque', value: formatStat(player.attack_power, bonuses.attack_power), inline: true },
                    { name: '🛡️ Defesa', value: formatStat(player.defense, bonuses.defense), inline: true },
                    { name: '💥 Crítico', value: formatStat(player.crit_chance, bonuses.crit_chance), inline: true }
                )
                .setFooter({ text: 'Use /distribuir-pontos para ficar mais forte!' });

            await interaction.reply({ embeds: [attributesEmbed] });

        } catch (err) {
            console.error(err);
            await interaction.reply({ content: 'Ocorreu um erro ao buscar seus atributos.', ephemeral: true });
        }
    },
};
