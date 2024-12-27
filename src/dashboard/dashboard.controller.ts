import { Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('revenue-overview')
  async getRevenueOverview(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return this.dashboardService.getRevenueOverview(start, end);
  }

  @Get('membership-analytics')
  async getMembershipAnalytics(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return this.dashboardService.getMembershipAnalytics(start, end);
  }

  @Get('class-analytics')
  async getClassAnalytics() {
    return this.dashboardService.getClassAnalytics();
  }

  @Get('payment-analytics')
  async getPaymentAnalytics() {
    return this.dashboardService.getPaymentAnalytics();
  }

  @Get('revenue-timeline')
  async getRevenueTimeline(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('groupBy') groupBy: 'day' | 'month' | 'year' = 'month'
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return this.dashboardService.getRevenueTimeline(start, end, groupBy);
  }
} 