# Crystal
# Setting Crystal up
## Config file
Crystal needs a `config.json` file with the following content:
```json
{
    "botOwnerID": "239810643581075457",
    "botToken": "BOTTOKEN",
    "prefix": "!",
    "botID": "678633764766744605",
    "DBLogging": false,
    "DBPath": "/database/bot.db",
    "TempPath": "/tmp",
    "guildID": "274249720736514048",
    "embedColor": "FF6B6B",
    "botVersion": "2.3.6",
    "botVersionDate": "18.10.2021",
    "welcomeChannelID": "698534201993068596",
    "memberRoleID": "482904616179204096",
    "dynamicVoiceCategoryID": "728591313741545542",
    "twitchStreamChannelID": "718731123580207144",
    "streamIDs": [
        104113408,
        185054922,
        62695277,
        406815168,
        88622388,
        486301264,
        509882914,
        271732070,
        430448985,
        274091124,
        65251238,
        595361294,
        38038138,
        65138489,
        110472956,
        255321772
    ],
    "twitchClientID": "TWITCH_CLIENT_ID",
    "twitchClientSecret": "TWITCH_CLIENT_SECRET",
    "twitchRoleID": "718738629790531614",
    "callbackURL": "CALLBACK_URL",
    "callbackPort": 80,
    "twitchUsers": {
        "104113408": "239810643581075457",
        "185054922": "200663245424558080",
        "62695277": "252108325024432128",
        "406815168": "188004498650693633",
        "88622388": "314102721147830273",
        "486301264": "160844666953138176",
        "509882914": "441702747415379969",
        "271732070": "369517185011286017",
        "430448985": "306863310010318858",
        "274091124": "508270034527846411",
        "65251238": "191923999071010816",
        "595361294": "765898062459568159",
        "38038138": "214106596211425280",
        "65138489": "231888715771805697",
        "110472956": "235749689272565762",
        "255321772":  "296752692720828417"
    },
    "landingChannelID": "356728457788522498",
    "eventChannelID": "601397385939255297",
    "eventCategoryID": "601399105607958529",
    "logChannelID": "644488046917713930",
    "levelExcludedTextChannels": [
        "401439160306630666"
    ],
    "levelExcludedVoiceChannels": [
        "328533625450659840"
    ],
    "experiencePerMsg": 5,
    "experiencePerVoiceMin": 1,
    "botChannel": "401439160306630666",
    "roleSeparatorID": "719563620501160039",
    "eventSeparatorID": "719563762553847918",
    "archiveCategoryID": "628951145167061021",
    "moderatorRoleID": "623958257957863424"
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
