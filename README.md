# Crystal
# Setting Crystal up
## Config file
Crystal needs a `config.json` file with the following content:
```json
{
   
}
```
## Starting the container
Crystal gets automatically builded and deployed on [Docker Hub](https://hub.docker.com/r/giyomoon/crystal) and can be pulled from there.

The container can be run with the following command:
```bash
docker run -d -v PATH_TO_YOUR_CONFIG_FILE:/crystal/config/config.json:ro -v PATH_TO_YOUR_DATABASE_FILE:/database/bot.db --name Crystal giyomoon/crystal
```

For example:
```bash
docker run -d -v /srv/data/crystal/config/config.json:/crystal/config/config.json:ro -v /srv/data/crystal/database/bot.db:/database/bot.db --name Crystal giyomoon/crystal
```
