const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');
require('dotenv').config();

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const CORE_API_URL = process.env.CORE_API_URL || 'http://localhost:8080';
const NODE_EXPORTER_URL = process.env.NODE_EXPORTER_URL || 'http://localhost:9100';

if (!TOKEN) {
    console.warn('[DiscordBot] DISCORD_BOT_TOKEN is not set. Bot process will idle.');
    process.exit(0);
}

// Bật thêm GuildMessages và MessageContent để đọc tin nhắn chat văn bản thông thường
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const commands = [
    new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Kiểm tra độ trễ của Bot'),
    new SlashCommandBuilder()
        .setName('health')
        .setDescription('Kiểm tra trạng thái sức khỏe của Backend API, DB và Redis'),
    new SlashCommandBuilder()
        .setName('server')
        .setDescription('Xem thông số hiệu năng máy chủ VPS (CPU, RAM, Uptime)')
].map(cmd => cmd.toJSON());

async function registerCommands() {
    try {
        if (!CLIENT_ID) {
            console.log('[DiscordBot] Skipping slash command registration (DISCORD_CLIENT_ID not specified).');
            return;
        }
        const rest = new REST({ version: '10' }).setToken(TOKEN);
        console.log('[DiscordBot] Registering global application (/) commands...');
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
        console.log('[DiscordBot] Global commands registered successfully.');
    } catch (err) {
        console.error('[DiscordBot] Failed to register application commands:', err.message);
    }
}

// Helper: Embed đo ping
function buildPingEmbed(pingMs, apiPingMs) {
    return new EmbedBuilder()
        .setTitle('🏓 Pong!')
        .setColor(0x2ECC71)
        .addFields(
            { name: 'Bot Latency', value: `${pingMs}ms`, inline: true },
            { name: 'API Latency', value: `${Math.round(apiPingMs)}ms`, inline: true }
        )
        .setTimestamp();
}

// Helper: Embed kiểm tra Health Actuator
async function buildHealthEmbed() {
    try {
        const res = await axios.get(`${CORE_API_URL}/actuator/health`, { timeout: 4000 });
        const isUp = res.data && res.data.status === 'UP';

        const embed = new EmbedBuilder()
            .setTitle(isUp ? '✅ Core-API System: UP' : '⚠️ Core-API System: Degraded')
            .setColor(isUp ? 0x2ECC71 : 0xE67E22)
            .setDescription(`Endpoint: \`${CORE_API_URL}/actuator/health\``)
            .setTimestamp();

        if (res.data.components) {
            const comps = res.data.components;
            Object.keys(comps).forEach(key => {
                const compStatus = comps[key]?.status || 'UNKNOWN';
                const icon = compStatus === 'UP' ? '🟢' : '🔴';
                embed.addFields({
                    name: `${icon} ${key.toUpperCase()}`,
                    value: `Status: **${compStatus}**`,
                    inline: true
                });
            });
        } else {
            embed.addFields({ name: 'Status', value: `**${res.data.status}**`, inline: true });
        }
        return embed;
    } catch (err) {
        return new EmbedBuilder()
            .setTitle('🚨 Core-API is DOWN / Unreachable')
            .setColor(0xE74C3C)
            .setDescription(`Không thể kết nối tới Backend API tại \`${CORE_API_URL}\`.\n**Chi tiết lỗi:** \`${err.message}\``)
            .setTimestamp();
    }
}

