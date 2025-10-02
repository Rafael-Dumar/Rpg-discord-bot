import dotenv from 'dotenv'
dotenv.config()
import { Client, Events, GatewayIntentBits, Collection, EmbedBuilder} from 'discord.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { monsterCache } from './util/monsterCache.js';


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

//CARREGADOR DE COMANDOS
client.commands = new Collection();
client.buttons = new Collection()
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
//CARREGADOR DE EVENTOS
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const fileUrl = pathToFileURL(filePath);
    const { default: event } = await import(fileUrl);

    // Passamos o mapa 'activeCombats' para os eventos que precisam dele
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, activeCombats));
    } else {
        client.on(event.name, (...args) => event.execute(...args, activeCombats));
    }
}

//CARREGADOR DE BOTÕES
const buttonsPath = path.join(__dirname, 'buttons');
const buttonFiles = fs.readdirSync(buttonsPath).filter(file => file.endsWith('.js'));
for (const file of buttonFiles) {
    const filePath = path.join(buttonsPath, file);
    const fileUrl = pathToFileURL(filePath);
    const {default: button} = await import(fileUrl);
    client.buttons.set(button.customId, button);
}

// Carrega o cache de monstros ao iniciar o bot
(async () => {
    try {
        await monsterCache(),
        console.log('Cache de monstros carregado.');
        client.login(process.env.bot_token);
    } catch (error) {
        console.error('Erro ao carregar o cache de monstros:', error);
    }
})();
