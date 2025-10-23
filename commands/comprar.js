import { SlashCommandBuilder } from "discord.js";
import pool from "../database.js";


export default {
    data: new SlashCommandBuilder()
        .setName('comprar')
        .setDescription('Compra um item da loja')
        .addIntegerOption(option =>
            option.setName('item_id')
            .setDescription('O ID do item que você quer comprar (visto na /loja).')
            .setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName('quantidade')
            .setDescription('Quantos itens você quer comprar (padrão: 1).')
            .setRequired(true),
        ),
    async execute(interaction) {
        const userId = interaction.user.id;
        const itemId = interaction.options.getInteger('item_id');
        const quantity = interaction.options.getInteger('quantidade');

        if (quantity <= 0) {
            return interaction.reply({content: 'A quantidade precisa ser pelo menos 1.', ephemeral: true});
        }
        const client = await pool.connect()

        try {
            await client.query('BEGIN');
            const itemResult = await client.query('SELECT * FROM items WHERE item_id = $1 AND for_sale = true', [itemId])
            const playerResult = await client.query('SELECT coins FROM players WHERE user_id = $1 FOR UPDATE', [userId])

            if (itemResult.rowCount === 0) {
                await client.query('ROLLBACK');
                return interaction.reply({content: `O item com ID \`${itemId}\` não foi encontrado na loja.`, ephemeral: true});
            }

            if (playerResult.rowCount === 0) {
                await client.query('ROLLBACK');
                return interaction.reply({content: 'Você precisa criar um personagem primeiro! Use `/criar-personagem`.', ephemeral: true});
            }

            const item = itemResult.rows[0];
            const player = playerResult.rows[0];
            const totalCost = item.price * quantity;
            // verifica se o jogador tem moedas suficientes
            if (player.coins < totalCost) {
                await client.query('ROLLBACK');
                return interaction.reply({content: `Você não tem moedas suficientes! Você precisa de **${totalCost}** moedas, mas só tem **${player.coins}**.`, ephemeral: true});
            }
            // subtrai as moedas do jogador
            await client.query('UPDATE players SET coins = coins - $1 WHERE user_id = $2', [totalCost, userId]);
            const inventoryCheck = await client.query ('SELECT * FROM inventories WHERE user_id = $1 AND item_id = $2', [userId, itemId]);

            if (inventoryCheck.rowCount > 0){
                // Se já tem, atualiza a quantidade
                await client.query('UPDATE inventories SET quantity = quantity + $1 WHERE user_id = $2 AND item_id = $3', [quantity, userId, itemId]);
            } else {
                // se não tem, insere um novo
                await client.query('INSERT INTO inventories (user_id, item_id, quantity) VALUES ($1, $2, $3)', [userId, itemId, quantity]);
            }

            await client.query('COMMIT');
            await interaction.reply({content: `✅ Compra realizada com sucesso! \nVocê comprou **${quantity}x ${item.name}** por **${totalCost}** moedas.`, ephemeral: true});


        }catch(err){
            await client.query('ROLLBACK');
            console.error("Erro na transação: ", err);
            await interaction.reply({content: 'Ocorreu um erro ao processar sua compra.', ephemeral: true});
        } finally{
            client.release();
        }
    },
    
    
};