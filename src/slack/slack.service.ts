import { Injectable } from '@nestjs/common';
import { App, ExpressReceiver, BlockAction, ButtonAction } from '@slack/bolt';
import { AttendanceService } from 'src/attendance/attendance.service';

@Injectable()
export class SlackService {
  private receiver: ExpressReceiver;
  public slackApp: App;

  constructor(private readonly attendanceService: AttendanceService) {
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
      this.listeners();
      console.log('⚡️ Slack Bolt app is running... inside NestJS Srever!');
    });
  }

  listeners() {
    const greetings = ['hello', 'hi', 'hey', 'hii', 'hy'];

    this.slackApp.message(async ({ message, say }) => {
      if (
        !('user' in message) ||
        !message.user ||
        !('text' in message && message.text)
      )
        return;

      const text = message.text.trim().toLowerCase();

      if (greetings.includes(text)) {
        console.log('[Slack] Greeting received:', text);
        await say(
          `👋 Hey <@${message.user}>, I see you said "${message.text}"!`,
        );
      }
    });

    this.slackApp.event('app_mention', async ({ event, say }) => {
      console.log('[Slack] Mention received:', event.text);
      await say(`Hi <@${event.user}>!`);
    });

    this.slackApp.message('In', async ({ message, say }) => {
      if (!('user' in message) || !message.user) return;

      const userId = message.user;
      const lastAttendance =
        await this.attendanceService.getLastAttendance(userId);

      if (!lastAttendance) {
        const { lateByMinutes } =
          await this.attendanceService.markAttendanceIn(userId);

        if (lateByMinutes && lateByMinutes > 0) {
          await say(
            `⏰ <@${userId}>, you punched in *${lateByMinutes} minutes late* today.`,
          );
        } else {
          await say(`✅ <@${userId}>, you have punched in on time.`);
        }

        return;
      }

      // Check if lunch or break needs to be ended
      if (lastAttendance.breakIn && !lastAttendance.breakOut) {
        await this.attendanceService.markBreakOut(userId);
        await say(`☕ <@${userId}>, your *break* has ended.`);
        return;
      }

      if (lastAttendance.lunchIn && !lastAttendance.lunchOut) {
        await this.attendanceService.markLunchOut(userId);
        await say(`🍴 <@${userId}>, your *lunch* has ended.`);
        return;
      }
      await say(`🍴 <@${userId}>, you are already punched *in*.`);
      return;
    });

    // Simple text command → Out
    this.slackApp.message('Out', async ({ message, say }) => {
      if ('user' in message && message.user) {
        await this.attendanceService.markAttendanceOut(message.user);
        await say(`✅ <@${message.user}> you are marked *OUT*.`);
      }
    });

    // Lunch In
    this.slackApp.message('Lunch', async ({ message, say }) => {
      if ('user' in message && message.user) {
        await this.attendanceService.markLunchIn(message.user);

        const formattedTime = this.formatReturnTime(1 / 3);
        await say(
          `🍽️ <@${message.user}>, Enjoy your *lunch*! See you back at ${formattedTime}`,
        );
        await this.scheduleBreakReminder(message.user, 1 / 3, say);
      }
    });

    // Break In
    this.slackApp.message('Break', async ({ message, say }) => {
      if ('user' in message && message.user) {
        await this.attendanceService.markBreakIn(message.user);

        const formattedTime = this.formatReturnTime(1 / 3);
        await say(
          `☕ <@${message.user}>, Enjoy your *Break*! See you back at ${formattedTime}`,
        );
        await this.scheduleBreakReminder(message.user, 1 / 3, say);
      }
    });

    this.slackApp.action<BlockAction>(
      { callback_id: 'break_reminder' },
      async ({ ack, body, client }) => {
        await ack();

        const action = (body as any).actions?.[0];
        const userId = body.user.id;

        if (action?.type === 'button') {
          const buttonAction = action as ButtonAction;

          if (buttonAction.value === 'still') {
            await client.chat.postMessage({
              channel: userId,
              text: `🙌 Got it <@${userId}>! Enjoy your extended break.`,
            });
          } else if (buttonAction.value === 'In') {
            await this.attendanceService.markBreakOut(userId);
            await client.chat.postMessage({
              channel: userId,
              text: `✅ Welcome back <@${userId}>! You're marked *IN*.`,
            });
          }
        } else {
          await client.chat.postMessage({
            channel: userId,
            text: `⚠️ Sorry <@${userId}>, I couldn't process your response.`,
          });
        }
      },
    );
  }

  formatReturnTime(durationMinutes: number): string {
    const now = new Date();
    const returnTime = new Date(now.getTime() + durationMinutes * 60 * 1000);

    let hours = returnTime.getHours();
    const minutes = returnTime.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';

    hours = hours % 12;
    hours = hours ? hours : 12;

    return `${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`;
  }

  async scheduleBreakReminder(
    userId: string,
    durationMinutes: number,
    say: any,
  ) {
    setTimeout(
      async () => {
        // Fetch latest attendance
        const last = await this.attendanceService.getLastAttendance(userId);

        // Send reminder only if break/lunch is still active
        if (
          (last?.breakIn && !last?.breakOut) ||
          (last?.lunchIn && !last?.lunchOut)
        ) {
          await say({
            text: `⏰ <@${userId}>, your break time is over!`,
            attachments: [
              {
                text: 'Choose an option:',
                callback_id: 'break_reminder',
                color: '#3AA3E3',
                attachment_type: 'default',
                actions: [
                  {
                    name: 'still',
                    text: '🙌 Still on Break',
                    type: 'button',
                    value: 'still',
                  },
                  {
                    name: 'in',
                    text: "✅ I'm Back (In)",
                    type: 'button',
                    value: 'In',
                  },
                ],
              },
            ],
          });
        }
      },
      durationMinutes * 60 * 1000,
    );
  }

  public getReceiverApp() {
    return this.receiver.app;
  }
}
