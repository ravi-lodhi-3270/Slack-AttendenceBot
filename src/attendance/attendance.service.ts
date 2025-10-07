import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  async markAttendanceIn(
    userId: string,
  ): Promise<{ lateByMinutes: number | null }> {
    const now = new Date();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const existing = await this.prisma.attendance.findFirst({
      where: {
        userId,
        attendanceIn: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    if (existing) return { lateByMinutes: null };

    const punchInTime = now;
    const lateThreshold = new Date();
    lateThreshold.setHours(10, 15, 0, 0);

    const lateByMinutes =
      punchInTime > lateThreshold
        ? Math.floor((punchInTime.getTime() - lateThreshold.getTime()) / 60000)
        : 0;

    await this.prisma.attendance.create({
      data: { userId, attendanceIn: punchInTime },
    });

    return { lateByMinutes };
  }

  async markAttendanceOut(userId: string) {
    return this.prisma.attendance.updateMany({
      where: { userId, attendanceOut: null },
      data: { attendanceOut: new Date() },
    });
  }

  async markLunchIn(userId: string) {
    return this.prisma.attendance.updateMany({
      where: { userId, lunchOut: null },
      data: { lunchIn: new Date() },
    });
  }

  async markLunchOut(userId: string) {
    return this.prisma.attendance.updateMany({
      where: { userId, lunchOut: null },
      data: { lunchOut: new Date() },
    });
  }

  async markBreakIn(userId: string) {
    return this.prisma.attendance.updateMany({
      where: { userId, breakOut: null },
      data: { breakIn: new Date() },
    });
  }

  async markBreakOut(userId: string) {
    return this.prisma.attendance.updateMany({
      where: { userId, breakOut: null },
      data: { breakOut: new Date() },
    });
  }

  async getLastAttendance(userId: string) {
    return this.prisma.attendance.findFirst({
      where: { userId },
      orderBy: { attendanceIn: 'desc' },
    });
  }
}
