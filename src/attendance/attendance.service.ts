import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  async markAttendanceIn(userId: string) {
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
}
