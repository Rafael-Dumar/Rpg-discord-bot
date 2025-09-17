import { Events } from "discord.js";

export default{
    name: Events.ClientReady,
    once: true,
    execute(client){
        console.log(`o bot esta online como ${client.user.tag}`)
    }

}