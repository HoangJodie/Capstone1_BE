export interface CreateMembershipDto {
    user_id: number;
    membership_type: number;
    start_date: Date;
    end_date: Date;
    price: number;
    status_id: number;
    payment_method: string;
    order_id?: string;
} 