// Helper: Embed kiểm tra RAM & CPU VPS
async function buildServerEmbed() {
    try {
        const res = await axios.get(`${NODE_EXPORTER_URL}/metrics`, { timeout: 4000 });
        const metricsText = res.data;

        const memTotalMatch = metricsText.match(/node_memory_MemTotal_bytes\s+([0-9.e+]+)/);
        const memAvailMatch = metricsText.match(/node_memory_MemAvailable_bytes\s+([0-9.e+]+)/);

        let memPercent = 'N/A';
        let memTotalGb = 'N/A';
        let memUsedGb = 'N/A';

        if (memTotalMatch && memAvailMatch) {
            const total = parseFloat(memTotalMatch[1]);
            const avail = parseFloat(memAvailMatch[1]);
            const used = total - avail;
            memPercent = ((used / total) * 100).toFixed(1);
            memTotalGb = (total / (1024 * 1024 * 1024)).toFixed(2);
            memUsedGb = (used / (1024 * 1024 * 1024)).toFixed(2);
        }

        return new EmbedBuilder()
            .setTitle('🖥️ VPS Performance & Metrics')
            .setColor(0x3498DB)
            .addFields(
                { name: '🧠 RAM Usage', value: `**${memPercent}%** (${memUsedGb}GB / ${memTotalGb}GB)`, inline: false },
                { name: '📡 Node Exporter', value: `\`${NODE_EXPORTER_URL}\` (Connected)`, inline: true }
            )
            .setTimestamp();
    } catch (err) {
        return new EmbedBuilder()
            .setTitle('⚠️ Node Exporter Unreachable')
            .setColor(0xE67E22)
            .setDescription(`Không thể đọc thông số từ \`${NODE_EXPORTER_URL}\`: \`${err.message}\``)
            .setTimestamp();
    }
}

client.once('ready', async () => {
    console.log(`[DiscordBot] Logged in as ${client.user.tag}!`);
    await registerCommands();
});

// Xử lý Slash Commands (Gõ dấu /)
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'ping') {
        const ping = Date.now() - interaction.createdTimestamp;
        return interaction.reply({ embeds: [buildPingEmbed(ping, client.ws.ping)] });
    }

    if (commandName === 'health') {
        await interaction.deferReply();
        const embed = await buildHealthEmbed();
        return interaction.editReply({ embeds: [embed] });
    }

    if (commandName === 'server') {
        await interaction.deferReply();
        const embed = await buildServerEmbed();
        return interaction.editReply({ embeds: [embed] });
    }
});

// Xử lý Chat văn bản thông thường (Khi tag @Bot hoặc nhắn tin cho Bot)
client.on('messageCreate', async message => {
    // Bỏ qua tin nhắn từ chính bot hoặc bot khác
    if (message.author.bot) return;

    // Kiểm tra xem tin nhắn có tag con bot không, hoặc chat trong kênh DM
    const isMentioned = message.mentions.has(client.user.id);
    if (!isMentioned && message.guild) return;

    const content = message.content.toLowerCase().trim();

    // 1. Kiểm tra sức khỏe hệ thống (Health / Status)
    if (content.includes('health') || content.includes('status') || content.includes('sức khỏe') || content.includes('kiem tra')) {
        await message.channel.sendTyping();
        const embed = await buildHealthEmbed();
        return message.reply({ embeds: [embed] });
    }

    // 2. Kiểm tra thông số máy chủ VPS (Server / RAM / Hiệu năng)
    if (content.includes('server') || content.includes('ram') || content.includes('vps') || content.includes('hieu nang') || content.includes('cpu')) {
        await message.channel.sendTyping();
        const embed = await buildServerEmbed();
        return message.reply({ embeds: [embed] });
    }

    // 3. Đo độ trễ (Ping)
    if (content.includes('ping')) {
        const ping = Date.now() - message.createdTimestamp;
        return message.reply({ embeds: [buildPingEmbed(ping, client.ws.ping)] });
    }

    // 4. Mặc định: Chào hỏi và hướng dẫn sử dụng
    const helpEmbed = new EmbedBuilder()
        .setTitle('👋 Chào bạn! Mình là Makeup Ops Bot')
        .setColor(0x9B59B6)
        .setDescription(`Bạn có thể chat tự nhiên với mình bằng cách tag tên hoặc gõ lệnh:
• **Kiểm tra Backend & DB**: Tag mình kèm từ \`health\` hoặc \`sức khỏe\` (hoặc gõ \`/health\`)
• **Kiểm tra VPS & RAM**: Tag mình kèm từ \`server\` hoặc \`ram\` (hoặc gõ \`/server\`)
• **Đo độ trễ**: Tag mình kèm từ \`ping\` (hoặc gõ \`/ping\`)`)
        .setFooter({ text: 'Makeup Booking Platform Monitoring' })
        .setTimestamp();

    return message.reply({ embeds: [helpEmbed] });
});

client.login(TOKEN);
