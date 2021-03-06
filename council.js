const { registerJoystreamTypes } = require('@joystream/types');
const { ApiPromise, WsProvider } = require('@polkadot/api');
const TelegramBot = require('node-telegram-bot-api');
// replace the value below with the Telegram token you receive from @BotFather
const token = 'yourowntoken';
// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token);
//get chat id here https://stackoverflow.com/questions/32423837/telegram-bot-how-to-get-a-group-chat-id
const chatid = 'yourownchat';

async function main () {
    registerJoystreamTypes()
    // Create the API and wait until ready
    const api = await ApiPromise.create({
        provider: new WsProvider() 
    })
    var lastcouncilnotif = 0

    const unsubscribe = await api.rpc.chain.subscribeNewHeads(async (header) => {
        const block = header.number.toNumber()
        const councilround = await api.query.councilElection.round()
        const councilendterm = await api.query.council.termEndsAt()
        const annperiod = await (await api.query.councilElection.announcingPeriod()).toNumber()
        const votingperiod = await (await api.query.councilElection.votingPeriod()).toNumber()
        const revealingperiod = await (await api.query.councilElection.revealingPeriod()).toNumber()
        const councilstage = await getcouncilStage(api)
        const councilperiod = await api.query.councilElection.newTermDuration()

        switch (councilstage){
            case null:
                console.log('Council has been elected')
                if (block>lastcouncilnotif){
                    bot.sendMessage(chatid, `New council has been elected at block ${councilendterm-councilperiod}.`, { parse_mode: 'html' })
                    lastcouncilnotif=councilendterm
                }
                break;

            default:
                const annstage = councilstage.Announcing
                const votingstage = councilstage.Voting
                const revealingstage = councilstage.Revealing
                if (annstage>0) {
                    console.log('Announcing Stage')
                    if (block>lastcouncilnotif){
                        bot.sendMessage(chatid, `New council election for round ${councilround} has been started at block ${annstage-annperiod}. You can apply now!`, { parse_mode: 'html' })
                        lastcouncilnotif=annstage
                    }
                }
                if (votingstage>0) {
                    console.log('Voting Stage')
                    if (block>lastcouncilnotif){
                        bot.sendMessage(chatid, `Voting stage for council election has been started at block ${votingstage-votingperiod}. You can vote now!`, { parse_mode: 'html' })
                        lastcouncilnotif=votingstage
                    }
                }
                if (revealingstage>0) {
                    console.log('Revealing Stage')
                    if (block>lastcouncilnotif){
                        bot.sendMessage(chatid, `Revealing stage for council election has been started at block ${revealingstage-revealingperiod}. Don't forget to reveal your vote!`, { parse_mode: 'html' })
                        lastcouncilnotif=revealingstage
                    }
                }       

                break;
        }
    })
}

const getcouncilStage = async (api) => {
    const councilstage = await api.query.councilElection.stage()
	const councilstagejson = councilstage.toJSON()
	return councilstagejson
}

main()
