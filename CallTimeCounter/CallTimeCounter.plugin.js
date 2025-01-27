/**
    * @name CallTimeCounter
    * @description Shows how much time you are in a voice chat.
    * @version 0.0.7
    * @author QWERT
    * @source https://github.com/QWERTxD/BetterDiscordPlugins/blob/main/CallTimeCounter/CallTimeCounter.plugin.js
    * @updateUrl https://raw.githubusercontent.com/QWERTxD/BetterDiscordPlugins/main/CallTimeCounter/CallTimeCounter.plugin.js
    * @website https://github.com/QWERTxD/BetterDiscordPlugins/tree/main/CallTimeCounter
    */

const config = {
    changelog: [
        {
            title: "Fixes",
            type: "fixed",
            items: [
                "Fixed for BetterDiscord 1.8 update."
            ]
        }
    ],
};

var console = {};

const { Webpack, Patcher, React } = BdApi;
const DiscordModules = Webpack.getModule(m => m.dispatch && m.subscribe);
const SelectedChannelStore = Webpack.getStore("SelectedChannelStore");

const PanelSubtext = Webpack.getModule(m => m?.$$typeof?.toString() === "Symbol(react.forward_ref)"
    && m.render?.toString().includes("createHref"), { searchExports: true });

let lastVoice, lastState;

module.exports = class CallTimeCounter {
    constructor(meta) {
        this.meta = meta;
        this.BdApi = new BdApi(this.meta.name);
        console = this.BdApi.Logger;
    }

    start() {
        this.patch();

        this.BdApi.DOM.addStyle(`
       .voiceTimer {
         text-decoration: none !important;
         margin-top: 8px;
       }
       `);
    }

    stop() {
        Patcher.unpatchAll(this.meta.name);
        this.BdApi.DOM.removeStyle();
    }

    patch() {
        Patcher.before(this.meta.name, PanelSubtext, "render", (_, [props], ret) => {
            if (!props?.children?.props?.className?.includes("channel")) return;
            props.children.props.children = [
                props.children.props.children,
                React.createElement(Timer, { className: "voiceTimer" })
            ];
        });
    }
};

class Timer extends React.Component {
    constructor(props) {
        super(props);
        this.connected = this.connected.bind(this);
        this.state = {
            startTime: 0,
            delta: 0
        };
    }

    connected(e) {
        if (e.state && e.state === 'RTC_DISCONNECTED' && !e.hasOwnProperty('streamKey')) {
            this.setState((prev) => (
                prev.startTime = Date.now()));
        }
    }

    componentDidMount() {
        if (lastVoice === SelectedChannelStore.getVoiceChannelId()) {
            DiscordModules.subscribe('RTC_CONNECTION_STATE', this.connected);
            this.setState(lastState);
            this.interval = setInterval(() => {
                this.setState((prev) => (prev.delta = Math.round((Date.now() - prev.startTime) / 1000) * 1000));
                this.setState((prev) => prev.lastVoice = SelectedChannelStore.getVoiceChannelId());
            }, 1000);
        } else {
            this.setState((prev) => (
                prev.startTime = Date.now()));
            DiscordModules.subscribe('RTC_CONNECTION_STATE', this.connected);
            this.interval = setInterval(() => {
                this.setState((prev) => (prev.delta = Math.round((Date.now() - prev.startTime) / 1000) * 1000));
                this.setState((prev) => prev.lastVoice = SelectedChannelStore.getVoiceChannelId());
            }, 1000);
        }
    }

    componentWillUnmount() {
        DiscordModules.unsubscribe('RTC_CONNECTION_STATE', this.connected);
        lastVoice = this.state.lastVoice;
        lastState = this.state;
        setTimeout(() => {
            lastVoice = null;
            lastState = {};
        }, 1000);
        clearInterval(this.interval);
    }

    render() {
        var YY = Math.floor(this.state.delta / 31556952000);
        var MM = Math.floor(this.state.delta / 2629746000);
        var DD = Math.floor(this.state.delta / 86400000);
        var hh = Math.floor(this.state.delta / 3600000);
        var mm = Math.floor(this.state.delta / 60000);
        var ss = Math.floor((this.state.delta % 60000) / 1000);

        let timeString = '';
        if (YY > 0) timeString += `${YY}y `;
        if (MM > 0) timeString += `${MM}m `;
        if (DD > 0) timeString += `${DD}d `;
        if (hh > 0) timeString += `${hh}h `;
        if (mm > 0) timeString += `${mm}m `;
        if (ss > 0) timeString += `${ss}s`;

        return React.createElement("div", { className: "voiceTimer" }, `Time elapsed: ${timeString}`);
    }
};
