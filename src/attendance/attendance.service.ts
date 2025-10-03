import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  async markAttendanceIn(userId: string) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // Check if already punched in today
    const existing = await this.prisma.attendance.findFirst({
      where: {
        userId,
        attendanceIn: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    if (existing) {
      return null;
    }

    return this.prisma.attendance.create({
      data: { userId, attendanceIn: new Date() },
    });
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
