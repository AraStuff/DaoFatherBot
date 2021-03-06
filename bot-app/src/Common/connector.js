const connect = require('@aragon/connect');
const TokenManager = require('@aragon/connect-thegraph-tokens');
const Voting = require('@aragon/connect-thegraph-voting');
const Finance = require('@aragon/connect-finance');
const Web3 = require('web3');
const EMPTY_SCRIPT = '0x00000001';
// const TOKENS_APP_ADDRESS = '0x459af03894cb2ed9bfad56c9bfeb4e63ad182736';
const TOKENS_APP_SUBGRAPH_URL =
  'https://api.thegraph.com/subgraphs/name/aragon/aragon-tokens-rinkeby';
const FINANCE_APP_SUBGRAPH_URL =
	'https://api.thegraph.com/subgraphs/name/0xgabi/aragon-finance-rinkeby';

const fetchVotes = async (address) => {
	const org = await connect.connect(
		address,
		'thegraph',
		{ chainId: 4 },
	);
	const apps = await org.apps();
	const result = apps.find(obj => {
		return obj.name === 'voting';
	});
	const voting = new Voting.Voting(
		result.address,
		'https://api.thegraph.com/subgraphs/name/aragon/aragon-voting-rinkeby',
		false,
	);
	const votes = await voting.votes();
	const processedVotes = await Promise.all(
		votes.map(async (vote) => processVote(vote, apps, org.provider)),
	);
	processedVotes.reverse();
	return processedVotes;
};

const processVote = async (vote, apps, provider) => {
	if (vote.script === EMPTY_SCRIPT) {
		return vote;
	}

	const [{ description }] = await connect.describeScript(
		vote.script,
		apps,
		provider,
	);
	return { ...vote, metadata: description };
};

const fetchTokenHolders = async (address) => {
	const org = await connect.connect(
		address,
		'thegraph',
		{ chainId: 4 },
	);
	const apps = await org.apps();
	const result = apps.find(obj => {
		return obj.name === 'token-manager';
	});
	const tokenManager = new TokenManager.TokenManager(
		result.address,
		TOKENS_APP_SUBGRAPH_URL,
	);
	return await tokenManager.token();
};

const votesSocket = async (address, cbfunc, id) =>{
	let status = false;
	const org = await connect.connect(
		address,
		'thegraph',
		{ chainId: 4 },
	);
	const apps = await org.apps();
	const result = apps.find(obj => {
		return obj.name === 'voting';
	});
	const voting = new Voting.Voting(
		result.address,
		'https://api.thegraph.com/subgraphs/name/aragon/aragon-voting-rinkeby',
		false,
	);
	voting.onVotes(async (event)=>{
		if(!status) {
			status = true;
			return;
		}
		const processedVotes = await Promise.all(
			event.map(async (evt) => processVote(evt, apps, org.provider)),
		);
		console.log('got vote');

		cbfunc(processedVotes[processedVotes.length - 1], id);
	},
	);
};

const fetchBalance = async (address) => {
	const org = await connect.connect(
		address,
		'thegraph',
		{ chainId: 4 },
	);
	const apps = await org.apps();
	const result = apps.find(obj => {
		return obj.name === 'finance';
	});
	const finance = new Finance.Finance(
		result.address,
		FINANCE_APP_SUBGRAPH_URL,
	);
	const wei = (await finance.balance('0x0000000000000000000000000000000000000000')).balance;
	const web3 = new Web3();
	const eth = web3.utils.fromWei(wei, 'ether');
	console.log(eth);
	return eth;
};

const fetchTx = async (address) => {
	const org = await connect.connect(
		address,
		'thegraph',
		{ chainId: 4 },
	);
	const apps = await org.apps();
	const result = apps.find(obj => {
		return obj.name === 'finance';
	});
	const finance = new Finance.Finance(
		result.address,
		FINANCE_APP_SUBGRAPH_URL,
	);
	console.log(await finance.transactions());
	const txlist = await finance.transactions();
	const web3 = new Web3();
	for (let i = 0; i < txlist.length; i++) {
		txlist[i].amount = web3.utils.fromWei(txlist[i].amount, 'ether');
	}
	console.log(txlist);
	return txlist;
};

const txSocket = async (address, callbck, id) => {
	let status = false;
	const org = await connect.connect(
		address,
		'thegraph',
		{ chainId: 4 },
	);
	const apps = await org.apps();
	const result = apps.find(obj => {
		return obj.name === 'finance';
	});
	const finance = new Finance.Finance(
		result.address,
		FINANCE_APP_SUBGRAPH_URL,
	);
	await finance.onTransactions((txlist)=>{
		if (!status) {
			status = true;
			return;
		}
		processTx(txlist, callbck, id);
	});

};

const processTx = (txlist, callbck, id) => {
	const web3 = new Web3();
	txlist[txlist.length - 1].amount = web3.utils.fromWei(txlist[txlist.length - 1].amount, 'ether');
	console.log(txlist[txlist.length - 1]);
	callbck(txlist[txlist.length - 1], id);
	return txlist[txlist.length - 1];

};

const orgAddressFinance = async (address)=> {
	const org = await connect.connect(
		address,
		'thegraph',
		{ chainId: 4 },
	);
	const apps = await org.apps();
	const result = apps.find(obj => {
		return obj.name === 'finance';
	});
	return result.address;
};

const orgAddressVoting = async (address)=> {
	const org = await connect.connect(
		address,
		'thegraph',
		{ chainId: 4 },
	);
	const apps = await org.apps();
	const result = apps.find(obj => {
		return obj.name === 'voting';
	});
	return result.address;
};

module.exports = {
	fetchVotes,
	fetchTokenHolders,
	votesSocket,
	fetchBalance,
	fetchTx,
	txSocket,
	orgAddressFinance,
	orgAddressVoting,
};
