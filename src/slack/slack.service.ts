import { Injectable } from '@nestjs/common';
import { App, ExpressReceiver } from '@slack/bolt';

@Injectable()
export class SlackService {
  private receiver: ExpressReceiver;
  public slackApp: App;

  constructor() {
    if (!process.env.SLACK_SIGNING_SECRET || !process.env.SLACK_BOT_TOKEN) {
      throw new Error('Slack env variables not set!');
    }

    this.receiver = new ExpressReceiver({
      signingSecret: process.env.SLACK_SIGNING_SECRET!,
      endpoints: '/slack/events',
      processBeforeResponse: true,
    });

    this.slackApp = new App({
      token: process.env.SLACK_BOT_TOKEN!,
      receiver: this.receiver,
    });

    this.slackApp.start().then(() => {
      console.log('⚡️ Slack Bolt app is running inside NestJS!');
    });

    // Specific listeners
    this.slackApp.message(async ({ message, say }) => {
      console.log('[Slack] Message event:', message);
      if ('user' in message) {
        await say(`Hey <@${message.user}>, I see you said hello!`);
      }
    });

    this.slackApp.event('app_mention', async ({ event, say }) => {
      console.log('[Slack] Mention received:', event.text);
      await say(`Hi <@${event.user}>!`);
    });
  }

  public getReceiverApp() {
    return this.receiver.app;
  }
}
