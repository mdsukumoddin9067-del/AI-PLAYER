import mineflayer from 'mineflayer';
import pf from 'mineflayer-pathfinder';
const { pathfinder, Movements, goals } = pf;
const GoalFollow = goals.GoalFollow;

import { GoogleGenAI } from '@google/genai';
import fs from 'fs';

// Load settings
const settings = JSON.parse(fs.readFileSync('./settings.json', 'utf8'));

// Initialize Gemini AI
const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey });

const botName = settings.profiles[0] || "GeminiBot";

const bot = mineflayer.createBot({
    host: settings.host,
    port: settings.port,
    username: botName,
    auth: settings.auth,
    version: "1.21.3"
});

bot.loadPlugin(pathfinder);

bot.on('spawn', () => {
    console.log(`[Mindcraft] ${bot.username} joined the world!`);
    const defaultMove = new Movements(bot);
    bot.pathfinder.setMovements(defaultMove);

    // Anti-AFK Interval
    setInterval(() => {
        if (bot && bot.entity) {
            bot.setControlState('jump', true);
            setTimeout(() => bot.setControlState('jump', false), 500);
        }
    }, 30000);
});

bot.on('chat', async (username, message) => {
    if (username === bot.username) return;

    const msg = message.toLowerCase().trim();
    const playerEntity = bot.players[username]?.entity;

    if (msg.includes('follow') || msg.includes('আসো')) {
        if (playerEntity) {
            bot.chat(`Coming to you, ${username}!`);
            bot.pathfinder.setGoal(new GoalFollow(playerEntity, 2), true);
        } else {
            bot.chat(`I can't see you!`);
        }
        return;
    }

    if (msg.includes('stop') || msg.includes('থামো')) {
        bot.chat('Stopping.');
        bot.pathfinder.setGoal(null);
        return;
    }

    // AI Mindcraft Response
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                {
                    role: 'user',
                    parts: [{
                        text: `You are an AI player companion inside Minecraft named ${bot.username}. ${username} says: "${message}". Reply briefly and naturally.`
                    }]
                }
            ]
        });

        const reply = response.text ? response.text.trim() : "...";
        bot.chat(reply);
    } catch (err) {
        console.error('[Mindcraft AI Error]:', err);
    }
});

bot.on('kicked', (reason) => console.log('[Kicked]:', reason));
bot.on('error', (err) => console.error('[Error]:', err));
bot.on('end', () => console.log('[Disconnected]'));
