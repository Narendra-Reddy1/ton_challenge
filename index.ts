import { getHttpEndpoint } from "@orbs-network/ton-access";
import { BN } from "bn.js";
import { Address, TonClient, toNano } from "ton"
import { MineMessageParams, Queries } from "./src/giver/NftGiver.data";
import { unixNow } from "./src/lib/utils";
const qrcode = require("qrcode-terminal");
//
async function main() {
    const wallet = Address.parse("0QCuVOJLy2Eyv9jmQWBFvCk_mtEwplzNkbdsq27lFB1WXF-U")
    const collection = Address.parse("EQDk8N7xM5D669LC2YACrseBJtDyFqwtSPCNhRWXU7kjEptX");

    var endpoint = await getHttpEndpoint({
        network: "testnet",
    });
    var client = new TonClient({ endpoint });
    const miningData = await client.callGetMethod(collection, "get_mining_data");
    console.log(miningData);
    const parseToBigInt = (s: any) => new BN(s.substring(2), 'hex');
    console.log(typeof miningData.stack[0][1]);
    const complexity = parseToBigInt(miningData.stack[0][1]);
    const last_mined_timestamp = parseToBigInt(miningData.stack[1][1]);
    const seed = parseToBigInt(miningData.stack[2][1]);
    const target_delta = parseToBigInt(miningData.stack[3][1]);
    const min_cpl = parseToBigInt(miningData.stack[4][1]);
    const max_cpl = parseToBigInt(miningData.stack[5][1]);

    console.log(complexity);
    console.log(last_mined_timestamp);
    console.log(seed);
    console.log(target_delta);
    console.log(min_cpl);
    console.log(max_cpl);

    const mineParams: MineMessageParams = {
        expire: unixNow() + 300,
        mintTo: wallet,
        data1: new BN(0),
        seed
    }

    let msg = Queries.mine(mineParams);
    let progress = 0;
    while (new BN(msg.hash(), "be").gt(complexity)) {
        progress += 1
        console.clear()
        console.log(`Mining started: please, wait for 30-60 seconds to mine your NFT!`)
        console.log(' ')
        console.log(`⛏ Mined ${progress} hashes! Last: `, new BN(msg.hash(), 'be').toString())

        mineParams.expire = unixNow() + 300;
        mineParams.data1.iaddn(1);
        msg = Queries.mine(mineParams);
    }

    console.log(' ')
    console.log('💎 Mission completed: msg_hash less than pow_complexity found!');
    console.log(' ')
    console.log('msg_hash: ', new BN(msg.hash(), 'be').toString())
    console.log('pow_complexity: ', complexity.toString())
    console.log('msg_hash < pow_complexity: ', new BN(msg.hash(), 'be').lt(complexity))


    console.log(' ');
    console.log("💣 WARNING! As soon as you find the hash, you should quickly send the transaction.");
    console.log("If someone else sends a transaction before you, the seed changes, and you'll have to find the hash again!");
    console.log(' ');
    const collectionAddr = collection.toFriendly({
        urlSafe: true,
        bounceable: true
    });
    const amountToSend = toNano("0.05").toString();
    const body = msg.toBoc().toString("base64url");

    const tonDeeplink = function (address: string, amount: string, body: string) {
        return `ton://transfer/${address}?amount=${amount}&bin=${body}`;
    };


    const link = tonDeeplink(collectionAddr, amountToSend, body);
    console.log('🚀 Link to receive an NFT:')
    console.log(link);
    qrcode.generate(link, { small: true }, function (qrcode: any) {
        console.log('🚀 Link to mine your NFT (use Tonkeeper in testnet mode):')
        console.log(qrcode);
        console.log('* If QR is still too big, please run script from the terminal. (or make the font smaller)')
    });
}

main();
