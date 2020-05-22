import { Bot } from "../bot";

export class ReadyListener {

    constructor(private _bot: Bot) { }

    public async evalReady() {
        console.log(`Logged in as ${this._bot.getClient().user.tag}`);
        this._bot.afterInit();
    }
}