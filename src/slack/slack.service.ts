import { Injectable, Logger } from '@nestjs/common';
import { App, LogLevel } from '@slack/bolt';
import { AttendanceService } from '../attendance/attendance.service';

@Injectable()
export class SlackService {
  private app: App;

  constructor(private attendanceService: AttendanceService) {
    this.app = new App({
      token: process.env.SLACK_BOT_TOKEN,
      signingSecret: process.env.SLACK_SIGNING_SECRET,
      logLevel: LogLevel.INFO,
    });

    this.registerCommands();
    this.start();
  }

  private registerCommands() {
    this.app.command('/attendance-in', async ({ ack, say, command }) => {
      await ack();
      await this.attendanceService.markAttendanceIn(command.user_id);
      await say(
        `<@${command.user_id}> marked Attendance In at ${new Date().toLocaleTimeString()}`,
      );
    });

    this.app.command('/attendance-out', async ({ ack, say, command }) => {
      await ack();
      await this.attendanceService.markAttendanceOut(command.user_id);
      await say(
        `<@${command.user_id}> marked Attendance Out at ${new Date().toLocaleTimeString()}`,
      );
    });

    this.app.command('/lunch-in', async ({ ack, say, command }) => {
      await ack();
      await this.attendanceService.markLunchIn(command.user_id);
      await say(
        `<@${command.user_id}> started lunch at ${new Date().toLocaleTimeString()}. Please be back in 45 mins.`,
      );
      // TODO: add timer for reminder
    });

    this.app.command('/lunch-out', async ({ ack, say, command }) => {
      await ack();
      await this.attendanceService.markLunchOut(command.user_id);
      await say(
        `<@${command.user_id}> ended lunch at ${new Date().toLocaleTimeString()}`,
      );
    });

    this.app.command('/break-in', async ({ ack, say, command }) => {
      await ack();
      await this.attendanceService.markBreakIn(command.user_id);
      await say(
        `<@${command.user_id}> started break at ${new Date().toLocaleTimeString()}. Please be back in 15 mins.`,
      );
    });

    this.app.command('/break-out', async ({ ack, say, command }) => {
      await ack();
      await this.attendanceService.markBreakOut(command.user_id);
      await say(
        `<@${command.user_id}> ended break at ${new Date().toLocaleTimeString()}`,
      );
    });
  }

  private async start() {
    await this.app.start(Number(process.env.PORT) || 3000);
    Logger.log('SlackBot is running...');
  }
}
