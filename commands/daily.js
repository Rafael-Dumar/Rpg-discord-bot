import { SlashCommandBuilder } from "discord.js";
import pool from "../database.js";
import { rollDice } from "../util/diceRoller.js";
import { getRandomLoot } from "../util/Reward.js";


export default{
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Tente a sorte na roleta diária!'),
    async execute(interaction) {
        const userId = interaction.user.id;
        const client = await pool.connect();
        const cooldown = 23 * 60 * 60 * 1000;
        try{
            await client.query('BEGIN');
            // verifica se o jogador existe
            const playerCheck = await client.query('SELECT * FROM players WHERE user_id = $1', [userId]);
            if (playerCheck.rowCount === 0) {
                await client.query('ROLLBACK');
                return await interaction.reply({content: 'Você ainda não tem um personagem criado!', ephemeral: true });
                
            }
            
            const player = playerCheck.rows[0];

            // verifica se o cooldown de 23 horas passou
            const lastDaily = parseInt(player.last_daily_time || '0');
            const timePassed = Date.now() - lastDaily;
            if (timePassed < cooldown) {
                const timeLeft = cooldown - timePassed;
                // convertendo para horas e minutos
                const hoursLeft = Math.floor(timeLeft / (60 * 60 * 1000));
                const minutesLeft = Math.ceil((timeLeft % (60 * 60 *1000)) / (60 * 1000));
                await client.query('ROLLBACK')
                return interaction.reply({content: `Você já resgatou sua recompensa diária. Tente novamente em **${hoursLeft}h e ${minutesLeft}m**.`, ephemeral: true });
                
            }
            let description = '';
            const itemDropChance = 0.3
            const scaledLoot = Math.max(0, Math.floor(player.level / 4));
            if (Math.random() <= itemDropChance) {
                const droppedRarity = getRandomLoot(scaledLoot);
                const possibleDrops = await client.query('SELECT item_id, name, rarity FROM items WHERE rarity = $1 ORDER BY RANDOM() LIMIT 1', [droppedRarity]);
                if (possibleDrops.rowCount > 0) {
                    const droppedItem = possibleDrops.rows[0];
                    // adiciona o item ao inventario do jogador
                    const inventoryCheck = await client.query('SELECT inventory_id FROM inventories WHERE user_id = $1 AND item_id = $2', [userId, droppedItem.item_id]);
                    if (inventoryCheck.rowCount > 0) {
                        // se o jogador já tem o item, aumenta a quantidade
                        await client.query('UPDATE inventories SET quantity = quantity + 1 WHERE inventory_id = $1', [inventoryCheck.rows[0].inventory_id]);
                    } else {
                        // se não tem, adiciona um novo item ao inventario
                        await client.query('INSERT INTO inventories (user_id, item_id, quantity) VALUES ($1, $2, $3)', [userId, droppedItem.item_id, 1]);
                    }
                    await client.query('UPDATE players SET last_daily_time = $1 WHERE user_id = $2', [Date.now().toString(), userId]);
                    description += `\n🎁 **${droppedItem.name} (${droppedItem.rarity})** foi adicionado ao seu inventário!`;
                }

            } else {
                const coinGain = Math.floor(rollDice('1d30'));
                await client.query('UPDATE players SET coins = coins + $1, last_daily_time = $2 WHERE user_id =$3', [coinGain, Date.now().toString(), userId ]);
                description += `\n💰Você ganhou **${coinGain}** moedas!`
            }

            await client.query('COMMIT');
            await interaction.reply({content: `${description}`})

            
        } catch(err) {
            console.error(err);
            await interaction.reply({content:'ocorreu um erro ao usar o daily.', ephemeral:true});
        } finally {
            client.release();
        }

    },
};

