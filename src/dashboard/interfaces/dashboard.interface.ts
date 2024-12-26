export interface RevenueOverview {
  membershipRevenue: number;
  classRevenue: number;
  totalRevenue: number;
  period: {
    startDate: Date;
    endDate: Date;
  };
}

export interface MembershipAnalytics {
  newMembers: number;
  activeMembers: number;
  membershipStats: {
    membership_type: number;
    _count: {
      user_id: number;
    };
    _sum: {
      price: number;
    };
  }[];
}

export interface ClassAnalytics {
  totalActiveClasses: number;
  popularClasses: {
    class_id: number;
    class_name: string;
    fee: number;
  }[];
}

export interface PaymentAnalytics {
  membershipPayments: {
    payment_method: string;
    _count: {
      membership_id: number;
    };
    _sum: {
      price: number;
    };
  }[];
  classPayments: {
    payment_method: string;
    _count: {
      class_transaction_id: number;
    };
    _sum: {
      amount_paid: number;
    };
  }[];
}

export interface RevenueTimelinePoint {
  date: string;
  revenue: number;
  membershipRevenue: number;
  classRevenue: number;
}

export interface RevenueTimeline {
  data: RevenueTimelinePoint[];
  total: {
    revenue: number;
    membershipRevenue: number;
    classRevenue: number;
  };
} 