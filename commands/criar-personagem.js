
import { SlashCommandBuilder } from "discord.js";
import pool from '../database.js';


export default {
    data: new SlashCommandBuilder()
        .setName('criar-personagem')
        .setDescription('Cria seu personagem para iniciar a aventura!'),
    async execute(interaction) {
        const userId = interaction.user.id;
        try {
            // verifica se o jogador ja existe
            const playercheck = await pool.query('SELECT * FROM Players WHERE user_id = $1', [userId])
            if (playercheck.rowCount > 0) {
                await interaction.reply('Você já tem um personagem criado!');
            } else {
                await pool.query('INSERT INTO Players (user_id) VALUES ($1)', [userId]);
                await interaction.reply('🎉 Personagem criado com sucesso! Use /perfil para ver seus status');
            }
        }catch (err){
            console.log(err);
            await interaction.reply('❌ Ocorreu um erro ao criar seu personagem.');
        }
        
    }
}
