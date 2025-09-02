import { REST, Routes } from 'discord.js';
import dotenv from 'dotenv';
dotenv.config();
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const commands = [];
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
	const fileUrl = pathToFileURL(filePath)
    const {default: command} = await import(fileUrl);
    commands.push(command.data.toJSON());
}

// Configuração para enviar os comandos para a API do Discord
const rest = new REST({ version: '10' }).setToken(process.env.bot_token);


// Função auto-executável para registrar os comandos
(async () => {
	try {
		console.log(`Iniciando o registro de ${commands.length} comandos (/).`);

		// O método put é usado para registrar/sincronizar os comandos
		const data = await rest.put(
			Routes.applicationCommands(process.env.client_id),
			{ body: commands },
		);

		console.log(`✅ ${data.length} comandos (/) registrados com sucesso.`);
	} catch (error) {
		console.error(error);
	}
})();