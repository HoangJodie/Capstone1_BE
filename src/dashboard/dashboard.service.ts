import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { RevenueTimelinePoint, RevenueTimeline } from './interfaces/dashboard.interface';

@Injectable()
export class DashboardService {
  constructor(private prisma: DatabaseService) {}

  async getRevenueOverview(startDate: Date, endDate: Date) {
    // Tính tổng doanh thu từ membership
    const membershipRevenue = await this.prisma.membership.aggregate({
      where: {
        transaction_date: {
          gte: startDate.toISOString(),
          lte: endDate.toISOString(),
        },
        status_id: 1, //1 là trạng thái thành công
      },
      _sum: {
        price: true,
      },
    });

    // Tính tổng doanh thu từ các lớp học
    const classRevenue = await this.prisma.class_transaction.aggregate({
      where: {
        payment_date: {
          gte: startDate,
          lte: endDate,
        },
        status_id: 1,
      },
      _sum: {
        amount_paid: true,
      },
    });

    return {
      membershipRevenue: Number(membershipRevenue._sum.price) || 0,
      classRevenue: Number(classRevenue._sum.amount_paid) || 0,
      totalRevenue: Number(membershipRevenue._sum.price || 0) + Number(classRevenue._sum.amount_paid || 0),
      period: {
        startDate,
        endDate,
      },
    };
  }

  async getMembershipAnalytics(startDate: Date, endDate: Date) {
    // Tính tổng thu nhập từ membership trong khoảng thời gian
    const totalRevenue = await this.prisma.membership.aggregate({
      where: {
        transaction_date: {
          gte: startDate.toISOString(),
          lte: endDate.toISOString(),
        },
        status_id: 1, // Trạng thái thành công
      },
      _sum: {
        price: true,
      },
    });

    // Đếm số lượng member mới trong khoảng thời gian
    const newMembers = await this.prisma.membership.count({
      where: {
        start_date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Đếm số lượng member đang hoạt động
    const activeMembers = await this.prisma.membership.count({
      where: {
        end_date: {
          gte: new Date(), // Vẫn giữ nguyên logic check member đang hoạt động
        },
        status_id: 1,
      },
    });

    // Thống kê theo loại membership trong khoảng thời gian
    const membershipStats = await this.prisma.membership.groupBy({
      by: ['membership_type'],
      where: {
        transaction_date: {
          gte: startDate.toISOString(),
          lte: endDate.toISOString(),
        },
        status_id: 1,
      },
      _count: {
        user_id: true,
      },
      _sum: {
        price: true,
      },
    });

    return {
      totalRevenue: Number(totalRevenue._sum.price) || 0,
      newMembers,
      activeMembers,
      membershipStats,
      period: {
        startDate,
        endDate,
      },
    };
  }

  async getClassAnalytics() {
    // Tổng số lớp học đang hoạt động
    const totalActiveClasses = await this.prisma.renamedclass.count({
      where: {
        status_id: 1,
      },
    });

    // Top các lớp học phổ biến
    const popularClasses = await this.prisma.renamedclass.findMany({
      select: {
        class_id: true,
        class_name: true,
        fee: true,
      },
      take: 5,
      orderBy: {
        class_id: 'desc', // Thay bằng tiêu chí phù hợp
      },
    });

    return {
      totalActiveClasses,
      popularClasses,
    };
  }

  async getPaymentAnalytics() {
    // Thống kê theo phương thức thanh toán cho membership
    const membershipPayments = await this.prisma.membership.groupBy({
      by: ['payment_method'],
      _count: {
        membership_id: true,
      },
      _sum: {
        price: true,
      },
    });

    // Thống kê theo phương thức thanh toán cho class
    const classPayments = await this.prisma.class_transaction.groupBy({
      by: ['payment_method'],
      _count: {
        class_transaction_id: true,
      },
      _sum: {
        amount_paid: true,
      },
    });

    return {
      membershipPayments,
      classPayments,
    };
  }

  async getRevenueTimeline(
    startDate: Date,
    endDate: Date,
    groupBy: 'day' | 'month' | 'year'
  ) {
    // Tính doanh thu membership theo timeline
    const membershipRevenue = await this.prisma.membership.groupBy({
      by: ['transaction_date'],
      where: {
        transaction_date: {
          gte: startDate.toISOString(),
          lte: endDate.toISOString(),
        },
        status_id: 1,
      },
      _sum: {
        price: true,
      },
    });

    // Tính doanh thu lớp học theo timeline
    const classRevenue = await this.prisma.class_transaction.groupBy({
      by: ['payment_date'],
      where: {
        payment_date: {
          gte: startDate.toISOString(),
          lte: endDate.toISOString(),
        },
        status_id: 1,
      },
      _sum: {
        amount_paid: true,
      },
    });

    // Tổng hợp dữ liệu theo groupBy
    const timelineData = this.aggregateTimelineData(
      membershipRevenue,
      classRevenue,
      groupBy
    );

    // Tính tổng
    const total = {
      membershipRevenue: membershipRevenue.reduce(
        (sum, item) => sum + Number(item._sum.price || 0),
        0
      ),
      classRevenue: classRevenue.reduce(
        (sum, item) => sum + Number(item._sum.amount_paid || 0),
        0
      ),
      revenue: 0,
    };
    total.revenue = total.membershipRevenue + total.classRevenue;

    return {
      data: timelineData,
      total,
    };
  }

  private aggregateTimelineData(
    membershipData: any[],
    classData: any[],
    groupBy: 'day' | 'month' | 'year'
  ) {
    const timeline = new Map<string, RevenueTimelinePoint>();

    // Xử lý dữ liệu membership
    membershipData.forEach((item) => {
      const date = new Date(item.transaction_date);
      const key = this.getTimelineKey(date, groupBy);
      
      if (!timeline.has(key)) {
        timeline.set(key, {
          date: key,
          revenue: 0,
          membershipRevenue: 0,
          classRevenue: 0,
        });
      }
      
      const point = timeline.get(key)!;
      const amount = Number(item._sum.price || 0);
      point.membershipRevenue += amount;
      point.revenue += amount;
    });

    // Xử lý dữ liệu class
    classData.forEach((item) => {
      const date = new Date(item.payment_date);
      const key = this.getTimelineKey(date, groupBy);
      
      if (!timeline.has(key)) {
        timeline.set(key, {
          date: key,
          revenue: 0,
          membershipRevenue: 0,
          classRevenue: 0,
        });
      }
      
      const point = timeline.get(key)!;
      const amount = Number(item._sum.amount_paid || 0);
      point.classRevenue += amount;
      point.revenue += amount;
    });

    return Array.from(timeline.values()).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }

  private getTimelineKey(date: Date, groupBy: 'day' | 'month' | 'year'): string {
    switch (groupBy) {
      case 'day':
        return date.toISOString().split('T')[0];
      case 'month':
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      case 'year':
        return date.getFullYear().toString();
    }
  }
} 