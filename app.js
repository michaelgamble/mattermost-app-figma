const express = require('express');
const fetch = require('node-fetch');
//const Client4 = require('mattermost-redux/client');

const app = express();
app.use(express.json());
const host = 'localhost';
const port = 8080;

app.listen(port, host, () => {
    console.log(`hello-world app listening at http://${host}:${port}`);
});

app.get('/manifest.json', (req, res) => {
    res.json({
        app_id: 'hello-world',
        display_name: 'Hello, world!',
        app_type: 'http',
        icon: 'icon.png',
        root_url: 'http://localhost:8080',
        requested_permissions: [
            'act_as_user',
            'act_as_bot',
            'act_as_admin',
        ],
        requested_locations: [
            '/channel_header',
            '/command',
        ],
    });
});

app.post('/bindings', (req, res) => {
    res.json({
        type: 'ok',
        data: [
            {
                location: '/channel_header',
                bindings: [
                    {
                        location: 'send-button',
                        icon: 'icon.png',
                        label: 'send hello message',
                        call: {
                            path: '/send-modal',
                        },
                    },
                ],
            },
            {
                location: '/command',
                bindings: [
                    {
                        icon: 'icon.png',
                        label: 'helloworld',
                        description: 'Hello World app',
                        hint: '[send]',
                        bindings: [
                            {
                                location: 'send',
                                label: 'send',
                                call: {
                                    path: '/send',
                                },
                            },
                        ],
                    },
                ],
            },
        ],
    });
});

app.post(['/send/form', '/send-modal/submit'], (req, res) => {
    res.json({
        type: 'form',
        form: {
            title: 'Hello, world!',
            icon: 'icon.png',
            fields: [
                {
                    type: 'channel',
                    name: 'channelname',
                    label: 'channel-name',
                    modal_label: 'Channel Name',
                },{
                    type: 'text',
                    name: 'message',
                    label: 'message',
                    modal_label: 'Message',
                },
            ],
            call: {
                path: '/send',
                expand: {
                    acting_user_access_token: 'all',
                    // bot_access_token: 'all',
                },
            },
        },
    });
});

app.get('/static/icon.png', (req, res) => {
    res.sendFile(__dirname + '/icon.png');
});

app.use(express.json());

app.post('/send/submit', async (req, res) => {
    const call = req.body;

    let message = 'Hello, world!';
    const submittedMessage = call.values.message;
    if (submittedMessage) {
        message += ' ...and ' + submittedMessage + '!';
    }

    const users = [
        call.context.bot_user_id,
        call.context.acting_user_id,
    ];
    const teamid = call.context.team_id;
    //NOTE - im not sure if this line is correct??
    const channelid = call.values.channelname.value;
    const botuserid = call.context.bot_user_id;

    // const client = new Client4();
    // client.setUrl(call.context.mattermost_site_url);
    // client.setToken(call.context.bot_access_token);

    // client.

    // Use the app bot to do API calls
    const options = {
        method: 'POST',
        headers: {
            Authorization: 'BEARER ' + call.context.admin_access_token,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(users),
    };

    // Get the DM channel between the user and the bot
    const mattermostSiteURL = call.context.mattermost_site_url;

    const teammembership = {
        team_id: teamid,
        user_id: botuserid,
    }

    console.log(teammembership);
    
    //POST - Sending the membership object
    options.body = JSON.stringify(teammembership);

    const joinTeamURL = mattermostSiteURL + '/api/v4/teams/' + teamid + '/members';
    console.log(call)
    const joinTeam = await makeRequest(joinTeamURL, call.context.acting_user_access_token, teammembership);

    const channelmembership = {
        user_id: botuserid,
    }

    //Note - does this make any sense?
    options.body = JSON.stringify(channelmembership);
    //Note - fix this to use the right api

    const joinChannelURL = mattermostSiteURL + '/api/v4/channels/' + channelid + '/members';
    const joinchannel = await makeRequest(joinChannelURL, call.context.acting_user_access_token, channelmembership);

    //OLD API call to create direct message
    // const channel = await fetch(mattermostSiteURL + '/api/v4/channels/direct', options).
    //   then((res) => res.json())

    //Note - fix this to point to the channel selected in the form    
    // {
    //     "file_ids": [],
    //     "message": "adfasdfa",
    //     "channel_id": "qmixu6rznjgdzmmd84noyo4mow",
    //     "pending_post_id": "db9jgxshhfyymy9p8efc71htxc:1626463834646",
    //     "user_id": "db9jgxshhfyymy9p8efc71htxc",
    //     "create_at": 0,
    //     "metadata": {},
    //     "props": {
    //         "disable_group_highlight": true
    //     },
    //     "update_at": 1626463834655,
    //     "reply_count": 0
    // }
        const post = {
        //channel_id: channel.id,
        //channelname,
        channel_id: channelid,
        message,
    };

    console.log('Mike' + JSON.stringify(post));

    // Create a post
    options.body = JSON.stringify(post);

    const createPostURL = mattermostSiteURL + '/api/v4/posts';
    const createPost = await makeRequest(createPostURL, call.context.bot_access_token, post)

    res.json({
        type: 'ok',
        markdown: 'Created a post in your DM channel.'
    });
});

const makeRequest = async (url, token, body) => {
    const options = {
        method: 'POST',
        headers: {
            Authorization: 'BEARER ' + token,
            'Content-Type': 'application/json',
        },
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    console.log(options);

    const res = await fetch(url, options).then(r => r.json());
    console.log(res);
    return res;
}