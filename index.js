import dotenv from 'dotenv'
dotenv.config()
import { Client, Events, GatewayIntentBits, Collection, EmbedBuilder} from 'discord.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent
    ]
});

const activeCombats = new Map();

client.commands = new Collection();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const fileUrl = pathToFileURL(filePath);
    const {default: command} = await import(fileUrl);
    client.commands.set(command.data.name, command);
}


client.once(Events.ClientReady, readyClient => {
    console.log(`o bot esta online como ${readyClient.user.tag}`)
})

client.on(Events.InteractionCreate, async interaction => {
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
        const userId = interaction.user.id
        const combat = activeCombats.get(userId)

        // se não tiver uma batalha ativa para o usuario ele vai ignorar
        if (!combat) {
            await interaction.reply({content: "Esta batalha não esta mais ativa.", ephemeral: true})
            return;
        }
        // botão atacar
        if (interaction.customId === 'attack_button') {
            const player = combat.playerData;
            const monster = combat.monsterData;

            // logica de dano (teste)
            const damageDealt = player.attack_power;
            monster.hit_points -= damageDealt;

            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle(`Batalha contra ${monster.name}!`)
                .setDescription(`Você ataca o ${monster.name} e causa **${damageDealt}** de dano!\n\n HP do monstro **${monster.hit_points}**`)

            // se o monstro foi derrotado
            if (monster.hit_points <= 0) {
                embed.setDescription(`Você derrotou o ${monster.name}!`)
                activeCombats.delete(userId) // remove a batalha do mapa
                //remove os botões de mensagem
                await interaction.update({embeds: [embed], components: []});
            } else {
                // atualiza a mensagem com o hp atual do monstro
                await interaction.update({embeds:[embed]});
            }
        }

        //logica de fugir ( teste)
        else if(interaction.customId ==='run_button') {
            activeCombats.delete(userId);
            await interaction.update({content: 'Você fugiu da batalha!', embeds: [], components:[]});
        }
    }
});
client.login(process.env.bot_token);
