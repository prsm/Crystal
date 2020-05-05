import { iBot } from "../bot";

export class ReadyListener {

    constructor(private _botClient: iBot) { }

    public async evalReady() {
        console.log(`Logged in as ${this._botClient.getClient().user.tag}`);
        this._botClient.afterInit();
    }
}