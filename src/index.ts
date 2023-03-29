import {
	Client,
	GuildChannel,
	Channel,
	GatewayIntentBits,
	ChannelType,
	CategoryChannel,
	DMChannel,
	NonThreadGuildBasedChannel,
} from 'discord.js';
import { config } from 'dotenv';

config();

const client = new Client({
	intents: [GatewayIntentBits.Guilds],
});

let currentlyMoving: Record<string, boolean> = {};
client.on('ready', async () => {
	console.log(`Logged in as ${client.user?.tag}!`);
});

client.on('channelCreate', (channel) => {
	alphabetizeChannels(getChannelCategory(channel));
});

client.on('channelUpdate', (oldChannel, newChannel: Channel) => {
	if (
		!(oldChannel instanceof GuildChannel) ||
		!(newChannel instanceof GuildChannel) ||
		oldChannel.rawPosition === newChannel.rawPosition
	) {
		return;
	}

	alphabetizeChannels(getChannelCategory(newChannel));
});

client.on('channelDelete', (channel) => {
	alphabetizeChannels(getChannelCategory(channel));
});

async function alphabetizeChannels(channel?: Channel) {
	if (!channel || !(channel instanceof CategoryChannel)) {
		return;
	}
	if (currentlyMoving[channel.id]) {
		return;
	}
	currentlyMoving[channel.id] = true;

	console.group(`Alphabetizing ${channel.name}`);
	const channels = Array.from(channel.children.cache.filter((ch) => ch.type === ChannelType.GuildText).values());
	if (!channels) {
		currentlyMoving[channel.id] = false;
		return;
	}
	const sortedChannels = [...channels.values()].sort((a, b) =>
		a.type > b.type ? 1 : -1 && a.name.localeCompare(b.name),
	);
	console.log(
		'New Order: ',
		sortedChannels.map((x, i) => `${x.type === 0 ? 'T' : 'V'}) ${x.name} (${x.rawPosition} -> ${i})`),
	);

	const idToIndex = new Map<string, number>();
	channels.forEach((channel, index) => idToIndex.set(channel.id, channel.position));

	const moves: Array<Promise<GuildChannel>> = [];

	while (true) {
		let maxDiff = -1;
		let maxDiffIndex = -1;

		sortedChannels.forEach((channel, sortedIndex) => {
			const originalIndex = idToIndex.get(channel.id) as number;
			const diff = Math.abs(originalIndex - sortedIndex);

			if (diff > maxDiff) {
				maxDiff = diff;
				maxDiffIndex = sortedIndex;
			}
		});

		if (maxDiff <= 0) {
			break;
		}

		if (sortedChannels[maxDiffIndex].rawPosition !== maxDiffIndex) {
			console.log(
				`Moving ${sortedChannels[maxDiffIndex].name} in ${sortedChannels[maxDiffIndex].parent!.name} from ${
					sortedChannels[maxDiffIndex].position
				} to ${maxDiffIndex}`,
			);
			await sortedChannels[maxDiffIndex].setPosition(maxDiffIndex);
		}

		idToIndex.set(sortedChannels[maxDiffIndex].id, maxDiffIndex);
		channels[maxDiffIndex] = sortedChannels[maxDiffIndex];
	}

	console.log(`Done alphabetizing ${channel.name}`);
	console.groupEnd();
	currentlyMoving[channel.id] = false;
}

function getChannelCategory(channel: Channel | DMChannel | NonThreadGuildBasedChannel) {
	if (channel instanceof CategoryChannel) {
		return channel;
	}

	if (channel instanceof GuildChannel) {
		return channel.parent!;
	}
}

client.login(process.env.DISCORD_TOKEN);
